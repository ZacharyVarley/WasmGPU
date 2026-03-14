/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { GltfAccessor, GltfAccessorComponentType, GltfAccessorType, GltfBufferView, GltfID, GltfRoot, GltfDocument } from "./types";

export type GltfTypedArray = | Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array;

type GltfTypedArrayCtor = {
    new (buffer: ArrayBuffer, byteOffset: number, length: number): GltfTypedArray;
};

export type AccessorView = {
    accessor: GltfAccessor;
    componentType: GltfAccessorComponentType;
    type: GltfAccessorType;
    count: number;
    numComponents: number;
    normalized: boolean;
    array: GltfTypedArray;
};

const COMPONENT_INFO: Record<number, { bytes: number; ctor: GltfTypedArrayCtor; signed: boolean; bits: number }> = {
    5120: { bytes: 1, ctor: Int8Array, signed: true, bits: 8 },
    5121: { bytes: 1, ctor: Uint8Array, signed: false, bits: 8 },
    5122: { bytes: 2, ctor: Int16Array, signed: true, bits: 16 },
    5123: { bytes: 2, ctor: Uint16Array, signed: false, bits: 16 },
    5124: { bytes: 4, ctor: Int32Array, signed: true, bits: 32 },
    5125: { bytes: 4, ctor: Uint32Array, signed: false, bits: 32 },
    5126: { bytes: 4, ctor: Float32Array, signed: true, bits: 32 },
};

export const gltfNumComponents = (type: GltfAccessorType): number => {
    switch (type) {
        case "SCALAR":
            return 1;
        case "VEC2":
            return 2;
        case "VEC3":
            return 3;
        case "VEC4":
            return 4;
        case "MAT2":
            return 4;
        case "MAT3":
            return 9;
        case "MAT4":
            return 16;
        default:
            return 1;
    }
};

const getAccessor = (json: GltfRoot, index: number): GltfAccessor => {
    const a = json.accessors?.[index];
    if (!a) throw new Error(`Invalid accessor index: ${index}`);
    return a;
};

const getBufferView = (json: GltfRoot, index: number): GltfBufferView => {
    const bv = json.bufferViews?.[index];
    if (!bv) throw new Error(`Invalid bufferView index: ${index}`);
    return bv;
};

const readComponent = (dv: DataView, byteOffset: number, componentType: GltfAccessorComponentType): number => {
    switch (componentType) {
        case 5120:
            return dv.getInt8(byteOffset);
        case 5121:
            return dv.getUint8(byteOffset);
        case 5122:
            return dv.getInt16(byteOffset, true);
        case 5123:
            return dv.getUint16(byteOffset, true);
        case 5124:
            return dv.getInt32(byteOffset, true);
        case 5125:
            return dv.getUint32(byteOffset, true);
        case 5126:
            return dv.getFloat32(byteOffset, true);
        default:
            throw new Error(`Unsupported componentType: ${componentType}`);
    }
};

export const readAccessor = (doc: GltfDocument, accessorIndex: number): AccessorView => {
    const json = doc.json;
    const accessor = getAccessor(json, accessorIndex);
    const componentType = accessor.componentType;
    const info = COMPONENT_INFO[componentType];
    if (!info) throw new Error(`Unsupported accessor componentType: ${componentType}`);
    const count = accessor.count | 0;
    const type = accessor.type;
    const numComps = gltfNumComponents(type);
    const normalized = accessor.normalized === true;
    const elemByteSize = info.bytes * numComps;
    let base: GltfTypedArray;
    if (accessor.bufferView === undefined) {
        base = new info.ctor(new ArrayBuffer(count * numComps * info.bytes), 0, count * numComps);
    } else {
        const bv = getBufferView(json, accessor.bufferView);
        if ((bv.extensions as Record<string, unknown> | undefined)?.["EXT_meshopt_compression"]) throw new Error("EXT_meshopt_compression is not supported yet. Please provide an uncompressed glTF/GLB.");
        const buffer = doc.buffers[bv.buffer];
        if (!buffer) throw new Error(`Missing buffer[${bv.buffer}]`);
        const bvOffset = (bv.byteOffset ?? 0) | 0;
        const accOffset = (accessor.byteOffset ?? 0) | 0;
        const start = bvOffset + accOffset;
        const byteStride = bv.byteStride ?? elemByteSize;
        if (byteStride < elemByteSize) throw new Error(`Invalid bufferView.byteStride (${byteStride}) < element byte size (${elemByteSize})`);
        const isTight = byteStride === elemByteSize;
        const isAligned = (start % info.bytes) === 0;
        if (isTight && isAligned) {
            base = new info.ctor(buffer, start, count * numComps);
        } else {
            base = new info.ctor(new ArrayBuffer(count * numComps * info.bytes), 0, count * numComps);
            const dv = new DataView(buffer);
            for (let i = 0; i < count; i++) {
                const elemBaseByte = start + i * byteStride;
                for (let c = 0; c < numComps; c++) {
                    const byteOff = elemBaseByte + c * info.bytes;
                    const outIndex = i * numComps + c;
                    (base as unknown as number[])[outIndex] = readComponent(dv, byteOff, componentType);
                }
            }
        }
    }
    if (accessor.sparse) {
        const out = base.slice() as GltfTypedArray;
        applySparse(doc, accessor, out, componentType, numComps);
        base = out;
    }
    return {
        accessor,
        componentType,
        type,
        count,
        numComponents: numComps,
        normalized,
        array: base,
    };
};

const applySparse = (doc: GltfDocument, accessor: GltfAccessor, out: GltfTypedArray, componentType: GltfAccessorComponentType, numComps: number): void => {
    const sparse = accessor.sparse!;
    const scount = sparse.count | 0;
    if (scount <= 0) return;
    const idxBv = getBufferView(doc.json, sparse.indices.bufferView);
    if ((idxBv.extensions as Record<string, unknown> | undefined)?.["EXT_meshopt_compression"]) throw new Error("EXT_meshopt_compression sparse indices are not supported yet.");
    const idxBuf = doc.buffers[idxBv.buffer];
    if (!idxBuf) throw new Error(`Missing buffer[${idxBv.buffer}] for sparse indices`);
    const idxOffset = (idxBv.byteOffset ?? 0) + (sparse.indices.byteOffset ?? 0);
    const idxComponent = sparse.indices.componentType;
    const idxInfo = COMPONENT_INFO[idxComponent];
    if (!idxInfo) throw new Error(`Unsupported sparse indices componentType: ${idxComponent}`);
    const idxStride = idxInfo.bytes;
    const idxDv = new DataView(idxBuf);
    const valBv = getBufferView(doc.json, sparse.values.bufferView);
    if ((valBv.extensions as Record<string, unknown> | undefined)?.["EXT_meshopt_compression"]) throw new Error("EXT_meshopt_compression sparse values are not supported yet.");
    const valBuf = doc.buffers[valBv.buffer];
    if (!valBuf) throw new Error(`Missing buffer[${valBv.buffer}] for sparse values`);
    const valOffset = (valBv.byteOffset ?? 0) + (sparse.values.byteOffset ?? 0);
    const valDv = new DataView(valBuf);
    const compInfo = COMPONENT_INFO[componentType];
    if (!compInfo) throw new Error(`Unsupported sparse values componentType: ${componentType}`);
    for (let i = 0; i < scount; i++) {
        const idxByte = idxOffset + i * idxStride;
        const dstIndex = readComponent(idxDv, idxByte, idxComponent as unknown as GltfAccessorComponentType) | 0;
        const dstBase = dstIndex * numComps;
        const srcBaseByte = valOffset + i * numComps * compInfo.bytes;
        for (let c = 0; c < numComps; c++) {
            const v = readComponent(valDv, srcBaseByte + c * compInfo.bytes, componentType);
            (out as unknown as number[])[dstBase + c] = v;
        }
    }
};

export const readAccessorAsFloat32 = (doc: GltfDocument, accessorIndex: number): Float32Array => {
    const view = readAccessor(doc, accessorIndex);
    const info = COMPONENT_INFO[view.componentType];
    if (!info) throw new Error(`Unsupported componentType: ${view.componentType}`);
    if (view.componentType === 5126 && !view.normalized) return view.array as Float32Array;
    const out = new Float32Array(view.array.length);
    for (let i = 0; i < view.array.length; i++) {
        const v = (view.array as unknown as number[])[i]!;
        if (!view.normalized || view.componentType === 5126) {
            out[i] = v;
        } else {
            if (info.signed) {
                const maxPos = 2 ** (info.bits - 1) - 1;
                const minNeg = -(2 ** (info.bits - 1));
                const f = v / maxPos;
                out[i] = v === minNeg ? -1.0 : Math.max(-1.0, Math.min(1.0, f));
            } else {
                const max = 2 ** info.bits - 1;
                out[i] = v / max;
            }
        }
    }
    return out;
};

export const readAccessorAsUint16 = (doc: GltfDocument, accessorIndex: number): Uint16Array => {
    const view = readAccessor(doc, accessorIndex);
    const ct = view.componentType;
    if (ct === 5123 && !view.normalized) return view.array as Uint16Array;
    const out = new Uint16Array(view.array.length);
    if (ct === 5121 && !view.normalized) {
        const src = view.array as Uint8Array;
        for (let i = 0; i < src.length; i++) out[i] = src[i]!;
        return out;
    }
    for (let i = 0; i < view.array.length; i++) {
        const v = (view.array as any)[i] as number;
        out[i] = v < 0 ? 0 : v > 65535 ? 65535 : (v | 0);
    }
    return out;
};

export const readIndicesAsUint32 = (doc: GltfDocument, accessorIndex: number): Uint32Array => {
    const view = readAccessor(doc, accessorIndex);
    const ct = view.componentType;
    if (ct === 5125 && !view.normalized) return view.array as Uint32Array;
    const out = new Uint32Array(view.array.length);
    for (let i = 0; i < view.array.length; i++) out[i] = (view.array as unknown as number[])[i]! >>> 0;
    return out;
};
