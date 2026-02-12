import { Transform } from "./transform";
import { Scene } from "../world/scene";
import { Light, DirectionalLight, PointLight } from "../world/light";
import { Camera } from "../world/camera";
import { Mesh } from "../world/mesh";
import { Geometry } from "../graphics/geometry";
import { Material, BlendMode, CullMode, UnlitMaterial, StandardMaterial } from "../graphics/material";
import { cullf, frameArena, frustumf, mat4f, transformf, wasm, WasmPtr } from "../wasm";
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
    private globalBindGroupLayout!: GPUBindGroupLayout;
    private globalBindGroups: GPUBindGroup[] = [];
    private cameraUniformBuffer!: GPUBuffer;
    private modelUniformBuffers: GPUBuffer[] = [];
    private modelBufferIndex: number = 0;
    private readonly MODEL_BUFFER_POOL_SIZE = 64;
    private lightingUniformBuffer!: GPUBuffer;
    private instanceBuffer: GPUBuffer | null = null;
    private instanceBufferCapacityBytes: number = 0;
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
    private modelUniformStagingView!: Float32Array<ArrayBuffer>;
    private _wasmBuffer: ArrayBuffer | null = null;
    private frustumCullingEnabled: boolean = true;
    private frustumCullingStatsEnabled: boolean = false;
    readonly cullingStats: { tested: number; visible: number } = { tested: 0, visible: 0 };
    private cullCentersPtr: WasmPtr = 0;
    private cullRadiiPtr: WasmPtr = 0;
    private cullCapacity: number = 0;
    private cullMeshScratch: Mesh[] = [];

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
        this.createGlobalBindGroupLayout();
        this.createUniformBuffers();
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
                geometryId: 0
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
        this.cameraUniformStagingPtr = frameArena.allocF32(20);
        this.lightingUniformStagingPtr = frameArena.allocF32(104);
        this.modelUniformStagingPtr = frameArena.allocF32(32);
        this._wasmBuffer = null;
        if ("aspect" in camera) (camera as { aspect: number }).aspect = this.aspectRatio;
        const colorTexture = this.context.getCurrentTexture();
        const colorView = colorTexture.createView();
        Transform.updateAll();
        this.writeCameraUniforms(camera);
        this.writeLightingUniforms(scene);
        const encoder = this.device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: colorView,
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
        this.queue.submit([encoder.finish()]);
    }

    destroy(): void {
        this.depthTexture?.destroy();
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

    private writeCameraUniforms(camera: Camera): void {
        const viewProj = camera.viewProjectionMatrix;
        const pos = camera.position;
        this.refreshWasmStagingViews();
        const data = this.cameraUniformStagingView;
        data.set(viewProj, 0);
        data.set(pos, 16);
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
        const countView = new Uint32Array(data.buffer, data.byteOffset + 16, 1);
        countView[0] = lights.length;
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
        if (this.frustumCullingEnabled) {
            this.ensureCullingCapacity(count);
            const centers = wasm.f32view(this.cullCentersPtr, count * 3);
            const radii = wasm.f32view(this.cullRadiiPtr, count);
            for (let i = 0; i < count; i++) {
                const mesh = candidates[i];
                const geom = mesh.geometry;
                const lc = geom.boundsCenter;
                const lr = geom.boundsRadius;
                const w = wasm.f32view(mesh.transform.worldMatrixPtr as WasmPtr, 16);
                const cx = w[0] * lc[0] + w[4] * lc[1] + w[8] * lc[2] + w[12];
                const cy = w[1] * lc[0] + w[5] * lc[1] + w[9] * lc[2] + w[13];
                const cz = w[2] * lc[0] + w[6] * lc[1] + w[10] * lc[2] + w[14];
                const base = i * 3;
                centers[base + 0] = cx;
                centers[base + 1] = cy;
                centers[base + 2] = cz;
                const sx = Math.hypot(w[0], w[1], w[2]);
                const sy = Math.hypot(w[4], w[5], w[6]);
                const sz = Math.hypot(w[8], w[9], w[10]);
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
                const pipeline = this.getOrCreatePipeline(material);
                const item = this.acquireDrawItem();
                item.mesh = mesh;
                item.geometry = geometry;
                item.material = material;
                item.pipeline = pipeline;
                item.pipelineId = this.getObjectId(pipeline);
                item.materialId = this.getObjectId(material);
                item.geometryId = this.getObjectId(geometry);
                if (material.blendMode === BlendMode.Opaque) this.opaqueDrawList.push(item);
                else this.transparentDrawList.push(item);
            }
        } else {
            const vis = visibleIndices!;
            for (let k = 0; k < visibleCount; k++) {
                const i = vis[k];
                const mesh = candidates[i];
                const geometry = mesh.geometry;
                const material = mesh.material;
                const pipeline = this.getOrCreatePipeline(material);
                const item = this.acquireDrawItem();
                item.mesh = mesh;
                item.geometry = geometry;
                item.material = material;
                item.pipeline = pipeline;
                item.pipelineId = this.getObjectId(pipeline);
                item.materialId = this.getObjectId(material);
                item.geometryId = this.getObjectId(geometry);
                if (material.blendMode === BlendMode.Opaque) this.opaqueDrawList.push(item);
                else this.transparentDrawList.push(item);
            }
        }
        this.opaqueDrawList.sort((a, b) => (a.pipelineId - b.pipelineId) || (a.materialId - b.materialId) || (a.geometryId - b.geometryId));
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
                if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
                lastGeometry = geometry;
            }
            const canInstance = runCount > 1 && this.materialSupportsInstancing(material) && items === this.opaqueDrawList;
            if (canInstance) {
                const instancedPipeline = this.getOrCreatePipeline(material, true);
                if (instancedPipeline !== lastPipeline) {
                    pass.setPipeline(instancedPipeline);
                    lastPipeline = instancedPipeline;
                }
                this.drawInstancedRun(pass, geometry, material, items, i, runCount);
            } else {
                for (let k = i; k < j; k++) {
                    if (this.modelBufferIndex >= this.MODEL_BUFFER_POOL_SIZE) {
                        console.warn("Model buffer pool exhausted! Increase MODEL_BUFFER_POOL_SIZE.");
                        return;
                    }
                    const modelSlot = this.modelBufferIndex++;
                    const modelBuffer = this.modelUniformBuffers[modelSlot];
                    const globalBindGroup = this.globalBindGroups[modelSlot];
                    const mesh = items[k].mesh;
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
        const ptrsPtr = frameArena.allocF32(count) as WasmPtr;
        const ptrs = wasm.u32view(ptrsPtr, count);
        for (let i = 0; i < count; i++) ptrs[i] = items[start + i].mesh.transform.worldMatrixPtr >>> 0;
        const outPtr = frameArena.allocF32(count * 32) as WasmPtr;
        transformf.packModelNormalMat4FromPtrs(outPtr, ptrsPtr, count);
        const outBytes = count * this.INSTANCE_STRIDE_BYTES;
        this.ensureInstanceBuffer(outBytes);
        const mem = wasm.memory().buffer as ArrayBuffer;
        this.queue.writeBuffer(this.instanceBuffer!, 0, mem, outPtr, outBytes);
        pass.setBindGroup(0, this.globalBindGroups[0]);
        pass.setVertexBuffer(3, this.instanceBuffer!);
        if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, count);
        else pass.draw(geometry.vertexCount, count);
    }

    private getOrCreatePipeline(material: Material, instanced: boolean = false): GPURenderPipeline {
        const key = this.getPipelineCacheKey(material, instanced);
        let pipeline = this.pipelineCache.get(key);
        if (pipeline) return pipeline;
        const shaderCode = material.getShaderCode(instanced);
        let shaderModule = this.shaderCache.get(shaderCode);
        if (!shaderModule) {
            shaderModule = this.device.createShaderModule({ code: shaderCode });
            this.shaderCache.set(shaderCode, shaderModule);
        }
        const materialBindGroupLayout = material.createBindGroupLayout(this.device);
        const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.globalBindGroupLayout, materialBindGroupLayout] });
        pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: "vs_main",
                buffers: instanced
                ? [
                    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                    { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
                    { arrayStride: 8,  attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
                    {
                        arrayStride: this.INSTANCE_STRIDE_BYTES,
                        stepMode: "instance",
                        attributes: [
                            { shaderLocation: 3,  offset: 0,   format: "float32x4" },
                            { shaderLocation: 4,  offset: 16,  format: "float32x4" },
                            { shaderLocation: 5,  offset: 32,  format: "float32x4" },
                            { shaderLocation: 6,  offset: 48,  format: "float32x4" },
                            { shaderLocation: 7,  offset: 64,  format: "float32x4" },
                            { shaderLocation: 8,  offset: 80,  format: "float32x4" },
                            { shaderLocation: 9,  offset: 96,  format: "float32x4" },
                            { shaderLocation: 10, offset: 112, format: "float32x4" }
                        ]
                    }
                ]
                : [
                    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                    { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
                    { arrayStride: 8,  attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] }
                ]
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

    private getPipelineCacheKey(material: Material, instanced: boolean): string {
        return `${material.constructor.name}_${material.blendMode}_${material.cullMode}_${material.depthWrite}_${material.depthTest}_${instanced ? "inst" : "mesh"}`;
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

    private ensureMaterialBindGroup(material: Material): void {
        if (!material.uniformBuffer) {
            material.uniformBuffer = this.device.createBuffer({ size: material.getUniformBufferSize(), usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        }
        if (material.dirty) {
            const data = material.getUniformData();
            this.queue.writeBuffer(material.uniformBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
            material.markClean();
        }
        if (!material.bindGroup) {
            const layout = material.createBindGroupLayout(this.device);
            material.bindGroup = this.device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: material.uniformBuffer } }] });
        }
    }

    private materialSupportsInstancing(material: Material): boolean {
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
