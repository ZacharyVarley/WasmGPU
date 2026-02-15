import { wasm, mat4f, meshf, WasmPtr } from "../wasm";
import { Geometry } from "../graphics/geometry";
import { BlendMode, CullMode, Material, StandardMaterial, UnlitMaterial, type Color } from "../graphics/material";
import { Texture2D } from "../graphics/texture";
import { AnimationClip, Skin } from "../graphics/animation";
import { Camera, OrthographicCamera, PerspectiveCamera } from "../world/camera";
import { Scene } from "../world/scene";
import { Mesh } from "../world/mesh";
import { DirectionalLight, PointLight, type Light } from "../world/light";
import { Transform } from "../core/transform";
import type { GltfDocument, GltfAnimation, GltfAnimationChannel, GltfAnimationSampler, GltfCamera, GltfMaterial, GltfMesh, GltfNode, GltfPrimitive, GltfRoot, GltfScene, GltfSkin, KHRLightsPunctualLight, KHRLightsPunctualNode, KHRLightsPunctualRoot } from "./types";
import { decodeDataUri, isDataUri, resolveUri } from "./uri";
import { readAccessor, readAccessorAsFloat32, readAccessorAsUint16, readIndicesAsUint32 } from "./accessors";

export type ImportedSkin = {
    name?: string;
    joints: Transform[];
    inverseBindMatrices?: Float32Array;
    skeleton?: Transform;
    runtime: Skin;
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

export type GltfImportResult = {
    scene: Scene;
    meshes: Mesh[];
    nodeTransforms: Transform[];
    lights: Light[];
    cameras: Camera[];
    skins: ImportedSkin[];
    animations: ImportedAnimation[];
    clips: AnimationClip[];
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

let _normPosPtr: WasmPtr = 0;
let _normPosCap: number = 0;

let _normIdxPtr: WasmPtr = 0;
let _normIdxCap: number = 0;

let _normOutPtr: WasmPtr = 0;
let _normOutCap: number = 0;

const nextPow2 = (x: number): number => {
    let v = Math.max(1, x | 0);
    v--;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v++;
    return v;
};

const ensureNormalScratch = (posLenF32: number, idxLenU32: number): void => {
    if (_normPosCap < posLenF32) {
        _normPosCap = nextPow2(posLenF32);
        _normPosPtr = wasm.allocF32(_normPosCap);
    }
    if (_normOutCap < posLenF32) {
        _normOutCap = nextPow2(posLenF32);
        _normOutPtr = wasm.allocF32(_normOutCap);
    }
    if (idxLenU32 > 0 && _normIdxCap < idxLenU32) {
        _normIdxCap = nextPow2(idxLenU32);
        _normIdxPtr = wasm.allocF32(_normIdxCap);
    }
};

const computeVertexNormalsWasm = (positions: Float32Array, indices: Uint32Array | null): Float32Array => {
    const vcount = (positions.length / 3) | 0;
    const idxLen = indices ? (indices.length | 0) : 0;
    ensureNormalScratch(positions.length, idxLen);
    wasm.f32view(_normPosPtr, positions.length).set(positions);
    const idxPtr = (indices && idxLen > 0) ? _normIdxPtr : 0;
    if (indices && idxLen > 0) wasm.u32view(_normIdxPtr, idxLen).set(indices);
    meshf.computeVertexNormals(_normOutPtr, _normPosPtr, vcount, idxPtr, idxLen);
    const out = new Float32Array(positions.length);
    out.set(wasm.f32view(_normOutPtr, positions.length));
    return out;
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

const getOrCreateMaterial = (doc: GltfDocument, json: GltfRoot, materialIndex: number | undefined, materialCache: Map<number, Material>, textureCache: Map<number, Texture2D>, opts?: ImportGltfOptions): Material => {
    if (materialIndex === undefined) return new StandardMaterial({});
    const existing = materialCache.get(materialIndex);
    if (existing) return existing;
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
        const texCoord = (info.texCoord ?? 0) | 0;
        if (texCoord !== 0) warn(opts, `Texture texCoord=${texCoord} not supported yet (usage=${usage}); using TEXCOORD_0.`);
        const ext = info.extensions as any;
        if (ext?.KHR_texture_transform) warn(opts, `KHR_texture_transform not supported yet (usage=${usage}); ignoring.`);
        return getOrCreateTextureByIndex(info.index, usage);
    };
    const alphaMode = mat.alphaMode ?? "OPAQUE";
    const alphaCutoff = alphaMode === "MASK" ? (mat.alphaCutoff ?? 0.5) : 0;
    const blendMode = alphaMode === "BLEND" ? BlendMode.Transparent : BlendMode.Opaque;
    const cullMode = mat.doubleSided ? CullMode.None : CullMode.Back;
    const pbr = mat.pbrMetallicRoughness;
    const baseColorFactor = pbr?.baseColorFactor ?? [1, 1, 1, 1];
    const metallicFactor = pbr?.metallicFactor ?? 1;
    const roughnessFactor = pbr?.roughnessFactor ?? 1;
    const baseColorTexture = getTex(pbr?.baseColorTexture as any, "baseColor");
    const metallicRoughnessTexture = getTex(pbr?.metallicRoughnessTexture as any, "metallicRoughness");
    const normalTexture = getTex(mat.normalTexture as any, "normal");
    const occlusionTexture = getTex(mat.occlusionTexture as any, "occlusion");
    const emissiveTexture = getTex(mat.emissiveTexture as any, "emissive");
    const normalScale = mat.normalTexture?.scale ?? 1;
    const occlusionStrength = mat.occlusionTexture?.strength ?? 1;
    const emissiveFactor = mat.emissiveFactor ?? [0, 0, 0];
    const emissiveStrength = (mat.extensions as any)?.KHR_materials_emissive_strength?.emissiveStrength ?? 1;
    const emissiveIntensity = emissiveStrength;
    const isUnlit = isMaterialUnlit(mat);
    const depthWrite = blendMode === BlendMode.Opaque;
    let created: Material;
    if (isUnlit) {
        created = new UnlitMaterial({
            color: [baseColorFactor[0] ?? 1, baseColorFactor[1] ?? 1, baseColorFactor[2] ?? 1],
            opacity: baseColorFactor[3] ?? 1,
            baseColorTexture,
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
            normalScale,
            occlusionStrength,
            alphaCutoff,
            blendMode,
            cullMode,
            depthWrite
        });
    }
    materialCache.set(materialIndex, created);
    return created;
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
    let uvs: Float32Array | null = null;
    const uvAcc = attrs["TEXCOORD_0"];
    if (uvAcc !== undefined) uvs = readAccessorAsFloat32(doc, uvAcc);
    let joints: Uint16Array | null = null;
    let weights: Float32Array | null = null;
    const jAcc = attrs["JOINTS_0"];
    const wAcc = attrs["WEIGHTS_0"];
    if (jAcc !== undefined && wAcc !== undefined) {
        joints = readAccessorAsUint16(doc, jAcc);
        weights = readAccessorAsFloat32(doc, wAcc);
    } else if (jAcc !== undefined || wAcc !== undefined) {
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
    if (!normals && computeMissingNormals) normals = computeVertexNormalsWasm(positions, indices);
    return new Geometry({
        positions,
        normals: normals ?? undefined,
        uvs: uvs ?? undefined,
        joints: joints ?? undefined,
        weights: weights ?? undefined,
        indices: indices ?? undefined
    });
};

const instantiateMeshNode = (doc: GltfDocument, json: GltfRoot, node: GltfNode, nodeT: Transform, materialCache: Map<number, Material>, textureCache: Map<number, Texture2D>, geometryCache: Map<string, Geometry | null>, opts: ImportGltfOptions): Mesh[] => {
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
        let geom = geometryCache.get(cacheKey);
        if (!geom) {
            const built = buildGeometryFromPrimitive(doc, json, prim, computeMissingNormals, opts);
            geom = built;
            geometryCache.set(cacheKey, geom);
        }
        if (!geom) continue;
        const mat = getOrCreateMaterial(doc, json, prim.material, materialCache, textureCache, opts);
        const mesh = new Mesh(geom, mat);
        mesh.name = node.name ?? gltfMesh.name ?? `gltf_mesh_${node.mesh}_${primIndex}`;
        mesh.transform.setParent(nodeT);
        out.push(mesh);
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
            range: light.range ?? 10,
        });
    }
    return null;
};

const parseSkins = (doc: GltfDocument, json: GltfRoot, nodeTransforms: Transform[], opts: ImportGltfOptions): ImportedSkin[] => {
    const skins = json.skins ?? [];
    const out: ImportedSkin[] = [];
    for (let i = 0; i < skins.length; i++) {
        const s: GltfSkin = skins[i]!;
        const joints: Transform[] = [];
        for (const j of s.joints) {
            const t = nodeTransforms[j];
            if (!t) {
                warn(opts, `skin[${i}] joint node ${j} missing transform`);
                continue;
            }
            joints.push(t);
        }
        let inverseBind: Float32Array | undefined;
        if (s.inverseBindMatrices !== undefined) inverseBind = readAccessorAsFloat32(doc, s.inverseBindMatrices);
        const skel = s.skeleton !== undefined ? nodeTransforms[s.skeleton] : undefined;
        const runt = new Skin(s.name ?? `skin_${i}`, joints, inverseBind ?? null);
        out.push({
            name: s.name,
            joints,
            inverseBindMatrices: inverseBind,
            skeleton: skel,
            runtime: runt
        });
    }
    return out;
};

const parseAnimations = (doc: GltfDocument, json: GltfRoot, nodeTransforms: Transform[], opts: ImportGltfOptions): ImportedAnimation[] => {
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
        for (let ci = 0; ci < a.channels.length; ci++) {
            const c: GltfAnimationChannel = a.channels[ci]!;
            const nodeIndex = c.target.node;
            const t = nodeIndex !== undefined ? nodeTransforms[nodeIndex] ?? null : null;
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
            }
        }
        let clip: AnimationClip | null = null;
        const channelCount = runtimeChannels.length | 0;
        if (samplerCount > 0 && channelCount > 0) {
            const channelsPtr = wasm.allocU32(channelCount * 3) as WasmPtr;
            const ch = wasm.u32view(channelsPtr, channelCount * 3);
            ownedU32Allocs.push({ ptr: channelsPtr, len: channelCount * 3 });
            for (let ci = 0; ci < channelCount; ci++) {
                const rc = runtimeChannels[ci]!;
                const base = ci * 3;
                ch[base + 0] = rc.sampler >>> 0;
                ch[base + 1] = rc.targetIndex >>> 0;
                ch[base + 2] = rc.pathCode >>> 0;
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
                ownedU32Allocs
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
    const nodes = json.nodes ?? [];
    const nodeTransforms: Transform[] = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
        const n: GltfNode = nodes[i]!;
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
        nodeTransforms[i] = t;
    }
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        const parentT = nodeTransforms[i]!;
        for (const child of n.children ?? []) {
            const childT = nodeTransforms[child];
            if (childT) childT.setParent(parentT);
            else warn(opts, `Node ${i} child ${child} missing transform`);
        }
    }
    const skins = parseSkins(doc, json, nodeTransforms, opts);
    const materialCache = new Map<number, Material>();
    const textureCache = new Map<number, Texture2D>();
    const geometryCache = new Map<string, Geometry | null>();
    const meshes: Mesh[] = [];
    const cameras: Camera[] = [];
    const lights: Light[] = [];
    const khrLights = getKHRLightsFromRoot(json);
    const instantiateNodeRecursive = (nodeIndex: number): void => {
        const node = nodes[nodeIndex];
        if (!node) return;
        const nodeT = nodeTransforms[nodeIndex]!;
        if (!nodeT) return;
        const createdMeshes = instantiateMeshNode(doc, json, node, nodeT, materialCache, textureCache, geometryCache, opts);
        if (node.skin !== undefined) {
            const skinDef = skins[node.skin];
            if (!skinDef) {
                warn(opts, `nodes[${nodeIndex}].skin=${node.skin} missing; skipping skin binding`);
            } else {
                for (const m of createdMeshes) {
                    if (m.geometry.joints === null || m.geometry.weights === null) {
                        warn(opts, `Mesh '${m.name}' is skinned (node.skin) but is missing JOINTS_0/WEIGHTS_0; it will render unskinned.`);
                        continue;
                    }
                    m.skin = skinDef.runtime.createInstance(m.transform);
                }
            }
        }
        for (const m of createdMeshes) {
            meshes.push(m);
            if (addToScene) scene.add(m);
        }
        if (opts.importCameras) {
            const cam = instantiateCameraNode(json, node, nodeT, opts);
            if (cam) cameras.push(cam);
        }
        if (opts.importLights && khrLights) {
            const nodeLight = getNodeKHRLight(node);
            if (nodeLight) {
                const lightDef = khrLights.lights[nodeLight.light];
                if (!lightDef) {
                    warn(opts, `KHR_lights_punctual node references missing light ${nodeLight.light}`);
                } else {
                    const created = instantiateLightNode(lightDef, nodeT);
                    if (created) {
                        lights.push(created);
                        if (addToScene) scene.addLight(created);
                    } else {
                        warn(opts, `Light '${node.name ?? `index ${nodeIndex}`}' has unsupported type '${lightDef.type}' and was skipped.`);
                    }
                }
            }
        }
        for (const child of node.children ?? []) instantiateNodeRecursive(child);
    };
    const sceneIndex = getSceneIndex(json, opts);
    const gltfScene: GltfScene | undefined = json.scenes?.[sceneIndex];
    const roots = gltfScene?.nodes ?? [];
    for (const root of roots) instantiateNodeRecursive(root);
    const animations = parseAnimations(doc, json, nodeTransforms, opts);
    const clips = animations.map((a) => a.clip).filter((c): c is AnimationClip => c !== null);
    const uniqueGeometries = Array.from(new Set(meshes.map((m) => m.geometry)));
    const uniqueMaterials = Array.from(new Set(meshes.map((m) => m.material)));
    return {
        scene,
        meshes,
        nodeTransforms,
        lights,
        cameras,
        skins,
        animations,
        clips,
        destroy(): void {
            if (addToScene) for (const m of meshes) scene.remove(m);
            for (const m of meshes) m.destroy();
            for (const a of animations) a.clip?.dispose();
            for (const s of skins) s.runtime.dispose();
            for (const g of uniqueGeometries) g.destroy();
            for (const tex of textureCache.values()) tex.destroy();
            for (const mat of uniqueMaterials) mat.destroy();
            for (const t of nodeTransforms) t.dispose();
        },
    };
};
