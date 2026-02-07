import { Transform } from "./transform";
import { Scene } from "../world/scene";
import { Light, DirectionalLight, PointLight } from "../world/light";
import { Camera } from "../world/camera";
import { Mesh } from "../world/mesh";
import { Geometry } from "../graphics/geometry";
import { Material, BlendMode, CullMode } from "../graphics/material";
import { mat4f, wasm, WasmPtr } from "../math";
import { createBuffer, createDepthTexture } from "../utils";

export type RendererDescriptor = {
    antialias?: boolean;
    powerPreference?: "high-performance" | "low-power";
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
    private cameraUniformBuffer!: GPUBuffer;
    private modelUniformBuffers: GPUBuffer[] = [];
    private modelBufferIndex: number = 0;
    private readonly MODEL_BUFFER_POOL_SIZE = 64;
    private lightingUniformBuffer!: GPUBuffer;
    private pipelineCache: Map<string, GPURenderPipeline> = new Map();
    private shaderCache: Map<string, GPUShaderModule> = new Map();
    private cameraUniformStagingPtr!: WasmPtr;
    private lightingUniformStagingPtr!: WasmPtr;
    private modelUniformStagingPtr!: WasmPtr;
    private cameraUniformStagingView!: Float32Array<ArrayBuffer>;
    private lightingUniformStagingView!: Float32Array<ArrayBuffer>;
    private modelUniformStagingView!: Float32Array<ArrayBuffer>;
    private _wasmBuffer: ArrayBuffer | null = null;

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

    render(scene: Scene, camera: Camera): void {
        this.resize();
        this.modelBufferIndex = 0;
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
        for (const mesh of scene.visibleMeshes) {
            this.renderMesh(pass, mesh, camera);
        }
        pass.end();
        this.queue.submit([encoder.finish()]);
    }

    destroy(): void {
        this.depthTexture?.destroy();
        this.cameraUniformBuffer?.destroy();
        for (const buffer of this.modelUniformBuffers) buffer.destroy();
        this.modelUniformBuffers = [];
        this.lightingUniformBuffer?.destroy();
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
        this.cameraUniformStagingPtr = wasm.allocF32(20);
        this.lightingUniformStagingPtr = wasm.allocF32(104);
        this.modelUniformStagingPtr = wasm.allocF32(32);
        if (!this.cameraUniformStagingPtr || !this.lightingUniformStagingPtr || !this.modelUniformStagingPtr) throw new Error("Failed to allocate WASM staging buffers.");
        this._wasmBuffer = null;
        this.refreshWasmStagingViews();
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

    private renderMesh(pass: GPURenderPassEncoder, mesh: Mesh, camera: Camera): void {
        const { geometry, material } = mesh;
        geometry.upload(this.device);
        const pipeline = this.getOrCreatePipeline(material);
        this.ensureMaterialBindGroup(material);
        if (this.modelBufferIndex >= this.MODEL_BUFFER_POOL_SIZE) {
            console.warn("Model buffer pool exhausted! Increase MODEL_BUFFER_POOL_SIZE.");
            return;
        }
        const modelBuffer = this.modelUniformBuffers[this.modelBufferIndex++];
        const modelPtr = mesh.transform.worldMatrixPtr as WasmPtr;
        const invPtr = this.modelUniformStagingPtr;
        const normalPtr = (this.modelUniformStagingPtr + 16 * 4) as WasmPtr;
        mat4f.invert(invPtr, modelPtr);
        mat4f.transpose(normalPtr, invPtr);
        const mem = wasm.memory().buffer as ArrayBuffer;
        this.queue.writeBuffer(modelBuffer, 0, mem, modelPtr, 16 * 4);
        this.queue.writeBuffer(modelBuffer, 16 * 4, mem, normalPtr, 16 * 4);
        const globalBindGroup = this.device.createBindGroup({
            layout: this.globalBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
                { binding: 1, resource: { buffer: modelBuffer } },
                { binding: 2, resource: { buffer: this.lightingUniformBuffer } }
            ]
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, globalBindGroup);
        pass.setBindGroup(1, material.bindGroup!);
        pass.setVertexBuffer(0, geometry.positionBuffer);
        pass.setVertexBuffer(1, geometry.normalBuffer);
        pass.setVertexBuffer(2, geometry.uvBuffer);
        if (geometry.isIndexed) {
            pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
            pass.drawIndexed(geometry.indexCount);
        } else {
            pass.draw(geometry.vertexCount);
        }
    }

    private getOrCreatePipeline(material: Material): GPURenderPipeline {
        const key = this.getPipelineCacheKey(material);
        let pipeline = this.pipelineCache.get(key);
        if (pipeline) return pipeline;
        const shaderCode = material.getShaderCode();
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
                buffers: [
                    {
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }]
                    },
                    {
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }]
                    },
                    {
                        arrayStride: 8,
                        attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }]
                    }
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

    private getPipelineCacheKey(material: Material): string {
        return `${material.constructor.name}_${material.blendMode}_${material.cullMode}_${material.depthWrite}_${material.depthTest}`;
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
}
