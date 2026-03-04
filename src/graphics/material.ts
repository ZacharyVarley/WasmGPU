import { Texture2D } from "./texture";
import { Colormap, type BuiltinColormapName } from "./colormap";
import { assert, createBuffer } from "../utils";
import unlitWGSL from "../wgsl/graphics/unlit.wgsl";
import unlitInstancedWGSL from "../wgsl/graphics/unlit-instanced.wgsl";
import unlitSkinnedWGSL from "../wgsl/graphics/unlit-skinned.wgsl";
import unlitSkinned8WGSL from "../wgsl/graphics/unlit-skinned8.wgsl";
import standardWGSL from "../wgsl/graphics/standard.wgsl";
import standardInstancedWGSL from "../wgsl/graphics/standard-instanced.wgsl";
import standardSkinnedWGSL from "../wgsl/graphics/standard-skinned.wgsl";
import standardSkinned8WGSL from "../wgsl/graphics/standard-skinned8.wgsl";
import dataWGSL from "../wgsl/graphics/data.wgsl";
import customDefaultVertexWGSL from "../wgsl/graphics/custom-default-vertex.wgsl";

export type Color = [number, number, number];
export type Color4 = [number, number, number, number];

export enum BlendMode {
    Opaque = "opaque",
    Transparent = "transparent",
    Additive = "additive"
}

export enum CullMode {
    None = "none",
    Back = "back",
    Front = "front"
}

export type MaterialDescriptor = {
    blendMode?: BlendMode;
    cullMode?: CullMode;
    depthWrite?: boolean;
    depthTest?: boolean;
};

export abstract class Material {
    readonly blendMode: BlendMode;
    readonly cullMode: CullMode;
    readonly depthWrite: boolean;
    readonly depthTest: boolean;
    pipeline: GPURenderPipeline | null = null;
    bindGroup: GPUBindGroup | null = null;
    bindGroupKey: string | null = null;
    uniformBuffer: GPUBuffer | null = null;
    protected _uniformDataCache: Float32Array | null = null;
    protected _dirty: boolean = true;

    constructor(descriptor: MaterialDescriptor = {}) {
        this.blendMode = descriptor.blendMode ?? BlendMode.Opaque;
        this.cullMode = descriptor.cullMode ?? CullMode.Back;
        this.depthWrite = descriptor.depthWrite ?? true;
        this.depthTest = descriptor.depthTest ?? true;
    }

    get dirty(): boolean {
        return this._dirty;
    }

    markClean(): void {
        this._dirty = false;
    }

    protected getUniformDataCache(floatCount: number): Float32Array {
        if (!this._uniformDataCache || this._uniformDataCache.length !== floatCount) this._uniformDataCache = new Float32Array(floatCount);
        return this._uniformDataCache;
    }

    abstract getUniformData(): Float32Array;
    abstract getShaderCode(opts?: { instanced?: boolean; skinned?: boolean; skinned8?: boolean }): string;
    abstract getUniformBufferSize(): number;
    abstract createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout;

    destroy(): void {
        this.uniformBuffer?.destroy();
        this.uniformBuffer = null;
        this.bindGroup = null;
        this.bindGroupKey = null;
        this.pipeline = null;
    }
}

export type UnlitMaterialDescriptor = MaterialDescriptor & {
    color?: Color;
    opacity?: number;
    baseColorTexture?: Texture2D | null;
    alphaCutoff?: number;
};

export class UnlitMaterial extends Material {
    private _color: Color;
    private _opacity: number;
    private _baseColorTexture: Texture2D | null;
    private _alphaCutoff: number;
    private static _cachedBindGroupLayout: GPUBindGroupLayout | null = null;
    private static _cachedLayoutDevice: GPUDevice | null = null;

    constructor(descriptor: UnlitMaterialDescriptor = {}) {
        super({
            ...descriptor,
            blendMode: descriptor.blendMode ?? ((descriptor.opacity ?? 1) < 1 ? BlendMode.Transparent : BlendMode.Opaque)
        });
        this._color = descriptor.color ?? [1, 1, 1];
        this._opacity = descriptor.opacity ?? 1;
        this._baseColorTexture = descriptor.baseColorTexture ?? null;
        this._alphaCutoff = descriptor.alphaCutoff ?? 0;
    }

    get color(): Color {
        return this._color;
    }

    set color(value: Color) {
        this._color = value;
        this._dirty = true;
    }

    get opacity(): number {
        return this._opacity;
    }

    set opacity(value: number) {
        this._opacity = value;
        this._dirty = true;
    }

    get baseColorTexture(): Texture2D | null {
        return this._baseColorTexture;
    }

    set baseColorTexture(value: Texture2D | null) {
        this._baseColorTexture = value;
        this._dirty = true;
    }

    get alphaCutoff(): number {
        return this._alphaCutoff;
    }

    set alphaCutoff(value: number) {
        this._alphaCutoff = value;
        this._dirty = true;
    }

    getUniformBufferSize(): number {
        return 32;
    }

    getUniformData(): Float32Array {
        const f = this.getUniformDataCache(8);
        f[0] = this._color[0];
        f[1] = this._color[1];
        f[2] = this._color[2];
        f[3] = this._opacity;
        f[4] = this._alphaCutoff;
        f[5] = 0;
        f[6] = 0;
        f[7] = 0;
        return f;
    }

    createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        if (UnlitMaterial._cachedBindGroupLayout && UnlitMaterial._cachedLayoutDevice === device) return UnlitMaterial._cachedBindGroupLayout;
        const layout = device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
            ]
        });
        UnlitMaterial._cachedBindGroupLayout = layout;
        UnlitMaterial._cachedLayoutDevice = device;
        return layout;
    }

    getShaderCode(opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string {
        if (opts.instanced) return unlitInstancedWGSL;
        if (opts.skinned8) return unlitSkinned8WGSL;
        if (opts.skinned) return unlitSkinnedWGSL;
        return unlitWGSL;
    }
}

export type StandardMaterialDescriptor = MaterialDescriptor & {
    color?: Color;
    opacity?: number;
    metallic?: number;
    roughness?: number;
    emissive?: Color;
    emissiveIntensity?: number;
    baseColorTexture?: Texture2D | null;
    metallicRoughnessTexture?: Texture2D | null;
    normalTexture?: Texture2D | null;
    occlusionTexture?: Texture2D | null;
    emissiveTexture?: Texture2D | null;
    normalScale?: number;
    occlusionStrength?: number;
    alphaCutoff?: number;
};

export class StandardMaterial extends Material {
    private _color: Color;
    private _opacity: number;
    private _metallic: number;
    private _roughness: number;
    private _emissive: Color;
    private _emissiveIntensity: number;
    private _baseColorTexture: Texture2D | null;
    private _metallicRoughnessTexture: Texture2D | null;
    private _normalTexture: Texture2D | null;
    private _occlusionTexture: Texture2D | null;
    private _emissiveTexture: Texture2D | null;
    private _normalScale: number;
    private _occlusionStrength: number;
    private _alphaCutoff: number;
    private static _cachedBindGroupLayout: GPUBindGroupLayout | null = null;
    private static _cachedLayoutDevice: GPUDevice | null = null;

    constructor(descriptor: StandardMaterialDescriptor = {}) {
        super({
            ...descriptor,
            blendMode: descriptor.blendMode ?? ((descriptor.opacity ?? 1) < 1 ? BlendMode.Transparent : BlendMode.Opaque)
        });
        this._color = descriptor.color ?? [1, 1, 1];
        this._opacity = descriptor.opacity ?? 1;
        this._metallic = descriptor.metallic ?? 0.0;
        this._roughness = descriptor.roughness ?? 1.0;
        this._emissive = descriptor.emissive ?? [0, 0, 0];
        this._emissiveIntensity = descriptor.emissiveIntensity ?? 0;
        this._baseColorTexture = descriptor.baseColorTexture ?? null;
        this._metallicRoughnessTexture = descriptor.metallicRoughnessTexture ?? null;
        this._normalTexture = descriptor.normalTexture ?? null;
        this._occlusionTexture = descriptor.occlusionTexture ?? null;
        this._emissiveTexture = descriptor.emissiveTexture ?? null;
        this._normalScale = descriptor.normalScale ?? 1;
        this._occlusionStrength = descriptor.occlusionStrength ?? 1;
        this._alphaCutoff = descriptor.alphaCutoff ?? 0;
    }

    get color(): Color {
        return this._color;
    }

    set color(value: Color) {
        this._color = value;
        this._dirty = true;
    }

    get opacity(): number {
        return this._opacity;
    }

    set opacity(value: number) {
        this._opacity = value;
        this._dirty = true;
    }

    get metallic(): number {
        return this._metallic;
    }

    set metallic(value: number) {
        this._metallic = Math.max(0, Math.min(1, value));
        this._dirty = true;
    }

    get roughness(): number {
        return this._roughness;
    }

    set roughness(value: number) {
        this._roughness = Math.max(0, Math.min(1, value));
        this._dirty = true;
    }

    get emissive(): Color {
        return this._emissive;
    }

    set emissive(value: Color) {
        this._emissive = value;
        this._dirty = true;
    }

    get emissiveIntensity(): number {
        return this._emissiveIntensity;
    }

    set emissiveIntensity(value: number) {
        this._emissiveIntensity = value;
        this._dirty = true;
    }

    get baseColorTexture(): Texture2D | null {
        return this._baseColorTexture;
    }

    set baseColorTexture(value: Texture2D | null) {
        this._baseColorTexture = value;
    }

    get metallicRoughnessTexture(): Texture2D | null {
        return this._metallicRoughnessTexture;
    }

    set metallicRoughnessTexture(value: Texture2D | null) {
        this._metallicRoughnessTexture = value;
    }

    get normalTexture(): Texture2D | null {
        return this._normalTexture;
    }

    set normalTexture(value: Texture2D | null) {
        this._normalTexture = value;
    }

    get occlusionTexture(): Texture2D | null {
        return this._occlusionTexture;
    }

    set occlusionTexture(value: Texture2D | null) {
        this._occlusionTexture = value;
    }

    get emissiveTexture(): Texture2D | null {
        return this._emissiveTexture;
    }

    set emissiveTexture(value: Texture2D | null) {
        this._emissiveTexture = value;
    }

    get normalScale(): number {
        return this._normalScale;
    }

    set normalScale(value: number) {
        this._normalScale = value;
        this._dirty = true;
    }

    get occlusionStrength(): number {
        return this._occlusionStrength;
    }

    set occlusionStrength(value: number) {
        this._occlusionStrength = value;
        this._dirty = true;
    }

    get alphaCutoff(): number {
        return this._alphaCutoff;
    }

    set alphaCutoff(value: number) {
        this._alphaCutoff = value;
        this._dirty = true;
    }

    getUniformBufferSize(): number {
        return 64;
    }

    getUniformData(): Float32Array {
        const f = this.getUniformDataCache(16);
        f[0] = this._color[0];
        f[1] = this._color[1];
        f[2] = this._color[2];
        f[3] = this._opacity;
        f[4] = this._emissive[0];
        f[5] = this._emissive[1];
        f[6] = this._emissive[2];
        f[7] = this._emissiveIntensity;
        f[8] = this._metallic;
        f[9] = this._roughness;
        f[10] = this._normalScale;
        f[11] = this._occlusionStrength;
        f[12] = this._alphaCutoff;
        f[13] = 0;
        f[14] = 0;
        f[15] = 0;
        return f;
    }

    createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        if (StandardMaterial._cachedBindGroupLayout && StandardMaterial._cachedLayoutDevice === device) return StandardMaterial._cachedBindGroupLayout;
        const layout = device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
                { binding: 5, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 6, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
                { binding: 7, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 8, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
                { binding: 9, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 10, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
            ]
        });
        StandardMaterial._cachedBindGroupLayout = layout;
        StandardMaterial._cachedLayoutDevice = device;
        return layout;
    }

    getShaderCode(opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string {
        if (opts.instanced) return standardInstancedWGSL;
        if (opts.skinned8) return standardSkinned8WGSL;
        if (opts.skinned) return standardSkinnedWGSL;
        return standardWGSL;
    }
}

export enum DataScaleMode {
    Linear = "linear",
    Log = "log",
    Symlog = "symlog"
}

export enum DataValueMode {
    Component = "component",
    Magnitude = "magnitude"
}

export type DataMaterialDescriptor = MaterialDescriptor & {
    data?: Float32Array;
    dataBuffer?: GPUBuffer | { buffer: GPUBuffer } | null;
    keepCPUData?: boolean;
    componentCount?: number;
    componentIndex?: number;
    valueMode?: DataValueMode;
    stride?: number;
    offset?: number;
    domainMin?: number;
    domainMax?: number;
    clipMin?: number;
    clipMax?: number;
    scaleMode?: DataScaleMode;
    symlogLinThresh?: number;
    logBase?: number;
    tMin?: number;
    tMax?: number;
    invert?: boolean;
    gamma?: number;
    opacity?: number;
    shading?: number;
    colormap?: BuiltinColormapName | Colormap;
};

export class DataMaterial extends Material {
    private _CPUData: Float32Array | null = null;
    private _keepCPUData: boolean = false;
    private _dataDirty: boolean = false;
    private _ownsDataBuffer: boolean = false;
    dataBuffer: GPUBuffer | null = null;
    private _componentCount: number = 1;
    private _componentIndex: number = 0;
    private _valueMode: DataValueMode = DataValueMode.Component;
    private _stride: number = 1;
    private _offset: number = 0;
    private _domainMin: number = 0;
    private _domainMax: number = 1;
    private _clipMin: number = 0;
    private _clipMax: number = 0;
    private _scaleMode: DataScaleMode = DataScaleMode.Linear;
    private _symlogLinThresh: number = 1;
    private _logBase: number = 10;
    private _tMin: number = 0;
    private _tMax: number = 1;
    private _invert: boolean = false;
    private _gamma: number = 1;
    private _opacity: number = 1;
    private _shading: number = 0;
    private _colormap: BuiltinColormapName | Colormap = "viridis";
    private static _cachedBindGroupLayout: GPUBindGroupLayout | null = null;
    private static _cachedLayoutDevice: GPUDevice | null = null;

    constructor(desc: DataMaterialDescriptor = {}) {
        super({
            ...desc,
            blendMode: desc.blendMode ?? ((desc.opacity ?? 1) < 1 ? BlendMode.Transparent : BlendMode.Opaque)
        });
        if (desc.keepCPUData !== undefined) this._keepCPUData = !!desc.keepCPUData;
        if (desc.componentCount !== undefined) this._componentCount = desc.componentCount;
        if (desc.componentIndex !== undefined) this._componentIndex = desc.componentIndex;
        if (desc.valueMode !== undefined) this._valueMode = desc.valueMode;
        if (desc.stride !== undefined) this._stride = desc.stride;
        if (desc.offset !== undefined) this._offset = desc.offset;
        if (desc.stride === undefined && desc.componentCount !== undefined) this._stride = this._componentCount;
        if (this._stride < this._componentCount) this._stride = this._componentCount;
        if (desc.domainMin !== undefined) this._domainMin = desc.domainMin;
        if (desc.domainMax !== undefined) this._domainMax = desc.domainMax;
        if (desc.clipMin !== undefined) this._clipMin = desc.clipMin;
        if (desc.clipMax !== undefined) this._clipMax = desc.clipMax;
        if (desc.scaleMode !== undefined) this._scaleMode = desc.scaleMode;
        if (desc.symlogLinThresh !== undefined) this._symlogLinThresh = desc.symlogLinThresh;
        if (desc.logBase !== undefined) this._logBase = desc.logBase;
        if (desc.tMin !== undefined) this._tMin = desc.tMin;
        if (desc.tMax !== undefined) this._tMax = desc.tMax;
        if (desc.invert !== undefined) this._invert = !!desc.invert;
        if (desc.gamma !== undefined) this._gamma = desc.gamma;
        if (desc.opacity !== undefined) this._opacity = desc.opacity;
        if (desc.shading !== undefined) this._shading = desc.shading;
        if (desc.colormap !== undefined) this._colormap = desc.colormap;
        if (desc.data) this.setData(desc.data, {
            keepCPUData: this._keepCPUData,
            componentCount: this._componentCount,
            stride: this._stride,
            offset: this._offset
        });
        if (desc.dataBuffer !== undefined && desc.dataBuffer !== null) {
            const b = (desc.dataBuffer as any).buffer ? (desc.dataBuffer as any).buffer : desc.dataBuffer;
            this.setDataBuffer(b as GPUBuffer, {
                componentCount: this._componentCount,
                stride: this._stride,
                offset: this._offset
            });
        }
    }

    get componentCount(): number {
        return this._componentCount;
    }

    set componentCount(v: number) {
        if (v === this._componentCount) return;
        this._componentCount = v;
        this._dirty = true;
    }

    get componentIndex(): number {
        return this._componentIndex;
    }

    set componentIndex(v: number) {
        if (v === this._componentIndex) return;
        this._componentIndex = v;
        this._dirty = true;
    }

    get valueMode(): DataValueMode {
        return this._valueMode;
    }

    set valueMode(v: DataValueMode) {
        if (v === this._valueMode) return;
        this._valueMode = v;
        this._dirty = true;
    }

    get stride(): number {
        return this._stride;
    }

    set stride(v: number) {
        if (v === this._stride) return;
        this._stride = v;
        this._dirty = true;
    }

    get offset(): number {
        return this._offset;
    }

    set offset(v: number) {
        if (v === this._offset) return;
        this._offset = v;
        this._dirty = true;
    }

    get domainMin(): number {
        return this._domainMin;
    }

    set domainMin(v: number) {
        if (v === this._domainMin) return;
        this._domainMin = v;
        this._dirty = true;
    }

    get domainMax(): number {
        return this._domainMax;
    }

    set domainMax(v: number) {
        if (v === this._domainMax) return;
        this._domainMax = v;
        this._dirty = true;
    }

    setDomain(min: number, max: number): void {
        this._domainMin = min;
        this._domainMax = max;
        this._dirty = true;
    }

    get clipMin(): number {
        return this._clipMin;
    }

    set clipMin(v: number) {
        if (v === this._clipMin) return;
        this._clipMin = v;
        this._dirty = true;
    }

    get clipMax(): number {
        return this._clipMax;
    }

    set clipMax(v: number) {
        if (v === this._clipMax) return;
        this._clipMax = v;
        this._dirty = true;
    }

    setClip(min: number, max: number): void {
        this._clipMin = min;
        this._clipMax = max;
        this._dirty = true;
    }

    get scaleMode(): DataScaleMode {
        return this._scaleMode;
    }

    set scaleMode(v: DataScaleMode) {
        if (v === this._scaleMode) return;
        this._scaleMode = v;
        this._dirty = true;
    }

    get symlogLinThresh(): number {
        return this._symlogLinThresh;
    }

    set symlogLinThresh(v: number) {
        if (v === this._symlogLinThresh) return;
        this._symlogLinThresh = v;
        this._dirty = true;
    }

    get logBase(): number {
        return this._logBase;
    }

    set logBase(v: number) {
        if (v === this._logBase) return;
        this._logBase = v;
        this._dirty = true;
    }

    get tMin(): number {
        return this._tMin;
    }

    set tMin(v: number) {
        if (v === this._tMin) return;
        this._tMin = v;
        this._dirty = true;
    }

    get tMax(): number {
        return this._tMax;
    }

    set tMax(v: number) {
        if (v === this._tMax) return;
        this._tMax = v;
        this._dirty = true;
    }

    get invert(): boolean {
        return this._invert;
    }

    set invert(v: boolean) {
        if (v === this._invert) return;
        this._invert = v;
        this._dirty = true;
    }

    get gamma(): number {
        return this._gamma;
    }

    set gamma(v: number) {
        if (v === this._gamma) return;
        this._gamma = v;
        this._dirty = true;
    }

    get opacity(): number {
        return this._opacity;
    }

    set opacity(v: number) {
        if (v === this._opacity) return;
        this._opacity = v;
        this._dirty = true;
    }

    get shading(): number {
        return this._shading;
    }

    set shading(v: number) {
        if (v === this._shading) return;
        this._shading = v;
        this._dirty = true;
    }

    get colormap(): BuiltinColormapName | Colormap {
        return this._colormap;
    }

    set colormap(v: BuiltinColormapName | Colormap) {
        this._colormap = v;
        this.bindGroupKey = null;
    }

    getColormapKey(): string {
        const c = this._colormap;
        return (c instanceof Colormap) ? `cm:${c.id}` : `cm:${c}`;
    }

    getColormapForBinding(): Colormap {
        const c = this._colormap;
        if (c instanceof Colormap) return c;
        return Colormap.builtin(c);
    }

    setData(data: Float32Array, opts: { keepCPUData?: boolean; componentCount?: number; stride?: number; offset?: number } = {}): void {
        assert(data.length > 0, "DataMaterial: data must be non-empty.");
        this._CPUData = data;
        this._dataDirty = true;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        if (opts.componentCount !== undefined) this._componentCount = opts.componentCount;
        if (opts.stride === undefined && opts.componentCount !== undefined) this._stride = this._componentCount;
        if (opts.stride !== undefined) this._stride = opts.stride;
        if (opts.offset !== undefined) this._offset = opts.offset;
        if (this._stride < this._componentCount) this._stride = this._componentCount;
        this._dirty = true;
        this.bindGroupKey = null;
    }

    setDataBuffer(buffer: GPUBuffer, opts: { componentCount?: number; stride?: number; offset?: number } = {}): void {
        this._CPUData = null;
        this.dataBuffer = buffer;
        this._ownsDataBuffer = false;
        this._dataDirty = false;
        if (opts.componentCount !== undefined) this._componentCount = opts.componentCount;
        if (opts.stride === undefined && opts.componentCount !== undefined) this._stride = this._componentCount;
        if (opts.stride !== undefined) this._stride = opts.stride;
        if (opts.offset !== undefined) this._offset = opts.offset;
        if (this._stride < this._componentCount) this._stride = this._componentCount;
        this._dirty = true;
        this.bindGroupKey = null;
    }

    dropCPUData(): void {
        this._CPUData = null;
    }

    computeDomainFromCPUData(): void {
        const data = this._CPUData;
        if (!data || data.length === 0) return;
        const cc = Math.max(1, Math.min(4, this._componentCount | 0));
        const stride = Math.max(cc, this._stride | 0);
        const offset = Math.max(0, this._offset | 0);
        const start = offset;
        if (start >= data.length) return;
        let minV = Number.POSITIVE_INFINITY;
        let maxV = Number.NEGATIVE_INFINITY;
        for (let i = start; i < data.length; i += stride) {
            let v = 0;
            if (this._valueMode === DataValueMode.Magnitude) {
                const x = data[i + 0] ?? 0;
                const y = (cc > 1) ? (data[i + 1] ?? 0) : 0;
                const z = (cc > 2) ? (data[i + 2] ?? 0) : 0;
                const w = (cc > 3) ? (data[i + 3] ?? 0) : 0;
                v = Math.hypot(x, y, z, w);
            } else {
                const cidx = Math.max(0, Math.min(3, this._componentIndex | 0));
                v = data[i + cidx] ?? 0;
            }
            if (!Number.isFinite(v)) continue;
            if (v < minV) minV = v;
            if (v > maxV) maxV = v;
        }

        if (minV === Number.POSITIVE_INFINITY || maxV === Number.NEGATIVE_INFINITY) return;
        this._domainMin = minV;
        this._domainMax = maxV;
        this._dirty = true;
    }

    computeClipFromCPUData(lowPercentile: number, highPercentile: number): void {
        const data = this._CPUData;
        if (!data || data.length === 0) return;
        const lp = Math.max(0, Math.min(100, lowPercentile));
        const hp = Math.max(0, Math.min(100, highPercentile));
        if (hp <= lp) return;
        const cc = Math.max(1, Math.min(4, this._componentCount | 0));
        const stride = Math.max(cc, this._stride | 0);
        const offset = Math.max(0, this._offset | 0);
        const start = offset;
        if (start >= data.length) return;
        const values: number[] = [];
        for (let i = start; i < data.length; i += stride) {
            let v = 0;
            if (this._valueMode === DataValueMode.Magnitude) {
                const x = data[i + 0] ?? 0;
                const y = (cc > 1) ? (data[i + 1] ?? 0) : 0;
                const z = (cc > 2) ? (data[i + 2] ?? 0) : 0;
                const w = (cc > 3) ? (data[i + 3] ?? 0) : 0;
                v = Math.hypot(x, y, z, w);
            } else {
                const cidx = Math.max(0, Math.min(3, this._componentIndex | 0));
                v = data[i + cidx] ?? 0;
            }
            if (!Number.isFinite(v)) continue;
            values.push(v);
        }
        if (values.length === 0) return;
        values.sort((a, b) => a - b);
        const idx = (p: number) => {
            const t = (p / 100) * (values.length - 1);
            const i0 = Math.floor(t);
            const i1 = Math.min(values.length - 1, i0 + 1);
            const f = t - i0;
            return values[i0] * (1 - f) + values[i1] * f;
        };
        this._clipMin = idx(lp);
        this._clipMax = idx(hp);
        this._dirty = true;
    }

    upload(device: GPUDevice, queue: GPUQueue): void {
        if (!this._dataDirty) return;
        if (this.dataBuffer && !this._CPUData) {
            this._dataDirty = false;
            return;
        }
        const data = this._CPUData;
        if (!data) {
            this._dataDirty = false;
            return;
        }
        const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
        if (!this.dataBuffer || !this._ownsDataBuffer) {
            this.dataBuffer = createBuffer(device, data, usage);
            this._ownsDataBuffer = true;
        } else {
            try {
                queue.writeBuffer(this.dataBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
            } catch {
                this.dataBuffer.destroy();
                this.dataBuffer = createBuffer(device, data, usage);
            }
        }
        if (!this._keepCPUData) this._CPUData = null;
        this._dataDirty = false;
        this.bindGroupKey = null;
    }

    getUniformBufferSize(): number {
        return 80;
    }

    getUniformData(): Float32Array {
        const f = this.getUniformDataCache(20);
        f[0] = Math.max(1, Math.min(4, Math.floor(this._componentCount)));
        f[1] = Math.max(0, Math.min(3, Math.floor(this._componentIndex)));
        f[2] = (this._valueMode === DataValueMode.Magnitude) ? 1 : 0;
        f[3] = Math.max(Math.max(1, Math.min(4, Math.floor(this._componentCount))), Math.floor(this._stride));
        f[4] = this._domainMin;
        f[5] = this._domainMax;
        f[6] = this._clipMin;
        f[7] = this._clipMax;
        f[8] = Math.max(0, Math.min(1, this._tMin));
        f[9] = Math.max(0, Math.min(1, this._tMax));
        f[10] = Math.max(1e-6, this._gamma);
        f[11] = this._invert ? 1 : 0;
        f[12] = (this._scaleMode === DataScaleMode.Log) ? 1 : (this._scaleMode === DataScaleMode.Symlog) ? 2 : 0;
        f[13] = Math.max(1e-6, this._symlogLinThresh);
        f[14] = Math.max(1.000001, this._logBase);
        f[15] = Math.max(0, Math.floor(this._offset));
        f[16] = Math.max(0, Math.min(1, this._opacity));
        f[17] = Math.max(0, Math.min(1, this._shading));
        f[18] = 0;
        f[19] = 0;
        return f;
    }

    createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        if (DataMaterial._cachedBindGroupLayout && DataMaterial._cachedLayoutDevice === device) return DataMaterial._cachedBindGroupLayout;
        const layout = device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float", viewDimension: "1d" } }
            ]
        });
        DataMaterial._cachedBindGroupLayout = layout;
        DataMaterial._cachedLayoutDevice = device;
        return layout;
    }

    getShaderCode(_opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string {
        return dataWGSL;
    }

    destroy(): void {
        super.destroy();
        if (this._ownsDataBuffer) this.dataBuffer?.destroy();
        this.dataBuffer = null;
        this._CPUData = null;
        this._dataDirty = false;
    }
}

export type UniformType = "f32" | "vec2f" | "vec3f" | "vec4f" | "mat4x4f";

export type UniformDefinition = {
    type: UniformType;
    value: number | number[];
};

export type CustomMaterialDescriptor = MaterialDescriptor & {
    vertexShader?: string;
    fragmentShader: string;
    uniforms?: Record<string, UniformDefinition>;
};

export class CustomMaterial extends Material {
    private _vertexShader: string;
    private _fragmentShader: string;
    private _uniforms: Record<string, UniformDefinition>;
    private _uniformLayout: { size: number; offsets: Record<string, number> } | null = null;
    private _cachedBindGroupLayout: GPUBindGroupLayout | null = null;
    private _cachedLayoutDevice: GPUDevice | null = null;

    constructor(descriptor: CustomMaterialDescriptor) {
        super(descriptor);
        this._vertexShader = descriptor.vertexShader ?? this.defaultVertexShader();
        this._fragmentShader = descriptor.fragmentShader;
        this._uniforms = descriptor.uniforms ?? {};
    }

    setUniform(name: string, value: number | number[]): void {
        if (this._uniforms[name]) {
            this._uniforms[name].value = value;
            this._dirty = true;
        }
    }

    getUniform(name: string): number | number[] | undefined {
        return this._uniforms[name]?.value;
    }

    private getUniformSize(type: UniformType): number {
        switch (type) {
            case "f32": return 4;
            case "vec2f": return 8;
            case "vec3f": return 12;
            case "vec4f": return 16;
            case "mat4x4f": return 64;
        }
    }

    private getUniformAlignment(type: UniformType): number {
        switch (type) {
            case "f32": return 4;
            case "vec2f": return 8;
            case "vec3f": return 16;
            case "vec4f": return 16;
            case "mat4x4f": return 16;
        }
    }

    private getUniformLayout(): { size: number; offsets: Record<string, number> } {
        if (this._uniformLayout) return this._uniformLayout;
        let offset = 0;
        const offsets: Record<string, number> = {};
        for (const [name, def] of Object.entries(this._uniforms)) {
            const align = this.getUniformAlignment(def.type);
            const size = this.getUniformSize(def.type);
            offset = this.alignTo(offset, align);
            offsets[name] = offset;
            offset += size;
        }
        const sizeBytes = Math.ceil(offset / 16) * 16 || 16;
        this._uniformLayout = { size: sizeBytes, offsets };
        return this._uniformLayout;
    }

    private alignTo(n: number, alignment: number): number {
        return (n + alignment - 1) & ~(alignment - 1);
    }

    getUniformBufferSize(): number {
        return this.getUniformLayout().size;
    }

    getUniformData(): Float32Array {
        const layout = this.getUniformLayout();
        const data = this.getUniformDataCache(layout.size / 4);
        data.fill(0);
        for (const [name, def] of Object.entries(this._uniforms)) {
            const floatOffset = layout.offsets[name] >>> 2;
            if (typeof def.value === "number") data[floatOffset] = def.value;
            else data.set(def.value as ArrayLike<number>, floatOffset);
        }
        return data;
    }

    createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        if (this._cachedBindGroupLayout && this._cachedLayoutDevice === device) return this._cachedBindGroupLayout;
        const layout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" }
                }
            ]
        });
        this._cachedBindGroupLayout = layout;
        this._cachedLayoutDevice = device;
        return layout;
    }

    private defaultVertexShader(): string {
        return customDefaultVertexWGSL;
    }

    getShaderCode(opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string {
        let uniformStruct = "struct CustomUniforms {\n";
        for (const [name, def] of Object.entries(this._uniforms)) uniformStruct += `    ${name}: ${def.type},\n`;
        uniformStruct += "};\n\n@group(1) @binding(0) var<uniform> custom: CustomUniforms;\n\n";
        return this._vertexShader + "\n" + uniformStruct + this._fragmentShader;
    }
}
