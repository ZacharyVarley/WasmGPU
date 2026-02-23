import { Texture2D } from "./texture";
import unlitWGSL from "../wgsl/graphics/unlit.wgsl";
import unlitInstancedWGSL from "../wgsl/graphics/unlit-instanced.wgsl";
import unlitSkinnedWGSL from "../wgsl/graphics/unlit-skinned.wgsl";
import unlitSkinned8WGSL from "../wgsl/graphics/unlit-skinned8.wgsl";
import standardWGSL from "../wgsl/graphics/standard.wgsl";
import standardInstancedWGSL from "../wgsl/graphics/standard-instanced.wgsl";
import standardSkinnedWGSL from "../wgsl/graphics/standard-skinned.wgsl";
import standardSkinned8WGSL from "../wgsl/graphics/standard-skinned8.wgsl";
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
