/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

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
import { SCALE_UNIFORM_FLOAT_COUNT, cloneScaleTransform, normalizeScaleTransform, packScaleTransform } from "../scaling";
import type { ScaleSourceDescriptor, ScaleTransform, ScaleTransformDescriptor } from "../scaling";

export type Color = [number, number, number];
export type Color4 = [number, number, number, number];

const clamp01 = (x: number): number => x < 0 ? 0 : x > 1 ? 1 : x;

export type TextureCoordinateSet = 0 | 1;

export type TextureTransformDescriptor = {
    offset?: [number, number];
    rotation?: number;
    scale?: [number, number];
    texCoord?: TextureCoordinateSet;
};

export type TextureTransform = Readonly<{
    offset: [number, number];
    rotation: number;
    scale: [number, number];
    texCoord: TextureCoordinateSet;
}>;

const normalizeTextureTransform = (descriptor?: TextureTransformDescriptor | null): TextureTransform => {
    const texCoord = descriptor?.texCoord === 1 ? 1 : 0;
    return {
        offset: [descriptor?.offset?.[0] ?? 0, descriptor?.offset?.[1] ?? 0],
        rotation: descriptor?.rotation ?? 0,
        scale: [descriptor?.scale?.[0] ?? 1, descriptor?.scale?.[1] ?? 1],
        texCoord
    };
};

const cloneTextureTransform = (transform: TextureTransform): TextureTransform => {
    return {
        offset: [transform.offset[0], transform.offset[1]],
        rotation: transform.rotation,
        scale: [transform.scale[0], transform.scale[1]],
        texCoord: transform.texCoord
    };
};

const packTextureTransform = (f: Float32Array, offset: number, transform: TextureTransform): void => {
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);
    f[offset + 0] = transform.offset[0];
    f[offset + 1] = transform.offset[1];
    f[offset + 2] = cos;
    f[offset + 3] = sin;
    f[offset + 4] = transform.scale[0];
    f[offset + 5] = transform.scale[1];
    f[offset + 6] = transform.texCoord;
    f[offset + 7] = 0;
};

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
    private _refCount: number = 1;
    private _destroyed: boolean = false;

    constructor(descriptor: MaterialDescriptor = {}) {
        this.blendMode = descriptor.blendMode ?? BlendMode.Opaque;
        this.cullMode = descriptor.cullMode ?? CullMode.Back;
        this.depthWrite = descriptor.depthWrite ?? true;
        this.depthTest = descriptor.depthTest ?? true;
    }

    get dirty(): boolean {
        return this._dirty;
    }

    protected assertAlive(action: string): void {
        if (this._destroyed) throw new Error(`Material: cannot ${action}; resource has already been released.`);
    }

    retain(): this {
        this.assertAlive("retain");
        this._refCount++;
        return this;
    }

    release(): void {
        if (this._destroyed) throw new Error("Material: release() called after the resource was already released.");
        if (this._refCount <= 0) throw new Error("Material: reference count underflow.");
        this._refCount--;
        if (this._refCount > 0) return;
        this._destroyed = true;
        this.disposeResources();
    }

    markClean(): void {
        this.assertAlive("markClean");
        this._dirty = false;
    }

    protected getUniformDataCache(floatCount: number): Float32Array {
        this.assertAlive("build uniform data");
        if (!this._uniformDataCache || this._uniformDataCache.length !== floatCount) this._uniformDataCache = new Float32Array(floatCount);
        return this._uniformDataCache;
    }

    abstract getUniformData(): Float32Array;
    abstract getShaderCode(opts?: { instanced?: boolean; skinned?: boolean; skinned8?: boolean }): string;
    abstract getUniformBufferSize(): number;
    abstract createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout;

    destroy(): void {
        this.release();
    }

    protected disposeResources(): void {
        this.uniformBuffer?.destroy();
        this.uniformBuffer = null;
        this.bindGroup = null;
        this.bindGroupKey = null;
        this.pipeline = null;
        this._uniformDataCache = null;
        this._dirty = true;
    }
}

export type UnlitMaterialDescriptor = MaterialDescriptor & {
    color?: Color;
    opacity?: number;
    baseColorTexture?: Texture2D | null;
    baseColorTextureTransform?: TextureTransformDescriptor | null;
    alphaCutoff?: number;
};

export class UnlitMaterial extends Material {
    private _color: Color;
    private _opacity: number;
    private _baseColorTexture: Texture2D | null;
    private _baseColorTextureTransform: TextureTransform;
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
        this._baseColorTextureTransform = normalizeTextureTransform(descriptor.baseColorTextureTransform);
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

    get baseColorTextureTransform(): TextureTransform {
        return cloneTextureTransform(this._baseColorTextureTransform);
    }

    set baseColorTextureTransform(value: TextureTransformDescriptor | null) {
        this._baseColorTextureTransform = normalizeTextureTransform(value);
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
        f[4] = this._alphaCutoff;
        f[5] = 0;
        f[6] = 0;
        f[7] = 0;
        packTextureTransform(f, 8, this._baseColorTextureTransform);
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

export type StandardMaterialClearcoatExtensionDescriptor = {
    factor?: number;
    texture?: Texture2D | null;
    roughness?: number;
    roughnessTexture?: Texture2D | null;
    normalTexture?: Texture2D | null;
    normalScale?: number;
};

export type StandardMaterialTransmissionExtensionDescriptor = {
    factor?: number;
    texture?: Texture2D | null;
};

export type StandardMaterialVolumeExtensionDescriptor = {
    thicknessFactor?: number;
    thicknessTexture?: Texture2D | null;
    attenuationDistance?: number;
    attenuationColor?: Color;
};

export type StandardMaterialSpecularExtensionDescriptor = {
    factor?: number;
    texture?: Texture2D | null;
    color?: Color;
    colorTexture?: Texture2D | null;
};

export type StandardMaterialSheenExtensionDescriptor = {
    color?: Color;
    colorTexture?: Texture2D | null;
    roughness?: number;
    roughnessTexture?: Texture2D | null;
};

export type StandardMaterialIridescenceExtensionDescriptor = {
    factor?: number;
    texture?: Texture2D | null;
    ior?: number;
    thicknessMinimum?: number;
    thicknessMaximum?: number;
    thicknessTexture?: Texture2D | null;
};

export type StandardMaterialAnisotropyExtensionDescriptor = {
    strength?: number;
    rotation?: number;
    texture?: Texture2D | null;
};

export type StandardMaterialIorExtensionDescriptor = {
    ior?: number;
};

export type StandardMaterialEmissiveStrengthExtensionDescriptor = {
    strength?: number;
};

export type StandardMaterialExtensionsDescriptor = {
    clearcoat?: StandardMaterialClearcoatExtensionDescriptor | null;
    transmission?: StandardMaterialTransmissionExtensionDescriptor | null;
    volume?: StandardMaterialVolumeExtensionDescriptor | null;
    specular?: StandardMaterialSpecularExtensionDescriptor | null;
    sheen?: StandardMaterialSheenExtensionDescriptor | null;
    iridescence?: StandardMaterialIridescenceExtensionDescriptor | null;
    anisotropy?: StandardMaterialAnisotropyExtensionDescriptor | null;
    ior?: StandardMaterialIorExtensionDescriptor | null;
    emissiveStrength?: StandardMaterialEmissiveStrengthExtensionDescriptor | null;
};

export type StandardMaterialClearcoatExtension = Readonly<{
    factor: number;
    texture: Texture2D | null;
    roughness: number;
    roughnessTexture: Texture2D | null;
    normalTexture: Texture2D | null;
    normalScale: number;
}>;

export type StandardMaterialTransmissionExtension = Readonly<{
    factor: number;
    texture: Texture2D | null;
}>;

export type StandardMaterialVolumeExtension = Readonly<{
    thicknessFactor: number;
    thicknessTexture: Texture2D | null;
    attenuationDistance: number;
    attenuationColor: Color;
}>;

export type StandardMaterialSpecularExtension = Readonly<{
    factor: number;
    texture: Texture2D | null;
    color: Color;
    colorTexture: Texture2D | null;
}>;

export type StandardMaterialSheenExtension = Readonly<{
    color: Color;
    colorTexture: Texture2D | null;
    roughness: number;
    roughnessTexture: Texture2D | null;
}>;

export type StandardMaterialIridescenceExtension = Readonly<{
    factor: number;
    texture: Texture2D | null;
    ior: number;
    thicknessMinimum: number;
    thicknessMaximum: number;
    thicknessTexture: Texture2D | null;
}>;

export type StandardMaterialAnisotropyExtension = Readonly<{
    strength: number;
    rotation: number;
    texture: Texture2D | null;
}>;

export type StandardMaterialIorExtension = Readonly<{
    ior: number;
}>;

export type StandardMaterialEmissiveStrengthExtension = Readonly<{
    strength: number;
}>;

export type StandardMaterialExtensions = Readonly<{
    clearcoat: StandardMaterialClearcoatExtension | null;
    transmission: StandardMaterialTransmissionExtension | null;
    volume: StandardMaterialVolumeExtension | null;
    specular: StandardMaterialSpecularExtension | null;
    sheen: StandardMaterialSheenExtension | null;
    iridescence: StandardMaterialIridescenceExtension | null;
    anisotropy: StandardMaterialAnisotropyExtension | null;
    ior: StandardMaterialIorExtension | null;
    emissiveStrength: StandardMaterialEmissiveStrengthExtension | null;
}>;

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
    baseColorTextureTransform?: TextureTransformDescriptor | null;
    metallicRoughnessTextureTransform?: TextureTransformDescriptor | null;
    normalTextureTransform?: TextureTransformDescriptor | null;
    occlusionTextureTransform?: TextureTransformDescriptor | null;
    emissiveTextureTransform?: TextureTransformDescriptor | null;
    normalScale?: number;
    occlusionStrength?: number;
    alphaCutoff?: number;
    extensions?: StandardMaterialExtensionsDescriptor;
};

export const enum StandardMaterialFeatureFlag {
    BaseColorTexture = 1 << 0,
    MetallicRoughnessTexture = 1 << 1,
    NormalTexture = 1 << 2,
    OcclusionTexture = 1 << 3,
    EmissiveTexture = 1 << 4,
    Clearcoat = 1 << 5,
    ClearcoatTexture = 1 << 6,
    ClearcoatRoughnessTexture = 1 << 7,
    ClearcoatNormalTexture = 1 << 8,
    Transmission = 1 << 9,
    TransmissionTexture = 1 << 10,
    Volume = 1 << 11,
    ThicknessTexture = 1 << 12,
    Specular = 1 << 13,
    SpecularTexture = 1 << 14,
    SpecularColorTexture = 1 << 15,
    Sheen = 1 << 16,
    SheenColorTexture = 1 << 17,
    SheenRoughnessTexture = 1 << 18,
    Iridescence = 1 << 19,
    IridescenceTexture = 1 << 20,
    IridescenceThicknessTexture = 1 << 21,
    Anisotropy = 1 << 22,
    AnisotropyTexture = 1 << 23,
    Ior = 1 << 24,
    EmissiveStrength = 1 << 25
}

const cloneColor = (value: Color | undefined, fallback: Color): Color => {
    return [value?.[0] ?? fallback[0], value?.[1] ?? fallback[1], value?.[2] ?? fallback[2]];
};

const normalizeStandardMaterialExtensions = (descriptor?: StandardMaterialExtensionsDescriptor): StandardMaterialExtensions => {
    return {
        clearcoat: descriptor?.clearcoat ? {
            factor: descriptor.clearcoat.factor ?? 0,
            texture: descriptor.clearcoat.texture ?? null,
            roughness: descriptor.clearcoat.roughness ?? 0,
            roughnessTexture: descriptor.clearcoat.roughnessTexture ?? null,
            normalTexture: descriptor.clearcoat.normalTexture ?? null,
            normalScale: descriptor.clearcoat.normalScale ?? 1
        } : null,
        transmission: descriptor?.transmission ? {
            factor: descriptor.transmission.factor ?? 0,
            texture: descriptor.transmission.texture ?? null
        } : null,
        volume: descriptor?.volume ? {
            thicknessFactor: descriptor.volume.thicknessFactor ?? 0,
            thicknessTexture: descriptor.volume.thicknessTexture ?? null,
            attenuationDistance: descriptor.volume.attenuationDistance ?? 0,
            attenuationColor: cloneColor(descriptor.volume.attenuationColor, [1, 1, 1])
        } : null,
        specular: descriptor?.specular ? {
            factor: descriptor.specular.factor ?? 1,
            texture: descriptor.specular.texture ?? null,
            color: cloneColor(descriptor.specular.color, [1, 1, 1]),
            colorTexture: descriptor.specular.colorTexture ?? null
        } : null,
        sheen: descriptor?.sheen ? {
            color: cloneColor(descriptor.sheen.color, [0, 0, 0]),
            colorTexture: descriptor.sheen.colorTexture ?? null,
            roughness: descriptor.sheen.roughness ?? 0,
            roughnessTexture: descriptor.sheen.roughnessTexture ?? null
        } : null,
        iridescence: descriptor?.iridescence ? {
            factor: descriptor.iridescence.factor ?? 0,
            texture: descriptor.iridescence.texture ?? null,
            ior: descriptor.iridescence.ior ?? 1.3,
            thicknessMinimum: descriptor.iridescence.thicknessMinimum ?? 100,
            thicknessMaximum: descriptor.iridescence.thicknessMaximum ?? 400,
            thicknessTexture: descriptor.iridescence.thicknessTexture ?? null
        } : null,
        anisotropy: descriptor?.anisotropy ? {
            strength: descriptor.anisotropy.strength ?? 0,
            rotation: descriptor.anisotropy.rotation ?? 0,
            texture: descriptor.anisotropy.texture ?? null
        } : null,
        ior: descriptor?.ior ? {
            ior: descriptor.ior.ior ?? 1.5
        } : null,
        emissiveStrength: descriptor?.emissiveStrength ? {
            strength: descriptor.emissiveStrength.strength ?? 1
        } : null
    };
};

const cloneStandardMaterialExtensions = (extensions: StandardMaterialExtensions): StandardMaterialExtensions => {
    return normalizeStandardMaterialExtensions(extensions);
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
    private _baseColorTextureTransform: TextureTransform;
    private _metallicRoughnessTextureTransform: TextureTransform;
    private _normalTextureTransform: TextureTransform;
    private _occlusionTextureTransform: TextureTransform;
    private _emissiveTextureTransform: TextureTransform;
    private _normalScale: number;
    private _occlusionStrength: number;
    private _alphaCutoff: number;
    private _extensions: StandardMaterialExtensions;
    private static _cachedBindGroupLayout: GPUBindGroupLayout | null = null;
    private static _cachedLayoutDevice: GPUDevice | null = null;
    private static readonly UNIFORM_FLOAT_COUNT = 56;
    private static readonly TEXTURE_BINDING_COUNT = 5;

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
        this._baseColorTextureTransform = normalizeTextureTransform(descriptor.baseColorTextureTransform);
        this._metallicRoughnessTextureTransform = normalizeTextureTransform(descriptor.metallicRoughnessTextureTransform);
        this._normalTextureTransform = normalizeTextureTransform(descriptor.normalTextureTransform);
        this._occlusionTextureTransform = normalizeTextureTransform(descriptor.occlusionTextureTransform);
        this._emissiveTextureTransform = normalizeTextureTransform(descriptor.emissiveTextureTransform);
        this._normalScale = descriptor.normalScale ?? 1;
        this._occlusionStrength = descriptor.occlusionStrength ?? 1;
        this._alphaCutoff = descriptor.alphaCutoff ?? 0;
        this._extensions = normalizeStandardMaterialExtensions(descriptor.extensions);
    }

    private invalidateBindings(): void {
        this.bindGroupKey = null;
        this._dirty = true;
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
        this.invalidateBindings();
    }

    get metallicRoughnessTexture(): Texture2D | null {
        return this._metallicRoughnessTexture;
    }

    set metallicRoughnessTexture(value: Texture2D | null) {
        this._metallicRoughnessTexture = value;
        this.invalidateBindings();
    }

    get normalTexture(): Texture2D | null {
        return this._normalTexture;
    }

    set normalTexture(value: Texture2D | null) {
        this._normalTexture = value;
        this.invalidateBindings();
    }

    get occlusionTexture(): Texture2D | null {
        return this._occlusionTexture;
    }

    set occlusionTexture(value: Texture2D | null) {
        this._occlusionTexture = value;
        this.invalidateBindings();
    }

    get emissiveTexture(): Texture2D | null {
        return this._emissiveTexture;
    }

    set emissiveTexture(value: Texture2D | null) {
        this._emissiveTexture = value;
        this.invalidateBindings();
    }

    get baseColorTextureTransform(): TextureTransform {
        return cloneTextureTransform(this._baseColorTextureTransform);
    }

    set baseColorTextureTransform(value: TextureTransformDescriptor | null) {
        this._baseColorTextureTransform = normalizeTextureTransform(value);
        this._dirty = true;
    }

    get metallicRoughnessTextureTransform(): TextureTransform {
        return cloneTextureTransform(this._metallicRoughnessTextureTransform);
    }

    set metallicRoughnessTextureTransform(value: TextureTransformDescriptor | null) {
        this._metallicRoughnessTextureTransform = normalizeTextureTransform(value);
        this._dirty = true;
    }

    get normalTextureTransform(): TextureTransform {
        return cloneTextureTransform(this._normalTextureTransform);
    }

    set normalTextureTransform(value: TextureTransformDescriptor | null) {
        this._normalTextureTransform = normalizeTextureTransform(value);
        this._dirty = true;
    }

    get occlusionTextureTransform(): TextureTransform {
        return cloneTextureTransform(this._occlusionTextureTransform);
    }

    set occlusionTextureTransform(value: TextureTransformDescriptor | null) {
        this._occlusionTextureTransform = normalizeTextureTransform(value);
        this._dirty = true;
    }

    get emissiveTextureTransform(): TextureTransform {
        return cloneTextureTransform(this._emissiveTextureTransform);
    }

    set emissiveTextureTransform(value: TextureTransformDescriptor | null) {
        this._emissiveTextureTransform = normalizeTextureTransform(value);
        this._dirty = true;
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

    get extensions(): StandardMaterialExtensions {
        return cloneStandardMaterialExtensions(this._extensions);
    }

    setExtensions(descriptor?: StandardMaterialExtensionsDescriptor): this {
        this._extensions = normalizeStandardMaterialExtensions(descriptor);
        return this;
    }

    getFeatureMask(): number {
        let mask = 0;
        if (this._baseColorTexture) mask |= StandardMaterialFeatureFlag.BaseColorTexture;
        if (this._metallicRoughnessTexture) mask |= StandardMaterialFeatureFlag.MetallicRoughnessTexture;
        if (this._normalTexture) mask |= StandardMaterialFeatureFlag.NormalTexture;
        if (this._occlusionTexture) mask |= StandardMaterialFeatureFlag.OcclusionTexture;
        if (this._emissiveTexture) mask |= StandardMaterialFeatureFlag.EmissiveTexture;
        const clearcoat = this._extensions.clearcoat;
        if (clearcoat) {
            mask |= StandardMaterialFeatureFlag.Clearcoat;
            if (clearcoat.texture) mask |= StandardMaterialFeatureFlag.ClearcoatTexture;
            if (clearcoat.roughnessTexture) mask |= StandardMaterialFeatureFlag.ClearcoatRoughnessTexture;
            if (clearcoat.normalTexture) mask |= StandardMaterialFeatureFlag.ClearcoatNormalTexture;
        }
        const transmission = this._extensions.transmission;
        if (transmission) {
            mask |= StandardMaterialFeatureFlag.Transmission;
            if (transmission.texture) mask |= StandardMaterialFeatureFlag.TransmissionTexture;
        }
        const volume = this._extensions.volume;
        if (volume) {
            mask |= StandardMaterialFeatureFlag.Volume;
            if (volume.thicknessTexture) mask |= StandardMaterialFeatureFlag.ThicknessTexture;
        }
        const specular = this._extensions.specular;
        if (specular) {
            mask |= StandardMaterialFeatureFlag.Specular;
            if (specular.texture) mask |= StandardMaterialFeatureFlag.SpecularTexture;
            if (specular.colorTexture) mask |= StandardMaterialFeatureFlag.SpecularColorTexture;
        }
        const sheen = this._extensions.sheen;
        if (sheen) {
            mask |= StandardMaterialFeatureFlag.Sheen;
            if (sheen.colorTexture) mask |= StandardMaterialFeatureFlag.SheenColorTexture;
            if (sheen.roughnessTexture) mask |= StandardMaterialFeatureFlag.SheenRoughnessTexture;
        }
        const iridescence = this._extensions.iridescence;
        if (iridescence) {
            mask |= StandardMaterialFeatureFlag.Iridescence;
            if (iridescence.texture) mask |= StandardMaterialFeatureFlag.IridescenceTexture;
            if (iridescence.thicknessTexture) mask |= StandardMaterialFeatureFlag.IridescenceThicknessTexture;
        }
        const anisotropy = this._extensions.anisotropy;
        if (anisotropy) {
            mask |= StandardMaterialFeatureFlag.Anisotropy;
            if (anisotropy.texture) mask |= StandardMaterialFeatureFlag.AnisotropyTexture;
        }
        if (this._extensions.ior) mask |= StandardMaterialFeatureFlag.Ior;
        if (this._extensions.emissiveStrength) mask |= StandardMaterialFeatureFlag.EmissiveStrength;
        return mask >>> 0;
    }

    getUniformBufferSize(): number {
        return StandardMaterial.UNIFORM_FLOAT_COUNT * 4;
    }

    getUniformData(): Float32Array {
        const f = this.getUniformDataCache(StandardMaterial.UNIFORM_FLOAT_COUNT);
        f.fill(0);
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
        packTextureTransform(f, 16, this._baseColorTextureTransform);
        packTextureTransform(f, 24, this._metallicRoughnessTextureTransform);
        packTextureTransform(f, 32, this._normalTextureTransform);
        packTextureTransform(f, 40, this._occlusionTextureTransform);
        packTextureTransform(f, 48, this._emissiveTextureTransform);
        return f;
    }

    createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        if (StandardMaterial._cachedBindGroupLayout && StandardMaterial._cachedLayoutDevice === device) return StandardMaterial._cachedBindGroupLayout;
        const entries: GPUBindGroupLayoutEntry[] = [ { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } } ];
        for (let i = 0; i < StandardMaterial.TEXTURE_BINDING_COUNT; i++) {
            const samplerBinding = 1 + (i * 2);
            entries.push({ binding: samplerBinding, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } });
            entries.push({ binding: samplerBinding + 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } });
        }
        const layout = device.createBindGroupLayout({ entries });
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

export type DataMaterialDescriptor = MaterialDescriptor & {
    data?: Float32Array;
    dataBuffer?: GPUBuffer | { buffer: GPUBuffer } | null;
    keepCPUData?: boolean;
    scaleTransform: ScaleTransformDescriptor;
    opacity?: number;
    shading?: number;
    colormap?: BuiltinColormapName | Colormap;
};

export type DataMaterialVisualChangeKind = "scale" | "colormap" | "visual";

export class DataMaterial extends Material {
    private _CPUData: Float32Array | null = null;
    private _keepCPUData: boolean = false;
    private _dataDirty: boolean = false;
    private _ownsDataBuffer: boolean = false;
    dataBuffer: GPUBuffer | null = null;
    private _elementCount: number = 0;
    private _scaleTransform: ScaleTransform;
    private _opacity: number = 1;
    private _shading: number = 0;
    private _colormap: BuiltinColormapName | Colormap = "viridis";
    private _scaleRevision: number = 0;
    private readonly _visualChangeListeners: Set<(kind: DataMaterialVisualChangeKind) => void> = new Set();
    private static _cachedBindGroupLayout: GPUBindGroupLayout | null = null;
    private static _cachedLayoutDevice: GPUDevice | null = null;

    constructor(desc: DataMaterialDescriptor) {
        assert(!!desc && !!desc.scaleTransform, "DataMaterial: scaleTransform is required.");
        super({
            ...desc,
            blendMode: desc.blendMode ?? ((desc.opacity ?? 1) < 1 ? BlendMode.Transparent : BlendMode.Opaque)
        });
        this._scaleTransform = normalizeScaleTransform(desc.scaleTransform);
        if (desc.keepCPUData !== undefined) this._keepCPUData = !!desc.keepCPUData;
        if (desc.opacity !== undefined) this._opacity = desc.opacity;
        if (desc.shading !== undefined) this._shading = desc.shading;
        if (desc.colormap !== undefined) this._colormap = desc.colormap;
        if (desc.data) this.setData(desc.data, { keepCPUData: this._keepCPUData });
        if (desc.dataBuffer !== undefined && desc.dataBuffer !== null) {
            const b = (desc.dataBuffer as { buffer?: GPUBuffer }).buffer ? (desc.dataBuffer as { buffer: GPUBuffer }).buffer : (desc.dataBuffer as GPUBuffer);
            this.setDataBuffer(b);
        }
    }

    get scaleTransform(): ScaleTransform {
        return cloneScaleTransform(this._scaleTransform);
    }

    setScaleTransform(transform: ScaleTransformDescriptor | ScaleTransform): void {
        this._scaleTransform = normalizeScaleTransform(transform);
        this._elementCount = this.recomputeElementCount();
        this._dirty = true;
        this.emitVisualChange("scale");
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
        this.emitVisualChange("colormap");
    }

    onVisualChange(listener: (kind: DataMaterialVisualChangeKind) => void): () => void {
        this._visualChangeListeners.add(listener);
        return () => {
            this._visualChangeListeners.delete(listener);
        };
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

    private computeElementCountFromFloatLength(floatLength: number): number {
        const stride = Math.max(1, Math.floor(this._scaleTransform.stride));
        const offset = Math.max(0, Math.floor(this._scaleTransform.offset));
        if (floatLength <= offset) return 0;
        return Math.max(0, Math.floor((floatLength - offset) / stride));
    }

    private recomputeElementCount(): number {
        if (this._CPUData) return this.computeElementCountFromFloatLength(this._CPUData.length);
        if (this.dataBuffer) return this.computeElementCountFromFloatLength(Math.floor(this.dataBuffer.size / 4));
        return 0;
    }

    setData(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void {
        assert(data.length > 0, "DataMaterial: data must be non-empty.");
        this._CPUData = data;
        this._dataDirty = true;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this._elementCount = this.computeElementCountFromFloatLength(data.length);
        this._scaleRevision++;
        this._dirty = true;
        this.bindGroupKey = null;
    }

    setDataBuffer(buffer: GPUBuffer): void {
        this._CPUData = null;
        this.dataBuffer = buffer;
        this._ownsDataBuffer = false;
        this._dataDirty = false;
        this._elementCount = this.computeElementCountFromFloatLength(Math.floor(buffer.size / 4));
        this._scaleRevision++;
        this._dirty = true;
        this.bindGroupKey = null;
    }

    dropCPUData(): void {
        this._CPUData = null;
    }

    getScaleSourceDescriptor(revision: number = this._scaleRevision): ScaleSourceDescriptor | null {
        if (!this.dataBuffer || this._elementCount <= 0) return null;
        return {
            buffer: this.dataBuffer,
            count: this._elementCount,
            componentCount: this._scaleTransform.componentCount,
            componentIndex: this._scaleTransform.componentIndex,
            valueMode: this._scaleTransform.valueMode,
            stride: this._scaleTransform.stride,
            offset: this._scaleTransform.offset,
            revision
        };
    }

    upload(device: GPUDevice, queue: GPUQueue): void {
        this.assertAlive("upload");
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
        this._elementCount = this.computeElementCountFromFloatLength(data.length);
        if (!this._keepCPUData) this._CPUData = null;
        this._dataDirty = false;
        this.bindGroupKey = null;
    }

    getUniformBufferSize(): number {
        return (SCALE_UNIFORM_FLOAT_COUNT + 4) * 4;
    }

    getUniformData(): Float32Array {
        const f = this.getUniformDataCache(SCALE_UNIFORM_FLOAT_COUNT + 4);
        f.fill(0);
        packScaleTransform(this._scaleTransform, f, 0);
        f[SCALE_UNIFORM_FLOAT_COUNT + 0] = clamp01(this._opacity);
        f[SCALE_UNIFORM_FLOAT_COUNT + 1] = clamp01(this._shading);
        f[SCALE_UNIFORM_FLOAT_COUNT + 2] = 0;
        f[SCALE_UNIFORM_FLOAT_COUNT + 3] = 0;
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

    private emitVisualChange(kind: DataMaterialVisualChangeKind): void {
        for (const listener of this._visualChangeListeners) {
            try {
                listener(kind);
            } catch { /* ignore */ }
        }
    }

    protected disposeResources(): void {
        super.disposeResources();
        if (this._ownsDataBuffer) this.dataBuffer?.destroy();
        this.dataBuffer = null;
        this._CPUData = null;
        this._dataDirty = false;
        this._elementCount = 0;
        this._visualChangeListeners.clear();
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
