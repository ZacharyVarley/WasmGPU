/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { wasm, mat4f, WasmPtr } from "../wasm";
import { Geometry, computeGeometryTangents, computeGeometryVertexNormals, type GeometryMorphTargetDescriptor } from "../graphics/geometry";
import { BlendMode, CullMode, Material, StandardMaterial, UnlitMaterial, type StandardMaterialExtensionsDescriptor, type TextureTransformDescriptor } from "../graphics/material";
import { Texture2D } from "../graphics/texture";
import { AnimationClip, Skin } from "../graphics/animation";
import { Camera, OrthographicCamera, PerspectiveCamera } from "../world/camera";
import { Scene } from "../world/scene";
import { Mesh, initializeMeshMorphRuntime } from "../world/mesh";
import { DirectionalLight, PointLight, SpotLight, bindLightToTransform, unbindLightTransform, type Light } from "../world/light";
import { Transform } from "../core/transform";
import type { GltfDocument, GltfAnimation, GltfAnimationChannel, GltfAnimationSampler, GltfAsset, GltfCamera, GltfExtensions, GltfExtras, GltfMaterial, GltfMesh, GltfNode, GltfPrimitive, GltfPrimitiveAttributes, GltfRoot, GltfScene, GltfSkin, KHRLightsPunctualLight, KHRLightsPunctualNode, KHRLightsPunctualRoot } from "./types";
import { decodeDataUri, isDataUri, resolveUri } from "./uri";
import { readAccessor, readAccessorAsFloat32, readAccessorAsUint16, readIndicesAsUint32 } from "./accessors";

export type ImportedSkin = {
    name?: string;
    joints: Transform[];
    inverseBindMatrices?: Float32Array;
    skeleton?: Transform;
    runtime: Skin | null;
};

export type ImportedAnimationSampler = {
    interpolation: "LINEAR" | "STEP" | "CUBICSPLINE";
    input: Float32Array;
    output: Float32Array;
};

export type ImportedAnimationChannel = {
    sampler: number;
    targetNode: Transform | null;
    path: "translation" | "rotation" | "scale" | "weights";
};

export type ImportedAnimation = {
    name?: string;
    samplers: ImportedAnimationSampler[];
    channels: ImportedAnimationChannel[];
    clip: AnimationClip | null;
};

export type GltfImportMetadataRecord = {
    index: number;
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
    xmp?: unknown | null;
};

export type GltfImportMeshPrimitiveMetadata = GltfImportMetadataRecord & {
    material?: number;
};

export type GltfImportMeshMetadata = GltfImportMetadataRecord & {
    primitives: GltfImportMeshPrimitiveMetadata[];
};

export type GltfImportMetadata = {
    asset: GltfImportMetadataRecord;
    scene: GltfImportMetadataRecord | null;
    nodes: GltfImportMetadataRecord[];
    meshes: GltfImportMeshMetadata[];
    materials: GltfImportMetadataRecord[];
    textures: GltfImportMetadataRecord[];
    images: GltfImportMetadataRecord[];
    cameras: GltfImportMetadataRecord[];
    skins: GltfImportMetadataRecord[];
    animations: GltfImportMetadataRecord[];
    extensions: GltfImportExtensionsMetadata;
    xmp: GltfImportXmpMetadata;
    variants: GltfImportVariantsMetadata;
};

export type GltfImportExtensionSupportState = "supported" | "partial" | "deferred" | "unsupported";

export type GltfImportExtensionsMetadata = {
    used: string[];
    required: string[];
    support: Record<string, GltfImportExtensionSupportState>;
};

export type GltfImportXmpMetadata = {
    packets: unknown[];
    packet: unknown | null;
};

export type GltfImportVariantItem = GltfImportMetadataRecord;

export type GltfImportVariantsMetadata = {
    readonly items: GltfImportVariantItem[];
    readonly names: string[];
    readonly activeName: string | null;
    readonly activeIndex: number | null;
    setActive(name: string | null): void;
    setActiveIndex(index: number | null): void;
    clear(): void;
};

export class GltfImportedNode {
    readonly index: number;
    name?: string;
    readonly transform: Transform;
    parentIndex: number | null;
    children: number[];
    meshes: Mesh[];
    camera: Camera | null;
    light: Light | null;
    private _visible: boolean;

    constructor(index: number, transform: Transform, source?: GltfNode) {
        this.index = index;
        this.name = source?.name;
        this.transform = transform;
        this.parentIndex = null;
        this.children = [...(source?.children ?? [])];
        this.meshes = [];
        this.camera = null;
        this.light = null;
        this._visible = true;
    }

    get visible(): boolean {
        return this._visible;
    }

    set visible(value: boolean) {
        this._visible = value;
        for (const mesh of this.meshes) mesh.visible = value;
        if (this.light) this.light.enabled = value;
    }
}

export type GltfImportResult = {
    scene: Scene;
    meshes: Mesh[];
    nodes: GltfImportedNode[];
    lights: Light[];
    cameras: Camera[];
    skins: ImportedSkin[];
    animations: ImportedAnimation[];
    clips: AnimationClip[];
    metadata: GltfImportMetadata;
    destroy(): void;
};

export type ImportGltfOptions = {
    sceneIndex?: number;
    targetScene?: Scene;
    addToScene?: boolean;
    computeMissingNormals?: boolean;
    importCameras?: boolean;
    importLights?: boolean;
    onWarning?: (message: string) => void;
};

const warn = (opts: ImportGltfOptions | undefined, msg: string): void => {
    opts?.onWarning?.(msg);
};

const getTextureInfoTexCoord = (info: any | undefined): number => {
    const transform = info?.extensions?.KHR_texture_transform;
    const texCoord = transform && typeof transform.texCoord === "number" ? transform.texCoord : info?.texCoord;
    return (texCoord ?? 0) | 0;
};

const validateMaterialTextureCoordinates = (mat: GltfMaterial | undefined, attrs: GltfPrimitiveAttributes, opts: ImportGltfOptions | undefined, context: string): void => {
    if (!mat) return;
    const validateInfo = (info: any | undefined, usage: string): void => {
        if (!info) return;
        const texCoord = getTextureInfoTexCoord(info);
        if (texCoord < 0 || texCoord > 1) {
            warn(opts, `${context}: texture usage '${usage}' references TEXCOORD_${texCoord}, but WasmGPU supports TEXCOORD_0 and TEXCOORD_1; using TEXCOORD_0.`);
            return;
        }
        if (attrs[`TEXCOORD_${texCoord}`] === undefined) warn(opts, `${context}: texture usage '${usage}' references missing TEXCOORD_${texCoord}; sampling will use zero coordinates.`);
    };
    validateInfo(mat.pbrMetallicRoughness?.baseColorTexture as any, "baseColor");
    validateInfo(mat.pbrMetallicRoughness?.metallicRoughnessTexture as any, "metallicRoughness");
    validateInfo(mat.normalTexture as any, "normal");
    validateInfo(mat.occlusionTexture as any, "occlusion");
    validateInfo(mat.emissiveTexture as any, "emissive");
    const specGloss = (mat.extensions as any)?.KHR_materials_pbrSpecularGlossiness as any;
    validateInfo(specGloss?.diffuseTexture as any, "diffuse");
    validateInfo(specGloss?.specularGlossinessTexture as any, "specularGlossiness");
    const clearcoat = (mat.extensions as any)?.KHR_materials_clearcoat as any;
    validateInfo(clearcoat?.clearcoatTexture as any, "clearcoat");
    validateInfo(clearcoat?.clearcoatRoughnessTexture as any, "clearcoatRoughness");
    validateInfo(clearcoat?.clearcoatNormalTexture as any, "clearcoatNormal");
    const specular = (mat.extensions as any)?.KHR_materials_specular as any;
    validateInfo(specular?.specularTexture as any, "specular");
    validateInfo(specular?.specularColorTexture as any, "specularColor");
};

const GL_NEAREST = 9728;
const GL_LINEAR = 9729;
const GL_NEAREST_MIPMAP_NEAREST = 9984;
const GL_LINEAR_MIPMAP_NEAREST = 9985;
const GL_NEAREST_MIPMAP_LINEAR = 9986;
const GL_LINEAR_MIPMAP_LINEAR = 9987;
const GL_CLAMP_TO_EDGE = 33071;
const GL_MIRRORED_REPEAT = 33648;
const GL_REPEAT = 10497;

const gltfWrapToAddressMode = (wrap: number | undefined): GPUAddressMode => {
    switch (wrap) {
        case GL_CLAMP_TO_EDGE: return "clamp-to-edge";
        case GL_MIRRORED_REPEAT: return "mirror-repeat";
        case GL_REPEAT:
        default:
            return "repeat";
    }
};

const gltfMagToFilterMode = (mag: number | undefined): GPUFilterMode => {
    switch (mag) {
        case GL_NEAREST: return "nearest";
        case GL_LINEAR:
        default:
            return "linear";
    }
};

const gltfMinToFilterModes = (min: number | undefined): { minFilter: GPUFilterMode; mipmapFilter: GPUMipmapFilterMode; useMipmaps: boolean } => {
    switch (min) {
        case GL_NEAREST: return { minFilter: "nearest", mipmapFilter: "nearest", useMipmaps: false };
        case GL_LINEAR: return { minFilter: "linear", mipmapFilter: "nearest", useMipmaps: false };
        case GL_NEAREST_MIPMAP_NEAREST: return { minFilter: "nearest", mipmapFilter: "nearest", useMipmaps: true };
        case GL_LINEAR_MIPMAP_NEAREST: return { minFilter: "linear", mipmapFilter: "nearest", useMipmaps: true };
        case GL_NEAREST_MIPMAP_LINEAR: return { minFilter: "nearest", mipmapFilter: "linear", useMipmaps: true };
        case GL_LINEAR_MIPMAP_LINEAR:
        default:
            return { minFilter: "linear", mipmapFilter: "linear", useMipmaps: true };
    }
};

const inferMimeTypeFromUri = (uri: string | undefined): string | undefined => {
    if (!uri) return undefined;
    const u = uri.toLowerCase();
    if (u.endsWith(".png")) return "image/png";
    if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
    if (u.endsWith(".webp")) return "image/webp";
    if (u.endsWith(".gif")) return "image/gif";
    return undefined;
};

const getSceneIndex = (json: GltfRoot, opts?: ImportGltfOptions): number => {
    if (opts?.sceneIndex !== undefined) return opts.sceneIndex | 0;
    if (json.scene !== undefined) return json.scene | 0;
    return 0;
};

const getKHRLightsFromRoot = (json: GltfRoot): KHRLightsPunctualRoot | null => {
    const ext = (json.extensions as unknown as Record<string, unknown> | undefined)?.["KHR_lights_punctual"];
    if (!ext) return null;
    return ext as KHRLightsPunctualRoot;
};

const getNodeKHRLight = (node: GltfNode): KHRLightsPunctualNode | null => {
    const ext = (node.extensions as unknown as Record<string, unknown> | undefined)?.["KHR_lights_punctual"];
    if (!ext) return null;
    return ext as KHRLightsPunctualNode;
};

const isMaterialUnlit = (mat: GltfMaterial): boolean => {
    const exts = mat.extensions as Record<string, unknown> | undefined;
    return !!exts?.["KHR_materials_unlit"];
};

let _tmpMat4Ptr: WasmPtr = 0;
let _tmpTRSPtr: WasmPtr = 0;

const ensureDecomposeScratch = (): void => {
    if (_tmpMat4Ptr !== 0 && _tmpTRSPtr !== 0) return;
    _tmpMat4Ptr = wasm.allocF32(16);
    _tmpTRSPtr = wasm.allocF32(10);
};

const applyNodeMatrixViaWasmDecompose = (t: { setPosition(x:number,y:number,z:number): any; setRotation(x:number,y:number,z:number,w:number): any; setScale(x:number,y:number,z:number): any }, m: ArrayLike<number>): void => {
    ensureDecomposeScratch();
    const mat = wasm.f32view(_tmpMat4Ptr, 16);
    for (let i = 0; i < 16; i++) mat[i] = (m[i] ?? (i % 5 === 0 ? 1 : 0)) as number;
    mat4f.decomposeTRS(_tmpTRSPtr, _tmpMat4Ptr);
    const out = wasm.f32view(_tmpTRSPtr, 10);
    t.setPosition(out[0]!, out[1]!, out[2]!);
    t.setRotation(out[3]!, out[4]!, out[5]!, out[6]!);
    t.setScale(out[7]!, out[8]!, out[9]!);
};

type GltfMetadataSource = {
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

const getXmpPacketIndex = (source: { extensions?: GltfExtensions } | undefined | null): number | null => {
    const ext = source?.extensions?.["KHR_xmp_json_ld"] as { packet?: number } | undefined;
    return typeof ext?.packet === "number" ? ext.packet : null;
};

const resolveXmpPacket = (packets: readonly unknown[], source: { extensions?: GltfExtensions } | undefined | null): unknown | null => {
    const packetIndex = getXmpPacketIndex(source);
    return packetIndex !== null && packetIndex >= 0 && packetIndex < packets.length ? packets[packetIndex] : null;
};

const buildMetadataRecord = (index: number, source: GltfMetadataSource | undefined | null, packets: readonly unknown[] = []): GltfImportMetadataRecord => {
    return {
        index,
        name: source?.name,
        extras: source?.extras,
        extensions: source?.extensions,
        xmp: resolveXmpPacket(packets, source)
    };
};

const buildMeshMetadata = (index: number, mesh: GltfMesh, packets: readonly unknown[]): GltfImportMeshMetadata => {
    return {
        ...buildMetadataRecord(index, mesh, packets),
        primitives: mesh.primitives.map((primitive, primitiveIndex) => ({
            ...buildMetadataRecord(primitiveIndex, primitive, packets),
            material: primitive.material
        }))
    };
};

type GltfVariantRegistration = {
    mesh: Mesh;
    baselineMaterial: Material;
    variants: Map<number, Material>;
    retainedMaterials: Material[];
};

type GltfVariantController = {
    public: GltfImportVariantsMetadata;
    register(mesh: Mesh, baselineMaterial: Material, variants?: Map<number, Material>): void;
    destroy(): void;
};

const GLTF_EXTENSION_SUPPORT_STATES: Record<string, GltfImportExtensionSupportState> = {
    KHR_lights_punctual: "supported",
    KHR_mesh_quantization: "supported",
    KHR_materials_unlit: "supported",
    KHR_materials_emissive_strength: "supported",
    KHR_materials_pbrSpecularGlossiness: "partial",
    KHR_materials_clearcoat: "supported",
    KHR_materials_transmission: "deferred",
    KHR_materials_volume: "deferred",
    KHR_materials_specular: "supported",
    KHR_materials_sheen: "deferred",
    KHR_materials_iridescence: "deferred",
    KHR_materials_anisotropy: "deferred",
    KHR_materials_ior: "supported",
    KHR_materials_variants: "supported",
    KHR_node_visibility: "deferred",
    KHR_animation_pointer: "deferred",
    KHR_xmp_json_ld: "supported",
    KHR_draco_mesh_compression: "unsupported",
    KHR_texture_transform: "supported"
};

const buildExtensionsMetadata = (json: GltfRoot): GltfImportExtensionsMetadata => {
    const used = [...(json.extensionsUsed ?? [])];
    const required = [...(json.extensionsRequired ?? [])];
    const names = new Set<string>([...used, ...required]);
    const support: Record<string, GltfImportExtensionSupportState> = {};
    for (const name of names) support[name] = GLTF_EXTENSION_SUPPORT_STATES[name] ?? "unsupported";
    return { used, required, support };
};

const buildXmpMetadata = (json: GltfRoot): GltfImportXmpMetadata => {
    const rootExt = (json.extensions as Record<string, unknown> | undefined)?.["KHR_xmp_json_ld"] as { packets?: unknown[] } | undefined;
    const packets = Array.isArray(rootExt?.packets) ? [...rootExt.packets] : [];
    const packet = resolveXmpPacket(packets, json.asset);
    return { packets, packet };
};

const createVariantsController = (initialItems: GltfImportVariantItem[] = []): GltfVariantController => {
    const items = [...initialItems];
    const registrations: GltfVariantRegistration[] = [];
    let activeIndex: number | null = null;
    const ensureKnownItem = (index: number): void => {
        if (items.some((item) => item.index === index)) return;
        items.push({ index, name: `variant_${index}` });
        items.sort((a, b) => a.index - b.index);
    };
    const findItemByName = (name: string): GltfImportVariantItem | undefined => items.find((item) => item.name === name);
    const getActiveName = (): string | null => activeIndex === null ? null : items.find((item) => item.index === activeIndex)?.name ?? `variant_${activeIndex}`;
    const applyVariant = (index: number | null): void => {
        activeIndex = index;
        for (const registration of registrations) {
            if (registration.mesh.destroyed) continue;
            const nextMaterial = index !== null ? registration.variants.get(index) ?? registration.baselineMaterial : registration.baselineMaterial;
            if (registration.mesh.material === nextMaterial) continue;
            nextMaterial.retain();
            registration.mesh.setMaterial(nextMaterial);
        }
    };
    return {
        public: {
            get items(): GltfImportVariantItem[] { return items.map((item) => ({ ...item })); },
            get names(): string[] { return items.map((item) => item.name ?? `variant_${item.index}`); },
            get activeName(): string | null { return getActiveName(); },
            get activeIndex(): number | null { return activeIndex; },
            setActive(name: string | null): void {
                if (name === null) {
                    applyVariant(null);
                    return;
                }
                const item = findItemByName(name);
                if (!item) throw new Error(`glTF variants: unknown variant '${name}'.`);
                applyVariant(item.index);
            },
            setActiveIndex(index: number | null): void {
                if (index === null) {
                    applyVariant(null);
                    return;
                }
                if (!items.some((item) => item.index === index)) throw new Error(`glTF variants: unknown variant index ${index}.`);
                applyVariant(index);
            },
            clear(): void { applyVariant(null); }
        },
        register(mesh: Mesh, baselineMaterial: Material, variants: Map<number, Material> = new Map()): void {
            if (variants.size === 0) return;
            const retainedMaterials = Array.from(new Set([baselineMaterial, ...variants.values()]));
            for (const material of retainedMaterials) material.retain();
            registrations.push({ mesh, baselineMaterial, variants, retainedMaterials });
            for (const index of variants.keys()) ensureKnownItem(index);
            if (activeIndex !== null) applyVariant(activeIndex);
        },
        destroy(): void {
            for (const registration of registrations) for (const material of registration.retainedMaterials) material.release();
            registrations.length = 0;
        }
    };
};

const getDeclaredVariants = (json: GltfRoot, packets: readonly unknown[]): GltfImportVariantItem[] => {
    const rootExt = (json.extensions as Record<string, unknown> | undefined)?.["KHR_materials_variants"] as { variants?: Array<{ name?: string; extras?: GltfExtras; extensions?: GltfExtensions }> } | undefined;
    const variants = Array.isArray(rootExt?.variants) ? rootExt.variants : [];
    return variants.map((variant, index) => ({
        ...buildMetadataRecord(index, variant, packets),
        name: variant?.name ?? `variant_${index}`
    }));
};

const buildImportMetadata = (json: GltfRoot, sceneIndex: number, extensions: GltfImportExtensionsMetadata, xmp: GltfImportXmpMetadata, variants: GltfImportVariantsMetadata): GltfImportMetadata => {
    const scene = json.scenes?.[sceneIndex];
    const packets = xmp.packets;
    return {
        asset: buildMetadataRecord(0, json.asset, packets),
        scene: scene ? buildMetadataRecord(sceneIndex, scene, packets) : null,
        nodes: (json.nodes ?? []).map((node, index) => buildMetadataRecord(index, node, packets)),
        meshes: (json.meshes ?? []).map((mesh, index) => buildMeshMetadata(index, mesh, packets)),
        materials: (json.materials ?? []).map((material, index) => buildMetadataRecord(index, material, packets)),
        textures: (json.textures ?? []).map((texture, index) => buildMetadataRecord(index, texture, packets)),
        images: (json.images ?? []).map((image, index) => buildMetadataRecord(index, image, packets)),
        cameras: (json.cameras ?? []).map((camera, index) => buildMetadataRecord(index, camera, packets)),
        skins: (json.skins ?? []).map((skin, index) => buildMetadataRecord(index, skin, packets)),
        animations: (json.animations ?? []).map((animation, index) => buildMetadataRecord(index, animation, packets)),
        extensions, xmp, variants
    };
};

const resolveMorphWeights = (weights: ReadonlyArray<number> | undefined, targetCount: number, opts: ImportGltfOptions | undefined, context: string): Float32Array => {
    const out = new Float32Array(targetCount);
    if (!weights || targetCount <= 0) return out;
    const srcCount = weights.length | 0;
    const copyCount = Math.min(srcCount, targetCount);
    for (let i = 0; i < copyCount; i++) out[i] = Number(weights[i] ?? 0) || 0;
    if (srcCount < targetCount) warn(opts, `${context}: morph weights length ${srcCount} is smaller than target count ${targetCount}; padding with zeros.`);
    else if (srcCount > targetCount) warn(opts, `${context}: morph weights length ${srcCount} exceeds target count ${targetCount}; truncating extra values.`);
    return out;
};

const normalizeWeightsTo4 = (weights: Float32Array): Float32Array => {
    const out = new Float32Array(weights);
    for (let i = 0; i < out.length; i += 4) {
        const w0 = out[i + 0] ?? 0;
        const w1 = out[i + 1] ?? 0;
        const w2 = out[i + 2] ?? 0;
        const w3 = out[i + 3] ?? 0;
        const sum = w0 + w1 + w2 + w3;
        if (sum > 0) {
            const inv = 1 / sum;
            out[i + 0] = w0 * inv;
            out[i + 1] = w1 * inv;
            out[i + 2] = w2 * inv;
            out[i + 3] = w3 * inv;
        } else {
            out[i + 0] = 1;
            out[i + 1] = 0;
            out[i + 2] = 0;
            out[i + 3] = 0;
        }
    }
    return out;
};

const normalizeWeightsTo8 = (weights0: Float32Array, weights1: Float32Array): { weights0: Float32Array; weights1: Float32Array } => {
    const out0 = new Float32Array(weights0);
    const out1 = new Float32Array(weights1);
    for (let i = 0; i < out0.length; i += 4) {
        const w0 = out0[i + 0] ?? 0;
        const w1 = out0[i + 1] ?? 0;
        const w2 = out0[i + 2] ?? 0;
        const w3 = out0[i + 3] ?? 0;
        const w4 = out1[i + 0] ?? 0;
        const w5 = out1[i + 1] ?? 0;
        const w6 = out1[i + 2] ?? 0;
        const w7 = out1[i + 3] ?? 0;
        const sum = w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7;
        if (sum > 0) {
            const inv = 1 / sum;
            out0[i + 0] = w0 * inv;
            out0[i + 1] = w1 * inv;
            out0[i + 2] = w2 * inv;
            out0[i + 3] = w3 * inv;
            out1[i + 0] = w4 * inv;
            out1[i + 1] = w5 * inv;
            out1[i + 2] = w6 * inv;
            out1[i + 3] = w7 * inv;
        } else {
            out0[i + 0] = 1;
            out0[i + 1] = 0;
            out0[i + 2] = 0;
            out0[i + 3] = 0;
            out1[i + 0] = 0;
            out1[i + 1] = 0;
            out1[i + 2] = 0;
            out1[i + 3] = 0;
        }
    }
    return { weights0: out0, weights1: out1 };
};

const triangulateStrip = (indices: Uint32Array): Uint32Array => {
    const tris: number[] = [];
    for (let i = 0; i + 2 < indices.length; i++) {
        const a = indices[i]!;
        const b = indices[i + 1]!;
        const c = indices[i + 2]!;
        if (a === b || b === c || a === c) continue;
        if ((i & 1) === 0) tris.push(a, b, c);
        else tris.push(b, a, c);
    }
    return new Uint32Array(tris);
};

const triangulateFan = (indices: Uint32Array): Uint32Array => {
    const tris: number[] = [];
    if (indices.length < 3) return new Uint32Array(0);
    const a0 = indices[0]!;
    for (let i = 1; i + 1 < indices.length; i++) {
        const b = indices[i]!;
        const c = indices[i + 1]!;
        if (a0 === b || b === c || a0 === c) continue;
        tris.push(a0, b, c);
    }
    return new Uint32Array(tris);
};

const getMaterialTangentTexCoords = (mat: GltfMaterial | undefined): number[] => {
    if (!mat || isMaterialUnlit(mat)) return [];
    const texCoords: number[] = [];
    const addInfo = (info: any | undefined): void => {
        if (!info) return;
        const texCoord = getTextureInfoTexCoord(info);
        const resolvedTexCoord = texCoord === 1 ? 1 : 0;
        if (!texCoords.includes(resolvedTexCoord)) texCoords.push(resolvedTexCoord);
    };
    addInfo(mat.normalTexture as any);
    const clearcoat = (mat.extensions as any)?.KHR_materials_clearcoat as any;
    addInfo(clearcoat?.clearcoatNormalTexture);
    return texCoords;
};

const getOrCreateMaterial = (doc: GltfDocument, json: GltfRoot, materialIndex: number | undefined, materialCache: Map<number, Material>, textureCache: Map<number, Texture2D>, opts?: ImportGltfOptions): Material => {
    if (materialIndex === undefined) return new StandardMaterial({});
    const existing = materialCache.get(materialIndex);
    if (existing) return existing.retain();
    const mat = json.materials?.[materialIndex];
    if (!mat) {
        const created = new StandardMaterial({});
        materialCache.set(materialIndex, created);
        return created;
    }
    const getOrCreateTextureByIndex = (textureIndex: number | undefined, usage: string): Texture2D | null => {
        if (textureIndex === undefined) return null;
        const cached = textureCache.get(textureIndex);
        if (cached) return cached;
        const texDef = json.textures?.[textureIndex];
        if (!texDef) {
            warn(opts, `glTF texture index ${textureIndex} missing (usage=${usage}).`);
            return null;
        }
        const imageIndex = texDef.source;
        const img = imageIndex !== undefined ? json.images?.[imageIndex] : undefined;
        if (imageIndex === undefined || !img) {
            warn(opts, `glTF texture ${textureIndex} has no valid source image (usage=${usage}).`);
            return null;
        }
        const sampler = texDef.sampler !== undefined ? json.samplers?.[texDef.sampler] : undefined;
        const addressModeU = gltfWrapToAddressMode(sampler?.wrapS);
        const addressModeV = gltfWrapToAddressMode(sampler?.wrapT);
        const magFilter = gltfMagToFilterMode(sampler?.magFilter);
        const { minFilter, mipmapFilter, useMipmaps } = gltfMinToFilterModes(sampler?.minFilter);
        let source: { kind: "bytes"; bytes: ArrayBuffer; mimeType?: string } | { kind: "url"; url: string; mimeType?: string } | null = null;
        const loadedBytes = doc.images?.[imageIndex];
        const mimeType = img.mimeType ?? inferMimeTypeFromUri(img.uri);
        if (loadedBytes) {
            source = { kind: "bytes", bytes: loadedBytes, mimeType };
        } else if (img.bufferView !== undefined) {
            const bv = json.bufferViews?.[img.bufferView];
            const buf = bv ? doc.buffers[bv.buffer] : undefined;
            if (bv && buf) {
                const start = (bv.byteOffset ?? 0) | 0;
                source = { kind: "bytes", bytes: buf.slice(start, start + bv.byteLength), mimeType };
            } else {
                warn(opts, `glTF image bufferView ${img.bufferView} missing (texture=${textureIndex}, usage=${usage}).`);
            }
        } else if (img.uri) {
            if (isDataUri(img.uri)) {
                const decoded = decodeDataUri(img.uri);
                source = { kind: "bytes", bytes: decoded.data, mimeType: mimeType ?? decoded.mimeType ?? undefined };
            } else {
                const url = resolveUri(doc.baseUrl, img.uri);
                source = { kind: "url", url, mimeType };
            }
        }
        if (!source) {
            warn(opts, `Could not resolve image source for texture=${textureIndex} (usage=${usage}).`);
            return null;
        }
        const created = Texture2D.createFrom({
            source,
            mipmaps: useMipmaps,
            sampler: {
                addressModeU,
                addressModeV,
                magFilter,
                minFilter,
                mipmapFilter
            }
        });
        textureCache.set(textureIndex, created);
        return created;
    };
    const getTex = (info: any | undefined, usage: string): Texture2D | null => {
        if (!info) return null;
        return getOrCreateTextureByIndex(info.index, usage);
    };
    const getTextureTransform = (info: any | undefined): TextureTransformDescriptor | null => {
        if (!info) return null;
        const ext = info.extensions as any;
        const transform = ext?.KHR_texture_transform as any;
        const texCoord = getTextureInfoTexCoord(info);
        const resolvedTexCoord = texCoord === 1 ? 1 : 0;
        if (!transform) return resolvedTexCoord === 1 ? { texCoord: 1 } : null;
        return {
            offset: [Number(transform.offset?.[0] ?? 0), Number(transform.offset?.[1] ?? 0)],
            rotation: Number(transform.rotation ?? 0),
            scale: [Number(transform.scale?.[0] ?? 1), Number(transform.scale?.[1] ?? 1)],
            texCoord: resolvedTexCoord
        };
    };
    const alphaMode = mat.alphaMode ?? "OPAQUE";
    const alphaCutoff = alphaMode === "MASK" ? (mat.alphaCutoff ?? 0.5) : 0;
    const blendMode = alphaMode === "BLEND" ? BlendMode.Transparent : BlendMode.Opaque;
    const cullMode = mat.doubleSided ? CullMode.None : CullMode.Back;
    const pbr = mat.pbrMetallicRoughness;
    const specGloss = (mat.extensions as any)?.KHR_materials_pbrSpecularGlossiness;
    if (!pbr && specGloss) {
        warn(opts, `Material '${mat.name ?? materialIndex}' uses KHR_materials_pbrSpecularGlossiness; approximating using diffuse as baseColor. Specular/glossiness are not fully supported yet.`);
        if (specGloss.specularGlossinessTexture) warn(opts, `Material '${mat.name ?? materialIndex}' has specularGlossinessTexture; currently ignored (highlights/roughness may look off).`);
    }
    const baseColorFactor = (pbr?.baseColorFactor ?? specGloss?.diffuseFactor ?? [1, 1, 1, 1]) as number[];
    const baseColorTextureInfo = (pbr?.baseColorTexture ?? specGloss?.diffuseTexture) as any;
    const baseColorTexture = getTex(baseColorTextureInfo, "baseColor");
    const baseColorTextureTransform = getTextureTransform(baseColorTextureInfo);
    let metallicFactor = 1;
    let roughnessFactor = 1;
    if (pbr) {
        metallicFactor = pbr.metallicFactor ?? 1;
        roughnessFactor = pbr.roughnessFactor ?? 1;
    } else if (specGloss) {
        metallicFactor = 0;
        const gloss = specGloss.glossinessFactor ?? 1;
        roughnessFactor = 1 - gloss;
        if (roughnessFactor < 0) roughnessFactor = 0;
        if (roughnessFactor > 1) roughnessFactor = 1;
    }
    const metallicRoughnessTextureInfo = pbr?.metallicRoughnessTexture as any;
    const normalTextureInfo = mat.normalTexture as any;
    const occlusionTextureInfo = mat.occlusionTexture as any;
    const emissiveTextureInfo = mat.emissiveTexture as any;
    const metallicRoughnessTexture = pbr ? getTex(metallicRoughnessTextureInfo, "metallicRoughness") : null;
    const metallicRoughnessTextureTransform = pbr ? getTextureTransform(metallicRoughnessTextureInfo) : null;
    const normalTexture = getTex(normalTextureInfo, "normal");
    const normalTextureTransform = getTextureTransform(normalTextureInfo);
    const occlusionTexture = getTex(occlusionTextureInfo, "occlusion");
    const occlusionTextureTransform = getTextureTransform(occlusionTextureInfo);
    const emissiveTexture = getTex(emissiveTextureInfo, "emissive");
    const emissiveTextureTransform = getTextureTransform(emissiveTextureInfo);
    const normalScale = mat.normalTexture?.scale ?? 1;
    const occlusionStrength = mat.occlusionTexture?.strength ?? 1;
    const emissiveFactor = mat.emissiveFactor ?? [0, 0, 0];
    const materialExtensions = (mat.extensions as any) ?? {};
    const emissiveStrengthExt = materialExtensions.KHR_materials_emissive_strength as { emissiveStrength?: number } | undefined;
    const emissiveStrength = emissiveStrengthExt?.emissiveStrength ?? 1;
    const clearcoatExt = materialExtensions.KHR_materials_clearcoat as any;
    const specularExt = materialExtensions.KHR_materials_specular as any;
    const iorExt = materialExtensions.KHR_materials_ior as { ior?: number } | undefined;
    const emissiveIntensity = 1;
    const standardMaterialExtensions: StandardMaterialExtensionsDescriptor = {};
    if (clearcoatExt) {
        standardMaterialExtensions.clearcoat = {
            factor: clearcoatExt.clearcoatFactor ?? 0,
            texture: getTex(clearcoatExt.clearcoatTexture, "clearcoat"),
            textureTransform: getTextureTransform(clearcoatExt.clearcoatTexture),
            roughness: clearcoatExt.clearcoatRoughnessFactor ?? 0,
            roughnessTexture: getTex(clearcoatExt.clearcoatRoughnessTexture, "clearcoatRoughness"),
            roughnessTextureTransform: getTextureTransform(clearcoatExt.clearcoatRoughnessTexture),
            normalTexture: getTex(clearcoatExt.clearcoatNormalTexture, "clearcoatNormal"),
            normalTextureTransform: getTextureTransform(clearcoatExt.clearcoatNormalTexture),
            normalScale: clearcoatExt.clearcoatNormalTexture?.scale ?? 1
        };
    }
    if (specularExt) {
        const specularColorFactor = Array.isArray(specularExt.specularColorFactor) ? specularExt.specularColorFactor : [1, 1, 1];
        standardMaterialExtensions.specular = {
            factor: specularExt.specularFactor ?? 1,
            texture: getTex(specularExt.specularTexture, "specular"),
            textureTransform: getTextureTransform(specularExt.specularTexture),
            color: [specularColorFactor[0] ?? 1, specularColorFactor[1] ?? 1, specularColorFactor[2] ?? 1],
            colorTexture: getTex(specularExt.specularColorTexture, "specularColor"),
            colorTextureTransform: getTextureTransform(specularExt.specularColorTexture)
        };
    }
    if (iorExt) standardMaterialExtensions.ior = { ior: iorExt.ior ?? 1.5 };
    if (emissiveStrengthExt) standardMaterialExtensions.emissiveStrength = { strength: emissiveStrength };
    const isUnlit = isMaterialUnlit(mat);
    const depthWrite = blendMode === BlendMode.Opaque;
    let created: Material;
    if (isUnlit) {
        created = new UnlitMaterial({
            color: [baseColorFactor[0] ?? 1, baseColorFactor[1] ?? 1, baseColorFactor[2] ?? 1],
            opacity: baseColorFactor[3] ?? 1,
            baseColorTexture,
            baseColorTextureTransform,
            alphaCutoff,
            blendMode,
            cullMode,
            depthWrite
        });
    } else {
        created = new StandardMaterial({
            color: [baseColorFactor[0] ?? 1, baseColorFactor[1] ?? 1, baseColorFactor[2] ?? 1],
            opacity: baseColorFactor[3] ?? 1,
            metallic: metallicFactor,
            roughness: roughnessFactor,
            emissive: [emissiveFactor[0] ?? 0, emissiveFactor[1] ?? 0, emissiveFactor[2] ?? 0],
            emissiveIntensity,
            baseColorTexture,
            metallicRoughnessTexture,
            normalTexture,
            occlusionTexture,
            emissiveTexture,
            baseColorTextureTransform,
            metallicRoughnessTextureTransform,
            normalTextureTransform,
            occlusionTextureTransform,
            emissiveTextureTransform,
            normalScale,
            occlusionStrength,
            alphaCutoff,
            extensions: Object.keys(standardMaterialExtensions).length > 0 ? standardMaterialExtensions : undefined,
            blendMode,
            cullMode,
            depthWrite
        });
    }
    materialCache.set(materialIndex, created);
    return created;
};

type PrimitiveVariantMaterials = {
    variants: Map<number, Material>;
    ownedMaterials: Material[];
};

const getPrimitiveVariantMaterials = (doc: GltfDocument, json: GltfRoot, prim: GltfPrimitive, materialCache: Map<number, Material>, textureCache: Map<number, Texture2D>, opts: ImportGltfOptions | undefined, context: string): PrimitiveVariantMaterials => {
    const ext = (prim.extensions as Record<string, unknown> | undefined)?.["KHR_materials_variants"] as { mappings?: Array<{ material?: number; variants?: number[] }> } | undefined;
    const mappings = Array.isArray(ext?.mappings) ? ext.mappings : [];
    const variantMaterialIndices = new Map<number, number>();
    for (const mapping of mappings) {
        if (typeof mapping.material !== "number" || !Number.isFinite(mapping.material) || !Array.isArray(mapping.variants)) continue;
        const materialIndex = mapping.material | 0;
        for (const variantIndex of mapping.variants) {
            if (typeof variantIndex !== "number" || !Number.isFinite(variantIndex)) continue;
            variantMaterialIndices.set(variantIndex | 0, materialIndex);
        }
    }
    const variants = new Map<number, Material>();
    const materialByIndex = new Map<number, Material>();
    for (const [variantIndex, materialIndex] of variantMaterialIndices) {
        let material = materialByIndex.get(materialIndex);
        if (!material) {
            validateMaterialTextureCoordinates(json.materials?.[materialIndex], prim.attributes, opts, `${context} variant material ${materialIndex}`);
            material = getOrCreateMaterial(doc, json, materialIndex, materialCache, textureCache, opts);
            materialByIndex.set(materialIndex, material);
        }
        variants.set(variantIndex, material);
    }
    return { variants, ownedMaterials: [...materialByIndex.values()] };
};

const buildGeometryFromPrimitive = (doc: GltfDocument, json: GltfRoot, prim: GltfPrimitive, computeMissingNormals: boolean, opts: ImportGltfOptions): Geometry | null => {
    const attrs = prim.attributes;
    const posAcc = attrs["POSITION"];
    if (posAcc === undefined) {
        warn(opts, "Primitive missing POSITION; skipping");
        return null;
    }
    const positions = readAccessorAsFloat32(doc, posAcc);
    let normals: Float32Array | null = null;
    const nAcc = attrs["NORMAL"];
    if (nAcc !== undefined) normals = readAccessorAsFloat32(doc, nAcc);
    let tangents: Float32Array | null = null;
    const tangentAcc = attrs["TANGENT"];
    if (tangentAcc !== undefined) tangents = readAccessorAsFloat32(doc, tangentAcc);
    let uvs: Float32Array | null = null;
    const uvAcc = attrs["TEXCOORD_0"];
    if (uvAcc !== undefined) uvs = readAccessorAsFloat32(doc, uvAcc);
    let uvs1: Float32Array | null = null;
    const uv1Acc = attrs["TEXCOORD_1"];
    if (uv1Acc !== undefined) uvs1 = readAccessorAsFloat32(doc, uv1Acc);
    let joints: Uint16Array | null = null;
    let weights: Float32Array | null = null;
    let joints1: Uint16Array | null = null;
    let weights1: Float32Array | null = null;
    const jAcc0 = attrs["JOINTS_0"];
    const wAcc0 = attrs["WEIGHTS_0"];
    const jAcc1 = attrs["JOINTS_1"];
    const wAcc1 = attrs["WEIGHTS_1"];
    if (jAcc0 !== undefined && wAcc0 !== undefined) {
        const joints0 = readAccessorAsUint16(doc, jAcc0);
        const weights0 = readAccessorAsFloat32(doc, wAcc0);
        if (jAcc1 !== undefined && wAcc1 !== undefined) {
            const joints1Raw = readAccessorAsUint16(doc, jAcc1);
            const weights1Raw = readAccessorAsFloat32(doc, wAcc1);
            if (joints1Raw.length === joints0.length && weights1Raw.length === weights0.length) {
                const norm = normalizeWeightsTo8(weights0, weights1Raw);
                joints = joints0;
                weights = norm.weights0;
                joints1 = joints1Raw;
                weights1 = norm.weights1;
            } else {
                warn(opts, "Primitive has JOINTS_1/WEIGHTS_1 but lengths don't match JOINTS_0/WEIGHTS_0; ignoring additional influences");
                joints = joints0;
                weights = normalizeWeightsTo4(weights0);
            }
        } else if (jAcc1 !== undefined || wAcc1 !== undefined) {
            warn(opts, "Primitive has JOINTS_1/WEIGHTS_1 mismatch; ignoring additional influences");
            joints = joints0;
            weights = normalizeWeightsTo4(weights0);
        } else {
            joints = joints0;
            weights = normalizeWeightsTo4(weights0);
        }
    } else if (jAcc0 !== undefined || wAcc0 !== undefined) {
        warn(opts, "Primitive has JOINTS_0/WEIGHTS_0 mismatch; ignoring skinning attributes for this primitive");
    }
    const mode = prim.mode ?? 4;
    let indices: Uint32Array | null = null;
    if (prim.indices !== undefined) {
        indices = readIndicesAsUint32(doc, prim.indices);
    } else {
        const vcount = (positions.length / 3) | 0;
        const seq = new Uint32Array(vcount);
        for (let i = 0; i < vcount; i++) seq[i] = i >>> 0;
        indices = mode === 4 ? null : seq;
    }
    if (mode === 5) {
        const idx = indices ?? new Uint32Array(0);
        indices = triangulateStrip(idx);
    } else if (mode === 6) {
        const idx = indices ?? new Uint32Array(0);
        indices = triangulateFan(idx);
    } else if (mode !== 4) {
        warn(opts, `Unsupported primitive mode=${mode} (only triangles/strip/fan supported); skipping primitive`);
        return null;
    }
    const morphTargets: GeometryMorphTargetDescriptor[] = [];
    if (prim.targets && prim.targets.length > 0) {
        for (let targetIndex = 0; targetIndex < prim.targets.length; targetIndex++) {
            const targetAttrs = prim.targets[targetIndex]!;
            const target: GeometryMorphTargetDescriptor = {};
            const targetPosAcc = targetAttrs["POSITION"];
            const targetNormalAcc = targetAttrs["NORMAL"];
            if (targetPosAcc !== undefined) {
                const targetPositions = readAccessorAsFloat32(doc, targetPosAcc);
                if (targetPositions.length === positions.length) target.positions = targetPositions;
                else warn(opts, `Primitive morph target ${targetIndex} POSITION length ${targetPositions.length} does not match base POSITION length ${positions.length}; ignoring POSITION deltas.`);
            }
            if (targetNormalAcc !== undefined) {
                const targetNormals = readAccessorAsFloat32(doc, targetNormalAcc);
                if (targetNormals.length === positions.length) target.normals = targetNormals;
                else warn(opts, `Primitive morph target ${targetIndex} NORMAL length ${targetNormals.length} does not match base NORMAL length ${positions.length}; ignoring NORMAL deltas.`);
            }
            if (targetAttrs["TANGENT"] !== undefined) warn(opts, `Primitive morph target ${targetIndex} provides TANGENT deltas; WasmGPU ignores tangent morph data.`);
            if (!target.positions && !target.normals) warn(opts, `Primitive morph target ${targetIndex} has no supported POSITION or NORMAL deltas; preserving target slot with no runtime effect.`);
            morphTargets.push(target);
        }
    }
    const tangentTexCoords = getMaterialTangentTexCoords(prim.material !== undefined ? json.materials?.[prim.material] : undefined);
    const tangentSpaceNeeded = tangentTexCoords.length > 0;
    if (!normals && (computeMissingNormals || tangentSpaceNeeded)) normals = computeGeometryVertexNormals(positions, indices);
    if (!tangents && tangentSpaceNeeded) {
        const tangentTexCoord = tangentTexCoords[0]!;
        if (tangentTexCoords.length > 1) warn(opts, "Primitive uses tangent-space textures on multiple texture coordinate sets; shader will fall back to derivative tangent space.");
        else {
            const tangentUvs = tangentTexCoord === 1 ? uvs1 : uvs;
            if (normals && tangentUvs) tangents = computeGeometryTangents(positions, normals, tangentUvs, indices);
            else warn(opts, `Primitive uses tangent-space material features but is missing NORMAL or TEXCOORD_${tangentTexCoord}; shader will fall back to derivative tangent space.`);
        }
    }
    return new Geometry({
        positions,
        normals: normals ?? undefined,
        tangents: tangents ?? undefined,
        uvs: uvs ?? undefined,
        uvs1: uvs1 ?? undefined,
        joints: joints ?? undefined,
        weights: weights ?? undefined,
        joints1: joints1 ?? undefined,
        weights1: weights1 ?? undefined,
        indices: indices ?? undefined,
        morphTargets,
        authoredNormals: nAcc !== undefined
    });
};

const instantiateMeshNode = (doc: GltfDocument, json: GltfRoot, nodeIndex: number, node: GltfNode, nodeT: Transform, materialCache: Map<number, Material>, textureCache: Map<number, Texture2D>, geometryCache: Map<string, Geometry | null>, variantsController: GltfVariantController, opts: ImportGltfOptions): Mesh[] => {
    if (node.mesh === undefined) return [];
    const gltfMesh: GltfMesh | undefined = json.meshes?.[node.mesh];
    if (!gltfMesh) {
        warn(opts, `nodes[].mesh=${node.mesh} missing; skipping mesh node`);
        return [];
    }
    const out: Mesh[] = [];
    const computeMissingNormals = opts.computeMissingNormals !== false;
    for (let primIndex = 0; primIndex < gltfMesh.primitives.length; primIndex++) {
        const prim = gltfMesh.primitives[primIndex]!;
        if ((prim.extensions as unknown as Record<string, unknown> | undefined)?.["KHR_draco_mesh_compression"]) {
            warn(opts, `Mesh ${gltfMesh.name ?? node.mesh} primitive ${primIndex}: KHR_draco_mesh_compression not supported; skipping primitive`);
            continue;
        }
        const cacheKey = `${node.mesh ?? -1}:${primIndex}`;
        const hasCachedGeometry = geometryCache.has(cacheKey);
        let geom = geometryCache.get(cacheKey);
        const meshName = `${gltfMesh.name ?? `mesh_${node.mesh}`}_${primIndex}`;
        const matJson = prim.material !== undefined ? json.materials?.[prim.material] : undefined;
        validateMaterialTextureCoordinates(matJson, prim.attributes, opts, `Mesh '${gltfMesh.name ?? node.mesh}' primitive ${primIndex}`);
        if (!hasCachedGeometry) {
            const built = buildGeometryFromPrimitive(doc, json, prim, computeMissingNormals, opts);
            geom = built;
            geometryCache.set(cacheKey, geom);
        }
        if (!geom) continue;
        if (hasCachedGeometry) geom.retain();
        const mat = getOrCreateMaterial(doc, json, prim.material, materialCache, textureCache, opts);
        const mesh = new Mesh(geom, mat);
        mesh.name = node.name ?? gltfMesh.name ?? `gltf_mesh_${node.mesh}_${primIndex}`;
        mesh.transform.setParent(nodeT);
        const resolvedWeights = resolveMorphWeights(node.weights ?? gltfMesh.weights, geom.morphTargets.length | 0, opts, `Mesh '${mesh.name}' primitive ${primIndex}`);
        if (geom.morphTargets.length > 0) initializeMeshMorphRuntime(mesh, resolvedWeights);
        mesh.userData.gltf = {
            nodeIndex,
            meshIndex: node.mesh,
            primitiveIndex: primIndex,
            resolvedWeights: Array.from(resolvedWeights),
            extras: {
                node: node.extras,
                mesh: gltfMesh.extras,
                primitive: prim.extras,
                material: matJson?.extras
            },
            extensions: {
                node: node.extensions,
                mesh: gltfMesh.extensions,
                primitive: prim.extensions,
                material: matJson?.extensions
            }
        };
        out.push(mesh);
        const variantMaterials = getPrimitiveVariantMaterials(doc, json, prim, materialCache, textureCache, opts, `Mesh '${gltfMesh.name ?? node.mesh}' primitive ${primIndex}`);
        variantsController.register(mesh, mesh.material, variantMaterials.variants);
        for (const material of variantMaterials.ownedMaterials) material.release();
    }
    return out;
};

const instantiateCameraNode = (json: GltfRoot, node: GltfNode, nodeT: Transform, opts: ImportGltfOptions): Camera | null => {
    if (node.camera === undefined) return null;
    const cam: GltfCamera | undefined = json.cameras?.[node.camera];
    if (!cam) {
        warn(opts, `nodes[].camera=${node.camera} missing; skipping camera`);
        return null;
    }
    let out: Camera;
    if (cam.type === "perspective") {
        const p = cam.perspective;
        if (!p) {
            warn(opts, `camera[${node.camera}] missing perspective block; skipping`);
            return null;
        }
        out = new PerspectiveCamera({ fov: p.yfov, near: p.znear, far: p.zfar ?? 1000 });
    } else {
        const o = cam.orthographic;
        if (!o) {
            warn(opts, `camera[${node.camera}] missing orthographic block; skipping`);
            return null;
        }
        out = new OrthographicCamera({ left: -o.xmag, right: o.xmag, top: o.ymag, bottom: -o.ymag, near: o.znear, far: o.zfar });
    }
    out.transform.setParent(nodeT);
    return out;
};

const instantiateLightNode = (light: KHRLightsPunctualLight, nodeT: Transform): Light | null => {
    const color = light.color ?? [1, 1, 1];
    const intensity = light.intensity ?? 1.0;
    if (light.type === "directional") {
        const wm = nodeT.worldMatrix;
        const zx = wm[8] ?? 0;
        const zy = wm[9] ?? 0;
        const zz = wm[10] ?? -1;
        const dx = -zx, dy = -zy, dz = -zz;
        const inv = 1.0 / (Math.hypot(dx, dy, dz) || 1.0);
        return new DirectionalLight({
            direction: [dx * inv, dy * inv, dz * inv],
            color: [color[0] ?? 1, color[1] ?? 1, color[2] ?? 1],
            intensity,
        });
    }
    if (light.type === "point") {
        const pos = nodeT.worldPosition;
        return new PointLight({
            position: [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0],
            color: [color[0] ?? 1, color[1] ?? 1, color[2] ?? 1],
            intensity,
            range: light.range ?? 0,
        });
    }
    if (light.type === "spot") {
        const pos = nodeT.worldPosition;
        const wm = nodeT.worldMatrix;
        const dx = -(wm[8] ?? 0);
        const dy = -(wm[9] ?? 0);
        const dz = -(wm[10] ?? -1);
        const inv = 1.0 / (Math.hypot(dx, dy, dz) || 1.0);
        return new SpotLight({
            position: [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0],
            direction: [dx * inv, dy * inv, dz * inv],
            color: [color[0] ?? 1, color[1] ?? 1, color[2] ?? 1],
            intensity,
            range: light.range ?? 0,
            innerCone: light.spot?.innerConeAngle ?? 0,
            outerCone: light.spot?.outerConeAngle ?? Math.PI / 4
        });
    }
    return null;
};

const parseSkins = (doc: GltfDocument, json: GltfRoot, nodes: GltfImportedNode[], opts: ImportGltfOptions): ImportedSkin[] => {
    const skins = json.skins ?? [];
    const out: ImportedSkin[] = [];
    for (let i = 0; i < skins.length; i++) {
        const s: GltfSkin = skins[i]!;
        const joints: Transform[] = [];
        let missingJoint = false;
        for (let jointSlot = 0; jointSlot < s.joints.length; jointSlot++) {
            const j = s.joints[jointSlot]!;
            const t = nodes[j]?.transform;
            if (!t) { warn(opts, `skin[${i}] joint slot ${jointSlot} references missing node ${j}; skipping skin runtime to avoid remapped joint indices.`); missingJoint = true; continue; }
            joints.push(t);
        }
        let inverseBind: Float32Array | undefined;
        if (s.inverseBindMatrices !== undefined) inverseBind = readAccessorAsFloat32(doc, s.inverseBindMatrices);
        let runtimeInverseBind = inverseBind;
        if (inverseBind && inverseBind.length !== s.joints.length * 16) { warn(opts, `skin[${i}] inverseBindMatrices length ${inverseBind.length} does not match ${s.joints.length} joints; using identity inverse binds.`); runtimeInverseBind = undefined; }
        const skel = s.skeleton !== undefined ? nodes[s.skeleton]?.transform : undefined;
        const runtime = missingJoint || joints.length === 0 ? null : new Skin(s.name ?? `skin_${i}`, joints, runtimeInverseBind ?? null);
        if (!runtime) warn(opts, `skin[${i}] has no valid runtime; meshes referencing it will render unskinned.`);
        out.push({ name: s.name, joints, inverseBindMatrices: inverseBind, skeleton: skel, runtime });
    }
    return out;
};

const parseAnimations = (doc: GltfDocument, json: GltfRoot, nodes: GltfImportedNode[], opts: ImportGltfOptions): ImportedAnimation[] => {
    const anims = json.animations ?? [];
    const out: ImportedAnimation[] = [];
    const interpToCode = (interp: string): number => {
        switch (interp) {
            case "STEP": return 0;
            case "CUBICSPLINE": return 2;
            case "LINEAR":
            default: return 1;
        }
    };
    const pathToCode = (path: ImportedAnimationChannel["path"]): number => {
        switch (path) {
            case "translation": return 0;
            case "rotation": return 1;
            case "scale": return 2;
            default: return -1;
        }
    };
    for (let i = 0; i < anims.length; i++) {
        const a: GltfAnimation = anims[i]!;
        const samplers: ImportedAnimationSampler[] = [];
        const weightSamplers: Array<{ interpolation: "LINEAR" | "STEP" | "CUBICSPLINE"; input: Float32Array; output: Float32Array; valueSize: number }> = [];
        const channels: ImportedAnimationChannel[] = [];
        const samplerCount = a.samplers.length | 0;
        const samplerTablePtr = samplerCount > 0 ? (wasm.allocU32(samplerCount * 5) as WasmPtr) : (0 as WasmPtr);
        const samplerTable = samplerCount > 0 ? wasm.u32view(samplerTablePtr, samplerCount * 5) : null;
        const ownedF32Allocs: { ptr: WasmPtr; len: number }[] = [];
        const ownedU32Allocs: { ptr: WasmPtr; len: number }[] = [];
        if (samplerCount > 0) ownedU32Allocs.push({ ptr: samplerTablePtr, len: samplerCount * 5 });
        let startTime = Number.POSITIVE_INFINITY;
        let endTime = Number.NEGATIVE_INFINITY;
        for (let si = 0; si < a.samplers.length; si++) {
            const s: GltfAnimationSampler = a.samplers[si]!;
            const input = readAccessorAsFloat32(doc, s.input);
            const outView = readAccessor(doc, s.output);
            const output = readAccessorAsFloat32(doc, s.output);
            samplers.push({
                interpolation: (s.interpolation ?? "LINEAR") as ImportedAnimationSampler["interpolation"],
                input,
                output,
            });
            const interpolation = (s.interpolation ?? "LINEAR") as ImportedAnimationSampler["interpolation"];
            const denom = interpolation === "CUBICSPLINE" ? Math.max(1, (input.length | 0) * 3) : Math.max(1, input.length | 0);
            const valueSize = Math.max(0, Math.floor(output.length / denom));
            weightSamplers.push({ interpolation, input, output, valueSize });
            if (input.length > 0) {
                startTime = Math.min(startTime, input[0]!);
                endTime = Math.max(endTime, input[input.length - 1]!);
            }
            if (samplerTable) {
                const timesPtr = wasm.allocF32(input.length) as WasmPtr;
                wasm.f32view(timesPtr, input.length).set(input);
                ownedF32Allocs.push({ ptr: timesPtr, len: input.length });
                const valuesPtr = wasm.allocF32(output.length) as WasmPtr;
                wasm.f32view(valuesPtr, output.length).set(output);
                ownedF32Allocs.push({ ptr: valuesPtr, len: output.length });
                const base = si * 5;
                samplerTable[base + 0] = timesPtr >>> 0;
                samplerTable[base + 1] = (input.length | 0) >>> 0;
                samplerTable[base + 2] = valuesPtr >>> 0;
                samplerTable[base + 3] = (outView.numComponents | 0) >>> 0;
                samplerTable[base + 4] = interpToCode(s.interpolation ?? "LINEAR") >>> 0;
            }
        }
        const runtimeChannels: { sampler: number; targetIndex: number; pathCode: number }[] = [];
        const runtimeWeightChannels: { sampler: number; meshes: Mesh[] }[] = [];
        for (let ci = 0; ci < a.channels.length; ci++) {
            const c: GltfAnimationChannel = a.channels[ci]!;
            const nodeIndex = c.target.node;
            const importedNode = nodeIndex !== undefined ? nodes[nodeIndex] ?? null : null;
            const t = importedNode?.transform ?? null;
            const chan: ImportedAnimationChannel = {
                sampler: c.sampler | 0,
                targetNode: t,
                path: c.target.path,
            };
            channels.push(chan);
            const pathCode = pathToCode(chan.path);
            if (t && pathCode >= 0) {
                runtimeChannels.push({
                    sampler: chan.sampler | 0,
                    targetIndex: t.index >>> 0,
                    pathCode,
                });
            } else if (chan.path === "weights" && nodeIndex !== undefined) {
                const meshes = (nodes[nodeIndex]?.meshes ?? []).filter((mesh) => mesh.geometry.morphTargets.length > 0);
                if (meshes.length > 0) runtimeWeightChannels.push({ sampler: chan.sampler | 0, meshes });
            }
        }
        let clip: AnimationClip | null = null;
        const channelCount = runtimeChannels.length | 0;
        const weightChannelCount = runtimeWeightChannels.length | 0;
        if (samplerCount > 0 && (channelCount > 0 || weightChannelCount > 0)) {
            let channelsPtr = 0 as WasmPtr;
            if (channelCount > 0) {
                channelsPtr = wasm.allocU32(channelCount * 3) as WasmPtr;
                const ch = wasm.u32view(channelsPtr, channelCount * 3);
                ownedU32Allocs.push({ ptr: channelsPtr, len: channelCount * 3 });
                for (let ci = 0; ci < channelCount; ci++) {
                    const rc = runtimeChannels[ci]!;
                    const base = ci * 3;
                    ch[base + 0] = rc.sampler >>> 0;
                    ch[base + 1] = rc.targetIndex >>> 0;
                    ch[base + 2] = rc.pathCode >>> 0;
                }
            }
            if (!Number.isFinite(startTime)) startTime = 0;
            if (!Number.isFinite(endTime)) endTime = 0;
            clip = new AnimationClip({
                name: a.name ?? `anim_${i}`,
                samplerCount,
                channelCount,
                samplersPtr: samplerTablePtr,
                channelsPtr,
                startTime,
                endTime,
                ownedF32Allocs,
                ownedU32Allocs,
                weightSamplers,
                weightChannels: runtimeWeightChannels.map((channel) => ({
                    sampler: channel.sampler,
                    meshes: channel.meshes,
                    scratch: new Float32Array(weightSamplers[channel.sampler]?.valueSize ?? 0)
                }))
            });
        } else {
            for (const a of ownedF32Allocs) wasm.freeF32(a.ptr, a.len);
            for (const a of ownedU32Allocs) wasm.freeU32(a.ptr, a.len);
        }
        out.push({ name: a.name, samplers, channels, clip });
    }
    return out;
};

export const importGltf = (doc: GltfDocument, opts: ImportGltfOptions = {}): GltfImportResult => {
    const json = doc.json;
    const scene = opts.targetScene ?? new Scene();
    const addToScene = opts.addToScene !== false;
    const sceneIndex = getSceneIndex(json, opts);
    const gltfNodes = json.nodes ?? [];
    const nodes: GltfImportedNode[] = new Array(gltfNodes.length);
    for (let i = 0; i < gltfNodes.length; i++) {
        const n: GltfNode = gltfNodes[i]!;
        const t = new Transform();
        if (n.matrix && n.matrix.length >= 16) {
            applyNodeMatrixViaWasmDecompose(t, n.matrix);
        } else {
            const tr = n.translation ?? [0, 0, 0];
            const ro = n.rotation ?? [0, 0, 0, 1];
            const sc = n.scale ?? [1, 1, 1];
            t.setPosition(tr[0], tr[1], tr[2]);
            t.setRotation(ro[0], ro[1], ro[2], ro[3]);
            t.setScale(sc[0], sc[1], sc[2]);
        }
        nodes[i] = new GltfImportedNode(i, t, n);
    }
    for (let i = 0; i < gltfNodes.length; i++) {
        const n = gltfNodes[i]!;
        const parentNode = nodes[i]!;
        for (const child of n.children ?? []) {
            const childNode = nodes[child];
            if (childNode) {
                childNode.transform.setParent(parentNode.transform);
                childNode.parentIndex = i;
            }
            else warn(opts, `Node ${i} child ${child} missing transform`);
        }
    }
    const extensions = buildExtensionsMetadata(json);
    const xmp = buildXmpMetadata(json);
    const variantsController = createVariantsController(getDeclaredVariants(json, xmp.packets));
    const skins = parseSkins(doc, json, nodes, opts);
    const materialCache = new Map<number, Material>();
    const textureCache = new Map<number, Texture2D>();
    const geometryCache = new Map<string, Geometry | null>();
    const meshes: Mesh[] = [];
    const cameras: Camera[] = [];
    const lights: Light[] = [];
    const khrLights = getKHRLightsFromRoot(json);
    const instantiateNodeRecursive = (nodeIndex: number, inheritedSkinIndex: number | undefined): void => {
        const node = gltfNodes[nodeIndex];
        if (!node) return;
        const importedNode = nodes[nodeIndex];
        const nodeT = importedNode?.transform;
        if (!importedNode || !nodeT) return;
        const createdMeshes = instantiateMeshNode(doc, json, nodeIndex, node, nodeT, materialCache, textureCache, geometryCache, variantsController, opts);
        importedNode.meshes = createdMeshes;
        importedNode.visible = importedNode.visible;
        const skinIndex = node.skin !== undefined ? (node.skin | 0) : inheritedSkinIndex;
        if (skinIndex !== undefined) {
            const skinDef = skins[skinIndex];
            if (!skinDef || !skinDef.runtime) warn(opts, `nodes[${nodeIndex}].skin=${skinIndex} missing or invalid; skipping skin binding`);
            else {
                for (const m of createdMeshes) {
                    if (m.geometry.joints === null || m.geometry.weights === null) { warn(opts, `Mesh '${m.name}' is skinned (node.skin) but is missing JOINTS_0/WEIGHTS_0; it will render unskinned.`); continue; }
                    m.skin = skinDef.runtime.createInstance(m.transform);
                }
            }
        }
        for (const m of createdMeshes) { meshes.push(m); if (addToScene) scene.add(m); }
        if (opts.importCameras) { const cam = instantiateCameraNode(json, node, nodeT, opts); if (cam) { cameras.push(cam); importedNode.camera = cam; } }
        if (opts.importLights && khrLights) {
            const nodeLight = getNodeKHRLight(node);
            if (nodeLight) {
                const lightDef = khrLights.lights[nodeLight.light];
                if (!lightDef) warn(opts, `KHR_lights_punctual node references missing light ${nodeLight.light}`);
                else {
                    const created = instantiateLightNode(lightDef, nodeT);
                    if (created) {
                        bindLightToTransform(created, nodeT);
                        lights.push(created);
                        importedNode.light = created;
                        importedNode.visible = importedNode.visible;
                        if (addToScene) scene.addLight(created);
                    } else warn(opts, `Light '${node.name ?? `index ${nodeIndex}`}' has unsupported type '${lightDef.type}' and was skipped.`);
                }
            }
        }
        for (const child of node.children ?? []) instantiateNodeRecursive(child, skinIndex);
    };
    const gltfScene: GltfScene | undefined = json.scenes?.[sceneIndex];
    const roots = gltfScene?.nodes ?? [];
    for (const root of roots) instantiateNodeRecursive(root, undefined);
    const animations = parseAnimations(doc, json, nodes, opts);
    const clips = animations.map((a) => a.clip).filter((c): c is AnimationClip => c !== null);
    const metadata = buildImportMetadata(json, sceneIndex, extensions, xmp, variantsController.public);
    let destroyed = false;
    return {
        scene, meshes, nodes, lights, cameras, skins, animations, clips, metadata,
        destroy(): void {
            if (destroyed) return;
            destroyed = true;
            if (addToScene) { for (const m of meshes) scene.remove(m); for (const light of lights) scene.removeLight(light); }
            for (const light of lights) unbindLightTransform(light);
            for (const m of meshes) m.destroy();
            for (const camera of cameras) camera.destroy();
            for (const a of animations) a.clip?.dispose();
            for (const s of skins) s.runtime?.dispose();
            variantsController.destroy();
            for (const tex of textureCache.values()) tex.destroy();
            for (const node of nodes) node.transform.dispose();
        },
    };
};
