import { Transform, TransformStore } from "./transform";
import { Scene } from "../world/scene";
import { Light, DirectionalLight, PointLight } from "../world/light";
import { Camera } from "../world/camera";
import { Mesh } from "../world/mesh";
import { Geometry } from "../graphics/geometry";
import { Material, BlendMode, CullMode, UnlitMaterial, StandardMaterial } from "../graphics/material";
import { animf, cullf, frameArena, frustumf, mat4f, transformf, wasm, WasmPtr } from "../wasm";
import smaaWGSL from "../wgsl/smaa.wgsl";
import { createBuffer, createDepthTexture } from "../utils";

export type RendererDescriptor = {
    antialias?: boolean;
    powerPreference?: "high-performance" | "low-power";
    frustumCulling?: boolean;
    frustumCullingStats?: boolean;
};

type DrawItem = {
    mesh: Mesh;
    geometry: Geometry;
    material: Material;
    pipeline: GPURenderPipeline;
    pipelineId: number;
    materialId: number;
    geometryId: number;
    skinned: boolean;
    sortKey: number;
};

export class Renderer {
    private canvas: HTMLCanvasElement;
    private context!: GPUCanvasContext;
    private device!: GPUDevice;
    private queue!: GPUQueue;
    private format!: GPUTextureFormat;
    private depthTexture!: GPUTexture;
    private depthView!: GPUTextureView;
    private width = 0;
    private height = 0;
    private smaaEnabled: boolean = false;
    private smaaSceneColorTexture: GPUTexture | null = null;
    private smaaSceneColorView: GPUTextureView | null = null;
    private smaaEdgesTexture: GPUTexture | null = null;
    private smaaEdgesView: GPUTextureView | null = null;
    private smaaBlendTexture: GPUTexture | null = null;
    private smaaBlendView: GPUTextureView | null = null;
    private smaaParamsBuffer: GPUBuffer | null = null;
    private smaaSamplerPoint: GPUSampler | null = null;
    private smaaSamplerLinear: GPUSampler | null = null;
    private smaaShaderModule: GPUShaderModule | null = null;
    private smaaEdgePipeline: GPURenderPipeline | null = null;
    private smaaWeightPipeline: GPURenderPipeline | null = null;
    private smaaNeighborhoodPipeline: GPURenderPipeline | null = null;
    private smaaEdgeBindGroupLayout: GPUBindGroupLayout | null = null;
    private smaaWeightBindGroupLayout: GPUBindGroupLayout | null = null;
    private smaaNeighborhoodBindGroupLayout: GPUBindGroupLayout | null = null;
    private smaaEdgeBindGroup: GPUBindGroup | null = null;
    private smaaWeightBindGroup: GPUBindGroup | null = null;
    private smaaNeighborhoodBindGroup: GPUBindGroup | null = null;
    private globalBindGroupLayout!: GPUBindGroupLayout;
    private globalBindGroups: GPUBindGroup[] = [];
    private skinBindGroupLayout!: GPUBindGroupLayout;
    private cameraUniformBuffer!: GPUBuffer;
    private modelUniformBuffers: GPUBuffer[] = [];
    private modelBufferIndex: number = 0;
    private readonly MODEL_BUFFER_POOL_SIZE = 64;
    private lightingUniformBuffer!: GPUBuffer;
    private instanceBuffer: GPUBuffer | null = null;
    private instanceBufferCapacityBytes: number = 0;
    private instanceBufferOffset: number = 0;
    private readonly INSTANCE_STRIDE_BYTES = 128;
    private pipelineCache: Map<string, GPURenderPipeline> = new Map();
    private shaderCache: Map<string, GPUShaderModule> = new Map();
    private drawItemPool: DrawItem[] = [];
    private drawItemPoolUsed: number = 0;
    private opaqueDrawList: DrawItem[] = [];
    private transparentDrawList: DrawItem[] = [];
    private objectIds: WeakMap<object, number> = new WeakMap();
    private nextObjectId: number = 1;
    private cameraUniformStagingPtr!: WasmPtr;
    private lightingUniformStagingPtr!: WasmPtr;
    private modelUniformStagingPtr!: WasmPtr;
    private cameraUniformStagingView!: Float32Array<ArrayBuffer>;
    private lightingUniformStagingView!: Float32Array<ArrayBuffer>;
    private lightingCountView!: Uint32Array<ArrayBuffer>;
    private modelUniformStagingView!: Float32Array<ArrayBuffer>;
    private _wasmBuffer: ArrayBuffer | null = null;
    private frustumCullingEnabled: boolean = true;
    private frustumCullingStatsEnabled: boolean = false;
    readonly cullingStats: { tested: number; visible: number } = { tested: 0, visible: 0 };
    private cullCentersPtr: WasmPtr = 0;
    private cullRadiiPtr: WasmPtr = 0;
    private cullCapacity: number = 0;
    private cullMeshScratch: Mesh[] = [];
    private fallbackSampler!: GPUSampler;
    private fallbackWhiteTexture!: GPUTexture;
    private fallbackWhiteViewLinear!: GPUTextureView;
    private fallbackWhiteViewSrgb!: GPUTextureView;
    private fallbackNormalTexture!: GPUTexture;
    private fallbackNormalViewLinear!: GPUTextureView;
    private fallbackMRTex!: GPUTexture;
    private fallbackMRViewLinear!: GPUTextureView;
    private fallbackOcclusionTex!: GPUTexture;
    private fallbackOcclusionViewLinear!: GPUTextureView;

    private constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    static async create(canvas: HTMLCanvasElement, descriptor: RendererDescriptor = {}): Promise<Renderer> {
        const renderer = new Renderer(canvas);
        await renderer.init(descriptor);
        return renderer;
    }

    private async init(descriptor: RendererDescriptor): Promise<void> {
        if (!navigator.gpu) throw new Error("WebGPU is not supported in this browser.");
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: descriptor.powerPreference ?? "high-performance" });
        if (!adapter) throw new Error("Failed to get GPU adapter.");
        this.device = await adapter.requestDevice();
        this.queue = this.device.queue;
        this.context = this.canvas.getContext("webgpu") as GPUCanvasContext;
        if (!this.context) throw new Error("Failed to get WebGPU canvas context.");
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.smaaEnabled = descriptor.antialias ?? false;
        if (this.smaaEnabled) this.createSmaaResources();
        this.createGlobalBindGroupLayout();
        this.createSkinBindGroupLayout();
        this.createUniformBuffers();
        this.createFallbackTextures();
        this.resize();
        this.frustumCullingEnabled = descriptor.frustumCulling ?? true;
        this.frustumCullingStatsEnabled = descriptor.frustumCullingStats ?? false;
    }

    get gpu(): { device: GPUDevice; queue: GPUQueue; format: GPUTextureFormat } {
        return {
            device: this.device,
            queue: this.queue,
            format: this.format
        };
    }

    resize(): void {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
        const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
        if (w === this.width && h === this.height) return;
        this.width = w;
        this.height = h;
        this.canvas.width = w;
        this.canvas.height = h;
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque"
        });
        if (this.depthTexture) this.depthTexture.destroy();
        this.depthTexture = createDepthTexture(this.device, this.width, this.height);
        this.depthView = this.depthTexture.createView();
        if (this.smaaEnabled) this.resizeSmaaTargets();
    }

    get aspectRatio(): number {
        return this.width / this.height;
    }

    private refreshWasmStagingViews(): void {
        const buf = wasm.memory().buffer;
        if (this._wasmBuffer === buf) return;
        this._wasmBuffer = buf;
        this.cameraUniformStagingView = wasm.f32view(this.cameraUniformStagingPtr, 20);
        this.lightingUniformStagingView = wasm.f32view(this.lightingUniformStagingPtr, 104);
        this.lightingCountView = new Uint32Array(buf as ArrayBuffer, this.lightingUniformStagingPtr + 16, 1);
        this.modelUniformStagingView = wasm.f32view(this.modelUniformStagingPtr, 32);
    }

    private getObjectId(obj: object): number {
        let id = this.objectIds.get(obj);
        if (id !== undefined) return id;
        id = this.nextObjectId++;
        this.objectIds.set(obj, id);
        return id;
    }

    private acquireDrawItem(): DrawItem {
        const i = this.drawItemPoolUsed++;
        let item = this.drawItemPool[i];
        if (!item) {
            item = {
                mesh: null as unknown as Mesh,
                geometry: null as unknown as Geometry,
                material: null as unknown as Material,
                pipeline: null as unknown as GPURenderPipeline,
                pipelineId: 0,
                materialId: 0,
                geometryId: 0,
                skinned: false,
                sortKey: 0
            };
            this.drawItemPool[i] = item;
        }
        return item;
    }

    private ensureCullingCapacity(count: number): void {
        if (count <= this.cullCapacity) return;
        let cap = Math.max(1, this.cullCapacity);
        while (cap < count) cap *= 2;
        this.cullCentersPtr = wasm.allocF32(cap * 3) as WasmPtr;
        this.cullRadiiPtr = wasm.allocF32(cap) as WasmPtr;
        this.cullCapacity = cap;
    }

    render(scene: Scene, camera: Camera): void {
        this.resize();
        this.modelBufferIndex = 0;
        this.instanceBufferOffset = 0;
        this.cameraUniformStagingPtr = frameArena.allocF32(20);
        this.lightingUniformStagingPtr = frameArena.allocF32(104);
        this.modelUniformStagingPtr = frameArena.allocF32(32);
        this._wasmBuffer = null;
        if ("aspect" in camera) (camera as { aspect: number }).aspect = this.aspectRatio;
        const swapTexture = this.context.getCurrentTexture();
        const swapView = swapTexture.createView();
        Transform.updateAll();
        this.writeCameraUniforms(camera);
        this.writeLightingUniforms(scene);
        const encoder = this.device.createCommandEncoder();
        if (this.smaaEnabled) {
            if (!this.smaaSceneColorView || !this.smaaEdgesView || !this.smaaBlendView) this.resizeSmaaTargets();
            const pass = encoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: this.smaaSceneColorView!,
                        clearValue: { r: scene.background[0], g: scene.background[1], b: scene.background[2], a: 1 },
                        loadOp: "clear",
                        storeOp: "store"
                    }
                ],
                depthStencilAttachment: {
                    view: this.depthView,
                    depthClearValue: 1.0,
                    depthLoadOp: "clear",
                    depthStoreOp: "store"
                }
            });
            this.buildDrawLists(scene, camera);
            this.executeDrawList(pass, this.opaqueDrawList);
            this.executeDrawList(pass, this.transparentDrawList);
            pass.end();
            this.executeSmaa(encoder, swapView);
        } else {
            const pass = encoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: swapView,
                        clearValue: { r: scene.background[0], g: scene.background[1], b: scene.background[2], a: 1 },
                        loadOp: "clear",
                        storeOp: "store"
                    }
                ],
                depthStencilAttachment: {
                    view: this.depthView,
                    depthClearValue: 1.0,
                    depthLoadOp: "clear",
                    depthStoreOp: "store"
                }
            });
            this.buildDrawLists(scene, camera);
            this.executeDrawList(pass, this.opaqueDrawList);
            this.executeDrawList(pass, this.transparentDrawList);
            pass.end();
        }
        this.queue.submit([encoder.finish()]);
    }

    destroy(): void {
        this.depthTexture?.destroy();
        this.smaaSceneColorTexture?.destroy();
        this.smaaEdgesTexture?.destroy();
        this.smaaBlendTexture?.destroy();
        this.smaaSceneColorTexture = null;
        this.smaaSceneColorView = null;
        this.smaaEdgesTexture = null;
        this.smaaEdgesView = null;
        this.smaaBlendTexture = null;
        this.smaaBlendView = null;
        this.smaaParamsBuffer?.destroy();
        this.smaaParamsBuffer = null;
        this.smaaEdgeBindGroup = null;
        this.smaaWeightBindGroup = null;
        this.smaaNeighborhoodBindGroup = null;
        this.smaaEdgePipeline = null;
        this.smaaWeightPipeline = null;
        this.smaaNeighborhoodPipeline = null;
        this.smaaShaderModule = null;
        this.smaaEdgeBindGroupLayout = null;
        this.smaaWeightBindGroupLayout = null;
        this.smaaNeighborhoodBindGroupLayout = null;
        this.smaaSamplerPoint = null;
        this.smaaSamplerLinear = null;
        this.fallbackWhiteTexture?.destroy();
        this.fallbackNormalTexture?.destroy();
        this.fallbackMRTex?.destroy();
        this.fallbackOcclusionTex?.destroy();
        this.cameraUniformBuffer?.destroy();
        for (const buffer of this.modelUniformBuffers) buffer.destroy();
        this.modelUniformBuffers = [];
        this.lightingUniformBuffer?.destroy();
        this.instanceBuffer?.destroy();
        this.instanceBuffer = null;
        this.instanceBufferCapacityBytes = 0;
        this.globalBindGroups = [];
        this.pipelineCache.clear();
        this.shaderCache.clear();
    }

    private createGlobalBindGroupLayout(): void {
        this.globalBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform", minBindingSize: 80 }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "uniform", minBindingSize: 128 }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform", minBindingSize: 416 }
                }
            ]
        });
    }

    private createSkinBindGroupLayout(): void {
        this.skinBindGroupLayout = this.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "read-only-storage" }
            }]
        });
    }

    private createUniformBuffers(): void {
        this.cameraUniformBuffer = this.device.createBuffer({
            size: 80,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        for (let i = 0; i < this.MODEL_BUFFER_POOL_SIZE; i++) {
            this.modelUniformBuffers.push(this.device.createBuffer({
                size: 128,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            }));
        }
        this.lightingUniformBuffer = this.device.createBuffer({
            size: 416,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.globalBindGroups = new Array(this.MODEL_BUFFER_POOL_SIZE);
        for (let i = 0; i < this.MODEL_BUFFER_POOL_SIZE; i++) {
            this.globalBindGroups[i] = this.device.createBindGroup({
                layout: this.globalBindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
                    { binding: 1, resource: { buffer: this.modelUniformBuffers[i] } },
                    { binding: 2, resource: { buffer: this.lightingUniformBuffer } }
                ]
            });
        }
        this.cameraUniformStagingPtr = 0;
        this.lightingUniformStagingPtr = 0;
        this.modelUniformStagingPtr = 0;
        this._wasmBuffer = null;
    }

    private ensureModelBufferPool(requiredCount: number): void {
        const current = this.modelUniformBuffers.length;
        if (requiredCount <= current) return;
        let newSize = Math.max(1, current);
        while (newSize < requiredCount) newSize *= 2;
        this.modelUniformBuffers.length = newSize;
        this.globalBindGroups.length = newSize;
        for (let i = current; i < newSize; i++) {
            const buf = this.device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            this.modelUniformBuffers[i] = buf;
            this.globalBindGroups[i] = this.device.createBindGroup({
                layout: this.globalBindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
                    { binding: 1, resource: { buffer: buf } },
                    { binding: 2, resource: { buffer: this.lightingUniformBuffer } },
                ],
            });
        }
    }

    private createFallbackTextures(): void {
        this.fallbackSampler = this.device.createSampler({
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "linear",
        });
        const create1x1 = (rgba: [number, number, number, number], wantSrgbView: boolean): { tex: GPUTexture; linear: GPUTextureView; srgb: GPUTextureView } => {
            const tex = this.device.createTexture({
                size: { width: 1, height: 1 },
                format: "rgba8unorm",
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
                viewFormats: ["rgba8unorm-srgb"],
            });
            const data = new Uint8Array(256);
            data[0] = rgba[0];
            data[1] = rgba[1];
            data[2] = rgba[2];
            data[3] = rgba[3];
            this.queue.writeTexture(
                { texture: tex },
                data,
                { bytesPerRow: 256, rowsPerImage: 1 },
                { width: 1, height: 1 }
            );
            const linear = tex.createView({ format: "rgba8unorm" });
            const srgb = wantSrgbView ? tex.createView({ format: "rgba8unorm-srgb" }) : linear;
            return { tex, linear, srgb };
        };
        const white = create1x1([255, 255, 255, 255], true);
        this.fallbackWhiteTexture = white.tex;
        this.fallbackWhiteViewLinear = white.linear;
        this.fallbackWhiteViewSrgb = white.srgb;
        const normal = create1x1([128, 128, 255, 255], false);
        this.fallbackNormalTexture = normal.tex;
        this.fallbackNormalViewLinear = normal.linear;
        const mr = create1x1([0, 255, 255, 255], false);
        this.fallbackMRTex = mr.tex;
        this.fallbackMRViewLinear = mr.linear;
        const occ = create1x1([255, 0, 0, 255], false);
        this.fallbackOcclusionTex = occ.tex;
        this.fallbackOcclusionViewLinear = occ.linear;
    }

    private createSmaaResources(): void {
        if (this.smaaParamsBuffer) return;
        this.smaaParamsBuffer = this.device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.smaaSamplerPoint = this.device.createSampler({
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            magFilter: "nearest",
            minFilter: "nearest"
        });
        this.smaaSamplerLinear = this.device.createSampler({
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            magFilter: "linear",
            minFilter: "linear"
        });
        const shaderCode = smaaWGSL;
        this.smaaShaderModule = this.device.createShaderModule({ code: shaderCode });
        this.smaaEdgeBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
            ]
        });
        this.smaaWeightBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
            ]
        });
        this.smaaNeighborhoodBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
                { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
            ]
        });
        const edgeLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.smaaEdgeBindGroupLayout] });
        const weightLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.smaaWeightBindGroupLayout] });
        const neighLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.smaaNeighborhoodBindGroupLayout] });
        this.smaaEdgePipeline = this.device.createRenderPipeline({
            layout: edgeLayout,
            vertex: { module: this.smaaShaderModule, entryPoint: "vs_fullscreen" },
            fragment: {
                module: this.smaaShaderModule,
                entryPoint: "fs_smaa_edges",
                targets: [{ format: "rgba8unorm" }]
            },
            primitive: { topology: "triangle-list", cullMode: "none" }
        });
        this.smaaWeightPipeline = this.device.createRenderPipeline({
            layout: weightLayout,
            vertex: { module: this.smaaShaderModule, entryPoint: "vs_fullscreen" },
            fragment: {
                module: this.smaaShaderModule,
                entryPoint: "fs_smaa_weights",
                targets: [{ format: "rgba8unorm" }]
            },
            primitive: { topology: "triangle-list", cullMode: "none" }
        });
        this.smaaNeighborhoodPipeline = this.device.createRenderPipeline({
            layout: neighLayout,
            vertex: { module: this.smaaShaderModule, entryPoint: "vs_fullscreen" },
            fragment: {
                module: this.smaaShaderModule,
                entryPoint: "fs_smaa_neighborhood",
                targets: [{ format: this.format }]
            },
            primitive: { topology: "triangle-list", cullMode: "none" }
        });
    }

    private resizeSmaaTargets(): void {
        if (!this.smaaEnabled) return;
        if (!this.smaaParamsBuffer) this.createSmaaResources();
        this.smaaSceneColorTexture?.destroy();
        this.smaaEdgesTexture?.destroy();
        this.smaaBlendTexture?.destroy();
        const w = this.width | 0;
        const h = this.height | 0;
        if (w <= 0 || h <= 0) return;
        this.smaaSceneColorTexture = this.device.createTexture({
            size: { width: w, height: h, depthOrArrayLayers: 1 },
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.smaaSceneColorView = this.smaaSceneColorTexture.createView();
        const intermediateFormat: GPUTextureFormat = "rgba8unorm";
        this.smaaEdgesTexture = this.device.createTexture({
            size: { width: w, height: h, depthOrArrayLayers: 1 },
            format: intermediateFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.smaaEdgesView = this.smaaEdgesTexture.createView();
        this.smaaBlendTexture = this.device.createTexture({
            size: { width: w, height: h, depthOrArrayLayers: 1 },
            format: intermediateFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.smaaBlendView = this.smaaBlendTexture.createView();
        const params = new Float32Array(8);
        params[0] = 1 / w;
        params[1] = 1 / h;
        params[2] = w;
        params[3] = h;
        params[4] = 0.1;
        this.queue.writeBuffer(this.smaaParamsBuffer!, 0, params);
        this.smaaEdgeBindGroup = this.device.createBindGroup({
            layout: this.smaaEdgeBindGroupLayout!,
            entries: [
                { binding: 0, resource: { buffer: this.smaaParamsBuffer! } },
                { binding: 2, resource: this.smaaSamplerPoint! },
                { binding: 3, resource: this.smaaSceneColorView! }
            ]
        });
        this.smaaWeightBindGroup = this.device.createBindGroup({
            layout: this.smaaWeightBindGroupLayout!,
            entries: [
                { binding: 0, resource: { buffer: this.smaaParamsBuffer! } },
                { binding: 2, resource: this.smaaSamplerPoint! },
                { binding: 4, resource: this.smaaEdgesView! }
            ]
        });
        this.smaaNeighborhoodBindGroup = this.device.createBindGroup({
            layout: this.smaaNeighborhoodBindGroupLayout!,
            entries: [
                { binding: 0, resource: { buffer: this.smaaParamsBuffer! } },
                { binding: 1, resource: this.smaaSamplerLinear! },
                { binding: 2, resource: this.smaaSamplerPoint! },
                { binding: 3, resource: this.smaaSceneColorView! },
                { binding: 5, resource: this.smaaBlendView! }
            ]
        });
    }

    private executeSmaa(encoder: GPUCommandEncoder, outputView: GPUTextureView): void {
        if (!this.smaaEdgePipeline || !this.smaaWeightPipeline || !this.smaaNeighborhoodPipeline) return;
        if (!this.smaaEdgeBindGroup || !this.smaaWeightBindGroup || !this.smaaNeighborhoodBindGroup) return;
        if (!this.smaaEdgesView || !this.smaaBlendView) return;
        const edgePass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.smaaEdgesView,
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    loadOp: "clear",
                    storeOp: "store"
                }
            ]
        });
        edgePass.setPipeline(this.smaaEdgePipeline);
        edgePass.setBindGroup(0, this.smaaEdgeBindGroup);
        edgePass.draw(3);
        edgePass.end();
        const weightPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.smaaBlendView,
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    loadOp: "clear",
                    storeOp: "store"
                }
            ]
        });
        weightPass.setPipeline(this.smaaWeightPipeline);
        weightPass.setBindGroup(0, this.smaaWeightBindGroup);
        weightPass.draw(3);
        weightPass.end();
        const neighborhoodPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: outputView,
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store"
                }
            ]
        });
        neighborhoodPass.setPipeline(this.smaaNeighborhoodPipeline);
        neighborhoodPass.setBindGroup(0, this.smaaNeighborhoodBindGroup);
        neighborhoodPass.draw(3);
        neighborhoodPass.end();
    }

    private writeCameraUniforms(camera: Camera): void {
        const viewProj = camera.viewProjectionMatrix;
        this.refreshWasmStagingViews();
        const data = this.cameraUniformStagingView;
        data.set(viewProj, 0);
        const storeF32 = TransformStore.global().f32();
        const wb = (camera.transform.worldMatrixPtr >>> 2);
        data[16] = storeF32[wb + 12];
        data[17] = storeF32[wb + 13];
        data[18] = storeF32[wb + 14];
        data[19] = 0;
        this.queue.writeBuffer(this.cameraUniformBuffer, 0, data);
    }

    private writeLightingUniforms(scene: Scene): void {
        const { ambient, lights } = scene.getLightingData();
        this.refreshWasmStagingViews();
        const data = this.lightingUniformStagingView;
        data[0] = ambient[0];
        data[1] = ambient[1];
        data[2] = ambient[2];
        data[3] = 1;
        this.lightingCountView[0] = lights.length;
        let offset = 8;
        for (let i = 0; i < lights.length && i < Scene.MAX_LIGHTS; i++) {
            const light = lights[i];
            if (light instanceof DirectionalLight) {
                data[offset + 0] = light.direction[0];
                data[offset + 1] = light.direction[1];
                data[offset + 2] = light.direction[2];
                data[offset + 3] = 0;
            } else if (light instanceof PointLight) {
                data[offset + 0] = light.position[0];
                data[offset + 1] = light.position[1];
                data[offset + 2] = light.position[2];
                data[offset + 3] = 1;
            }
            data[offset + 4] = light.color[0];
            data[offset + 5] = light.color[1];
            data[offset + 6] = light.color[2];
            data[offset + 7] = light.intensity;
            if (light instanceof PointLight) {
                data[offset + 8] = light.range;
            }
            offset += 12;
        }
        this.queue.writeBuffer(this.lightingUniformBuffer, 0, data);
    }

    private buildDrawLists(scene: Scene, camera: Camera): void {
        this.drawItemPoolUsed = 0;
        this.opaqueDrawList.length = 0;
        this.transparentDrawList.length = 0;
        const candidates = this.cullMeshScratch;
        candidates.length = 0;
        for (const mesh of scene.meshes) {
            if (!mesh.visible) continue;
            candidates.push(mesh);
        }
        const count = candidates.length;
        if (count === 0) {
            if (this.frustumCullingStatsEnabled) {
                this.cullingStats.tested = 0;
                this.cullingStats.visible = 0;
            }
            return;
        }
        let visibleIndices: Uint32Array<ArrayBuffer> | null = null;
        let visibleCount = count;
        const storeF32 = TransformStore.global().f32();
        const camWb = (camera.transform.worldMatrixPtr >>> 2);
        const camX = storeF32[camWb + 12];
        const camY = storeF32[camWb + 13];
        const camZ = storeF32[camWb + 14];
        if (this.frustumCullingEnabled) {
            this.ensureCullingCapacity(count);
            const centers = wasm.f32view(this.cullCentersPtr, count * 3);
            const radii = wasm.f32view(this.cullRadiiPtr, count);
            for (let i = 0; i < count; i++) {
                const mesh = candidates[i];
                const geom = mesh.geometry;
                const lc = geom.boundsCenter;
                const lr = geom.boundsRadius;
                const wb = (mesh.transform.worldMatrixPtr >>> 2);
                const w0 = storeF32[wb + 0];
                const w1 = storeF32[wb + 1];
                const w2 = storeF32[wb + 2];
                const w4 = storeF32[wb + 4];
                const w5 = storeF32[wb + 5];
                const w6 = storeF32[wb + 6];
                const w8 = storeF32[wb + 8];
                const w9 = storeF32[wb + 9];
                const w10 = storeF32[wb + 10];
                const w12 = storeF32[wb + 12];
                const w13 = storeF32[wb + 13];
                const w14 = storeF32[wb + 14];
                const cx = w0 * lc[0] + w4 * lc[1] + w8 * lc[2] + w12;
                const cy = w1 * lc[0] + w5 * lc[1] + w9 * lc[2] + w13;
                const cz = w2 * lc[0] + w6 * lc[1] + w10 * lc[2] + w14;
                const base = i * 3;
                centers[base + 0] = cx;
                centers[base + 1] = cy;
                centers[base + 2] = cz;
                const sx = Math.hypot(w0, w1, w2);
                const sy = Math.hypot(w4, w5, w6);
                const sz = Math.hypot(w8, w9, w10);
                const smax = Math.max(sx, sy, sz);
                radii[i] = lr * smax;
            }
            const frustumPtr = frameArena.allocF32(24) as WasmPtr;
            frustumf.writePlanesFromViewProjection(frustumPtr, camera.viewProjectionMatrix);
            const outPtr = frameArena.alloc(count * 4, 4) as WasmPtr;
            visibleCount = cullf.spheresFrustum(outPtr, this.cullCentersPtr, this.cullRadiiPtr, count, frustumPtr);
            visibleIndices = wasm.u32view(outPtr, visibleCount);
        }
        if (this.frustumCullingStatsEnabled) {
            this.cullingStats.tested = count;
            this.cullingStats.visible = visibleCount;
        }
        if (!this.frustumCullingEnabled) {
            for (let i = 0; i < count; i++) {
                const mesh = candidates[i];
                const geometry = mesh.geometry;
                const material = mesh.material;
                const skinned = mesh.skin !== null && geometry.joints !== null && geometry.weights !== null && this.materialSupportsSkinning(material);
                const pipeline = this.getOrCreatePipeline(material, false, skinned);
                const item = this.acquireDrawItem();
                item.mesh = mesh;
                item.geometry = geometry;
                item.material = material;
                item.pipeline = pipeline;
                item.pipelineId = this.getObjectId(pipeline);
                item.materialId = this.getObjectId(material);
                item.geometryId = this.getObjectId(geometry);
                item.skinned = skinned;
                item.sortKey = 0;
                if (material.blendMode === BlendMode.Opaque) {
                    this.opaqueDrawList.push(item);
                } else {
                    const wb = (mesh.transform.worldMatrixPtr >>> 2);
                    const dx = storeF32[wb + 12] - camX;
                    const dy = storeF32[wb + 13] - camY;
                    const dz = storeF32[wb + 14] - camZ;
                    item.sortKey = dx * dx + dy * dy + dz * dz;
                    this.transparentDrawList.push(item);
                }
            }
        } else {
            const vis = visibleIndices!;
            for (let k = 0; k < visibleCount; k++) {
                const i = vis[k];
                const mesh = candidates[i];
                const geometry = mesh.geometry;
                const material = mesh.material;
                const skinned = mesh.skin !== null && geometry.joints !== null && geometry.weights !== null && this.materialSupportsSkinning(material);
                const pipeline = this.getOrCreatePipeline(material, false, skinned);
                const item = this.acquireDrawItem();
                item.mesh = mesh;
                item.geometry = geometry;
                item.material = material;
                item.pipeline = pipeline;
                item.pipelineId = this.getObjectId(pipeline);
                item.materialId = this.getObjectId(material);
                item.geometryId = this.getObjectId(geometry);
                item.skinned = skinned;
                item.sortKey = 0;
                if (material.blendMode === BlendMode.Opaque) {
                    this.opaqueDrawList.push(item);
                } else {
                    const wb = (mesh.transform.worldMatrixPtr >>> 2);
                    const dx = storeF32[wb + 12] - camX;
                    const dy = storeF32[wb + 13] - camY;
                    const dz = storeF32[wb + 14] - camZ;
                    item.sortKey = dx * dx + dy * dy + dz * dz;
                    this.transparentDrawList.push(item);
                }
            }
        }
        this.opaqueDrawList.sort((a, b) => (a.pipelineId - b.pipelineId) || (a.materialId - b.materialId) || (a.geometryId - b.geometryId));
        this.transparentDrawList.sort((a, b) => (b.sortKey - a.sortKey) || (a.pipelineId - b.pipelineId) || (a.materialId - b.materialId) || (a.geometryId - b.geometryId));
    }

    private executeDrawList(pass: GPURenderPassEncoder, items: DrawItem[]): void {
        let lastPipeline: GPURenderPipeline | null = null;
        let lastMaterial: Material | null = null;
        let lastGeometry: Geometry | null = null;
        for (let i = 0; i < items.length; ) {
            const first = items[i];
            const pipeline = first.pipeline;
            const material = first.material;
            const geometry = first.geometry;
            let j = i + 1;
            while (j < items.length) {
                const it = items[j];
                if (it.pipeline !== pipeline) break;
                if (it.material !== material) break;
                if (it.geometry !== geometry) break;
                j++;
            }
            const runCount = j - i;
            if (geometry !== lastGeometry) geometry.upload(this.device);
            if (material !== lastMaterial) this.ensureMaterialBindGroup(material);
            if (pipeline !== lastPipeline) {
                pass.setPipeline(pipeline);
                lastPipeline = pipeline;
            }
            if (material !== lastMaterial) {
                pass.setBindGroup(1, material.bindGroup!);
                lastMaterial = material;
            }
            if (geometry !== lastGeometry) {
                pass.setVertexBuffer(0, geometry.positionBuffer);
                pass.setVertexBuffer(1, geometry.normalBuffer);
                pass.setVertexBuffer(2, geometry.uvBuffer);
                if (first.skinned) {
                    pass.setVertexBuffer(3, geometry.jointsBuffer!);
                    pass.setVertexBuffer(4, geometry.weightsBuffer!);
                }
                if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
                lastGeometry = geometry;
            }
            const canInstance = runCount > 1 && !first.skinned && this.materialSupportsInstancing(material) && items === this.opaqueDrawList;
            if (canInstance) {
                const instancedPipeline = this.getOrCreatePipeline(material, true);
                if (instancedPipeline !== lastPipeline) {
                    pass.setPipeline(instancedPipeline);
                    lastPipeline = instancedPipeline;
                }
                this.drawInstancedRun(pass, geometry, material, items, i, runCount);
            } else {
                for (let k = i; k < j; k++) {
                    if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
                    const modelSlot = this.modelBufferIndex++;
                    const modelBuffer = this.modelUniformBuffers[modelSlot];
                    const globalBindGroup = this.globalBindGroups[modelSlot];
                    const mesh = items[k].mesh;
                    const skin = first.skinned ? mesh.skin : null;
                    if (skin) {
                        skin.ensureGpuResources(this.device, this.skinBindGroupLayout);
                        const jointCount = skin.jointCount | 0;
                        const jointMatPtr = frameArena.allocF32(jointCount * 16) as WasmPtr;
                        animf.computeJointMatricesTo(jointMatPtr, skin.skin.jointIndicesPtr, jointCount, skin.skin.invBindPtr, TransformStore.global().worldPtr as WasmPtr, skin.meshTransform.worldMatrixPtr as WasmPtr);
                        this.queue.writeBuffer(skin.boneBuffer!, 0, wasm.memory().buffer as ArrayBuffer, jointMatPtr, jointCount * 64);
                        pass.setBindGroup(2, skin.bindGroup!);
                    }
                    const modelPtr = mesh.transform.worldMatrixPtr as WasmPtr;
                    const invPtr = this.modelUniformStagingPtr;
                    const normalPtr = (this.modelUniformStagingPtr + 16 * 4) as WasmPtr;
                    mat4f.invert(invPtr, modelPtr);
                    mat4f.transpose(normalPtr, invPtr);
                    const mem = wasm.memory().buffer as ArrayBuffer;
                    this.queue.writeBuffer(modelBuffer, 0, mem, modelPtr, 16 * 4);
                    this.queue.writeBuffer(modelBuffer, 16 * 4, mem, normalPtr, 16 * 4);
                    pass.setBindGroup(0, globalBindGroup);
                    if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount);
                    else pass.draw(geometry.vertexCount);
                }
            }
            i = j;
        }
    }

    private drawInstancedRun(pass: GPURenderPassEncoder, geometry: Geometry, material: Material, items: DrawItem[], start: number, count: number): void {
        const ptrsPtr = frameArena.alloc(count * 4, 4) as WasmPtr;
        const ptrs = wasm.u32view(ptrsPtr, count);
        for (let i = 0; i < count; i++) ptrs[i] = items[start + i].mesh.transform.worldMatrixPtr >>> 0;
        const outPtr = frameArena.allocF32(count * 32) as WasmPtr;
        transformf.packModelNormalMat4FromPtrs(outPtr, ptrsPtr, count);
        const outBytes = count * this.INSTANCE_STRIDE_BYTES;
        const dstOffset = this.instanceBufferOffset;
        const dstEnd = dstOffset + outBytes;
        this.ensureInstanceBuffer(dstEnd);
        const mem = wasm.memory().buffer as ArrayBuffer;
        this.queue.writeBuffer(this.instanceBuffer!, dstOffset, mem, outPtr, outBytes);
        pass.setBindGroup(0, this.globalBindGroups[0]);
        pass.setVertexBuffer(3, this.instanceBuffer!, dstOffset, outBytes);
        if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, count);
        else pass.draw(geometry.vertexCount, count);
        this.instanceBufferOffset = dstEnd;
    }

    private getOrCreatePipeline(material: Material, instanced: boolean = false, skinned: boolean = false): GPURenderPipeline {
        if (instanced && skinned) throw new Error("Renderer: instanced + skinned pipelines are not supported (attribute layout conflict).");
        const key = this.getPipelineCacheKey(material, instanced, skinned);
        let pipeline = this.pipelineCache.get(key);
        if (pipeline) return pipeline;
        const shaderCode = material.getShaderCode({ instanced, skinned });
        let shaderModule = this.shaderCache.get(shaderCode);
        if (!shaderModule) {
            shaderModule = this.device.createShaderModule({ code: shaderCode });
            this.shaderCache.set(shaderCode, shaderModule);
        }
        const materialBindGroupLayout = material.createBindGroupLayout(this.device);
        const bindGroupLayouts: GPUBindGroupLayout[] = [this.globalBindGroupLayout, materialBindGroupLayout];
        if (skinned) bindGroupLayouts.push(this.skinBindGroupLayout);
        const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts });
        let buffers: GPUVertexBufferLayout[];
        if (instanced) {
            buffers = [
                { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
                { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
                {
                    arrayStride: this.INSTANCE_STRIDE_BYTES,
                    stepMode: "instance",
                    attributes: [
                        { shaderLocation: 3, offset: 0, format: "float32x4" },
                        { shaderLocation: 4, offset: 16, format: "float32x4" },
                        { shaderLocation: 5, offset: 32, format: "float32x4" },
                        { shaderLocation: 6, offset: 48, format: "float32x4" },
                        { shaderLocation: 7, offset: 64, format: "float32x4" },
                        { shaderLocation: 8, offset: 80, format: "float32x4" },
                        { shaderLocation: 9, offset: 96, format: "float32x4" },
                        { shaderLocation: 10, offset: 112, format: "float32x4" }
                    ]
                }
            ];
        } else if (skinned) {
            buffers = [
                { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
                { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
                { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: "uint16x4" }] },
                { arrayStride: 16, attributes: [{ shaderLocation: 4, offset: 0, format: "float32x4" }] }
            ];
        } else {
            buffers = [
                { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
                { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] }
            ];
        }
        pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: "vs_main",
                buffers
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fs_main",
                targets: [
                    {
                        format: this.format,
                        blend: this.getBlendState(material.blendMode)
                    }
                ]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: this.getCullMode(material.cullMode),
                frontFace: "ccw"
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: material.depthWrite,
                depthCompare: material.depthTest ? "less" : "always"
            }
        });
        this.pipelineCache.set(key, pipeline);
        return pipeline;
    }

    private getPipelineCacheKey(material: Material, instanced: boolean, skinned: boolean): string {
        const ctorId = this.getObjectId(material.constructor as unknown as object);
        const isBuiltin = material.constructor === UnlitMaterial || material.constructor === StandardMaterial;
        const matKey = isBuiltin ? `${ctorId}` : `${ctorId}_${this.getObjectId(material)}`;
        return `${matKey}_${material.blendMode}_${material.cullMode}_${material.depthWrite}_${material.depthTest}_${instanced ? "inst" : "mesh"}_${skinned ? "skinned" : "noskin"}`;
    }

    private getBlendState(mode: BlendMode): GPUBlendState | undefined {
        switch (mode) {
            case BlendMode.Opaque:
                return undefined;
            case BlendMode.Transparent:
                return {
                    color: {
                        srcFactor: "src-alpha",
                        dstFactor: "one-minus-src-alpha",
                        operation: "add"
                    },
                    alpha: {
                        srcFactor: "one",
                        dstFactor: "one-minus-src-alpha",
                        operation: "add"
                    }
                };
            case BlendMode.Additive:
                return {
                    color: {
                        srcFactor: "src-alpha",
                        dstFactor: "one",
                        operation: "add"
                    },
                    alpha: {
                        srcFactor: "one",
                        dstFactor: "one",
                        operation: "add"
                    }
                };
        }
    }

    private getCullMode(mode: CullMode): GPUCullMode {
        switch (mode) {
            case CullMode.None: return "none";
            case CullMode.Back: return "back";
            case CullMode.Front: return "front";
        }
    }

    private getMaterialBindGroupKey(material: Material): string {
        if (material instanceof UnlitMaterial) {
            const t = material.baseColorTexture;
            return `unlit:${t?.id ?? 0}:${t?.revision ?? 0}`;
        }
        if (material instanceof StandardMaterial) {
            const bc = material.baseColorTexture;
            const mr = material.metallicRoughnessTexture;
            const n = material.normalTexture;
            const o = material.occlusionTexture;
            const e = material.emissiveTexture;
            return `standard:${bc?.id ?? 0}:${bc?.revision ?? 0}:${mr?.id ?? 0}:${mr?.revision ?? 0}:${n?.id ?? 0}:${n?.revision ?? 0}:${o?.id ?? 0}:${o?.revision ?? 0}:${e?.id ?? 0}:${e?.revision ?? 0}`;
        }
        return "custom";
    }

    private ensureMaterialBindGroup(material: Material): void {
        if (!material.uniformBuffer) {
            material.uniformBuffer = this.device.createBuffer({
                size: material.getUniformBufferSize(),
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
        }
        if (material.dirty) {
            const data = material.getUniformData();
            this.queue.writeBuffer(material.uniformBuffer!, 0, data.buffer, data.byteOffset, data.byteLength);
            material.markClean();
        }
        const key = this.getMaterialBindGroupKey(material);
        if (material.bindGroup && material.bindGroupKey === key) return;
        const layout = material.createBindGroupLayout(this.device);
        if (material instanceof UnlitMaterial) {
            const tex = material.baseColorTexture;
            const sampler = tex ? tex.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler;
            const view = tex ? tex.getView(this.device, this.queue, "srgb", this.fallbackWhiteViewSrgb) : this.fallbackWhiteViewSrgb;
            material.bindGroup = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: material.uniformBuffer } },
                    { binding: 1, resource: sampler },
                    { binding: 2, resource: view }
                ]
            });
            material.bindGroupKey = key;
            return;
        }
        if (material instanceof StandardMaterial) {
            const bc = material.baseColorTexture;
            const mr = material.metallicRoughnessTexture;
            const n = material.normalTexture;
            const o = material.occlusionTexture;
            const e = material.emissiveTexture;
            const bcSampler = bc ? bc.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler;
            const bcView = bc ? bc.getView(this.device, this.queue, "srgb", this.fallbackWhiteViewSrgb) : this.fallbackWhiteViewSrgb;
            const mrSampler = mr ? mr.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler;
            const mrView = mr ? mr.getView(this.device, this.queue, "linear", this.fallbackMRViewLinear) : this.fallbackMRViewLinear;
            const nSampler = n ? n.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler;
            const nView = n ? n.getView(this.device, this.queue, "linear", this.fallbackNormalViewLinear) : this.fallbackNormalViewLinear;
            const oSampler = o ? o.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler;
            const oView = o ? o.getView(this.device, this.queue, "linear", this.fallbackOcclusionViewLinear) : this.fallbackOcclusionViewLinear;
            const eSampler = e ? e.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler;
            const eView = e ? e.getView(this.device, this.queue, "srgb", this.fallbackWhiteViewSrgb) : this.fallbackWhiteViewSrgb;
            material.bindGroup = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: material.uniformBuffer } },
                    { binding: 1, resource: bcSampler },
                    { binding: 2, resource: bcView },
                    { binding: 3, resource: mrSampler },
                    { binding: 4, resource: mrView },
                    { binding: 5, resource: nSampler },
                    { binding: 6, resource: nView },
                    { binding: 7, resource: oSampler },
                    { binding: 8, resource: oView },
                    { binding: 9, resource: eSampler },
                    { binding: 10, resource: eView }
                ]
            });
            material.bindGroupKey = key;
            return;
        }
        material.bindGroup = this.device.createBindGroup({
            layout,
            entries: [{ binding: 0, resource: { buffer: material.uniformBuffer } }]
        });
        material.bindGroupKey = key;
    }

    private materialSupportsInstancing(material: Material): boolean {
        return material instanceof UnlitMaterial || material instanceof StandardMaterial;
    }

    private materialSupportsSkinning(material: Material): boolean {
        return material instanceof UnlitMaterial || material instanceof StandardMaterial;
    }

    private ensureInstanceBuffer(byteLength: number): void {
        if (this.instanceBuffer && this.instanceBufferCapacityBytes >= byteLength) return;
        this.instanceBuffer?.destroy();
        let cap = this.instanceBufferCapacityBytes || (this.INSTANCE_STRIDE_BYTES * 256);
        while (cap < byteLength) cap *= 2;
        this.instanceBufferCapacityBytes = cap;
        this.instanceBuffer = this.device.createBuffer({
            size: cap,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
    }
}
