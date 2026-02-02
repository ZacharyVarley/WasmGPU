import { WGSL } from "./shaders";
import { assert, createBuffer, createDepthTexture } from "./utils";
import { initMath, mat4 } from "./math";

type WasmGPUOptions = {
    antialias?: boolean;
};

export class WasmGPU {
    private canvas!: HTMLCanvasElement;
    private context!: GPUCanvasContext;
    private device!: GPUDevice;
    private queue!: GPUQueue;
    private format!: GPUTextureFormat;
    private depthTexture!: GPUTexture;
    private depthView!: GPUTextureView;
    private clearColor: GPUColor = { r: 0, g: 0, b: 0, a: 1 };
    private pipeline!: GPURenderPipeline;
    private vertexBuffer!: GPUBuffer;
    private indexBuffer!: GPUBuffer;
    private indexCount = 0;
    private uniformBuffer!: GPUBuffer;
    private bindGroup!: GPUBindGroup;
    private width = 0;
    private height = 0;

    static async create(canvas: HTMLCanvasElement, _opts: WasmGPUOptions = {}): Promise<WasmGPU> {
        const w = new WasmGPU();
        await w.init(canvas);
        return w;
    }

    async init(canvas: HTMLCanvasElement): Promise<void> {
        await initMath();
        this.canvas = canvas;
        assert("gpu" in navigator, "WebGPU not supported in this browser.");
        const adapter = await navigator.gpu.requestAdapter();
        assert(adapter, "Failed to get GPU adapter.");
        this.device = await adapter.requestDevice();
        this.queue = this.device.queue;
        this.context = canvas.getContext("webgpu") as GPUCanvasContext;
        assert(this.context, "Failed to get webgpu canvas context.");
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.configureContext();
        this.createDepthResources();
        this.createCubePipelineAndBuffers();
    }

    setClearColor(r: number, g: number, b: number, a = 1): void {
        this.clearColor = { r: r / 255, g: g / 255, b: b / 255, a };
    }

    resizeToCanvas(): void {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
        const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
        if (w === this.width && h === this.height) return;
        this.width = w;
        this.height = h;
        this.canvas.width = w;
        this.canvas.height = h;
        this.configureContext();
        this.createDepthResources();
    }

    renderFrame(timeSeconds: number): void {
        this.resizeToCanvas();
        const aspect = this.width / this.height;
        const proj = mat4.perspective((60 * Math.PI) / 180, aspect, 0.1, 100.0);
        const view = mat4.lookAt([0, 0, 4], [0, 0, 0], [0, 1, 0]);
        let model = mat4.identity();
        model = mat4.rotateY(model, timeSeconds);
        const mv = mat4.mul(view, model);
        const mvp = mat4.mul(proj, mv);
        const mvpF32 = new Float32Array(mvp);
        this.queue.writeBuffer(this.uniformBuffer, 0, mvpF32.buffer, mvpF32.byteOffset, mvpF32.byteLength);
        const colorView = this.context.getCurrentTexture().createView();
        const encoder = this.device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: colorView,
                    clearValue: this.clearColor,
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

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setIndexBuffer(this.indexBuffer, "uint16");
        pass.drawIndexed(this.indexCount);
        pass.end();
        this.queue.submit([encoder.finish()]);
    }

    private configureContext(): void {
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque"
        });
    }

    private createDepthResources(): void {
        if (this.depthTexture) this.depthTexture.destroy();
        this.depthTexture = createDepthTexture(this.device, this.width || this.canvas.width, this.height || this.canvas.height);
        this.depthView = this.depthTexture.createView();
    }

    private createCubePipelineAndBuffers(): void {
        const shader = this.device.createShaderModule({
            code: WGSL.cube.code()
        });
        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" }
                }
            ]
        });
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });
        this.pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shader,
                entryPoint: "vsMain",
                buffers: [
                    {
                        arrayStride: 6 * 4,
                        attributes: [
                            { shaderLocation: 0, offset: 0, format: "float32x3" },
                            { shaderLocation: 1, offset: 3 * 4, format: "float32x3" }
                        ]
                    }
                ]
            },
            fragment: {
                module: shader,
                entryPoint: "fsMain",
                targets: [{ format: this.format }]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "back",
                frontFace: "ccw"
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });
        const verts = new Float32Array([
            -1, -1,  1,   1, 0, 0,
             1, -1,  1,   0, 1, 0,
             1,  1,  1,   0, 0, 1,
            -1,  1,  1,   1, 1, 0,
            -1, -1, -1,   1, 0, 1,
             1, -1, -1,   0, 1, 1,
             1,  1, -1,   1, 1, 1,
            -1,  1, -1,   0, 0, 0
        ]);
        const indices = new Uint16Array([
            0, 1, 2,  0, 2, 3,
            1, 5, 6,  1, 6, 2,
            5, 4, 7,  5, 7, 6,
            4, 0, 3,  4, 3, 7,
            3, 2, 6,  3, 6, 7,
            4, 5, 1,  4, 1, 0
        ]);
        this.vertexBuffer = createBuffer(this.device, verts, GPUBufferUsage.VERTEX);
        this.indexBuffer = createBuffer(this.device, indices, GPUBufferUsage.INDEX);
        this.indexCount = indices.length;
        this.uniformBuffer = this.device.createBuffer({
            size: 16 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.uniformBuffer }
                }
            ]
        });
    }
}
