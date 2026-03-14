/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "assert";
import { initWebAssembly, readAccessorAsFloat32, parseGLB, loadGltf, importGltf } from "../dist/WasmGPU.js";

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
    off += binPaddedLen;
    return out;
};

await initWebAssembly(new URL("../dist/", import.meta.url).toString());

// 1) parseGLB: minimal valid GLB with a single accessor + bufferView + buffer
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
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        nodes: [{ mesh: 0 }],
        scenes: [{ nodes: [0] }],
        scene: 0,
    };
    const glb = makeGLB(gltfJson, positions.buffer);
    const parsed = parseGLB(glb);
    assert.equal(parsed.json.asset.version, "2.0");
    assert.ok(parsed.binChunk);
}

// 2) accessor decoding: byteStride + normalized u16 → f32
{
    const buf = new ArrayBuffer(32);
    const dv = new DataView(buf);
    dv.setFloat32(0, 1.0, true);
    dv.setFloat32(4, 2.0, true);
    dv.setFloat32(8, 3.0, true);
    dv.setUint16(12, 0, true);
    dv.setUint16(14, 65535, true);
    dv.setFloat32(16, 4.0, true);
    dv.setFloat32(20, 5.0, true);
    dv.setFloat32(24, 6.0, true);
    dv.setUint16(28, 32768, true);
    dv.setUint16(30, 0, true);
    const doc = {
        json: {
            asset: { version: "2.0" },
            buffers: [{ byteLength: 32 }],
            bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 32, byteStride: 16 }],
            accessors: [
                { bufferView: 0, byteOffset: 0, componentType: 5126, count: 2, type: "VEC3" },
                { bufferView: 0, byteOffset: 12, componentType: 5123, normalized: true, count: 2, type: "VEC2" },
            ],
        },
        buffers: [buf],
        baseUrl: "",
    };
    const pos = readAccessorAsFloat32(doc, 0);
    const uv = readAccessorAsFloat32(doc, 1);
    assert.deepEqual(Array.from(pos), [1, 2, 3, 4, 5, 6]);
    assert.ok(Math.abs(uv[0] - 0.0) < 1e-6);
    assert.ok(Math.abs(uv[1] - 1.0) < 1e-6);
    assert.ok(Math.abs(uv[2] - (32768 / 65535)) < 1e-6);
    assert.ok(Math.abs(uv[3] - 0.0) < 1e-6);
}

// 3) importer: creates Mesh, computes normals if missing
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
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        nodes: [{ mesh: 0, name: "Tri" }],
        scenes: [{ nodes: [0] }],
        scene: 0,
    };
    const glb = makeGLB(gltfJson, positions.buffer);
    const doc = await loadGltf(glb);
    const res = importGltf(doc, {
        addToScene: false,
        computeMissingNormals: true,
    });
    assert.equal(res.meshes.length, 1);
    assert.equal(res.meshes[0].name, "Tri");
    const geom = res.meshes[0].geometry;
    assert.equal(geom.vertexCount, 3);
    assert.ok(geom.normals.some((v) => Math.abs(v) > 1e-6));
    res.destroy();
}
