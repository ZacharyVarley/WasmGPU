/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Transform, TransformStore } from "./transform";
import { Scene } from "../world/scene";
import { DirectionalLight, PointLight } from "../world/light";
import { Camera } from "../world/camera";
import { Mesh } from "../world/mesh";
import { PointCloud } from "../world/pointcloud";
import { GlyphField } from "../world/glyphfield";
import type { PickLassoPoint, PickQuery, PickRegionQuery } from "../world/picking";
import { Geometry } from "../graphics/geometry";
import { Material, BlendMode, CullMode, UnlitMaterial, StandardMaterial, DataMaterial } from "../graphics/material";
import { animf, cullf, frameArena, mat4, mat4f, transformf, wasm, wasmInterop, WasmPtr } from "../wasm";
import smaaWGSL from "../wgsl/core/smaa.wgsl";
import pointCloudWGSL from "../wgsl/world/pointcloud.wgsl";
import glyphFieldWGSL from "../wgsl/world/glyphfield.wgsl";
import pickMeshWGSL from "../wgsl/core/picking-mesh.wgsl";
import pickMeshSkinnedWGSL from "../wgsl/core/picking-mesh-skinned.wgsl";
import pickMeshSkinned8WGSL from "../wgsl/core/picking-mesh-skinned8.wgsl";
import pickPointCloudWGSL from "../wgsl/world/picking-pointcloud.wgsl";
import pickGlyphFieldWGSL from "../wgsl/world/picking-glyphfield.wgsl";
import { createDepthTexture } from "../utils";

export type RendererDescriptor = {
    antialias?: boolean;
    powerPreference?: "high-performance" | "low-power";
    canvasFormat?: GPUTextureFormat;
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
    skinned8: boolean;
    sortKey: number;
};

type PointCloudDrawItem = {
    cloud: PointCloud;
    pipeline: GPURenderPipeline;
    pipelineId: number;
    cloudId: number;
    sortKey: number;
};

type GlyphDrawItem = {
    field: GlyphField;
    geometry: Geometry;
    pipeline: GPURenderPipeline;
    pipelineId: number;
    geometryId: number;
    fieldId: number;
    sortKey: number;
};

type TransparentDrawItem = DrawItem | PointCloudDrawItem | GlyphDrawItem;

export type RendererPickHit =
    {
        kind: "mesh";
        object: Mesh;
        objectId: number;
        elementIndex: number;
        worldPosition: [number, number, number];
    } |
    {
        kind: "pointcloud";
        object: PointCloud;
        objectId: number;
        elementIndex: number;
        worldPosition: [number, number, number];
    } |
    {
        kind: "glyphfield";
        object: GlyphField;
        objectId: number;
        elementIndex: number;
        worldPosition: [number, number, number];
    };

export type RendererPickRegionMode = "rect" | "lasso";

export type RendererPickRegionBounds = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type RendererPickRegionResult = {
    mode: RendererPickRegionMode;
    hits: RendererPickHit[];
    truncated: boolean;
    bounds: RendererPickRegionBounds;
    sampledPixels: number;
};

type ResolvedPickRegionQuery = {
    mode: RendererPickRegionMode;
    bounds: RendererPickRegionBounds;
    x: number;
    y: number;
    width: number;
    height: number;
    maxHits: number;
    lasso: Array<{ x: number; y: number }> | null;
};

type DecodedPickSample = {
    objectId: number;
    elementIndex: number;
    depth: number;
    px: number;
    py: number;
};

export class Renderer {
    readonly canvas: HTMLCanvasElement;
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
    private pointCloudBindGroupLayout: GPUBindGroupLayout | null = null;
    private pointCloudDrawItemPool: PointCloudDrawItem[] = [];
    private pointCloudDrawItemPoolUsed: number = 0;
    private opaquePointCloudDrawList: PointCloudDrawItem[] = [];
    private transparentPointCloudDrawList: PointCloudDrawItem[] = [];
    private glyphFieldBindGroupLayout: GPUBindGroupLayout | null = null;
    private glyphFieldDummyAttributesBuffer: GPUBuffer | null = null;
    private glyphFieldDrawItemPool: GlyphDrawItem[] = [];
    private glyphFieldDrawItemPoolUsed: number = 0;
    private opaqueGlyphFieldDrawList: GlyphDrawItem[] = [];
    private transparentGlyphFieldDrawList: GlyphDrawItem[] = [];
    private cullGlyphFieldScratch: GlyphField[] = [];
    private transparentMergedDrawList: TransparentDrawItem[] = [];
    private cullPointCloudScratch: PointCloud[] = [];
    private objectIds: WeakMap<object, number> = new WeakMap();
    private objectsById: Map<number, object> = new Map();
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
    private gpuTimingSupported: boolean = false;
    private gpuTimingEnabled: boolean = false;
    private gpuQuerySet: GPUQuerySet | null = null;
    private gpuResolveBuffer: GPUBuffer | null = null;
    private gpuResultBuffer: GPUBuffer | null = null;
    private gpuResultPending: boolean = false;
    private _gpuTimeNs: number | null = null;
    private dataMaterialDummyDataBuffer: GPUBuffer | null = null;
    private pickBindGroupLayout: GPUBindGroupLayout | null = null;
    private pickUniformBuffers: GPUBuffer[] = [];
    private pickBindGroups: GPUBindGroup[] = [];
    private pickIdTexture: GPUTexture | null = null;
    private pickIdView: GPUTextureView | null = null;
    private pickDepthTexture: GPUTexture | null = null;
    private pickDepthView: GPUTextureView | null = null;
    private pickDepthPayloadTexture: GPUTexture | null = null;
    private pickDepthPayloadView: GPUTextureView | null = null;
    private pickIdReadbackBuffer: GPUBuffer | null = null;
    private pickDepthReadbackBuffer: GPUBuffer | null = null;
    private pickIdReadbackCapacityBytes: number = 0;
    private pickDepthReadbackCapacityBytes: number = 0;
    private pickTail: Promise<unknown> = Promise.resolve();
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
        const requiredFeatures: GPUFeatureName[] = [];
        if (adapter.features.has("timestamp-query")) requiredFeatures.push("timestamp-query");
        const deviceDesc: GPUDeviceDescriptor = {};
        if (requiredFeatures.length > 0) deviceDesc.requiredFeatures = requiredFeatures;
        this.device = await adapter.requestDevice(deviceDesc);
        this.gpuTimingSupported = this.device.features.has("timestamp-query");
        this.queue = this.device.queue;
        this.context = this.canvas.getContext("webgpu") as GPUCanvasContext;
        if (!this.context) throw new Error("Failed to get WebGPU canvas context.");
        if (descriptor.canvasFormat) this.format = descriptor.canvasFormat;
        else if (typeof navigator.gpu.getPreferredCanvasFormat === "function") this.format = navigator.gpu.getPreferredCanvasFormat();
        else this.format = "rgba8unorm";
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

    get gpuTimeNs(): number | null {
        return this._gpuTimeNs;
    }

    get isGpuTimingSupported(): boolean {
        return this.gpuTimingSupported;
    }

    enableGpuTiming(enabled: boolean): void {
        const want = !!enabled;
        if (want && this.gpuTimingSupported && !this.gpuQuerySet) this.createGpuTimingResources();
        this.gpuTimingEnabled = want && this.gpuTimingSupported;
    }

    private createGpuTimingResources(): void {
        if (!this.gpuTimingSupported) return;
        if (this.gpuQuerySet) return;
        try {
            this.gpuQuerySet = this.device.createQuerySet({ type: "timestamp", count: 2 });
            this.gpuResolveBuffer = this.device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
            });
            this.gpuResultBuffer = this.device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
        } catch (e) {
            this.gpuQuerySet = null;
            this.gpuResolveBuffer?.destroy();
            this.gpuResolveBuffer = null;
            this.gpuResultBuffer?.destroy();
            this.gpuResultBuffer = null;
            this.gpuTimingSupported = false;
            this.gpuTimingEnabled = false;
            console.warn("Renderer: failed to initialize GPU timing resources:", e);
        }
    }

    private tryReadGpuTiming(): void {
        if (!this.gpuResultPending) return;
        const buf = this.gpuResultBuffer;
        if (!buf) return;
        if (buf.mapState !== "unmapped") return;
        this.gpuResultPending = false;
        buf.mapAsync(GPUMapMode.READ).then(() => {
            try {
                const mapped = buf.getMappedRange();
                const times = new BigUint64Array(mapped);
                const begin = times[0];
                const end = times[1];
                const delta = end - begin;
                const ns = delta > 0n ? Number(delta) : 0;
                this._gpuTimeNs = Number.isFinite(ns) ? ns : 0;
            } catch {
                /* ignore */
            } finally {
                try { buf.unmap(); } catch { /* ignore */ }
            }
        }).catch(() => {
            try { buf.unmap(); } catch { /* ignore */ }
        });
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
        this.resizePickTargets();
    }

    get aspectRatio(): number {
        return this.width / this.height;
    }

    private refreshWasmStagingViews(): void {
        const buf = wasm.memory().buffer as ArrayBuffer;
        const needRefresh =
            buf !== this._wasmBuffer ||
            !this.cameraUniformStagingView ||
            this.cameraUniformStagingView.byteOffset !== this.cameraUniformStagingPtr ||
            !this.lightingUniformStagingView ||
            this.lightingUniformStagingView.byteOffset !== this.lightingUniformStagingPtr ||
            !this.modelUniformStagingView ||
            this.modelUniformStagingView.byteOffset !== this.modelUniformStagingPtr;
        if (!needRefresh) return;
        this._wasmBuffer = buf;
        this.cameraUniformStagingView = wasm.f32view(this.cameraUniformStagingPtr, 20);
        this.lightingUniformStagingView = wasm.f32view(this.lightingUniformStagingPtr, 104);
        this.lightingCountView = wasm.u32view(this.lightingUniformStagingPtr + 16, 1);
        this.modelUniformStagingView = wasm.f32view(this.modelUniformStagingPtr, 32);
    }

    private getObjectId(obj: object): number {
        let id = this.objectIds.get(obj);
        if (id !== undefined) return id;
        id = this.nextObjectId++;
        this.objectIds.set(obj, id);
        this.objectsById.set(id, obj);
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
                skinned8: false,
                sortKey: 0
            };
            this.drawItemPool[i] = item;
        }
        return item;
    }

    private acquirePointCloudDrawItem(): PointCloudDrawItem {
        const i = this.pointCloudDrawItemPoolUsed++;
        let item = this.pointCloudDrawItemPool[i];
        if (!item) {
            item = {
                cloud: null as unknown as PointCloud,
                pipeline: null as unknown as GPURenderPipeline,
                pipelineId: 0,
                cloudId: 0,
                sortKey: 0
            };
            this.pointCloudDrawItemPool[i] = item;
        }
        return item;
    }

    private acquireGlyphFieldDrawItem(): GlyphDrawItem {
        const idx = this.glyphFieldDrawItemPoolUsed++;
        if (idx >= this.glyphFieldDrawItemPool.length) this.glyphFieldDrawItemPool.push({} as any);
        return this.glyphFieldDrawItemPool[idx];
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
        if ("aspect" in camera) (camera as { aspect: number }).aspect = this.aspectRatio;
        const swapTexture = this.context.getCurrentTexture();
        const swapView = swapTexture.createView();
        Transform.updateAll();
        this.writeCameraUniforms(camera);
        this.writeLightingUniforms(scene);
        const encoder = this.device.createCommandEncoder();
        const timestampWrites = (this.gpuTimingEnabled && this.gpuQuerySet)
            ? ({ querySet: this.gpuQuerySet, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } as any)
            : undefined;
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
                },
                ...(timestampWrites ? { timestampWrites } : {})
            });
            this.buildDrawLists(scene, camera);
            this.buildPointCloudDrawLists(scene, camera);
            this.buildGlyphFieldDrawLists(scene, camera);
            this.executeDrawList(pass, this.opaqueDrawList);
            this.executeGlyphFieldDrawList(pass, this.opaqueGlyphFieldDrawList);
            this.executePointCloudDrawList(pass, this.opaquePointCloudDrawList);
            this.executeTransparentMergedDrawList(pass);
            pass.end();
            if (timestampWrites && this.gpuResolveBuffer && this.gpuResultBuffer) {
                encoder.resolveQuerySet(this.gpuQuerySet!, 0, 2, this.gpuResolveBuffer, 0);
                if (this.gpuResultBuffer.mapState === "unmapped") {
                    encoder.copyBufferToBuffer(this.gpuResolveBuffer, 0, this.gpuResultBuffer, 0, 16);
                    this.gpuResultPending = true;
                }
            }
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
                },
                ...(timestampWrites ? { timestampWrites } : {})
            });
            this.buildDrawLists(scene, camera);
            this.buildPointCloudDrawLists(scene, camera);
            this.buildGlyphFieldDrawLists(scene, camera);
            this.executeDrawList(pass, this.opaqueDrawList);
            this.executeGlyphFieldDrawList(pass, this.opaqueGlyphFieldDrawList);
            this.executePointCloudDrawList(pass, this.opaquePointCloudDrawList);
            this.executeTransparentMergedDrawList(pass);
            pass.end();
            if (timestampWrites && this.gpuResolveBuffer && this.gpuResultBuffer) {
                encoder.resolveQuerySet(this.gpuQuerySet!, 0, 2, this.gpuResolveBuffer, 0);
                if (this.gpuResultBuffer.mapState === "unmapped") {
                    encoder.copyBufferToBuffer(this.gpuResolveBuffer, 0, this.gpuResultBuffer, 0, 16);
                    this.gpuResultPending = true;
                }
            }
        }
        this.queue.submit([encoder.finish()]);
        this.tryReadGpuTiming();
    }

    private schedulePick<T>(run: () => Promise<T>): Promise<T> {
        const task = this.pickTail.then(run, run);
        this.pickTail = task.then(() => undefined, () => undefined);
        return task;
    }

    pick(scene: Scene, camera: Camera, x: number, y: number, _opts: PickQuery = {}): Promise<RendererPickHit | null> {
        return this.schedulePick(() => this.runPick(scene, camera, x, y));
    }

    pickRect(scene: Scene, camera: Camera, x0: number, y0: number, x1: number, y1: number, opts: PickRegionQuery = {}): Promise<RendererPickRegionResult> {
        return this.schedulePick(() => this.runPickRect(scene, camera, x0, y0, x1, y1, opts));
    }

    pickLasso(scene: Scene, camera: Camera, points: PickLassoPoint[], opts: PickRegionQuery = {}): Promise<RendererPickRegionResult> {
        return this.schedulePick(() => this.runPickLasso(scene, camera, points, opts));
    }

    private clamp(x: number, min: number, max: number): number {
        if (x < min) return min;
        if (x > max) return max;
        return x;
    }

    private alignTo256(x: number): number {
        return (x + 255) & ~255;
    }

    private getPickMaxHits(opts: PickRegionQuery): number {
        const v = opts.maxHits;
        if (!Number.isFinite(v as number)) return 10000;
        return Math.max(1, Math.floor(v as number));
    }

    private toFramebufferPixel(clientCoord: number, clientSize: number, framebufferSize: number): number {
        const size = Math.max(1, framebufferSize | 0);
        const t = (clientCoord / Math.max(1, clientSize)) * size;
        const p = Math.floor(t);
        if (p < 0) return 0;
        if (p >= size) return size - 1;
        return p;
    }

    private toClientBounds(minX: number, minY: number, maxX: number, maxY: number, clientW: number, clientH: number): RendererPickRegionBounds {
        const x = this.clamp(minX, 0, clientW);
        const y = this.clamp(minY, 0, clientH);
        const right = this.clamp(maxX, 0, clientW);
        const bottom = this.clamp(maxY, 0, clientH);
        return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
    }

    private resolveSinglePixel(x: number, y: number, clientW: number, clientH: number): { px: number; py: number } | null {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        if (x < 0 || y < 0 || x >= clientW || y >= clientH) return null;
        const px = this.toFramebufferPixel(x, clientW, this.width);
        const py = this.toFramebufferPixel(y, clientH, this.height);
        return { px, py };
    }

    private resolveRectPickQuery(x0: number, y0: number, x1: number, y1: number, maxHits: number, clientW: number, clientH: number): ResolvedPickRegionQuery {
        const minX = Math.min(x0, x1);
        const minY = Math.min(y0, y1);
        const maxX = Math.max(x0, x1);
        const maxY = Math.max(y0, y1);
        const bounds = this.toClientBounds(minX, minY, maxX, maxY, clientW, clientH);
        const sameX = Math.abs(x0 - x1) <= 1e-6;
        const sameY = Math.abs(y0 - y1) <= 1e-6;
        if (sameX && sameY) {
            const p = this.resolveSinglePixel(x0, y0, clientW, clientH);
            if (!p) return { mode: "rect", bounds, x: 0, y: 0, width: 0, height: 0, maxHits, lasso: null };
            return { mode: "rect", bounds, x: p.px, y: p.py, width: 1, height: 1, maxHits, lasso: null };
        }
        if (bounds.width <= 0 || bounds.height <= 0) return { mode: "rect", bounds, x: 0, y: 0, width: 0, height: 0, maxHits, lasso: null };
        const maxClientX = Math.max(bounds.x, (bounds.x + bounds.width) - 1e-6);
        const maxClientY = Math.max(bounds.y, (bounds.y + bounds.height) - 1e-6);
        const px0 = this.toFramebufferPixel(bounds.x, clientW, this.width);
        const py0 = this.toFramebufferPixel(bounds.y, clientH, this.height);
        const px1 = this.toFramebufferPixel(maxClientX, clientW, this.width);
        const py1 = this.toFramebufferPixel(maxClientY, clientH, this.height);
        return {
            mode: "rect", bounds,
            x: Math.min(px0, px1), y: Math.min(py0, py1),
            width: Math.abs(px1 - px0) + 1, height: Math.abs(py1 - py0) + 1,
            maxHits, lasso: null
        };
    }

    private resolveLassoPickQuery(points: PickLassoPoint[], maxHits: number, clientW: number, clientH: number): ResolvedPickRegionQuery {
        if (!Array.isArray(points) || points.length < 3) {
            return {
                mode: "lasso", bounds: { x: 0, y: 0, width: 0, height: 0 },
                x: 0, y: 0,
                width: 0, height: 0,
                maxHits, lasso: null
            };
        }
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
            return {
                mode: "lasso", bounds: { x: 0, y: 0, width: 0, height: 0 },
                x: 0, y: 0,
                width: 0, height: 0,
                maxHits, lasso: null
            };
        }
        const bounds = this.toClientBounds(minX, minY, maxX, maxY, clientW, clientH);
        if (bounds.width <= 0 || bounds.height <= 0) {
            return { mode: "lasso", bounds, x: 0, y: 0, width: 0, height: 0, maxHits, lasso: null };
        }
        const lasso: Array<{ x: number; y: number }> = [];
        let minFx = Infinity;
        let minFy = Infinity;
        let maxFx = -Infinity;
        let maxFy = -Infinity;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
            const fx = (p.x / Math.max(1, clientW)) * Math.max(1, this.width);
            const fy = (p.y / Math.max(1, clientH)) * Math.max(1, this.height);
            lasso.push({ x: fx, y: fy });
            if (fx < minFx) minFx = fx;
            if (fy < minFy) minFy = fy;
            if (fx > maxFx) maxFx = fx;
            if (fy > maxFy) maxFy = fy;
        }
        if (lasso.length < 3 || !Number.isFinite(minFx) || !Number.isFinite(minFy) || !Number.isFinite(maxFx) || !Number.isFinite(maxFy)) {
            return { mode: "lasso", bounds, x: 0, y: 0, width: 0, height: 0, maxHits, lasso: null };
        }
        const px0 = this.clamp(Math.floor(minFx), 0, Math.max(0, this.width - 1));
        const py0 = this.clamp(Math.floor(minFy), 0, Math.max(0, this.height - 1));
        const px1 = this.clamp(Math.floor(maxFx), 0, Math.max(0, this.width - 1));
        const py1 = this.clamp(Math.floor(maxFy), 0, Math.max(0, this.height - 1));
        if (px1 < px0 || py1 < py0) {
            return { mode: "lasso", bounds, x: 0, y: 0, width: 0, height: 0, maxHits, lasso: null };
        }
        return {
            mode: "lasso", bounds,
            x: px0, y: py0,
            width: (px1 - px0) + 1, height: (py1 - py0) + 1,
            maxHits, lasso
        };
    }

    private preparePickFrame(scene: Scene, camera: Camera): void {
        this.modelBufferIndex = 0;
        this.instanceBufferOffset = 0;
        this.cameraUniformStagingPtr = frameArena.allocF32(20);
        this.lightingUniformStagingPtr = frameArena.allocF32(104);
        this.modelUniformStagingPtr = frameArena.allocF32(32);
        if ("aspect" in camera) (camera as { aspect: number }).aspect = this.aspectRatio;
        Transform.updateAll();
        this.writeCameraUniforms(camera);
        this.writeLightingUniforms(scene);
        this.buildDrawLists(scene, camera);
        this.buildPointCloudDrawLists(scene, camera);
        this.buildGlyphFieldDrawLists(scene, camera);
        if (!this.pickIdView || !this.pickDepthView || !this.pickDepthPayloadView) this.resizePickTargets();
    }

    private resolveRendererPickHit(camera: Camera, sample: DecodedPickSample): RendererPickHit | null {
        const obj = this.objectsById.get(sample.objectId);
        if (!obj) return null;
        const worldPosition = this.unprojectDepth(camera, sample.px, sample.py, sample.depth);
        if (obj instanceof Mesh) {
            return {
                kind: "mesh",
                object: obj, objectId: sample.objectId,
                elementIndex: sample.elementIndex, worldPosition
            };
        }
        if (obj instanceof PointCloud) {
            return {
                kind: "pointcloud",
                object: obj, objectId: sample.objectId,
                elementIndex: sample.elementIndex, worldPosition
            };
        }
        if (obj instanceof GlyphField) {
            return {
                kind: "glyphfield",
                object: obj, objectId: sample.objectId,
                elementIndex: sample.elementIndex, worldPosition
            };
        }
        return null;
    }

    private pointInPolygon(x: number, y: number, polygon: Array<{ x: number; y: number }>): boolean {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;
            const intersects = ((yi > y) !== (yj > y)) && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12)) + xi);
            if (intersects) inside = !inside;
        }
        return inside;
    }

    private async executePickRegion(scene: Scene, camera: Camera, query: ResolvedPickRegionQuery): Promise<RendererPickRegionResult> {
        if (query.width <= 0 || query.height <= 0) return { mode: query.mode, hits: [], truncated: false, bounds: query.bounds, sampledPixels: 0 };
        this.preparePickFrame(scene, camera);
        if (!this.pickIdView || !this.pickDepthView || !this.pickDepthPayloadView) return { mode: query.mode, hits: [], truncated: false, bounds: query.bounds, sampledPixels: 0 };
        const readback = this.ensurePickReadbackBuffers(query.width, query.height);
        if (!this.pickIdTexture || !this.pickDepthPayloadTexture || !this.pickIdReadbackBuffer || !this.pickDepthReadbackBuffer) return { mode: query.mode, hits: [], truncated: false, bounds: query.bounds, sampledPixels: 0 };
        if (this.pickIdReadbackBuffer.mapState !== "unmapped") try { this.pickIdReadbackBuffer.unmap(); } catch { /* ignore */ }
        if (this.pickDepthReadbackBuffer.mapState !== "unmapped") try { this.pickDepthReadbackBuffer.unmap(); } catch { /* ignore */ }
        const encoder = this.device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.pickIdView,
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    loadOp: "clear",
                    storeOp: "store"
                },
                {
                    view: this.pickDepthPayloadView,
                    clearValue: { r: 1, g: 0, b: 0, a: 0 },
                    loadOp: "clear",
                    storeOp: "store"
                }
            ],
            depthStencilAttachment: {
                view: this.pickDepthView,
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        });
        pass.setScissorRect(query.x, query.y, query.width, query.height);
        this.executeMeshPickDrawList(pass, this.opaqueDrawList);
        this.executeMeshPickDrawList(pass, this.transparentDrawList);
        this.executeGlyphPickDrawList(pass, this.opaqueGlyphFieldDrawList);
        this.executeGlyphPickDrawList(pass, this.transparentGlyphFieldDrawList);
        this.executePointCloudPickDrawList(pass, this.opaquePointCloudDrawList);
        this.executePointCloudPickDrawList(pass, this.transparentPointCloudDrawList);
        pass.end();
        encoder.copyTextureToBuffer(
            { texture: this.pickIdTexture, origin: { x: query.x, y: query.y, z: 0 } },
            { buffer: this.pickIdReadbackBuffer, bytesPerRow: readback.idBytesPerRow, rowsPerImage: query.height },
            { width: query.width, height: query.height, depthOrArrayLayers: 1 }
        );
        encoder.copyTextureToBuffer(
            { texture: this.pickDepthPayloadTexture, origin: { x: query.x, y: query.y, z: 0 } },
            { buffer: this.pickDepthReadbackBuffer, bytesPerRow: readback.depthBytesPerRow, rowsPerImage: query.height },
            { width: query.width, height: query.height, depthOrArrayLayers: 1 }
        );
        this.queue.submit([encoder.finish()]);
        await Promise.all([
            this.pickIdReadbackBuffer.mapAsync(GPUMapMode.READ, 0, readback.idSizeBytes),
            this.pickDepthReadbackBuffer.mapAsync(GPUMapMode.READ, 0, readback.depthSizeBytes)
        ]);
        let truncated = false;
        let sampledPixels = 0;
        const samples: Map<string, DecodedPickSample> = new Map();
        try {
            const idWords = new Uint32Array(this.pickIdReadbackBuffer.getMappedRange(0, readback.idSizeBytes));
            const depthWords = new Float32Array(this.pickDepthReadbackBuffer.getMappedRange(0, readback.depthSizeBytes));
            const lasso = query.mode === "lasso" ? query.lasso : null;
            rows: for (let y = 0; y < query.height; y++) {
                const idRowBase = (y * readback.idBytesPerRow) >>> 2;
                const depthRowBase = (y * readback.depthBytesPerRow) >>> 2;
                const py = query.y + y;
                for (let x = 0; x < query.width; x++) {
                    const px = query.x + x;
                    if (lasso && !this.pointInPolygon(px + 0.5, py + 0.5, lasso)) continue;
                    sampledPixels++;
                    const idIndex = idRowBase + (x * 2);
                    const objectId = idWords[idIndex] >>> 0;
                    if (objectId === 0) continue;
                    const elementIndex = idWords[idIndex + 1] >>> 0;
                    const depth = depthWords[depthRowBase + x];
                    if (!Number.isFinite(depth) || depth >= 1.0) continue;
                    const key = `${objectId}:${elementIndex}`;
                    const existing = samples.get(key);
                    if (!existing) {
                        if (samples.size >= query.maxHits) {
                            truncated = true;
                            break rows;
                        }
                        samples.set(key, { objectId, elementIndex, depth, px, py });
                    } else if (depth < existing.depth) {
                        existing.depth = depth;
                        existing.px = px;
                        existing.py = py;
                    }
                }
            }
        } finally {
            try { this.pickIdReadbackBuffer.unmap(); } catch { /* ignore */ }
            try { this.pickDepthReadbackBuffer.unmap(); } catch { /* ignore */ }
        }
        const hits: RendererPickHit[] = [];
        for (const sample of samples.values()) {
            const hit = this.resolveRendererPickHit(camera, sample);
            if (hit) hits.push(hit);
        }
        return { mode: query.mode, hits, truncated, bounds: query.bounds, sampledPixels };
    }

    private async runPick(scene: Scene, camera: Camera, x: number, y: number): Promise<RendererPickHit | null> {
        frameArena.reset();
        this.resize();
        const clientW = Math.max(1, this.canvas.clientWidth || this.width);
        const clientH = Math.max(1, this.canvas.clientHeight || this.height);
        const pixel = this.resolveSinglePixel(x, y, clientW, clientH);
        if (!pixel) return null;
        const query: ResolvedPickRegionQuery = {
            mode: "rect", bounds: { x, y, width: 0, height: 0 },
            x: pixel.px, y: pixel.py,
            width: 1, height: 1,
            maxHits: 1, lasso: null
        };
        const result = await this.executePickRegion(scene, camera, query);
        return result.hits.length > 0 ? result.hits[0] : null;
    }

    private async runPickRect(scene: Scene, camera: Camera, x0: number, y0: number, x1: number, y1: number, opts: PickRegionQuery): Promise<RendererPickRegionResult> {
        frameArena.reset();
        this.resize();
        const clientW = Math.max(1, this.canvas.clientWidth || this.width);
        const clientH = Math.max(1, this.canvas.clientHeight || this.height);
        const query = this.resolveRectPickQuery(x0, y0, x1, y1, this.getPickMaxHits(opts), clientW, clientH);
        return this.executePickRegion(scene, camera, query);
    }

    private async runPickLasso(scene: Scene, camera: Camera, points: PickLassoPoint[], opts: PickRegionQuery): Promise<RendererPickRegionResult> {
        frameArena.reset();
        this.resize();
        const clientW = Math.max(1, this.canvas.clientWidth || this.width);
        const clientH = Math.max(1, this.canvas.clientHeight || this.height);
        const query = this.resolveLassoPickQuery(points, this.getPickMaxHits(opts), clientW, clientH);
        return this.executePickRegion(scene, camera, query);
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
        for (const buffer of this.pickUniformBuffers) buffer.destroy();
        this.modelUniformBuffers = [];
        this.pickUniformBuffers = [];
        this.pickBindGroups = [];
        this.pickBindGroupLayout = null;
        this.pickIdTexture?.destroy();
        this.pickDepthTexture?.destroy();
        this.pickDepthPayloadTexture?.destroy();
        this.pickIdTexture = null;
        this.pickIdView = null;
        this.pickDepthTexture = null;
        this.pickDepthView = null;
        this.pickDepthPayloadTexture = null;
        this.pickDepthPayloadView = null;
        this.pickIdReadbackBuffer?.destroy();
        this.pickDepthReadbackBuffer?.destroy();
        this.pickIdReadbackBuffer = null;
        this.pickDepthReadbackBuffer = null;
        this.pickIdReadbackCapacityBytes = 0;
        this.pickDepthReadbackCapacityBytes = 0;
        this.pickTail = Promise.resolve();
        this.lightingUniformBuffer?.destroy();
        this.instanceBuffer?.destroy();
        this.instanceBuffer = null;
        this.instanceBufferCapacityBytes = 0;
        this.globalBindGroups = [];
        this.pipelineCache.clear();
        this.shaderCache.clear();
        this.pointCloudBindGroupLayout = null;
        this.glyphFieldBindGroupLayout = null;
        this.glyphFieldDummyAttributesBuffer?.destroy();
        this.glyphFieldDummyAttributesBuffer = null;
        this.gpuQuerySet?.destroy();
        this.gpuQuerySet = null;
        this.gpuResolveBuffer?.destroy();
        this.gpuResolveBuffer = null;
        this.gpuResultBuffer?.destroy();
        this.gpuResultBuffer = null;
        this.gpuResultPending = false;
        this._gpuTimeNs = null;
        this.dataMaterialDummyDataBuffer?.destroy();
        this.dataMaterialDummyDataBuffer = null;
        this.objectsById.clear();
        this.objectIds = new WeakMap();
        this.nextObjectId = 1;
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
        this.lightingUniformBuffer = this.device.createBuffer({
            size: 416,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.modelUniformBuffers = [];
        this.globalBindGroups = [];
        this.pickUniformBuffers = [];
        this.pickBindGroups = [];
        const pickLayout = this.getPickBindGroupLayout();
        for (let i = 0; i < this.MODEL_BUFFER_POOL_SIZE; i++) {
            const modelBuffer = this.device.createBuffer({
                size: 128,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            this.modelUniformBuffers.push(modelBuffer);
            this.globalBindGroups.push(this.device.createBindGroup({
                layout: this.globalBindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
                    { binding: 1, resource: { buffer: modelBuffer } },
                    { binding: 2, resource: { buffer: this.lightingUniformBuffer } }
                ]
            }));
            const pickBuffer = this.device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            this.pickUniformBuffers.push(pickBuffer);
            this.pickBindGroups.push(this.device.createBindGroup({
                layout: pickLayout,
                entries: [{ binding: 0, resource: { buffer: pickBuffer } }]
            }));
        }
        this.cameraUniformStagingPtr = 0;
        this.lightingUniformStagingPtr = 0;
        this.modelUniformStagingPtr = 0;
        this._wasmBuffer = null;
    }

    private getPickBindGroupLayout(): GPUBindGroupLayout {
        if (this.pickBindGroupLayout) return this.pickBindGroupLayout;
        this.pickBindGroupLayout = this.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform", minBindingSize: 16 }
            }]
        });
        return this.pickBindGroupLayout;
    }

    private ensureModelBufferPool(requiredCount: number): void {
        const current = this.modelUniformBuffers.length;
        if (requiredCount <= current) return;
        let newSize = Math.max(1, current);
        while (newSize < requiredCount) newSize *= 2;
        this.modelUniformBuffers.length = newSize;
        this.globalBindGroups.length = newSize;
        this.pickUniformBuffers.length = newSize;
        this.pickBindGroups.length = newSize;
        const pickLayout = this.getPickBindGroupLayout();
        for (let i = current; i < newSize; i++) {
            const modelBuffer = this.device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            this.modelUniformBuffers[i] = modelBuffer;
            this.globalBindGroups[i] = this.device.createBindGroup({
                layout: this.globalBindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
                    { binding: 1, resource: { buffer: modelBuffer } },
                    { binding: 2, resource: { buffer: this.lightingUniformBuffer } }
                ]
            });
            const pickBuffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            this.pickUniformBuffers[i] = pickBuffer;
            this.pickBindGroups[i] = this.device.createBindGroup({
                layout: pickLayout,
                entries: [{ binding: 0, resource: { buffer: pickBuffer } }]
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

    private resizePickTargets(): void {
        const w = this.width | 0;
        const h = this.height | 0;
        if (w <= 0 || h <= 0) return;
        this.pickIdTexture?.destroy();
        this.pickDepthTexture?.destroy();
        this.pickDepthPayloadTexture?.destroy();
        this.pickIdTexture = this.device.createTexture({
            size: { width: w, height: h, depthOrArrayLayers: 1 },
            format: "rg32uint",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        });
        this.pickIdView = this.pickIdTexture.createView();
        this.pickDepthTexture = createDepthTexture(this.device, w, h);
        this.pickDepthView = this.pickDepthTexture.createView();
        this.pickDepthPayloadTexture = this.device.createTexture({
            size: { width: w, height: h, depthOrArrayLayers: 1 },
            format: "r32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        });
        this.pickDepthPayloadView = this.pickDepthPayloadTexture.createView();
        this.ensurePickReadbackBuffers(1, 1);
    }

    private ensurePickReadbackBuffers(copyWidth: number, copyHeight: number): { idBytesPerRow: number; depthBytesPerRow: number; idSizeBytes: number; depthSizeBytes: number } {
        const width = Math.max(1, copyWidth | 0);
        const height = Math.max(1, copyHeight | 0);
        const idBytesPerRow = this.alignTo256(width * 8);
        const depthBytesPerRow = this.alignTo256(width * 4);
        const idSizeBytes = idBytesPerRow * height;
        const depthSizeBytes = depthBytesPerRow * height;
        if (!this.pickIdReadbackBuffer || this.pickIdReadbackCapacityBytes < idSizeBytes) {
            this.pickIdReadbackBuffer?.destroy();
            this.pickIdReadbackBuffer = this.device.createBuffer({
                size: idSizeBytes,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            this.pickIdReadbackCapacityBytes = idSizeBytes;
        }
        if (!this.pickDepthReadbackBuffer || this.pickDepthReadbackCapacityBytes < depthSizeBytes) {
            this.pickDepthReadbackBuffer?.destroy();
            this.pickDepthReadbackBuffer = this.device.createBuffer({
                size: depthSizeBytes,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            this.pickDepthReadbackCapacityBytes = depthSizeBytes;
        }
        return { idBytesPerRow, depthBytesPerRow, idSizeBytes, depthSizeBytes };
    }

    private writePickUniform(slot: number, objectId: number, elementBase: number = 0): void {
        if (slot >= this.pickUniformBuffers.length) this.ensureModelBufferPool(slot + 1);
        const data = new Uint32Array([objectId >>> 0, elementBase >>> 0, 0, 0]);
        this.queue.writeBuffer(this.pickUniformBuffers[slot], 0, data.buffer, data.byteOffset, data.byteLength);
    }

    private unprojectDepth(camera: Camera, px: number, py: number, depth: number): [number, number, number] {
        const x = ((px + 0.5) / Math.max(1, this.width)) * 2.0 - 1.0;
        const y = 1.0 - ((py + 0.5) / Math.max(1, this.height)) * 2.0;
        const z = depth;
        const inv = mat4.invert(camera.viewProjectionMatrix);
        const wx = inv[0] * x + inv[4] * y + inv[8] * z + inv[12];
        const wy = inv[1] * x + inv[5] * y + inv[9] * z + inv[13];
        const wz = inv[2] * x + inv[6] * y + inv[10] * z + inv[14];
        const ww = inv[3] * x + inv[7] * y + inv[11] * z + inv[15];
        if (!Number.isFinite(ww) || Math.abs(ww) <= 1e-8) return [0, 0, 0];
        return [wx / ww, wy / ww, wz / ww];
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
        this.refreshWasmStagingViews();
        const proj = camera.getProjectionMatrix();
        this.modelUniformStagingView.set(proj, 0);
        const viewPtr = this.modelUniformStagingPtr + 16 * 4;
        mat4f.invert(viewPtr, camera.transform.worldMatrixPtr);
        mat4f.mul(this.cameraUniformStagingPtr, this.modelUniformStagingPtr, viewPtr);
        const store = TransformStore.global();
        const storeF32 = store.f32();
        const base = (store.worldPtr >>> 2) + camera.transform.index * 16;
        this.cameraUniformStagingView[16] = storeF32[base + 12];
        this.cameraUniformStagingView[17] = storeF32[base + 13];
        this.cameraUniformStagingView[18] = storeF32[base + 14];
        this.cameraUniformStagingView[19] = this.height;
        this.queue.writeBuffer(this.cameraUniformBuffer, 0, this.cameraUniformStagingView);
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
        let visibleIndicesBase = 0;
        let visibleCount = count;
        const store = TransformStore.global();
        const storeF32 = store.f32();
        const storeU32 = store.u32();
        const camWb = (camera.transform.worldMatrixPtr >>> 2);
        const camX = storeF32[camWb + 12];
        const camY = storeF32[camWb + 13];
        const camZ = storeF32[camWb + 14];
        if (this.frustumCullingEnabled) {
            this.ensureCullingCapacity(count);
            const centersBase = this.cullCentersPtr >>> 2;
            const radiiBase = this.cullRadiiPtr >>> 2;
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
                const base = centersBase + i * 3;
                storeF32[base + 0] = cx;
                storeF32[base + 1] = cy;
                storeF32[base + 2] = cz;
                const sx = Math.hypot(w0, w1, w2);
                const sy = Math.hypot(w4, w5, w6);
                const sz = Math.hypot(w8, w9, w10);
                const smax = Math.max(sx, sy, sz);
                storeF32[radiiBase + i] = lr * smax;
            }
            const frustumPtr = frameArena.allocF32(24) as WasmPtr;
            const frb = frustumPtr >>> 2;
            const m = this.cameraUniformStagingView;
            storeF32[frb + 0] = m[3] + m[0];
            storeF32[frb + 1] = m[7] + m[4];
            storeF32[frb + 2] = m[11] + m[8];
            storeF32[frb + 3] = m[15] + m[12];
            storeF32[frb + 4] = m[3] - m[0];
            storeF32[frb + 5] = m[7] - m[4];
            storeF32[frb + 6] = m[11] - m[8];
            storeF32[frb + 7] = m[15] - m[12];
            storeF32[frb + 8] = m[3] + m[1];
            storeF32[frb + 9] = m[7] + m[5];
            storeF32[frb + 10] = m[11] + m[9];
            storeF32[frb + 11] = m[15] + m[13];
            storeF32[frb + 12] = m[3] - m[1];
            storeF32[frb + 13] = m[7] - m[5];
            storeF32[frb + 14] = m[11] - m[9];
            storeF32[frb + 15] = m[15] - m[13];
            storeF32[frb + 16] = m[2];
            storeF32[frb + 17] = m[6];
            storeF32[frb + 18] = m[10];
            storeF32[frb + 19] = m[14];
            storeF32[frb + 20] = m[3] - m[2];
            storeF32[frb + 21] = m[7] - m[6];
            storeF32[frb + 22] = m[11] - m[10];
            storeF32[frb + 23] = m[15] - m[14];
            for (let p = 0; p < 6; p++) {
                const off = frb + p * 4;
                const nx = storeF32[off + 0];
                const ny = storeF32[off + 1];
                const nz = storeF32[off + 2];
                const len = Math.hypot(nx, ny, nz);
                if (len > 0) {
                    const inv = 1.0 / len;
                    storeF32[off + 0] = nx * inv;
                    storeF32[off + 1] = ny * inv;
                    storeF32[off + 2] = nz * inv;
                    storeF32[off + 3] = storeF32[off + 3] * inv;
                }
            }
            const outPtr = frameArena.alloc(count * 4, 4) as WasmPtr;
            visibleCount = cullf.spheresFrustum(outPtr, this.cullCentersPtr, this.cullRadiiPtr, count, frustumPtr);
            visibleIndicesBase = outPtr >>> 2;
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
                const skinned8 = skinned && geometry.joints1 !== null && geometry.weights1 !== null;
                const pipeline = this.getOrCreatePipeline(material, false, skinned, skinned8);
                const item = this.acquireDrawItem();
                item.mesh = mesh;
                item.geometry = geometry;
                item.material = material;
                item.pipeline = pipeline;
                item.pipelineId = this.getObjectId(pipeline);
                item.materialId = this.getObjectId(material);
                item.geometryId = this.getObjectId(geometry);
                item.skinned = skinned;
                item.skinned8 = skinned8;
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
            const visBase = visibleIndicesBase;
            for (let k = 0; k < visibleCount; k++) {
                const i = storeU32[visBase + k];
                const mesh = candidates[i];
                const geometry = mesh.geometry;
                const material = mesh.material;
                const skinned = mesh.skin !== null && geometry.joints !== null && geometry.weights !== null && this.materialSupportsSkinning(material);
                const skinned8 = skinned && geometry.joints1 !== null && geometry.weights1 !== null;
                const pipeline = this.getOrCreatePipeline(material, false, skinned, skinned8);
                const item = this.acquireDrawItem();
                item.mesh = mesh;
                item.geometry = geometry;
                item.material = material;
                item.pipeline = pipeline;
                item.pipelineId = this.getObjectId(pipeline);
                item.materialId = this.getObjectId(material);
                item.geometryId = this.getObjectId(geometry);
                item.skinned = skinned;
                item.skinned8 = skinned8;
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

    private buildPointCloudDrawLists(scene: Scene, camera: Camera): void {
        this.pointCloudDrawItemPoolUsed = 0;
        this.opaquePointCloudDrawList.length = 0;
        this.transparentPointCloudDrawList.length = 0;
        this.transparentMergedDrawList.length = 0;
        this.cullPointCloudScratch.length = 0;
        for (const pc of scene.pointClouds) {
            if (!pc.visible) continue;
            if (pc.pointCount <= 0) continue;
            this.cullPointCloudScratch.push(pc);
        }
        if (this.cullPointCloudScratch.length === 0) return;
        const ts = TransformStore.global();
        const storeF32 = ts.f32();
        const storeU32 = ts.u32();
        const m = this.cameraUniformStagingView;
        const camX = m[16];
        const camY = m[17];
        const camZ = m[18];
        const visible: PointCloud[] = [];
        if (this.frustumCullingEnabled) {
            const bounded: PointCloud[] = [];
            const unbounded: PointCloud[] = [];
            for (const pc of this.cullPointCloudScratch) {
                if (pc.boundsRadius > 0) bounded.push(pc);
                else unbounded.push(pc);
            }
            if (bounded.length > 0) {
                this.ensureCullingCapacity(bounded.length);
                const cullCentersBase = this.cullCentersPtr >>> 2;
                const cullRadiiBase = this.cullRadiiPtr >>> 2;
                for (let i = 0; i < bounded.length; i++) {
                    const pc = bounded[i];
                    const worldBase = pc.transform.worldMatrixPtr >>> 2;
                    const cx = pc.boundsCenter[0];
                    const cy = pc.boundsCenter[1];
                    const cz = pc.boundsCenter[2];
                    const cwx = storeF32[worldBase + 0] * cx + storeF32[worldBase + 4] * cy + storeF32[worldBase + 8] * cz + storeF32[worldBase + 12];
                    const cwy = storeF32[worldBase + 1] * cx + storeF32[worldBase + 5] * cy + storeF32[worldBase + 9] * cz + storeF32[worldBase + 13];
                    const cwz = storeF32[worldBase + 2] * cx + storeF32[worldBase + 6] * cy + storeF32[worldBase + 10] * cz + storeF32[worldBase + 14];
                    const sx = Math.hypot(storeF32[worldBase + 0], storeF32[worldBase + 1], storeF32[worldBase + 2]);
                    const sy = Math.hypot(storeF32[worldBase + 4], storeF32[worldBase + 5], storeF32[worldBase + 6]);
                    const sz = Math.hypot(storeF32[worldBase + 8], storeF32[worldBase + 9], storeF32[worldBase + 10]);
                    const smax = Math.max(sx, sy, sz);
                    storeF32[cullCentersBase + i * 3 + 0] = cwx;
                    storeF32[cullCentersBase + i * 3 + 1] = cwy;
                    storeF32[cullCentersBase + i * 3 + 2] = cwz;
                    storeF32[cullRadiiBase + i] = pc.boundsRadius * smax;
                }
                const frustumPtr = frameArena.allocF32(24) as WasmPtr;
                const frb = frustumPtr >>> 2;
                storeF32[frb + 0] = m[3] + m[0];
                storeF32[frb + 1] = m[7] + m[4];
                storeF32[frb + 2] = m[11] + m[8];
                storeF32[frb + 3] = m[15] + m[12];
                storeF32[frb + 4] = m[3] - m[0];
                storeF32[frb + 5] = m[7] - m[4];
                storeF32[frb + 6] = m[11] - m[8];
                storeF32[frb + 7] = m[15] - m[12];
                storeF32[frb + 8] = m[3] + m[1];
                storeF32[frb + 9] = m[7] + m[5];
                storeF32[frb + 10] = m[11] + m[9];
                storeF32[frb + 11] = m[15] + m[13];
                storeF32[frb + 12] = m[3] - m[1];
                storeF32[frb + 13] = m[7] - m[5];
                storeF32[frb + 14] = m[11] - m[9];
                storeF32[frb + 15] = m[15] - m[13];
                storeF32[frb + 16] = m[2];
                storeF32[frb + 17] = m[6];
                storeF32[frb + 18] = m[10];
                storeF32[frb + 19] = m[14];
                storeF32[frb + 20] = m[3] - m[2];
                storeF32[frb + 21] = m[7] - m[6];
                storeF32[frb + 22] = m[11] - m[10];
                storeF32[frb + 23] = m[15] - m[14];
                for (let p = 0; p < 6; p++) {
                    const off = frb + p * 4;
                    const len = Math.hypot(storeF32[off + 0], storeF32[off + 1], storeF32[off + 2]);
                    if (len > 0) {
                        const inv = 1 / len;
                        storeF32[off + 0] *= inv;
                        storeF32[off + 1] *= inv;
                        storeF32[off + 2] *= inv;
                        storeF32[off + 3] *= inv;
                    }
                }
                const outPtr = frameArena.alloc(bounded.length * 4, 4) as WasmPtr;
                const numVisible = cullf.spheresFrustum(outPtr, this.cullCentersPtr, this.cullRadiiPtr, bounded.length, frustumPtr);
                const outBase = outPtr >>> 2;
                for (let i = 0; i < numVisible; i++) visible.push(bounded[storeU32[outBase + i]]);
            }
            for (const pc of unbounded) visible.push(pc);
        } else for (const pc of this.cullPointCloudScratch) visible.push(pc);
        for (const pc of visible) {
            const pipeline = this.getOrCreatePointCloudPipeline(pc);
            const pipelineId = this.getObjectId(pipeline);
            const cloudId = this.getObjectId(pc);
            const item = this.acquirePointCloudDrawItem();
            item.cloud = pc;
            item.pipeline = pipeline;
            item.pipelineId = pipelineId;
            item.cloudId = cloudId;
            if (pc.blendMode === BlendMode.Opaque) {
                item.sortKey = 0;
                this.opaquePointCloudDrawList.push(item);
            } else {
                const worldBase = pc.transform.worldMatrixPtr >>> 2;
                const cx = pc.boundsCenter[0];
                const cy = pc.boundsCenter[1];
                const cz = pc.boundsCenter[2];
                const cwx = storeF32[worldBase + 0] * cx + storeF32[worldBase + 4] * cy + storeF32[worldBase + 8] * cz + storeF32[worldBase + 12];
                const cwy = storeF32[worldBase + 1] * cx + storeF32[worldBase + 5] * cy + storeF32[worldBase + 9] * cz + storeF32[worldBase + 13];
                const cwz = storeF32[worldBase + 2] * cx + storeF32[worldBase + 6] * cy + storeF32[worldBase + 10] * cz + storeF32[worldBase + 14];
                const dx = cwx - camX;
                const dy = cwy - camY;
                const dz = cwz - camZ;
                item.sortKey = dx * dx + dy * dy + dz * dz;
                this.transparentPointCloudDrawList.push(item);
            }
        }
        this.opaquePointCloudDrawList.sort((a, b) => a.pipelineId - b.pipelineId || a.cloudId - b.cloudId);
        this.transparentPointCloudDrawList.sort((a, b) => b.sortKey - a.sortKey || a.pipelineId - b.pipelineId || a.cloudId - b.cloudId);
    }

    private buildGlyphFieldDrawLists(scene: Scene, camera: Camera): void {
        this.glyphFieldDrawItemPoolUsed = 0;
        this.opaqueGlyphFieldDrawList.length = 0;
        this.transparentGlyphFieldDrawList.length = 0;
        this.cullGlyphFieldScratch.length = 0;
        for (const gf of scene.glyphFields) {
            if (!gf.visible) continue;
            if (gf.instanceCount <= 0) continue;
            this.cullGlyphFieldScratch.push(gf);
        }
        if (this.cullGlyphFieldScratch.length === 0) return;
        const store = TransformStore.global();
        const f32 = store.f32();
        const camX = camera.position[0];
        const camY = camera.position[1];
        const camZ = camera.position[2];
        const visible: GlyphField[] = [];
        if (this.frustumCullingEnabled) {
            const bounded: GlyphField[] = [];
            const unbounded: GlyphField[] = [];
            for (const gf of this.cullGlyphFieldScratch) {
                if (gf.boundsRadius > 0) bounded.push(gf);
                else unbounded.push(gf);
            }
            if (bounded.length > 0) {
                this.ensureCullingCapacity(bounded.length);
                const centers = store.f32().subarray(this.cullCentersPtr >>> 2, (this.cullCentersPtr >>> 2) + bounded.length * 3);
                const radii = store.f32().subarray(this.cullRadiiPtr >>> 2, (this.cullRadiiPtr >>> 2) + bounded.length);
                for (let i = 0; i < bounded.length; i++) {
                    const field = bounded[i];
                    const ptr = field.transform.worldMatrixPtr >>> 2;
                    const cx = field.boundsCenter[0];
                    const cy = field.boundsCenter[1];
                    const cz = field.boundsCenter[2];
                    const tx = f32[ptr + 12];
                    const ty = f32[ptr + 13];
                    const tz = f32[ptr + 14];
                    const wx = f32[ptr + 0] * cx + f32[ptr + 4] * cy + f32[ptr + 8] * cz + tx;
                    const wy = f32[ptr + 1] * cx + f32[ptr + 5] * cy + f32[ptr + 9] * cz + ty;
                    const wz = f32[ptr + 2] * cx + f32[ptr + 6] * cy + f32[ptr + 10] * cz + tz;
                    centers[i * 3 + 0] = wx;
                    centers[i * 3 + 1] = wy;
                    centers[i * 3 + 2] = wz;
                    const sx = Math.hypot(f32[ptr + 0], f32[ptr + 1], f32[ptr + 2]);
                    const sy = Math.hypot(f32[ptr + 4], f32[ptr + 5], f32[ptr + 6]);
                    const sz = Math.hypot(f32[ptr + 8], f32[ptr + 9], f32[ptr + 10]);
                    const maxS = Math.max(sx, sy, sz);
                    radii[i] = field.boundsRadius * maxS;
                }
                const m = this.cameraUniformStagingView;
                const p = frameArena.allocF32(6 * 4) as WasmPtr;
                const pv = store.f32().subarray(p >>> 2, (p >>> 2) + 24);
                pv.set([
                    m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12],
                    m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12],
                    m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13],
                    m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13],
                    m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14],
                    m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]
                ]);
                const planesPtr = p;
                const centersPtr = this.cullCentersPtr;
                const radiiPtr = this.cullRadiiPtr;
                const outPtr = frameArena.alloc(bounded.length * 4, 4) as WasmPtr;
                const numVisible = cullf.spheresFrustum(outPtr, centersPtr, radiiPtr, bounded.length, planesPtr);
                const u32 = store.u32();
                const outBase = outPtr >>> 2;
                for (let i = 0; i < numVisible; i++) visible.push(bounded[u32[outBase + i]]);
                if (this.frustumCullingStatsEnabled) {
                    this.cullingStats.tested += bounded.length;
                    this.cullingStats.visible += visible.length;
                }
            }
            for (const gf of unbounded) visible.push(gf);
        } else for (const gf of this.cullGlyphFieldScratch) visible.push(gf);
        for (const gf of visible) {
            const geometry = gf.geometry;
            const pipeline = this.getOrCreateGlyphFieldPipeline(gf);
            const item = this.acquireGlyphFieldDrawItem();
            item.field = gf;
            item.geometry = geometry;
            item.pipeline = pipeline;
            item.pipelineId = this.getObjectId(pipeline);
            item.geometryId = this.getObjectId(geometry);
            item.fieldId = this.getObjectId(gf);
            if (gf.blendMode === BlendMode.Opaque) {
                item.sortKey = 0;
                this.opaqueGlyphFieldDrawList.push(item);
            } else {
                const base = gf.transform.worldMatrixPtr >>> 2;
                const dx = f32[base + 12] - camX;
                const dy = f32[base + 13] - camY;
                const dz = f32[base + 14] - camZ;
                item.sortKey = dx * dx + dy * dy + dz * dz;
                this.transparentGlyphFieldDrawList.push(item);
            }
        }
        if (this.opaqueGlyphFieldDrawList.length > 0) {
            this.opaqueGlyphFieldDrawList.sort((a, b) => {
                const d0 = a.pipelineId - b.pipelineId;
                if (d0 !== 0) return d0;
                const d1 = a.geometryId - b.geometryId;
                if (d1 !== 0) return d1;
                return a.fieldId - b.fieldId;
            });
        }
        if (this.transparentGlyphFieldDrawList.length > 0) {
            this.transparentGlyphFieldDrawList.sort((a, b) => {
                const d0 = b.sortKey - a.sortKey;
                if (d0 !== 0) return d0;
                const d1 = a.pipelineId - b.pipelineId;
                if (d1 !== 0) return d1;
                const d2 = a.geometryId - b.geometryId;
                if (d2 !== 0) return d2;
                return a.fieldId - b.fieldId;
            });
        }
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
                    if (first.skinned8) {
                        pass.setVertexBuffer(5, geometry.joints1Buffer!);
                        pass.setVertexBuffer(6, geometry.weights1Buffer!);
                    }
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
                    const bytes = wasmInterop.bytes();
                    const mesh = items[k].mesh;
                    const skin = first.skinned ? mesh.skin : null;
                    if (skin) {
                        skin.ensureGpuResources(this.device, this.skinBindGroupLayout);
                        const jointCount = skin.jointCount | 0;
                        const jointMatPtr = frameArena.allocF32(jointCount * 16) as WasmPtr;
                        animf.computeJointMatricesTo(jointMatPtr, skin.skin.jointIndicesPtr, jointCount, skin.skin.invBindPtr, TransformStore.global().worldPtr as WasmPtr, skin.bindMatrixPtr);
                        this.queue.writeBuffer(skin.boneBuffer!, 0, bytes, jointMatPtr, jointCount * 64);
                        pass.setBindGroup(2, skin.bindGroup!);
                    }
                    const modelPtr = mesh.transform.worldMatrixPtr as WasmPtr;
                    const invPtr = this.modelUniformStagingPtr;
                    const normalPtr = (this.modelUniformStagingPtr + 16 * 4) as WasmPtr;
                    mat4f.invert(invPtr, modelPtr);
                    mat4f.transpose(normalPtr, invPtr);
                    this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
                    this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
                    pass.setBindGroup(0, globalBindGroup);
                    if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount);
                    else pass.draw(geometry.vertexCount);
                }
            }
            i = j;
        }
    }

    private executePointCloudDrawList(pass: GPURenderPassEncoder, items: PointCloudDrawItem[]): void {
        if (items.length === 0) return;
        const bytes = wasmInterop.bytes();
        const mat4 = mat4f;
        let lastPipeline: GPURenderPipeline | null = null;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const cloud = item.cloud;
            if (!cloud.visible) continue;
            if (cloud.pointCount <= 0) continue;
            this.ensurePointCloudBindGroup(cloud);
            if (!cloud.bindGroup) continue;
            if (item.pipeline !== lastPipeline) {
                pass.setPipeline(item.pipeline);
                lastPipeline = item.pipeline;
            }
            if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
            const modelSlot = this.modelBufferIndex++;
            const modelBuffer = this.modelUniformBuffers[modelSlot];
            const globalBindGroup = this.globalBindGroups[modelSlot];
            const modelPtr = cloud.transform.worldMatrixPtr as WasmPtr;
            const invPtr = this.modelUniformStagingPtr as WasmPtr;
            const normalPtr = (this.modelUniformStagingPtr + 16 * 4) as WasmPtr;
            mat4.invert(invPtr, modelPtr);
            mat4.transpose(normalPtr, invPtr);
            this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
            this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
            pass.setBindGroup(0, globalBindGroup);
            pass.setBindGroup(1, cloud.bindGroup);
            pass.draw(6, cloud.pointCount);
        }
    }

    private executeGlyphFieldDrawList(pass: GPURenderPassEncoder, list: GlyphDrawItem[]): void {
        if (list.length === 0) return;
        const bytes = wasmInterop.bytes();
        let lastPipeline: GPURenderPipeline | null = null;
        let lastGeometry: Geometry | null = null;
        let lastField: GlyphField | null = null;
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const field = item.field;
            const geometry = item.geometry;
            if (!field.visible) continue;
            if (field.instanceCount <= 0) continue;
            this.ensureGlyphFieldBindGroup(field);
            if (!field.bindGroup) continue;
            if (item.pipeline !== lastPipeline) {
                pass.setPipeline(item.pipeline);
                lastPipeline = item.pipeline;
                lastGeometry = null;
                lastField = null;
            }
            if (geometry !== lastGeometry) {
                geometry.upload(this.device);
                pass.setVertexBuffer(0, geometry.positionBuffer);
                pass.setVertexBuffer(1, geometry.normalBuffer);
                if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
                lastGeometry = geometry;
            }
            if (field !== lastField) {
                pass.setBindGroup(1, field.bindGroup);
                lastField = field;
            }
            if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
            const modelSlot = this.modelBufferIndex++;
            const modelBuffer = this.modelUniformBuffers[modelSlot];
            const globalBindGroup = this.globalBindGroups[modelSlot];
            const modelPtr = field.transform.worldMatrixPtr as WasmPtr;
            const invPtr = this.modelUniformStagingPtr;
            const normalPtr = (this.modelUniformStagingPtr + 16 * 4) as WasmPtr;
            mat4f.invert(invPtr, modelPtr);
            mat4f.transpose(normalPtr, invPtr);
            this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
            this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
            pass.setBindGroup(0, globalBindGroup);
            if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, field.instanceCount);
            else pass.draw(geometry.vertexCount, field.instanceCount);
        }
    }

    private executeTransparentMergedDrawList(pass: GPURenderPassEncoder): void {
        this.transparentMergedDrawList.length = 0;
        for (const item of this.transparentDrawList) this.transparentMergedDrawList.push(item);
        for (const item of this.transparentGlyphFieldDrawList) this.transparentMergedDrawList.push(item);
        for (const item of this.transparentPointCloudDrawList) this.transparentMergedDrawList.push(item);
        if (this.transparentMergedDrawList.length === 0) return;
        const typeOrder = (x: TransparentDrawItem): number => {
            if ("mesh" in x) return 0;
            if ("field" in x) return 1;
            return 2;
        };
        this.transparentMergedDrawList.sort((a, b) => {
            const d0 = b.sortKey - a.sortKey;
            if (d0 !== 0) return d0;
            const d1 = a.pipelineId - b.pipelineId;
            if (d1 !== 0) return d1;
            const aIsMesh = "mesh" in a;
            const bIsMesh = "mesh" in b;
            if (aIsMesh && bIsMesh) {
                const am = a as DrawItem;
                const bm = b as DrawItem;
                return (
                    (am.materialId - bm.materialId) ||
                    (am.geometryId - bm.geometryId) ||
                    ((am.skinned ? 1 : 0) - (bm.skinned ? 1 : 0)) ||
                    ((am.skinned8 ? 1 : 0) - (bm.skinned8 ? 1 : 0))
                );
            }
            const aIsCloud = "cloud" in a;
            const bIsCloud = "cloud" in b;
            if (aIsCloud && bIsCloud) {
                const ap = a as PointCloudDrawItem;
                const bp = b as PointCloudDrawItem;
                return ap.cloudId - bp.cloudId;
            }
            const aIsGlyph = "field" in a;
            const bIsGlyph = "field" in b;
            if (aIsGlyph && bIsGlyph) {
                const ag = a as GlyphDrawItem;
                const bg = b as GlyphDrawItem;
                return (ag.geometryId - bg.geometryId) || (ag.fieldId - bg.fieldId);
            }
            return typeOrder(a) - typeOrder(b);
        });
        const bytes = wasmInterop.bytes();
        let lastPipeline: GPURenderPipeline | null = null;
        let lastMaterial: Material | null = null;
        let lastGeometry: Geometry | null = null;
        let lastSkinned: boolean = false;
        let lastSkinned8: boolean = false;
        let lastCloud: PointCloud | null = null;
        let lastGlyph: GlyphField | null = null;
        for (let i = 0; i < this.transparentMergedDrawList.length; i++) {
            const item = this.transparentMergedDrawList[i];
            if ("mesh" in item) {
                const drawItem = item as DrawItem;
                const mesh = drawItem.mesh;
                const geometry = drawItem.geometry;
                const material = drawItem.material;
                if (drawItem.pipeline !== lastPipeline) {
                    pass.setPipeline(drawItem.pipeline);
                    lastPipeline = drawItem.pipeline;
                    lastMaterial = null;
                    lastGeometry = null;
                    lastSkinned = false;
                    lastSkinned8 = false;
                    lastCloud = null;
                    lastGlyph = null;
                }
                if (geometry !== lastGeometry) geometry.upload(this.device);
                if (material !== lastMaterial) this.ensureMaterialBindGroup(material);
                if (material !== lastMaterial) {
                    pass.setBindGroup(1, material.bindGroup!);
                    lastMaterial = material;
                }
                if (geometry !== lastGeometry || drawItem.skinned !== lastSkinned || drawItem.skinned8 !== lastSkinned8) {
                    pass.setVertexBuffer(0, geometry.positionBuffer);
                    pass.setVertexBuffer(1, geometry.normalBuffer);
                    pass.setVertexBuffer(2, geometry.uvBuffer);
                    if (drawItem.skinned) {
                        pass.setVertexBuffer(3, geometry.jointsBuffer!);
                        pass.setVertexBuffer(4, geometry.weightsBuffer!);
                        if (drawItem.skinned8) {
                            pass.setVertexBuffer(5, geometry.joints1Buffer!);
                            pass.setVertexBuffer(6, geometry.weights1Buffer!);
                        }
                    }
                    if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
                    lastGeometry = geometry;
                    lastSkinned = drawItem.skinned;
                    lastSkinned8 = drawItem.skinned8;
                }
                if (drawItem.skinned) {
                    const skin = mesh.skin;
                    if (skin) {
                        skin.ensureGpuResources(this.device, this.skinBindGroupLayout);
                        const jointCount = skin.jointCount | 0;
                        const jointMatPtr = frameArena.allocF32(jointCount * 16) as WasmPtr;
                        animf.computeJointMatricesTo(
                            jointMatPtr,
                            skin.skin.jointIndicesPtr,
                            jointCount,
                            skin.skin.invBindPtr,
                            TransformStore.global().worldPtr as WasmPtr,
                            skin.bindMatrixPtr
                        );
                        this.queue.writeBuffer(skin.boneBuffer!, 0, bytes, jointMatPtr, jointCount * 64);
                        pass.setBindGroup(2, skin.bindGroup!);
                    }
                }
                if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
                const modelSlot = this.modelBufferIndex++;
                const modelBuffer = this.modelUniformBuffers[modelSlot];
                const globalBindGroup = this.globalBindGroups[modelSlot];
                const modelPtr = mesh.transform.worldMatrixPtr as WasmPtr;
                const invPtr = this.modelUniformStagingPtr;
                const normalPtr = (this.modelUniformStagingPtr + 16 * 4) as WasmPtr;
                mat4f.invert(invPtr, modelPtr);
                mat4f.transpose(normalPtr, invPtr);
                this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
                this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
                pass.setBindGroup(0, globalBindGroup);
                if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount);
                else pass.draw(geometry.vertexCount);
                continue;
            }
            if ("field" in item) {
                const drawItem = item as GlyphDrawItem;
                const field = drawItem.field;
                const geometry = drawItem.geometry;
                if (!field.visible) continue;
                if (field.instanceCount <= 0) continue;
                this.ensureGlyphFieldBindGroup(field);
                if (!field.bindGroup) continue;
                if (drawItem.pipeline !== lastPipeline) {
                    pass.setPipeline(drawItem.pipeline);
                    lastPipeline = drawItem.pipeline;
                    lastMaterial = null;
                    lastGeometry = null;
                    lastSkinned = false;
                    lastSkinned8 = false;
                    lastCloud = null;
                    lastGlyph = null;
                }
                if (geometry !== lastGeometry) {
                    geometry.upload(this.device);
                    pass.setVertexBuffer(0, geometry.positionBuffer);
                    pass.setVertexBuffer(1, geometry.normalBuffer);
                    if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
                    lastGeometry = geometry;
                }
                if (field !== lastGlyph) {
                    pass.setBindGroup(1, field.bindGroup);
                    lastGlyph = field;
                    lastCloud = null;
                    lastMaterial = null;
                }
                if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
                const modelSlot = this.modelBufferIndex++;
                const modelBuffer = this.modelUniformBuffers[modelSlot];
                const globalBindGroup = this.globalBindGroups[modelSlot];
                const modelPtr = field.transform.worldMatrixPtr as WasmPtr;
                const invPtr = this.modelUniformStagingPtr;
                const normalPtr = (this.modelUniformStagingPtr + 16 * 4) as WasmPtr;
                mat4f.invert(invPtr, modelPtr);
                mat4f.transpose(normalPtr, invPtr);
                this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
                this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
                pass.setBindGroup(0, globalBindGroup);
                if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, field.instanceCount);
                else pass.draw(geometry.vertexCount, field.instanceCount);
                continue;
            }
            const drawItem = item as PointCloudDrawItem;
            const cloud = drawItem.cloud;
            if (!cloud.visible) continue;
            if (cloud.pointCount <= 0) continue;
            this.ensurePointCloudBindGroup(cloud);
            if (!cloud.bindGroup) continue;
            if (drawItem.pipeline !== lastPipeline) {
                pass.setPipeline(drawItem.pipeline);
                lastPipeline = drawItem.pipeline;
                lastMaterial = null;
                lastGeometry = null;
                lastSkinned = false;
                lastSkinned8 = false;
                lastCloud = null;
                lastGlyph = null;
            }
            if (cloud !== lastCloud) {
                pass.setBindGroup(1, cloud.bindGroup);
                lastCloud = cloud;
                lastGlyph = null;
                lastMaterial = null;
            }
            if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
            const modelSlot = this.modelBufferIndex++;
            const modelBuffer = this.modelUniformBuffers[modelSlot];
            const globalBindGroup = this.globalBindGroups[modelSlot];
            const modelPtr = cloud.transform.worldMatrixPtr as WasmPtr;
            const invPtr = this.modelUniformStagingPtr;
            const normalPtr = (this.modelUniformStagingPtr + 16 * 4) as WasmPtr;
            mat4f.invert(invPtr, modelPtr);
            mat4f.transpose(normalPtr, invPtr);
            this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
            this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
            pass.setBindGroup(0, globalBindGroup);
            pass.draw(6, cloud.pointCount);
        }
    }


    private executeMeshPickDrawList(pass: GPURenderPassEncoder, items: DrawItem[]): void {
        const bytes = wasmInterop.bytes();
        let lastPipeline: GPURenderPipeline | null = null;
        let lastGeometry: Geometry | null = null;
        let lastSkinned = false;
        let lastSkinned8 = false;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const mesh = item.mesh;
            const geometry = item.geometry;
            if (!mesh.visible) continue;
            const pipeline = this.getOrCreatePickMeshPipeline(item.material, item.skinned, item.skinned8);
            if (pipeline !== lastPipeline) {
                pass.setPipeline(pipeline);
                lastPipeline = pipeline;
                lastGeometry = null;
                lastSkinned = false;
                lastSkinned8 = false;
            }
            if (geometry !== lastGeometry || item.skinned !== lastSkinned || item.skinned8 !== lastSkinned8) {
                geometry.upload(this.device);
                pass.setVertexBuffer(0, geometry.positionBuffer);
                if (item.skinned) {
                    pass.setVertexBuffer(3, geometry.jointsBuffer!);
                    pass.setVertexBuffer(4, geometry.weightsBuffer!);
                    if (item.skinned8) {
                        pass.setVertexBuffer(5, geometry.joints1Buffer!);
                        pass.setVertexBuffer(6, geometry.weights1Buffer!);
                    }
                }
                if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
                lastGeometry = geometry;
                lastSkinned = item.skinned;
                lastSkinned8 = item.skinned8;
            }
            if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
            const slot = this.modelBufferIndex++;
            const modelBuffer = this.modelUniformBuffers[slot];
            const globalBindGroup = this.globalBindGroups[slot];
            const modelPtr = mesh.transform.worldMatrixPtr as WasmPtr;
            const invPtr = this.modelUniformStagingPtr;
            const normalPtr = (this.modelUniformStagingPtr + 16 * 4) as WasmPtr;
            mat4f.invert(invPtr, modelPtr);
            mat4f.transpose(normalPtr, invPtr);
            this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
            this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
            this.writePickUniform(slot, this.getObjectId(mesh), 0);
            pass.setBindGroup(0, globalBindGroup);
            pass.setBindGroup(1, this.pickBindGroups[slot]);
            if (item.skinned) {
                const skin = mesh.skin;
                if (skin) {
                    skin.ensureGpuResources(this.device, this.skinBindGroupLayout);
                    const jointCount = skin.jointCount | 0;
                    const jointMatPtr = frameArena.allocF32(jointCount * 16) as WasmPtr;
                    animf.computeJointMatricesTo(
                        jointMatPtr,
                        skin.skin.jointIndicesPtr,
                        jointCount,
                        skin.skin.invBindPtr,
                        TransformStore.global().worldPtr as WasmPtr,
                        skin.bindMatrixPtr
                    );
                    this.queue.writeBuffer(skin.boneBuffer!, 0, bytes, jointMatPtr, jointCount * 64);
                    pass.setBindGroup(2, skin.bindGroup!);
                }
            }
            if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount);
            else pass.draw(geometry.vertexCount);
        }
    }

    private executePointCloudPickDrawList(pass: GPURenderPassEncoder, items: PointCloudDrawItem[]): void {
        const bytes = wasmInterop.bytes();
        let lastPipeline: GPURenderPipeline | null = null;
        let lastCloud: PointCloud | null = null;
        for (let i = 0; i < items.length; i++) {
            const cloud = items[i].cloud;
            if (!cloud.visible || cloud.pointCount <= 0) continue;
            this.ensurePointCloudBindGroup(cloud);
            if (!cloud.bindGroup) continue;
            const pipeline = this.getOrCreatePickPointCloudPipeline();
            if (pipeline !== lastPipeline) {
                pass.setPipeline(pipeline);
                lastPipeline = pipeline;
                lastCloud = null;
            }
            if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
            const slot = this.modelBufferIndex++;
            const modelBuffer = this.modelUniformBuffers[slot];
            const globalBindGroup = this.globalBindGroups[slot];
            const modelPtr = cloud.transform.worldMatrixPtr as WasmPtr;
            const invPtr = this.modelUniformStagingPtr;
            const normalPtr = (this.modelUniformStagingPtr + 16 * 4) as WasmPtr;
            mat4f.invert(invPtr, modelPtr);
            mat4f.transpose(normalPtr, invPtr);
            this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
            this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
            this.writePickUniform(slot, this.getObjectId(cloud), 0);
            pass.setBindGroup(0, globalBindGroup);
            if (cloud !== lastCloud) {
                pass.setBindGroup(1, cloud.bindGroup);
                lastCloud = cloud;
            }
            pass.setBindGroup(2, this.pickBindGroups[slot]);
            pass.draw(6, cloud.pointCount);
        }
    }

    private executeGlyphPickDrawList(pass: GPURenderPassEncoder, items: GlyphDrawItem[]): void {
        const bytes = wasmInterop.bytes();
        let lastPipeline: GPURenderPipeline | null = null;
        let lastGeometry: Geometry | null = null;
        let lastField: GlyphField | null = null;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const field = item.field;
            const geometry = item.geometry;
            if (!field.visible || field.instanceCount <= 0) continue;
            this.ensureGlyphFieldBindGroup(field);
            if (!field.bindGroup) continue;
            const pipeline = this.getOrCreatePickGlyphFieldPipeline(field);
            if (pipeline !== lastPipeline) {
                pass.setPipeline(pipeline);
                lastPipeline = pipeline;
                lastGeometry = null;
                lastField = null;
            }
            if (geometry !== lastGeometry) {
                geometry.upload(this.device);
                pass.setVertexBuffer(0, geometry.positionBuffer);
                if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer!, "uint32");
                lastGeometry = geometry;
            }
            if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
            const slot = this.modelBufferIndex++;
            const modelBuffer = this.modelUniformBuffers[slot];
            const globalBindGroup = this.globalBindGroups[slot];
            const modelPtr = field.transform.worldMatrixPtr as WasmPtr;
            const invPtr = this.modelUniformStagingPtr;
            const normalPtr = (this.modelUniformStagingPtr + 16 * 4) as WasmPtr;
            mat4f.invert(invPtr, modelPtr);
            mat4f.transpose(normalPtr, invPtr);
            this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
            this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
            this.writePickUniform(slot, this.getObjectId(field), 0);
            pass.setBindGroup(0, globalBindGroup);
            if (field !== lastField) {
                pass.setBindGroup(1, field.bindGroup);
                lastField = field;
            }
            pass.setBindGroup(2, this.pickBindGroups[slot]);
            if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, field.instanceCount);
            else pass.draw(geometry.vertexCount, field.instanceCount);
        }
    }

    private drawInstancedRun(pass: GPURenderPassEncoder, geometry: Geometry, material: Material, items: DrawItem[], start: number, count: number): void {
        const ptrsPtr = frameArena.alloc(count * 4, 4) as WasmPtr;
        const u32 = TransformStore.global().u32();
        const ptrsBase = ptrsPtr >>> 2;
        for (let i = 0; i < count; i++) u32[ptrsBase + i] = items[start + i].mesh.transform.worldMatrixPtr >>> 0;
        const outPtr = frameArena.allocF32(count * 32) as WasmPtr;
        transformf.packModelNormalMat4FromPtrs(outPtr, ptrsPtr, count);
        const outBytes = count * this.INSTANCE_STRIDE_BYTES;
        const dstOffset = this.instanceBufferOffset;
        const dstEnd = dstOffset + outBytes;
        this.ensureInstanceBuffer(dstEnd);
        const bytes = wasmInterop.bytes();
        this.queue.writeBuffer(this.instanceBuffer!, dstOffset, bytes, outPtr, outBytes);
        pass.setBindGroup(0, this.globalBindGroups[0]);
        pass.setVertexBuffer(3, this.instanceBuffer!, dstOffset, outBytes);
        if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, count);
        else pass.draw(geometry.vertexCount, count);
        this.instanceBufferOffset = dstEnd;
    }

    private getOrCreatePipeline(material: Material, instanced: boolean = false, skinned: boolean = false, skinned8: boolean = false): GPURenderPipeline {
        if (instanced && skinned) throw new Error("Renderer: instanced + skinned pipelines are not supported (attribute layout conflict).");
        if (skinned8 && !skinned) skinned = true;
        const key = this.getPipelineCacheKey(material, instanced, skinned, skinned8);
        let pipeline = this.pipelineCache.get(key);
        if (pipeline) return pipeline;
        const shaderCode = material.getShaderCode({ instanced, skinned, skinned8 });
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
        } else if (skinned8) {
            buffers = [
                { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
                { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
                { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: "uint16x4" }] },
                { arrayStride: 16, attributes: [{ shaderLocation: 4, offset: 0, format: "float32x4" }] },
                { arrayStride: 8, attributes: [{ shaderLocation: 5, offset: 0, format: "uint16x4" }] },
                { arrayStride: 16, attributes: [{ shaderLocation: 6, offset: 0, format: "float32x4" }] }
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

    private getOrCreatePickMeshPipeline(material: Material, skinned: boolean, skinned8: boolean): GPURenderPipeline {
        if (skinned8 && !skinned) skinned = true;
        const cullMode = this.getCullMode(material.cullMode);
        const key = `pick:mesh:${cullMode}:${skinned8 ? "skin8" : skinned ? "skin4" : "noskin"}`;
        const cached = this.pipelineCache.get(key);
        if (cached) return cached;
        const shaderCode = skinned8 ? pickMeshSkinned8WGSL : skinned ? pickMeshSkinnedWGSL : pickMeshWGSL;
        let shaderModule = this.shaderCache.get(shaderCode);
        if (!shaderModule) {
            shaderModule = this.device.createShaderModule({ code: shaderCode });
            this.shaderCache.set(shaderCode, shaderModule);
        }
        const bindGroupLayouts: GPUBindGroupLayout[] = [this.globalBindGroupLayout, this.getPickBindGroupLayout()];
        if (skinned) bindGroupLayouts.push(this.skinBindGroupLayout);
        const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts });
        let buffers: GPUVertexBufferLayout[];
        if (skinned8) {
            buffers = [
                { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: "uint16x4" }] },
                { arrayStride: 16, attributes: [{ shaderLocation: 4, offset: 0, format: "float32x4" }] },
                { arrayStride: 8, attributes: [{ shaderLocation: 5, offset: 0, format: "uint16x4" }] },
                { arrayStride: 16, attributes: [{ shaderLocation: 6, offset: 0, format: "float32x4" }] }
            ];
        } else if (skinned) {
            buffers = [
                { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
                { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: "uint16x4" }] },
                { arrayStride: 16, attributes: [{ shaderLocation: 4, offset: 0, format: "float32x4" }] }
            ];
        } else {
            buffers = [
                { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }
            ];
        }
        const pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: "vs_main",
                buffers
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fs_main",
                targets: [{ format: "rg32uint" }, { format: "r32float" }]
            },
            primitive: {
                topology: "triangle-list",
                cullMode,
                frontFace: "ccw"
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });
        this.pipelineCache.set(key, pipeline);
        return pipeline;
    }

    private getOrCreatePickPointCloudPipeline(): GPURenderPipeline {
        const key = "pick:pointcloud";
        const cached = this.pipelineCache.get(key);
        if (cached) return cached;
        let shaderModule = this.shaderCache.get(pickPointCloudWGSL);
        if (!shaderModule) {
            shaderModule = this.device.createShaderModule({ code: pickPointCloudWGSL });
            this.shaderCache.set(pickPointCloudWGSL, shaderModule);
        }
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.globalBindGroupLayout, this.getPointCloudBindGroupLayout(), this.getPickBindGroupLayout()]
        });
        const pipeline = this.device.createRenderPipeline({
            label: key,
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: "vs_main",
                buffers: []
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fs_main",
                targets: [{ format: "rg32uint" }, { format: "r32float" }]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "none"
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });
        this.pipelineCache.set(key, pipeline);
        return pipeline;
    }

    private getOrCreatePickGlyphFieldPipeline(field: GlyphField): GPURenderPipeline {
        const cullMode = this.getCullMode(field.cullMode);
        const key = `pick:glyphfield:${cullMode}`;
        const cached = this.pipelineCache.get(key);
        if (cached) return cached;
        let shaderModule = this.shaderCache.get(pickGlyphFieldWGSL);
        if (!shaderModule) {
            shaderModule = this.device.createShaderModule({ code: pickGlyphFieldWGSL });
            this.shaderCache.set(pickGlyphFieldWGSL, shaderModule);
        }
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.globalBindGroupLayout, this.getGlyphFieldBindGroupLayout(), this.getPickBindGroupLayout()]
        });
        const pipeline = this.device.createRenderPipeline({
            label: key,
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: "vs_main",
                buffers: [
                    {
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }]
                    }
                ]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fs_main",
                targets: [{ format: "rg32uint" }, { format: "r32float" }]
            },
            primitive: {
                topology: "triangle-list",
                cullMode
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });
        this.pipelineCache.set(key, pipeline);
        return pipeline;
    }

    private getPipelineCacheKey(material: Material, instanced: boolean, skinned: boolean, skinned8: boolean): string {
        const ctorId = this.getObjectId(material.constructor as unknown as object);
        const isBuiltin = material.constructor === UnlitMaterial || material.constructor === StandardMaterial || material.constructor === DataMaterial;
        const matKey = isBuiltin ? `${ctorId}` : `${ctorId}_${this.getObjectId(material)}`;
        return `${matKey}_${material.blendMode}_${material.cullMode}_${material.depthWrite}_${material.depthTest}_${instanced ? "inst" : "mesh"}_${skinned8 ? "skin8" : skinned ? "skin4" : "noskin"}`;
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
            const bc = material.baseColorTexture;
            return `unlit:${bc?.id ?? 0}:${bc?.revision ?? 0}`;
        }
        if (material instanceof StandardMaterial) {
            const bc = material.baseColorTexture;
            const mr = material.metallicRoughnessTexture;
            const n = material.normalTexture;
            const o = material.occlusionTexture;
            const e = material.emissiveTexture;
            return `standard:${bc?.id ?? 0}:${bc?.revision ?? 0}:${mr?.id ?? 0}:${mr?.revision ?? 0}:${n?.id ?? 0}:${n?.revision ?? 0}:${o?.id ?? 0}:${o?.revision ?? 0}:${e?.id ?? 0}:${e?.revision ?? 0}`;
        }
        if (material instanceof DataMaterial) {
            const bufId = material.dataBuffer ? this.getObjectId(material.dataBuffer) : 0;
            return `data:${bufId}:${material.getColormapKey()}`;
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
        if (material instanceof DataMaterial) {
            material.upload(this.device, this.queue);
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
            material.bindGroup = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: material.uniformBuffer } },
                    { binding: 1, resource: bc ? bc.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler },
                    { binding: 2, resource: bc ? bc.getView(this.device, this.queue, "srgb", this.fallbackWhiteViewSrgb) : this.fallbackWhiteViewSrgb },
                    { binding: 3, resource: mr ? mr.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler },
                    { binding: 4, resource: mr ? mr.getView(this.device, this.queue, "linear", this.fallbackMRViewLinear) : this.fallbackMRViewLinear },
                    { binding: 5, resource: n ? n.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler },
                    { binding: 6, resource: n ? n.getView(this.device, this.queue, "linear", this.fallbackNormalViewLinear) : this.fallbackNormalViewLinear },
                    { binding: 7, resource: o ? o.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler },
                    { binding: 8, resource: o ? o.getView(this.device, this.queue, "linear", this.fallbackOcclusionViewLinear) : this.fallbackOcclusionViewLinear },
                    { binding: 9, resource: e ? e.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler },
                    { binding: 10, resource: e ? e.getView(this.device, this.queue, "srgb", this.fallbackWhiteViewSrgb) : this.fallbackWhiteViewSrgb }
                ]
            });
            material.bindGroupKey = key;
            return;
        }
        if (material instanceof DataMaterial) {
            if (!this.dataMaterialDummyDataBuffer) {
                this.dataMaterialDummyDataBuffer = this.device.createBuffer({
                    size: 4,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
                });
                this.queue.writeBuffer(this.dataMaterialDummyDataBuffer, 0, new Uint8Array(4));
            }
            const dataBuffer = material.dataBuffer ?? this.dataMaterialDummyDataBuffer;
            const cmap = material.getColormapForBinding().getGPUResources(this.device, this.queue);
            material.bindGroup = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: material.uniformBuffer } },
                    { binding: 1, resource: { buffer: dataBuffer } },
                    { binding: 2, resource: cmap.sampler },
                    { binding: 3, resource: cmap.view }
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

    private getPointCloudBindGroupLayout(): GPUBindGroupLayout {
        if (this.pointCloudBindGroupLayout) return this.pointCloudBindGroupLayout;
        this.pointCloudBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "read-only-storage" }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform", minBindingSize: 240 }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    sampler: { type: "filtering" }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "float", viewDimension: "1d" }
                }
            ]
        });
        return this.pointCloudBindGroupLayout;
    }

    private getPointCloudPipelineCacheKey(cloud: PointCloud): string {
        return ["pointcloud", `blend=${cloud.blendMode}`, `depthTest=${cloud.depthTest ? 1 : 0}`, `depthWrite=${cloud.depthWrite ? 1 : 0}`, `fmt=${this.format}`].join("|");
    }

    private getOrCreatePointCloudPipeline(cloud: PointCloud): GPURenderPipeline {
        const key = this.getPointCloudPipelineCacheKey(cloud);
        const cached = this.pipelineCache.get(key);
        if (cached) return cached;
        let shaderModule = this.shaderCache.get(pointCloudWGSL);
        if (!shaderModule) {
            shaderModule = this.device.createShaderModule({ code: pointCloudWGSL });
            this.shaderCache.set(pointCloudWGSL, shaderModule);
        }
        const bindGroupLayout = this.getPointCloudBindGroupLayout();
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.globalBindGroupLayout, bindGroupLayout]
        });
        const blend = this.getBlendState(cloud.blendMode);
        const pipeline = this.device.createRenderPipeline({
            label: key,
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: "vs_main",
                buffers: []
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fs_main",
                targets: [
                    {
                        format: this.format,
                        blend
                    }
                ]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "none"
            },
            depthStencil: cloud.depthTest
                ? {
                    format: "depth24plus",
                    depthWriteEnabled: cloud.depthWrite,
                    depthCompare: "less"
                }
                : undefined
        });
        this.pipelineCache.set(key, pipeline);
        return pipeline;
    }

    private getPointCloudBindGroupKey(cloud: PointCloud): string {
        const points = cloud.pointsBuffer;
        const uniforms = cloud.uniformBuffer;
        return `pointcloud:${points ? this.getObjectId(points) : 0}:${uniforms ? this.getObjectId(uniforms) : 0}:${cloud.getColormapKey()}`;
    }

    private ensurePointCloudBindGroup(cloud: PointCloud): void {
        cloud.upload(this.device, this.queue);
        if (!cloud.pointsBuffer) return;
        if (cloud.pointCount <= 0) return;
        if (!cloud.uniformBuffer) {
            cloud.uniformBuffer = this.device.createBuffer({
                size: cloud.getUniformBufferSize(),
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            cloud.bindGroupKey = null;
        }
        if (cloud.dirtyUniforms) {
            const data = cloud.getUniformData();
            this.queue.writeBuffer(cloud.uniformBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
            cloud.markUniformsClean();
        }
        const key = this.getPointCloudBindGroupKey(cloud);
        if (cloud.bindGroup && cloud.bindGroupKey === key) return;
        const layout = this.getPointCloudBindGroupLayout();
        const cmapGPU = cloud.getColormapForBinding().getGPUResources(this.device, this.queue);
        cloud.bindGroup = this.device.createBindGroup({
            layout,
            entries: [
                { binding: 0, resource: { buffer: cloud.pointsBuffer } },
                { binding: 1, resource: { buffer: cloud.uniformBuffer } },
                { binding: 2, resource: cmapGPU.sampler },
                { binding: 3, resource: cmapGPU.view }
            ]
        });
        cloud.bindGroupKey = key;
    }

    private getGlyphFieldBindGroupLayout(): GPUBindGroupLayout {
        if (this.glyphFieldBindGroupLayout) return this.glyphFieldBindGroupLayout;
        this.glyphFieldBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "read-only-storage" }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform", minBindingSize: 240 }
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: "filtering" }
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "float", viewDimension: "1d" }
                }
            ]
        });
        return this.glyphFieldBindGroupLayout;
    }

    private getOrCreateGlyphFieldPipeline(field: GlyphField): GPURenderPipeline {
        const key = `glyphfield:${this.format}:${field.blendMode}:${field.depthWrite ? 1 : 0}:${field.depthTest ? 1 : 0}:${field.cullMode}`;
        const cached = this.pipelineCache.get(key);
        if (cached) return cached;
        const shaderCode = glyphFieldWGSL;
        let shaderModule = this.shaderCache.get(shaderCode);
        if (!shaderModule) {
            shaderModule = this.device.createShaderModule({ code: shaderCode });
            this.shaderCache.set(shaderCode, shaderModule);
        }
        const layout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.globalBindGroupLayout, this.getGlyphFieldBindGroupLayout()]
        });
        const pipeline = this.device.createRenderPipeline({
            layout,
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
                    }
                ]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fs_main",
                targets: [{ format: this.format, blend: this.getBlendState(field.blendMode) }]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: this.getCullMode(field.cullMode)
            },
            depthStencil: (field.depthTest || field.depthWrite)
                ? {
                    format: "depth24plus",
                    depthWriteEnabled: field.depthWrite,
                    depthCompare: field.depthTest ? "less" : "always"
                }
                : undefined
        });
        this.pipelineCache.set(key, pipeline);
        return pipeline;
    }

    private getGlyphFieldBindGroupKey(field: GlyphField): string {
        const p = field.positionsBuffer;
        const r = field.rotationsBuffer;
        const s = field.scalesBuffer;
        const a = field.attributesBuffer;
        const u = field.uniformBuffer;
        return `glyphfield:${p ? this.getObjectId(p) : 0}:${r ? this.getObjectId(r) : 0}:${s ? this.getObjectId(s) : 0}:${a ? this.getObjectId(a) : 0}:${u ? this.getObjectId(u) : 0}:${field.getColormapKey()}`;
    }

    private ensureGlyphFieldBindGroup(field: GlyphField): void {
        field.upload(this.device, this.queue);
        if (!field.positionsBuffer) return;
        if (!field.rotationsBuffer) return;
        if (!field.scalesBuffer) return;
        if (field.instanceCount <= 0) return;
        if (!field.uniformBuffer) {
            field.uniformBuffer = this.device.createBuffer({
                size: field.getUniformBufferSize(),
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            field.bindGroupKey = null;
        }
        if (field.dirtyUniforms) {
            const data = field.getUniformData();
            this.queue.writeBuffer(field.uniformBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
            field.markUniformsClean();
        }
        if (!field.attributesBuffer) {
            if (!this.glyphFieldDummyAttributesBuffer) {
                this.glyphFieldDummyAttributesBuffer = this.device.createBuffer({
                    size: 16,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
                });
            }
            field.attributesBuffer = this.glyphFieldDummyAttributesBuffer;
            field.bindGroupKey = null;
        }
        const key = this.getGlyphFieldBindGroupKey(field);
        if (field.bindGroup && field.bindGroupKey === key) return;
        const layout = this.getGlyphFieldBindGroupLayout();
        const cmapGPU = field.getColormapForBinding().getGPUResources(this.device, this.queue);
        field.bindGroup = this.device.createBindGroup({
            layout,
            entries: [
                { binding: 0, resource: { buffer: field.positionsBuffer } },
                { binding: 1, resource: { buffer: field.rotationsBuffer } },
                { binding: 2, resource: { buffer: field.scalesBuffer } },
                { binding: 3, resource: { buffer: field.attributesBuffer } },
                { binding: 4, resource: { buffer: field.uniformBuffer } },
                { binding: 5, resource: cmapGPU.sampler },
                { binding: 6, resource: cmapGPU.view }
            ]
        });
        field.bindGroupKey = key;
    }
}
