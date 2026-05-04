/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "assert";
import { initWebAssembly, readAccessorAsFloat32, readAccessorAsUint16, readIndicesAsUint32, parseGLB, loadGltf, importGltf, Scene, TransformStore, UnlitMaterial, StandardMaterial, BlendMode, CullMode, PerspectiveCamera, OrthographicCamera } from "../dist/WasmGPU.js";

const pad4 = (n) => (n + 3) & ~3;
const makeGLB = (gltfJson, binBytes) => {
    const jsonBytes = new TextEncoder().encode(JSON.stringify(gltfJson));
    const jsonPaddedLen = pad4(jsonBytes.byteLength);
    const binPaddedLen = pad4(binBytes.byteLength);
    const totalLen = 12 + 8 + jsonPaddedLen + 8 + binPaddedLen;
    const out = new ArrayBuffer(totalLen);
    const dv = new DataView(out);
    const u8 = new Uint8Array(out);
    dv.setUint32(0, 0x46546c67, true);
    dv.setUint32(4, 2, true);
    dv.setUint32(8, totalLen, true);
    let off = 12;
    dv.setUint32(off + 0, jsonPaddedLen, true);
    dv.setUint32(off + 4, 0x4E4F534A, true);
    off += 8;
    u8.set(jsonBytes, off);
    for (let i = off + jsonBytes.byteLength; i < off + jsonPaddedLen; i++) u8[i] = 0x20;
    off += jsonPaddedLen;
    dv.setUint32(off + 0, binPaddedLen, true);
    dv.setUint32(off + 4, 0x004E4942, true);
    off += 8;
    u8.set(new Uint8Array(binBytes), off);
    return out;
};

const copyBytes = (target, offset, source) => { target.set(new Uint8Array(source.buffer, source.byteOffset, source.byteLength), offset); };

const approxEqual = (actual, expected, tol = 1e-6, msg = "Numbers differ") => { assert.ok(Number.isFinite(actual) && Number.isFinite(expected), `${msg}: expected finite numbers`); assert.ok(Math.abs(actual - expected) <= tol, `${msg}: ${actual} vs ${expected}`); };

const approxArray = (actual, expected, tol = 1e-6, msg = "Arrays differ") => { assert.equal(actual.length, expected.length, `${msg}: length ${actual.length} vs ${expected.length}`); for (let i = 0; i < actual.length; i++) approxEqual(actual[i], expected[i], tol, `${msg} at index ${i}`); };

await initWebAssembly(new URL("../dist/", import.meta.url).toString());

// 1) GLB parsing and loading preserve the asset metadata and binary payload.
{
    const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
    ]);
    const gltfJson = {
        asset: { version: "2.0", generator: "WasmGPU test", extras: { suite: "gltf" } },
        buffers: [{ byteLength: positions.byteLength }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        nodes: [{ mesh: 0 }],
        scenes: [{ nodes: [0] }],
        scene: 0,
    };
    const glb = makeGLB(gltfJson, positions.buffer);
    const parsed = parseGLB(glb);
    assert.equal(parsed.json.asset.version, "2.0");
    assert.equal(parsed.json.asset.generator, "WasmGPU test");
    assert.ok(parsed.binChunk);
    assert.equal(parsed.binChunk.byteLength, positions.byteLength);

    const doc = await loadGltf(glb, { baseUrl: "memory://asset/" });
    assert.equal(doc.baseUrl, "memory://asset/");
    assert.equal(doc.json.asset.extras.suite, "gltf");
    assert.equal(doc.buffers.length, 1);
    assert.equal(doc.buffers[0].byteLength, positions.byteLength);
}

// 2) Accessor decoding handles striding, normalized conversion, sparse patches, and index conversion.
{
    const buf = new ArrayBuffer(64);
    const dv = new DataView(buf);
    dv.setFloat32(0, 1.0, true);
    dv.setFloat32(4, 2.0, true);
    dv.setFloat32(8, 3.0, true);
    dv.setUint16(12, 0, true);
    dv.setUint16(14, 65535, true);
    dv.setFloat32(20, 4.0, true);
    dv.setFloat32(24, 5.0, true);
    dv.setFloat32(28, 6.0, true);
    dv.setUint16(32, 32768, true);
    dv.setUint16(34, 0, true);
    dv.setUint8(40, 1);
    copyBytes(new Uint8Array(buf), 44, new Float32Array([7, 8, 9]));
    copyBytes(new Uint8Array(buf), 56, new Uint16Array([0, 2, 1]));
    const doc = {
        json: {
            asset: { version: "2.0" },
            buffers: [{ byteLength: 64 }],
            bufferViews: [
                { buffer: 0, byteOffset: 0, byteLength: 40, byteStride: 20 },
                { buffer: 0, byteOffset: 40, byteLength: 1 },
                { buffer: 0, byteOffset: 44, byteLength: 12 },
                { buffer: 0, byteOffset: 56, byteLength: 6 }
            ],
            accessors: [
                { bufferView: 0, byteOffset: 0, componentType: 5126, count: 2, type: "VEC3" },
                { bufferView: 0, byteOffset: 12, componentType: 5123, normalized: true, count: 2, type: "VEC2" },
                {
                    componentType: 5126,
                    count: 3,
                    type: "VEC3",
                    sparse: {
                        count: 1,
                        indices: { bufferView: 1, componentType: 5121 },
                        values: { bufferView: 2 }
                    }
                },
                { bufferView: 3, componentType: 5123, count: 3, type: "SCALAR" }
            ],
        },
        buffers: [buf],
        baseUrl: "",
    };

    approxArray(Array.from(readAccessorAsFloat32(doc, 0)), [1, 2, 3, 4, 5, 6]);
    const uv = readAccessorAsFloat32(doc, 1);
    approxEqual(uv[0], 0);
    approxEqual(uv[1], 1);
    approxEqual(uv[2], 32768 / 65535);
    approxEqual(uv[3], 0);
    approxArray(Array.from(readAccessorAsFloat32(doc, 2)), [0, 0, 0, 7, 8, 9, 0, 0, 0]);
    assert.deepEqual(Array.from(readAccessorAsUint16(doc, 3)), [0, 2, 1]);
    assert.deepEqual(Array.from(readIndicesAsUint32(doc, 3)), [0, 2, 1]);
}

// 3) Mesh and material import creates geometry, materials, texture transforms, and provenance.
{
    const positions = new Int16Array([
        0, 0, 0,
        2, 0, 0,
        0, 2, 0,
    ]);
    const uv0 = new Float32Array([
        0, 0,
        1, 0,
        0, 1,
    ]);
    const uv1 = new Uint16Array([
        65535, 0,
        0, 65535,
        32768, 32768,
    ]);
    const posOffset = 0;
    const uv0Offset = 20;
    const uv1Offset = 44;
    const bin = new Uint8Array(56);
    copyBytes(bin, posOffset, positions);
    copyBytes(bin, uv0Offset, uv0);
    copyBytes(bin, uv1Offset, uv1);
    const gltfJson = {
        asset: { version: "2.0" },
        extensionsUsed: ["KHR_mesh_quantization", "KHR_texture_transform", "KHR_materials_unlit"],
        extensionsRequired: ["KHR_mesh_quantization"],
        buffers: [{ byteLength: bin.byteLength }],
        bufferViews: [
            { buffer: 0, byteOffset: posOffset, byteLength: positions.byteLength },
            { buffer: 0, byteOffset: uv0Offset, byteLength: uv0.byteLength },
            { buffer: 0, byteOffset: uv1Offset, byteLength: uv1.byteLength }
        ],
        accessors: [
            { bufferView: 0, componentType: 5122, count: 3, type: "VEC3" },
            { bufferView: 1, componentType: 5126, count: 3, type: "VEC2" },
            { bufferView: 2, componentType: 5123, normalized: true, count: 3, type: "VEC2" }
        ],
        images: [{ uri: "texture.png" }],
        textures: [{ source: 0 }],
        materials: [
            {
                name: "StandardLayer",
                doubleSided: true,
                alphaMode: "BLEND",
                pbrMetallicRoughness: {
                    baseColorFactor: [0.25, 0.5, 0.75, 0.6],
                    baseColorTexture: {
                        index: 0,
                        texCoord: 0,
                        extensions: {
                            KHR_texture_transform: {
                                offset: [0.25, 0.5],
                                rotation: 0.125,
                                scale: [2, 3],
                                texCoord: 1
                            }
                        }
                    },
                    metallicFactor: 0.2,
                    roughnessFactor: 0.7
                }
            },
            {
                name: "UnlitMask",
                alphaMode: "MASK",
                alphaCutoff: 0.35,
                pbrMetallicRoughness: {
                    baseColorFactor: [1, 0, 0, 1]
                },
                extensions: {
                    KHR_materials_unlit: {}
                }
            }
        ],
        meshes: [{
            name: "LayeredTri",
            primitives: [
                { attributes: { POSITION: 0, TEXCOORD_0: 1, TEXCOORD_1: 2 }, material: 0 },
                { attributes: { POSITION: 0, TEXCOORD_0: 1, TEXCOORD_1: 2 }, material: 1 }
            ],
            extras: { kind: "mesh-extra" }
        }],
        nodes: [{ mesh: 0, name: "LayeredNode", extras: { kind: "node-extra" } }],
        scenes: [{ nodes: [0] }],
        scene: 0,
    };
    const doc = await loadGltf(makeGLB(gltfJson, bin.buffer), { baseUrl: "https://example.test/models/" });
    const res = importGltf(doc, {
        addToScene: false,
        computeMissingNormals: true,
    });

    assert.equal(res.meshes.length, 2);
    const standardMesh = res.meshes[0];
    const unlitMesh = res.meshes[1];
    assert.ok(standardMesh.material instanceof StandardMaterial);
    assert.ok(unlitMesh.material instanceof UnlitMaterial);
    assert.equal(standardMesh.material.blendMode, BlendMode.Transparent);
    assert.equal(standardMesh.material.cullMode, CullMode.None);
    assert.equal(standardMesh.material.depthWrite, false);
    assert.equal(unlitMesh.material.blendMode, BlendMode.Opaque);
    assert.equal(unlitMesh.material.cullMode, CullMode.Back);
    assert.equal(unlitMesh.material.alphaCutoff, 0.35);

    const geom = standardMesh.geometry;
    assert.equal(geom.vertexCount, 3);
    assert.equal(geom.positions[3], 2);
    assert.ok(geom.normals.some((v) => Math.abs(v) > 1e-6));
    approxArray(Array.from(geom.uvs), Array.from(uv0));
    approxEqual(geom.uvs1[0], 1);
    approxEqual(geom.uvs1[3], 1);
    approxEqual(geom.uvs1[4], 32768 / 65535);

    const transform = standardMesh.material.baseColorTextureTransform;
    assert.equal(transform.texCoord, 1);
    assert.deepEqual(transform.offset, [0.25, 0.5]);
    assert.deepEqual(transform.scale, [2, 3]);
    approxEqual(transform.rotation, 0.125);
    assert.equal(standardMesh.userData.gltf.nodeIndex, 0);
    assert.equal(standardMesh.userData.gltf.meshIndex, 0);
    assert.equal(standardMesh.userData.gltf.primitiveIndex, 0);
    assert.equal(standardMesh.userData.gltf.extras.node.kind, "node-extra");
    assert.equal(standardMesh.userData.gltf.extras.mesh.kind, "mesh-extra");
    res.destroy();
}

// 4) Scene graph import preserves selected scenes, node hierarchy, transforms, and visibility.
{
    const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
    ]);
    const gltfJson = {
        asset: { version: "2.0" },
        buffers: [{ byteLength: positions.byteLength }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
        meshes: [{ name: "TriMesh", primitives: [{ attributes: { POSITION: 0 } }] }],
        nodes: [
            { name: "UnusedSceneRoot" },
            { name: "Parent", translation: [1, 2, 3], children: [2, 3] },
            { name: "ChildMesh", mesh: 0, translation: [4, 0, 0] },
            { name: "MatrixChild", matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 5, 0, 1] }
        ],
        scenes: [
            { name: "unused", nodes: [0] },
            { name: "selected", nodes: [1] }
        ],
        scene: 0,
    };
    const doc = await loadGltf(makeGLB(gltfJson, positions.buffer));
    const scene = new Scene();
    const res = importGltf(doc, {
        sceneIndex: 1,
        targetScene: scene,
        addToScene: true,
        computeMissingNormals: true,
    });

    assert.equal(res.metadata.scene.name, "selected");
    assert.equal(res.nodes.length, 4);
    assert.equal(res.meshes.length, 1);
    assert.equal(scene.meshes.length, 1);
    assert.equal(res.nodes[1].index, 1);
    assert.equal(res.nodes[1].name, "Parent");
    assert.deepEqual(res.nodes[1].children, [2, 3]);
    assert.equal(res.nodes[2].parentIndex, 1);
    assert.equal(res.nodes[2].transform.parent, res.nodes[1].transform);
    assert.equal(res.nodes[2].meshes[0], res.meshes[0]);
    approxArray(res.nodes[2].transform.worldPosition, [5, 2, 3]);
    approxArray(res.nodes[3].transform.position, [0, 5, 0]);
    approxArray(res.nodes[3].transform.worldPosition, [1, 7, 3]);

    res.nodes[2].visible = false;
    assert.equal(res.meshes[0].visible, false);
    res.nodes[2].visible = true;
    assert.equal(res.meshes[0].visible, true);

    const detachedScene = new Scene();
    const detached = importGltf(doc, {
        sceneIndex: 1,
        targetScene: detachedScene,
        addToScene: false,
        computeMissingNormals: true,
    });
    assert.equal(detached.meshes.length, 1);
    assert.equal(detachedScene.meshes.length, 0);
    detached.destroy();
    res.destroy();
    assert.equal(scene.meshes.length, 0);
}

// 5) Camera and punctual-light import creates bound runtime objects with glTF defaults.
{
    const gltfJson = {
        asset: { version: "2.0" },
        extensionsUsed: ["KHR_lights_punctual"],
        extensions: {
            KHR_lights_punctual: {
                lights: [
                    { type: "directional", color: [1, 0.9, 0.8], intensity: 2 },
                    { type: "point", color: [0.5, 1, 0.5], intensity: 4, range: 12 },
                    { type: "spot", color: [0.5, 0.5, 1], intensity: 6 }
                ]
            }
        },
        cameras: [
            { type: "perspective", perspective: { yfov: Math.PI / 3, znear: 0.1, zfar: 100 } },
            { type: "orthographic", orthographic: { xmag: 4, ymag: 3, znear: 0.2, zfar: 50 } }
        ],
        nodes: [
            { name: "Directional", extensions: { KHR_lights_punctual: { light: 0 } } },
            { name: "Point", translation: [1, 2, 3], extensions: { KHR_lights_punctual: { light: 1 } } },
            { name: "Spot", translation: [4, 5, 6], extensions: { KHR_lights_punctual: { light: 2 } } },
            { name: "Perspective", camera: 0 },
            { name: "Orthographic", camera: 1 }
        ],
        scenes: [{ nodes: [0, 1, 2, 3, 4] }],
        scene: 0,
    };
    const res = importGltf(await loadGltf(makeGLB(gltfJson, new ArrayBuffer(0))), {
        addToScene: false,
        importCameras: true,
        importLights: true,
    });

    assert.equal(res.cameras.length, 2);
    assert.ok(res.cameras[0] instanceof PerspectiveCamera);
    assert.ok(res.cameras[1] instanceof OrthographicCamera);
    assert.equal(res.cameras[0].near, 0.1);
    assert.equal(res.cameras[0].far, 100);
    assert.equal(res.cameras[1].left, -4);
    assert.equal(res.cameras[1].right, 4);
    assert.equal(res.cameras[1].top, 3);
    assert.equal(res.cameras[1].bottom, -3);

    assert.equal(res.lights.length, 3);
    assert.equal(res.lights[0].type, "directional");
    assert.equal(res.lights[1].type, "point");
    assert.equal(res.lights[2].type, "spot");
    assert.deepEqual(res.lights[1].position, [1, 2, 3]);
    assert.equal(res.lights[1].range, 12);
    assert.deepEqual(res.lights[2].position, [4, 5, 6]);
    assert.equal(res.lights[2].range, 0);
    assert.equal(res.lights[2].innerCone, 0);
    assert.equal(res.lights[2].outerCone, Math.PI / 4);
    const directionBefore = res.lights[2].direction;
    res.nodes[2].transform.setPosition(7, 8, 9);
    res.nodes[2].transform.setRotationFromAxisAngle([0, 1, 0], Math.PI / 2);
    assert.deepEqual(res.lights[2].position, [7, 8, 9]);
    assert.notDeepEqual(res.lights[2].direction, directionBefore);
    approxEqual(Math.hypot(...res.lights[2].direction), 1);
    res.destroy();
}

// 6) Skin import creates valid runtimes, preserves joint order, and normalizes 8 influences.
{
    const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
    ]);
    const joints0 = new Uint16Array([
        0, 1, 0, 0,
        0, 1, 0, 0,
        0, 1, 0, 0,
    ]);
    const weights0 = new Float32Array([
        2, 2, 0, 0,
        1, 1, 0, 0,
        3, 1, 0, 0,
    ]);
    const joints1 = new Uint16Array([
        1, 0, 0, 0,
        1, 0, 0, 0,
        1, 0, 0, 0,
    ]);
    const weights1 = new Float32Array([
        2, 0, 0, 0,
        2, 0, 0, 0,
        4, 0, 0, 0,
    ]);
    const posOffset = 0;
    const joints0Offset = positions.byteLength;
    const weights0Offset = joints0Offset + joints0.byteLength;
    const joints1Offset = weights0Offset + weights0.byteLength;
    const weights1Offset = joints1Offset + joints1.byteLength;
    const bin = new Uint8Array(weights1Offset + weights1.byteLength);
    copyBytes(bin, posOffset, positions);
    copyBytes(bin, joints0Offset, joints0);
    copyBytes(bin, weights0Offset, weights0);
    copyBytes(bin, joints1Offset, joints1);
    copyBytes(bin, weights1Offset, weights1);
    const gltfJson = {
        asset: { version: "2.0" },
        buffers: [{ byteLength: bin.byteLength }],
        bufferViews: [
            { buffer: 0, byteOffset: posOffset, byteLength: positions.byteLength },
            { buffer: 0, byteOffset: joints0Offset, byteLength: joints0.byteLength },
            { buffer: 0, byteOffset: weights0Offset, byteLength: weights0.byteLength },
            { buffer: 0, byteOffset: joints1Offset, byteLength: joints1.byteLength },
            { buffer: 0, byteOffset: weights1Offset, byteLength: weights1.byteLength }
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
            { bufferView: 1, componentType: 5123, count: 3, type: "VEC4" },
            { bufferView: 2, componentType: 5126, count: 3, type: "VEC4" },
            { bufferView: 3, componentType: 5123, count: 3, type: "VEC4" },
            { bufferView: 4, componentType: 5126, count: 3, type: "VEC4" }
        ],
        meshes: [{ primitives: [{ attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2, JOINTS_1: 3, WEIGHTS_1: 4 } }] }],
        skins: [{ name: "Armature", joints: [0, 1] }],
        nodes: [
            { name: "JointA" },
            { name: "JointB", translation: [0, 1, 0] },
            { name: "SkinnedTri", mesh: 0, skin: 0 }
        ],
        scenes: [{ nodes: [0, 1, 2] }],
        scene: 0,
    };
    const res = importGltf(await loadGltf(makeGLB(gltfJson, bin.buffer)), {
        addToScene: false,
        computeMissingNormals: true,
    });

    assert.equal(res.skins.length, 1);
    assert.ok(res.skins[0].runtime);
    assert.equal(res.skins[0].runtime.jointCount, 2);
    assert.equal(res.skins[0].joints[0], res.nodes[0].transform);
    assert.equal(res.skins[0].joints[1], res.nodes[1].transform);
    assert.ok(res.meshes[0].skin);
    assert.equal(res.meshes[0].skin.jointCount, 2);
    assert.ok(res.meshes[0].geometry.joints1);
    assert.ok(res.meshes[0].geometry.weights1);
    approxEqual(res.meshes[0].geometry.weights[0] + res.meshes[0].geometry.weights[1] + res.meshes[0].geometry.weights1[0], 1);
    approxEqual(res.meshes[0].geometry.weights[4] + res.meshes[0].geometry.weights[5] + res.meshes[0].geometry.weights1[4], 1);
    res.destroy();
}

// 7) Morph targets and weight animations import and update public mesh bounds.
{
    const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
    ]);
    const targetPositions = new Float32Array([
        0, 0, 0,
        2, 0, 0,
        0, 0, 0,
    ]);
    const times = new Float32Array([0, 1]);
    const weights = new Float32Array([0, 1]);
    const posOffset = 0;
    const targetOffset = positions.byteLength;
    const timesOffset = targetOffset + targetPositions.byteLength;
    const weightsOffset = timesOffset + times.byteLength;
    const bin = new Uint8Array(weightsOffset + weights.byteLength);
    copyBytes(bin, posOffset, positions);
    copyBytes(bin, targetOffset, targetPositions);
    copyBytes(bin, timesOffset, times);
    copyBytes(bin, weightsOffset, weights);
    const gltfJson = {
        asset: { version: "2.0" },
        buffers: [{ byteLength: bin.byteLength }],
        bufferViews: [
            { buffer: 0, byteOffset: posOffset, byteLength: positions.byteLength },
            { buffer: 0, byteOffset: targetOffset, byteLength: targetPositions.byteLength },
            { buffer: 0, byteOffset: timesOffset, byteLength: times.byteLength },
            { buffer: 0, byteOffset: weightsOffset, byteLength: weights.byteLength }
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
            { bufferView: 1, componentType: 5126, count: 3, type: "VEC3" },
            { bufferView: 2, componentType: 5126, count: 2, type: "SCALAR" },
            { bufferView: 3, componentType: 5126, count: 2, type: "SCALAR" }
        ],
        meshes: [{
            weights: [0.25],
            primitives: [{ attributes: { POSITION: 0 }, targets: [{ POSITION: 1 }] }]
        }],
        nodes: [{ mesh: 0, name: "MorphNode", weights: [0.5] }],
        animations: [{
            name: "MorphWeight",
            samplers: [{ input: 2, output: 3, interpolation: "LINEAR" }],
            channels: [{ sampler: 0, target: { node: 0, path: "weights" } }]
        }],
        scenes: [{ nodes: [0] }],
        scene: 0,
    };
    const res = importGltf(await loadGltf(makeGLB(gltfJson, bin.buffer)), {
        addToScene: false,
        computeMissingNormals: true,
    });

    assert.equal(res.meshes.length, 1);
    assert.equal(res.meshes[0].geometry.morphTargets.length, 1);
    assert.deepEqual(res.meshes[0].userData.gltf.resolvedWeights, [0.5]);
    approxEqual(res.meshes[0].getLocalBounds().boxMax[0], 2);
    assert.equal(res.animations.length, 1);
    assert.equal(res.clips.length, 1);
    assert.equal(res.clips[0].duration, 1);
    res.clips[0].sample(1);
    approxEqual(res.meshes[0].getLocalBounds().boxMax[0], 3);
    res.destroy();
}

// 8) Metadata and variants expose extension support, XMP packets, and material switching.
{
    const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
    ]);
    const gltfJson = {
        asset: {
            version: "2.0",
            extras: { assetTag: "root" },
            extensions: { KHR_xmp_json_ld: { packet: 0 } }
        },
        extensionsUsed: [
            "KHR_materials_variants",
            "KHR_xmp_json_ld",
            "KHR_materials_clearcoat",
            "KHR_draco_mesh_compression"
        ],
        extensions: {
            KHR_xmp_json_ld: {
                packets: [
                    { label: "asset-packet" },
                    { label: "green-material-packet" }
                ]
            },
            KHR_materials_variants: {
                variants: [{ name: "Green", extras: { swatch: "green" } }]
            }
        },
        buffers: [{ byteLength: positions.byteLength }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
        materials: [
            { name: "White", pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] } },
            {
                name: "Green",
                pbrMetallicRoughness: { baseColorFactor: [0, 1, 0, 1] },
                extensions: { KHR_xmp_json_ld: { packet: 1 } }
            }
        ],
        meshes: [{
            name: "VariantMesh",
            primitives: [{
                attributes: { POSITION: 0 },
                material: 0,
                extras: { primitiveTag: "variant-slot" },
                extensions: {
                    KHR_materials_variants: {
                        mappings: [{ material: 1, variants: [0] }]
                    }
                }
            }],
            extras: { meshTag: "variant" }
        }],
        nodes: [{ mesh: 0, name: "VariantNode", extras: { nodeTag: "variant-node" } }],
        scenes: [{ name: "VariantScene", nodes: [0] }],
        scene: 0,
    };
    const res = importGltf(await loadGltf(makeGLB(gltfJson, positions.buffer)), {
        addToScene: false,
        computeMissingNormals: true,
    });

    assert.equal(res.metadata.extensions.support.KHR_materials_variants, "supported");
    assert.equal(res.metadata.extensions.support.KHR_xmp_json_ld, "supported");
    assert.equal(res.metadata.extensions.support.KHR_materials_clearcoat, "deferred");
    assert.equal(res.metadata.extensions.support.KHR_draco_mesh_compression, "unsupported");
    assert.equal(res.metadata.xmp.packet.label, "asset-packet");
    assert.equal(res.metadata.asset.xmp.label, "asset-packet");
    assert.equal(res.metadata.materials[1].xmp.label, "green-material-packet");
    assert.equal(res.metadata.scene.name, "VariantScene");
    assert.equal(res.metadata.nodes[0].extras.nodeTag, "variant-node");
    assert.equal(res.metadata.meshes[0].primitives[0].extras.primitiveTag, "variant-slot");
    assert.deepEqual(res.metadata.variants.names, ["Green"]);
    assert.equal(res.metadata.variants.items[0].extras.swatch, "green");

    const baselineMaterial = res.meshes[0].material;
    assert.deepEqual(res.meshes[0].material.color, [1, 1, 1]);
    res.metadata.variants.setActive("Green");
    assert.equal(res.metadata.variants.activeName, "Green");
    assert.equal(res.metadata.variants.activeIndex, 0);
    assert.notEqual(res.meshes[0].material, baselineMaterial);
    assert.deepEqual(res.meshes[0].material.color, [0, 1, 0]);
    res.metadata.variants.clear();
    assert.equal(res.metadata.variants.activeName, null);
    assert.equal(res.meshes[0].material, baselineMaterial);
    res.destroy();
}

// 9) Lifecycle cleanup handles shared resources, scene removal, transforms, clips, skins, and invalid skins.
{
    const baseTransformCount = TransformStore.global().count;
    const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
    ]);
    const joints = new Uint16Array([
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
    ]);
    const weights = new Float32Array([
        1, 0, 0, 0,
        1, 0, 0, 0,
        1, 0, 0, 0,
    ]);
    const times = new Float32Array([0, 1]);
    const translations = new Float32Array([
        0, 0, 0,
        1, 0, 0,
    ]);
    const posOffset = 0;
    const jointsOffset = positions.byteLength;
    const weightsOffset = jointsOffset + joints.byteLength;
    const timesOffset = weightsOffset + weights.byteLength;
    const translationsOffset = timesOffset + times.byteLength;
    const bin = new Uint8Array(translationsOffset + translations.byteLength);
    copyBytes(bin, posOffset, positions);
    copyBytes(bin, jointsOffset, joints);
    copyBytes(bin, weightsOffset, weights);
    copyBytes(bin, timesOffset, times);
    copyBytes(bin, translationsOffset, translations);
    const gltfJson = {
        asset: { version: "2.0" },
        buffers: [{ byteLength: bin.byteLength }],
        bufferViews: [
            { buffer: 0, byteOffset: posOffset, byteLength: positions.byteLength },
            { buffer: 0, byteOffset: jointsOffset, byteLength: joints.byteLength },
            { buffer: 0, byteOffset: weightsOffset, byteLength: weights.byteLength },
            { buffer: 0, byteOffset: timesOffset, byteLength: times.byteLength },
            { buffer: 0, byteOffset: translationsOffset, byteLength: translations.byteLength }
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
            { bufferView: 1, componentType: 5123, count: 3, type: "VEC4" },
            { bufferView: 2, componentType: 5126, count: 3, type: "VEC4" },
            { bufferView: 3, componentType: 5126, count: 2, type: "SCALAR" },
            { bufferView: 4, componentType: 5126, count: 2, type: "VEC3" }
        ],
        materials: [{ name: "SharedMaterial" }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 }, material: 0 }] }],
        skins: [{ joints: [0] }],
        cameras: [{ type: "perspective", perspective: { yfov: Math.PI / 4, znear: 0.1, zfar: 20 } }],
        animations: [{
            name: "MoveMesh",
            samplers: [{ input: 3, output: 4 }],
            channels: [{ sampler: 0, target: { node: 1, path: "translation" } }]
        }],
        nodes: [
            { name: "Joint" },
            { mesh: 0, skin: 0, name: "SharedA" },
            { mesh: 0, name: "SharedB" },
            { camera: 0, name: "CameraNode" }
        ],
        scenes: [{ nodes: [0, 1, 2, 3] }],
        scene: 0,
    };
    const scene = new Scene();
    const res = importGltf(await loadGltf(makeGLB(gltfJson, bin.buffer)), {
        targetScene: scene,
        addToScene: true,
        importCameras: true,
        computeMissingNormals: true,
    });

    assert.equal(res.meshes.length, 2);
    assert.equal(res.cameras.length, 1);
    assert.equal(res.skins.length, 1);
    assert.equal(res.clips.length, 1);
    assert.equal(scene.meshes.length, 2);
    res.meshes[0].destroy();
    assert.equal(scene.meshes.length, 1);
    assert.doesNotThrow(() => res.meshes[1].material.getUniformData());
    assert.doesNotThrow(() => res.meshes[1].geometry.retain().release());
    assert.doesNotThrow(() => res.destroy());
    assert.equal(scene.meshes.length, 0);
    assert.equal(TransformStore.global().count, baseTransformCount);

    const invalidWarnings = [];
    const invalid = importGltf(await loadGltf(makeGLB({
        asset: { version: "2.0" },
        buffers: [{ byteLength: bin.byteLength }],
        bufferViews: [
            { buffer: 0, byteOffset: posOffset, byteLength: positions.byteLength },
            { buffer: 0, byteOffset: jointsOffset, byteLength: joints.byteLength },
            { buffer: 0, byteOffset: weightsOffset, byteLength: weights.byteLength }
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
            { bufferView: 1, componentType: 5123, count: 3, type: "VEC4" },
            { bufferView: 2, componentType: 5126, count: 3, type: "VEC4" }
        ],
        meshes: [{ primitives: [{ attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 } }] }],
        skins: [{ joints: [99] }],
        nodes: [{ mesh: 0, skin: 0 }],
        scenes: [{ nodes: [0] }],
        scene: 0,
    }, bin.buffer)), {
        addToScene: false,
        computeMissingNormals: true,
        onWarning: (message) => invalidWarnings.push(message),
    });
    assert.equal(invalid.skins.length, 1);
    assert.equal(invalid.skins[0].runtime, null);
    assert.equal(invalid.meshes[0].skin, null);
    assert.ok(invalidWarnings.some((message) => message.includes("skipping skin runtime")));
    assert.ok(invalidWarnings.some((message) => message.includes("skipping skin binding")));
    invalid.destroy();
    assert.equal(TransformStore.global().count, baseTransformCount);
}
