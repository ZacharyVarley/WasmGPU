/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createBuffer } from "../utils";
import { boundsf, wasm } from "../wasm";

export type GeometryAttribute = {
    data: Float32Array;
    itemSize: number;
};

export type GeometryDescriptor = {
    positions: Float32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    joints?: Uint16Array;
    weights?: Float32Array;
    joints1?: Uint16Array;
    weights1?: Float32Array;
    indices?: Uint32Array;
};

export type CartesianCurveDescriptor = {
    f: (x: number) => number;
    xMin?: number;
    xMax?: number;
    segments?: number;
    radius?: number;
    radialSegments?: number;
    closed?: boolean;
    plane?: "xy" | "xz" | "yz";
    up?: [number, number, number];
    breakOnInvalid?: boolean;
};

export type CartesianSurfaceDescriptor = {
    f: (x: number, z: number) => number;
    xMin?: number;
    xMax?: number;
    zMin?: number;
    zMax?: number;
    xSegments?: number;
    zSegments?: number;
    plane?: "xy" | "xz" | "yz";
    skipInvalid?: boolean;
    doubleSided?: boolean;
};

export type ParametricCurveDescriptor = {
    f: (t: number) => [number, number] | [number, number, number];
    tMin?: number;
    tMax?: number;
    segments?: number;
    radius?: number;
    radialSegments?: number;
    closed?: boolean;
    plane?: "xy" | "xz" | "yz";
    up?: [number, number, number];
    breakOnInvalid?: boolean;
};

export type ParametricSurfaceDescriptor = {
    f: (u: number, v: number) => [number, number, number];
    uMin?: number;
    uMax?: number;
    vMin?: number;
    vMax?: number;
    uSegments?: number;
    vSegments?: number;
    plane?: "xy" | "xz" | "yz";
    skipInvalid?: boolean;
    doubleSided?: boolean;
};

export class Geometry {
    readonly positions: Float32Array;
    readonly normals: Float32Array;
    readonly uvs: Float32Array;
    readonly joints: Uint16Array | null;
    readonly weights: Float32Array | null;
    readonly joints1: Uint16Array | null;
    readonly weights1: Float32Array | null;
    private _jointsBuffer: GPUBuffer | null = null;
    private _weightsBuffer: GPUBuffer | null = null;
    private _joints1Buffer: GPUBuffer | null = null;
    private _weights1Buffer: GPUBuffer | null = null;
    readonly indices: Uint32Array | null;
    readonly vertexCount: number;
    readonly indexCount: number;
    private _boundsMin: [number, number, number];
    private _boundsMax: [number, number, number];
    private _boundsCenter: [number, number, number];
    private _boundsRadius: number;
    private _positionBuffer: GPUBuffer | null = null;
    private _normalBuffer: GPUBuffer | null = null;
    private _uvBuffer: GPUBuffer | null = null;
    private _indexBuffer: GPUBuffer | null = null;
    private _device: GPUDevice | null = null;

    constructor(descriptor: GeometryDescriptor) {
        this.positions = descriptor.positions;
        this.vertexCount = this.positions.length / 3;
        this.normals = descriptor.normals ?? new Float32Array(this.vertexCount * 3).fill(0);
        if (!descriptor.normals) for (let i = 1; i < this.normals.length; i += 3) this.normals[i] = 1;
        this.uvs = descriptor.uvs ?? new Float32Array(this.vertexCount * 2);
        let joints = descriptor.joints ?? null;
        let weights = descriptor.weights ?? null;
        const expected = this.vertexCount * 4;
        if ((joints && !weights) || (!joints && weights)) {
            console.warn(`[Geometry] JOINTS_0/WEIGHTS_0 must be provided together. Skinning disabled for this geometry.`);
            joints = null; weights = null;
        }
        if (joints && joints.length !== expected) {
            console.warn(`[Geometry] joints length mismatch (got ${joints.length}, expected ${expected}). Skinning disabled.`);
            joints = null; weights = null;
        }
        if (weights && weights.length !== expected) {
            console.warn(`[Geometry] weights length mismatch (got ${weights.length}, expected ${expected}). Skinning disabled.`);
            joints = null; weights = null;
        }
        this.joints = joints;
        this.weights = weights;
        let joints1 = descriptor.joints1 ?? null;
        let weights1 = descriptor.weights1 ?? null;
        if ((joints1 && !weights1) || (!joints1 && weights1)) {
            console.warn(`[Geometry] JOINTS_1/WEIGHTS_1 must be provided together. Ignoring additional influences.`);
            joints1 = null; weights1 = null;
        }
        if ((joints1 || weights1) && (!joints || !weights)) {
            console.warn(`[Geometry] JOINTS_1/WEIGHTS_1 provided without JOINTS_0/WEIGHTS_0. Ignoring additional influences.`);
            joints1 = null; weights1 = null;
        }
        if (joints1 && joints1.length !== expected) {
            console.warn(`[Geometry] joints1 length mismatch (got ${joints1.length}, expected ${expected}). Ignoring additional influences.`);
            joints1 = null; weights1 = null;
        }
        if (weights1 && weights1.length !== expected) {
            console.warn(`[Geometry] weights1 length mismatch (got ${weights1.length}, expected ${expected}). Ignoring additional influences.`);
            joints1 = null; weights1 = null;
        }
        this.joints1 = joints1;
        this.weights1 = weights1;
        this.indices = descriptor.indices ?? null;
        this.indexCount = this.indices?.length ?? this.vertexCount;
        if (this.vertexCount > 0) {
            const positionsPtr = wasm.allocF32(this.positions.length);
            const boxMinPtr = wasm.allocF32(3);
            const boxMaxPtr = wasm.allocF32(3);
            const sphereCenterPtr = wasm.allocF32(3);
            const sphereRadiusPtr = wasm.allocF32(1);
            try {
                wasm.f32view(positionsPtr, this.positions.length).set(this.positions);
                boundsf.geometryPositions(boxMinPtr, boxMaxPtr, sphereCenterPtr, sphereRadiusPtr, positionsPtr, this.vertexCount);
                const boxMin = wasm.f32view(boxMinPtr, 3);
                const boxMax = wasm.f32view(boxMaxPtr, 3);
                const sphereCenter = wasm.f32view(sphereCenterPtr, 3);
                const sphereRadius = wasm.f32view(sphereRadiusPtr, 1);
                this._boundsMin = [boxMin[0], boxMin[1], boxMin[2]];
                this._boundsMax = [boxMax[0], boxMax[1], boxMax[2]];
                this._boundsCenter = [sphereCenter[0], sphereCenter[1], sphereCenter[2]];
                this._boundsRadius = sphereRadius[0];
            } finally {
                wasm.freeF32(sphereRadiusPtr, 1);
                wasm.freeF32(sphereCenterPtr, 3);
                wasm.freeF32(boxMaxPtr, 3);
                wasm.freeF32(boxMinPtr, 3);
                wasm.freeF32(positionsPtr, this.positions.length);
            }
        } else {
            this._boundsMin = [0, 0, 0];
            this._boundsMax = [0, 0, 0];
            this._boundsCenter = [0, 0, 0];
            this._boundsRadius = 0;
        }
    }

    upload(device: GPUDevice): void {
        if (this._device === device) return;
        this._device = device;
        this._positionBuffer = createBuffer(device, this.positions, GPUBufferUsage.VERTEX);
        this._normalBuffer = createBuffer(device, this.normals, GPUBufferUsage.VERTEX);
        this._uvBuffer = createBuffer(device, this.uvs, GPUBufferUsage.VERTEX);
        if (this.joints) this._jointsBuffer = createBuffer(device, this.joints, GPUBufferUsage.VERTEX);
        if (this.weights) this._weightsBuffer = createBuffer(device, this.weights, GPUBufferUsage.VERTEX);
        if (this.joints1) this._joints1Buffer = createBuffer(device, this.joints1, GPUBufferUsage.VERTEX);
        if (this.weights1) this._weights1Buffer = createBuffer(device, this.weights1, GPUBufferUsage.VERTEX);
        if (this.indices) this._indexBuffer = createBuffer(device, this.indices, GPUBufferUsage.INDEX);
    }

    get positionBuffer(): GPUBuffer {
        if (!this._positionBuffer) throw new Error("Geometry not uploaded. Call upload(device) first.");
        return this._positionBuffer;
    }

    get normalBuffer(): GPUBuffer {
        if (!this._normalBuffer) throw new Error("Geometry not uploaded. Call upload(device) first.");
        return this._normalBuffer;
    }

    get uvBuffer(): GPUBuffer {
        if (!this._uvBuffer) throw new Error("Geometry not uploaded. Call upload(device) first.");
        return this._uvBuffer;
    }

    get jointsBuffer(): GPUBuffer | null {
        return this._jointsBuffer;
    }

    get weightsBuffer(): GPUBuffer | null {
        return this._weightsBuffer;
    }

    get joints1Buffer(): GPUBuffer | null {
        return this._joints1Buffer;
    }

    get weights1Buffer(): GPUBuffer | null {
        return this._weights1Buffer;
    }

    get indexBuffer(): GPUBuffer | null {
        return this._indexBuffer;
    }

    get isIndexed(): boolean {
        return this._indexBuffer !== null;
    }

    get isSkinned(): boolean {
        return this._jointsBuffer !== null && this._weightsBuffer !== null;
    }

    get isSkinned8(): boolean {
        return this._jointsBuffer !== null && this._weightsBuffer !== null && this._joints1Buffer !== null && this._weights1Buffer !== null;
    }

    get boundsMin(): readonly [number, number, number] {
        return this._boundsMin;
    }

    get boundsMax(): readonly [number, number, number] {
        return this._boundsMax;
    }

    get boundsCenter(): readonly [number, number, number] {
        return this._boundsCenter;
    }

    get boundsRadius(): number {
        return this._boundsRadius;
    }

    destroy(): void {
        this._positionBuffer?.destroy();
        this._normalBuffer?.destroy();
        this._uvBuffer?.destroy();
        this._jointsBuffer?.destroy();
        this._weightsBuffer?.destroy();
        this._joints1Buffer?.destroy();
        this._weights1Buffer?.destroy();
        this._jointsBuffer = null;
        this._weightsBuffer = null;
        this._joints1Buffer = null;
        this._weights1Buffer = null;
        this._indexBuffer?.destroy();
        this._positionBuffer = null;
        this._normalBuffer = null;
        this._uvBuffer = null;
        this._indexBuffer = null;
        this._device = null;
    }

    static point(size = 1, plane: "xy" | "xz" | "yz" = "xy", doubleSided: boolean = false): Geometry {
        return Geometry.rectangle(size, size, plane, doubleSided);
    }

    static line(length = 1, thickness = 0.01, plane: "xy" | "xz" | "yz" = "xy", doubleSided: boolean = false): Geometry {
        return Geometry.rectangle(length, thickness, plane, doubleSided);
    }

    static plane(width = 1, height = 1, widthSegments = 1, heightSegments = 1): Geometry {
        const w = width / 2, h = height / 2;
        const gridX = widthSegments, gridY = heightSegments;
        const gridX1 = gridX + 1, gridY1 = gridY + 1;
        const segmentWidth = width / gridX;
        const segmentHeight = height / gridY;
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        for (let iy = 0; iy < gridY1; iy++) {
            const y = iy * segmentHeight - h;
            for (let ix = 0; ix < gridX1; ix++) {
                const x = ix * segmentWidth - w;
                positions.push(x, 0, y);
                normals.push(0, 1, 0);
                uvs.push(ix / gridX, 1 - iy / gridY);
            }
        }
        for (let iy = 0; iy < gridY; iy++) {
            for (let ix = 0; ix < gridX; ix++) {
                const a = ix + gridX1 * iy;
                const b = ix + gridX1 * (iy + 1);
                const c = (ix + 1) + gridX1 * (iy + 1);
                const d = (ix + 1) + gridX1 * iy;
                indices.push(a, b, d, b, c, d);
            }
        }
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static triangle(width = 1, height = 1, plane: "xy" | "xz" | "yz" = "xy", doubleSided: boolean = false): Geometry {
        const w = width / 2;
        const h = height / 2;
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const flipWinding = plane === "xz";
        let nx = 0, ny = 0, nz = 0;
        switch (plane) {
            case "xy":
                nz = 1;
                break;
            case "xz":
                ny = 1;
                break;
            case "yz":
                nx = 1;
                break;
        }
        const uFor = (x: number) => (width !== 0 ? (x / width) + 0.5 : 0.5);
        const vFor = (y: number) => (height !== 0 ? (-y / height) + 0.5 : 0.5);
        const pushVertex = (x: number, y: number) => {
            switch (plane) {
                case "xy":
                    positions.push(x, y, 0);
                    break;
                case "xz":
                    positions.push(x, 0, y);
                    break;
                case "yz":
                    positions.push(0, x, y);
                    break;
            }
            normals.push(nx, ny, nz);
            uvs.push(uFor(x), vFor(y));
        };
        pushVertex(-w, -h);
        pushVertex( w, -h);
        pushVertex( 0,  h);
        if (flipWinding) {
            indices.push(0, 2, 1);
        } else {
            indices.push(0, 1, 2);
        }
        const base: GeometryDescriptor = {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        };
        return new Geometry(doubleSided ? Geometry._makeDoubleSided(base) : base);
    }

    static rectangle(width = 1, height = 1, plane: "xy" | "xz" | "yz" = "xy", doubleSided: boolean = false): Geometry {
        const w = width / 2;
        const h = height / 2;
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const flipWinding = plane === "xz";
        let nx = 0, ny = 0, nz = 0;
        switch (plane) {
            case "xy":
                nz = 1;
                break;
            case "xz":
                ny = 1;
                break;
            case "yz":
                nx = 1;
                break;
        }
        const pushVertex = (x: number, y: number, u: number, v: number) => {
            switch (plane) {
                case "xy":
                    positions.push(x, y, 0);
                    break;
                case "xz":
                    positions.push(x, 0, y);
                    break;
                case "yz":
                    positions.push(0, x, y);
                    break;
            }
            normals.push(nx, ny, nz);
            uvs.push(u, v);
        };
        pushVertex(-w, -h, 0, 1);
        pushVertex( w, -h, 1, 1);
        pushVertex( w,  h, 1, 0);
        pushVertex(-w,  h, 0, 0);
        if (flipWinding) {
            indices.push(0, 2, 1, 0, 3, 2);
        } else {
            indices.push(0, 1, 2, 0, 2, 3);
        }
        const base: GeometryDescriptor = {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        };
        return new Geometry(doubleSided ? Geometry._makeDoubleSided(base) : base);
    }

    static circle(radius = 0.5, segments = 64, plane: "xy" | "xz" | "yz" = "xy", doubleSided: boolean = false): Geometry {
        const seg = Math.max(3, Math.floor(segments));
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const flipWinding = plane === "xz";
        let nx = 0, ny = 0, nz = 0;
        switch (plane) {
            case "xy":
                nz = 1;
                break;
            case "xz":
                ny = 1;
                break;
            case "yz":
                nx = 1;
                break;
        }
        const inv2r = radius !== 0 ? (1 / (2 * radius)) : 0;
        const pushVertex = (x: number, y: number) => {
            switch (plane) {
                case "xy":
                    positions.push(x, y, 0);
                    break;
                case "xz":
                    positions.push(x, 0, y);
                    break;
                case "yz":
                    positions.push(0, x, y);
                    break;
            }
            normals.push(nx, ny, nz);
            const u = radius !== 0 ? (0.5 + x * inv2r) : 0.5;
            const v = radius !== 0 ? (0.5 - y * inv2r) : 0.5;
            uvs.push(u, v);
        };
        pushVertex(0, 0);
        for (let i = 0; i < seg; i++) {
            const t = (i / seg) * Math.PI * 2;
            const x = Math.cos(t) * radius;
            const y = Math.sin(t) * radius;
            pushVertex(x, y);
        }
        for (let i = 0; i < seg; i++) {
            const a = 0;
            const b = 1 + i;
            const c = 1 + ((i + 1) % seg);
            if (flipWinding) {
                indices.push(a, c, b);
            } else {
                indices.push(a, b, c);
            }
        }
        const base: GeometryDescriptor = {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        };
        return new Geometry(doubleSided ? Geometry._makeDoubleSided(base) : base);
    }

    static ellipse(radiusX = 0.5, radiusY = 0.5, segments = 64, plane: "xy" | "xz" | "yz" = "xy", doubleSided: boolean = false): Geometry {
        const seg = Math.max(3, Math.floor(segments));
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const flipWinding = plane === "xz";
        let nx = 0, ny = 0, nz = 0;
        switch (plane) {
            case "xy":
                nz = 1;
                break;
            case "xz":
                ny = 1;
                break;
            case "yz":
                nx = 1;
                break;
        }
        const inv2rx = radiusX !== 0 ? (1 / (2 * radiusX)) : 0;
        const inv2ry = radiusY !== 0 ? (1 / (2 * radiusY)) : 0;
        const pushVertex = (x: number, y: number) => {
            switch (plane) {
                case "xy":
                    positions.push(x, y, 0);
                    break;
                case "xz":
                    positions.push(x, 0, y);
                    break;
                case "yz":
                    positions.push(0, x, y);
                    break;
            }
            normals.push(nx, ny, nz);
            const u = radiusX !== 0 ? (0.5 + x * inv2rx) : 0.5;
            const v = radiusY !== 0 ? (0.5 - y * inv2ry) : 0.5;
            uvs.push(u, v);
        };
        pushVertex(0, 0);
        for (let i = 0; i < seg; i++) {
            const t = (i / seg) * Math.PI * 2;
            const x = Math.cos(t) * radiusX;
            const y = Math.sin(t) * radiusY;
            pushVertex(x, y);
        }
        for (let i = 0; i < seg; i++) {
            const a = 0;
            const b = 1 + i;
            const c = 1 + ((i + 1) % seg);
            if (flipWinding) {
                indices.push(a, c, b);
            } else {
                indices.push(a, b, c);
            }
        }
        const base: GeometryDescriptor = {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        };
        return new Geometry(doubleSided ? Geometry._makeDoubleSided(base) : base);
    }

    static box(width = 1, height = 1, depth = 1): Geometry {
        const w = width / 2, h = height / 2, d = depth / 2;
        const positions = new Float32Array([
            -w, -h,  d,   w, -h,  d,   w,  h,  d,  -w,  h,  d,
             w, -h, -d,  -w, -h, -d,  -w,  h, -d,   w,  h, -d,
            -w,  h,  d,   w,  h,  d,   w,  h, -d,  -w,  h, -d,
            -w, -h, -d,   w, -h, -d,   w, -h,  d,  -w, -h,  d,
             w, -h,  d,   w, -h, -d,   w,  h, -d,   w,  h,  d,
            -w, -h, -d,  -w, -h,  d,  -w,  h,  d,  -w,  h, -d,
        ]);
        const normals = new Float32Array([
            0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
            0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
            0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
            0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
            1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
            -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
        ]);
        const uvs = new Float32Array([
            0, 1,  1, 1,  1, 0,  0, 0,
            0, 1,  1, 1,  1, 0,  0, 0,
            0, 1,  1, 1,  1, 0,  0, 0,
            0, 1,  1, 1,  1, 0,  0, 0,
            0, 1,  1, 1,  1, 0,  0, 0,
            0, 1,  1, 1,  1, 0,  0, 0,
        ]);
        const indices = new Uint32Array([
            0,  1,  2,   0,  2,  3,
            4,  5,  6,   4,  6,  7,
            8,  9, 10,   8, 10, 11,
           12, 13, 14,  12, 14, 15,
           16, 17, 18,  16, 18, 19,
           20, 21, 22,  20, 22, 23,
        ]);
        return new Geometry({ positions, normals, uvs, indices });
    }

    static sphere(radius = 0.5, widthSegments = 32, heightSegments = 16): Geometry {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        for (let iy = 0; iy <= heightSegments; iy++) {
            const v = iy / heightSegments;
            const phi = v * Math.PI;
            for (let ix = 0; ix <= widthSegments; ix++) {
                const u = ix / widthSegments;
                const theta = u * Math.PI * 2;
                const x = -Math.cos(theta) * Math.sin(phi);
                const y = Math.cos(phi);
                const z = Math.sin(theta) * Math.sin(phi);
                positions.push(radius * x, radius * y, radius * z);
                normals.push(x, y, z);
                uvs.push(u, v);
            }
        }
        for (let iy = 0; iy < heightSegments; iy++) {
            for (let ix = 0; ix < widthSegments; ix++) {
                const a = ix + (widthSegments + 1) * iy;
                const b = ix + (widthSegments + 1) * (iy + 1);
                const c = (ix + 1) + (widthSegments + 1) * (iy + 1);
                const d = (ix + 1) + (widthSegments + 1) * iy;
                if (iy !== 0) indices.push(a, b, d);
                if (iy !== heightSegments - 1) indices.push(b, c, d);
            }
        }
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static cylinder(radiusTop = 0.5, radiusBottom = 0.5, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false): Geometry {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let index = 0;
        const halfHeight = height / 2;
        const slope = (radiusBottom - radiusTop) / height;
        for (let iy = 0; iy <= heightSegments; iy++) {
            const v = iy / heightSegments;
            const y = v * height - halfHeight;
            const radius = v * (radiusTop - radiusBottom) + radiusBottom;
            for (let ix = 0; ix <= radialSegments; ix++) {
                const u = ix / radialSegments;
                const theta = u * Math.PI * 2;
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);
                positions.push(radius * sinTheta, y, radius * cosTheta);
                const nLen = Math.sqrt(1 + slope * slope);
                normals.push(sinTheta / nLen, slope / nLen, cosTheta / nLen);
                uvs.push(u, 1 - v);
            }
        }
        for (let iy = 0; iy < heightSegments; iy++) {
            for (let ix = 0; ix < radialSegments; ix++) {
                const a = ix + (radialSegments + 1) * iy;
                const b = ix + (radialSegments + 1) * (iy + 1);
                const c = (ix + 1) + (radialSegments + 1) * (iy + 1);
                const d = (ix + 1) + (radialSegments + 1) * iy;
                indices.push(a, d, b, b, d, c);
            }
        }
        index = positions.length / 3;
        const generateTopCap = () => {
            const centerIndex = index;
            positions.push(0, halfHeight, 0);
            normals.push(0, 1, 0);
            uvs.push(0.5, 0.5);
            index++;
            for (let ix = 0; ix <= radialSegments; ix++) {
                const u = ix / radialSegments;
                const theta = u * Math.PI * 2;
                const x = radiusTop * Math.sin(theta);
                const z = radiusTop * Math.cos(theta);
                positions.push(x, halfHeight, z);
                normals.push(0, 1, 0);
                uvs.push(Math.sin(theta) * 0.5 + 0.5, Math.cos(theta) * 0.5 + 0.5);
                if (ix > 0) indices.push(centerIndex, index - 1, index);
                index++;
            }
        };
        const generateBottomCap = () => {
            const centerIndex = index;
            positions.push(0, -halfHeight, 0);
            normals.push(0, -1, 0);
            uvs.push(0.5, 0.5);
            index++;
            for (let ix = 0; ix <= radialSegments; ix++) {
                const u = ix / radialSegments;
                const theta = u * Math.PI * 2;
                const x = radiusBottom * Math.sin(theta);
                const z = radiusBottom * Math.cos(theta);
                positions.push(x, -halfHeight, z);
                normals.push(0, -1, 0);
                uvs.push(Math.sin(theta) * 0.5 + 0.5, Math.cos(theta) * 0.5 + 0.5);
                if (ix > 0) indices.push(centerIndex, index, index - 1);
                index++;
            }
        };
        if (!openEnded) {
            generateTopCap();
            generateBottomCap();
        }
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static pyramid(baseWidth = 1, baseDepth = 1, height = 1): Geometry {
        const w = baseWidth / 2, d = baseDepth / 2;
        const h = height;
        const apex: [number, number, number] = [0, h, 0];
        const bl: [number, number, number] = [-w, 0, -d];
        const br: [number, number, number] = [w, 0, -d];
        const fr: [number, number, number] = [w, 0, d];
        const fl: [number, number, number] = [-w, 0, d];
        const faceNormal = (v0: [number, number, number], v1: [number, number, number], v2: [number, number, number]): [number, number, number] => {
            const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
            const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
            const nx = ay * bz - az * by;
            const ny = az * bx - ax * bz;
            const nz = ax * by - ay * bx;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            return [nx / len, ny / len, nz / len];
        };
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let idx = 0;
        const addFace = (v0: [number, number, number], v1: [number, number, number], v2: [number, number, number]) => {
            const n = faceNormal(v0, v1, v2);
            positions.push(...v0, ...v1, ...v2);
            normals.push(...n, ...n, ...n);
            uvs.push(0.5, 0, 0, 1, 1, 1);
            indices.push(idx, idx + 1, idx + 2);
            idx += 3;
        };
        addFace(apex, fl, fr);
        addFace(apex, fr, br);
        addFace(apex, br, bl);
        addFace(apex, bl, fl);
        const baseNormal: [number, number, number] = [0, -1, 0];
        positions.push(...bl, ...br, ...fr, ...fl);
        normals.push(...baseNormal, ...baseNormal, ...baseNormal, ...baseNormal);
        uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
        indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static torus(radius = 0.5, tube = 0.2, radialSegments = 32, tubularSegments = 24): Geometry {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        for (let j = 0; j <= radialSegments; j++) {
            for (let i = 0; i <= tubularSegments; i++) {
                const u = (i / tubularSegments) * Math.PI * 2;
                const v = (j / radialSegments) * Math.PI * 2;
                const x = (radius + tube * Math.cos(v)) * Math.cos(u);
                const y = tube * Math.sin(v);
                const z = (radius + tube * Math.cos(v)) * Math.sin(u);
                positions.push(x, y, z);
                const cx = radius * Math.cos(u);
                const cz = radius * Math.sin(u);
                const nx = x - cx;
                const ny = y;
                const nz = z - cz;
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                normals.push(nx / len, ny / len, nz / len);
                uvs.push(i / tubularSegments, j / radialSegments);
            }
        }
        for (let j = 0; j < radialSegments; j++) {
            for (let i = 0; i < tubularSegments; i++) {
                const a = i + (tubularSegments + 1) * j;
                const b = i + (tubularSegments + 1) * (j + 1);
                const c = (i + 1) + (tubularSegments + 1) * (j + 1);
                const d = (i + 1) + (tubularSegments + 1) * j;
                indices.push(a, b, d, b, c, d);
            }
        }
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static prism(radius = 0.5, height = 1, sides = 6): Geometry {
        if (sides < 3) sides = 3;
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const halfHeight = height / 2;
        let idx = 0;
        const topRing: [number, number, number][] = [];
        const bottomRing: [number, number, number][] = [];
        for (let i = 0; i < sides; i++) {
            const theta = (i / sides) * Math.PI * 2;
            const x = radius * Math.cos(theta);
            const z = radius * Math.sin(theta);
            topRing.push([x, halfHeight, z]);
            bottomRing.push([x, -halfHeight, z]);
        }
        const faceNormal = (v0: [number, number, number], v1: [number, number, number], v2: [number, number, number]): [number, number, number] => {
            const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
            const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
            const nx = ay * bz - az * by;
            const ny = az * bx - ax * bz;
            const nz = ax * by - ay * bx;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            return [nx / len, ny / len, nz / len];
        };
        for (let i = 0; i < sides; i++) {
            const next = (i + 1) % sides;
            const t0 = topRing[i];
            const t1 = topRing[next];
            const b0 = bottomRing[i];
            const b1 = bottomRing[next];
            const n = faceNormal(t0, t1, b0);
            positions.push(...t0, ...b0, ...b1, ...t1);
            normals.push(...n, ...n, ...n, ...n);
            const u0 = i / sides;
            const u1 = (i + 1) / sides;
            uvs.push(u0, 0, u0, 1, u1, 1, u1, 0);
            indices.push(idx, idx + 2, idx + 1, idx, idx + 3, idx + 2);
            idx += 4;
        }
        const topCenter: [number, number, number] = [0, halfHeight, 0];
        const topNormal: [number, number, number] = [0, 1, 0];
        const topCenterIdx = idx;
        positions.push(...topCenter);
        normals.push(...topNormal);
        uvs.push(0.5, 0.5);
        idx++;
        for (let i = 0; i < sides; i++) {
            const t = topRing[i];
            positions.push(...t);
            normals.push(...topNormal);
            const u = 0.5 + 0.5 * Math.cos((i / sides) * Math.PI * 2);
            const v = 0.5 + 0.5 * Math.sin((i / sides) * Math.PI * 2);
            uvs.push(u, v);
        }
        for (let i = 0; i < sides; i++) {
            const next = (i + 1) % sides;
            indices.push(topCenterIdx, topCenterIdx + 1 + next, topCenterIdx + 1 + i);
        }
        idx += sides;
        const bottomCenter: [number, number, number] = [0, -halfHeight, 0];
        const bottomNormal: [number, number, number] = [0, -1, 0];
        const bottomCenterIdx = idx;
        positions.push(...bottomCenter);
        normals.push(...bottomNormal);
        uvs.push(0.5, 0.5);
        idx++;
        for (let i = 0; i < sides; i++) {
            const b = bottomRing[i];
            positions.push(...b);
            normals.push(...bottomNormal);
            const u = 0.5 + 0.5 * Math.cos((i / sides) * Math.PI * 2);
            const v = 0.5 + 0.5 * Math.sin((i / sides) * Math.PI * 2);
            uvs.push(u, v);
        }
        for (let i = 0; i < sides; i++) {
            const next = (i + 1) % sides;
            indices.push(bottomCenterIdx, bottomCenterIdx + 1 + i, bottomCenterIdx + 1 + next);
        }
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static cartesianCurve(descriptor: CartesianCurveDescriptor): Geometry {
        const f = descriptor.f;
        const xMin = descriptor.xMin ?? -1;
        const xMax = descriptor.xMax ?? 1;
        const segments = Math.max(2, Math.floor(descriptor.segments ?? 256));
        const radius = descriptor.radius ?? 0.01;
        const radialSegments = Math.max(3, Math.floor(descriptor.radialSegments ?? 8));
        const closed = descriptor.closed ?? false;
        const plane: "xy" | "xz" | "yz" = descriptor.plane ?? "xy";
        const upLocal: [number, number, number] = descriptor.up ?? [0, 0, 1];
        let up: [number, number, number];
        switch (plane) {
            case "xy":
                up = upLocal;
                break;
            case "xz":
                up = [upLocal[0], upLocal[2], upLocal[1]];
                break;
            case "yz":
                up = [upLocal[2], upLocal[0], upLocal[1]];
                break;
        }
        const breakOnInvalid = descriptor.breakOnInvalid ?? true;
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let vertexOffset = 0;
        const sampleCount = closed ? segments : segments + 1;
        let segmentPoints: number[] = [];
        let anyInvalid = false;
        const flushSegment = (close: boolean) => {
            const pointCount = segmentPoints.length / 3;
            if (pointCount >= 2) {
                vertexOffset = Geometry._appendTubeSegment(new Float32Array(segmentPoints), radius, radialSegments, close, up, positions, normals, uvs, indices, vertexOffset);
            }
            segmentPoints = [];
        };
        const range = xMax - xMin;
        for (let i = 0; i < sampleCount; i++) {
            const u = segments > 0 ? (i / segments) : 0;
            const x = xMin + range * u;
            const y = f(x);
            if (!Number.isFinite(y)) {
                anyInvalid = true;
                if (breakOnInvalid) flushSegment(false);
                continue;
            }
            let wx: number;
            let wy: number;
            let wz: number;
            switch (plane) {
                case "xy":
                    wx = x;
                    wy = y;
                    wz = 0;
                    break;
                case "xz":
                    wx = x;
                    wy = 0;
                    wz = y;
                    break;
                case "yz":
                    wx = 0;
                    wy = x;
                    wz = y;
                    break;
            }
            segmentPoints.push(wx, wy, wz);
        }
        flushSegment(closed && !anyInvalid);
        if (positions.length === 0) return new Geometry({ positions: new Float32Array(0) });
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static cartesianSurface(descriptor: CartesianSurfaceDescriptor): Geometry {
        const f = descriptor.f;
        const xMin = descriptor.xMin ?? -1;
        const xMax = descriptor.xMax ?? 1;
        const zMin = descriptor.zMin ?? -1;
        const zMax = descriptor.zMax ?? 1;
        const xSegments = Math.max(1, Math.floor(descriptor.xSegments ?? 128));
        const zSegments = Math.max(1, Math.floor(descriptor.zSegments ?? 128));
        const skipInvalid = descriptor.skipInvalid ?? true;
        const doubleSided = descriptor.doubleSided ?? false;
        const plane: "xy" | "xz" | "yz" = descriptor.plane ?? "xz";
        const gridX = xSegments;
        const gridZ = zSegments;
        const gridX1 = gridX + 1;
        const gridZ1 = gridZ + 1;
        const positions = new Float32Array(gridX1 * gridZ1 * 3);
        const normals = new Float32Array(gridX1 * gridZ1 * 3);
        const uvs = new Float32Array(gridX1 * gridZ1 * 2);
        const valid = new Uint8Array(gridX1 * gridZ1);
        const xRange = xMax - xMin;
        const zRange = zMax - zMin;
        for (let iz = 0; iz < gridZ1; iz++) {
            const vz = gridZ > 0 ? (iz / gridZ) : 0;
            const z = zMin + zRange * vz;
            for (let ix = 0; ix < gridX1; ix++) {
                const ux = gridX > 0 ? (ix / gridX) : 0;
                const x = xMin + xRange * ux;
                const i = ix + gridX1 * iz;
                const y = f(x, z);
                const ok = Number.isFinite(y);
                valid[i] = ok ? 1 : 0;
                const p = i * 3;
                const height = ok ? y : 0;
                let wx: number;
                let wy: number;
                let wz: number;
                switch (plane) {
                    case "xy":
                        wx = x;
                        wy = z;
                        wz = height;
                        break;
                    case "xz":
                        wx = x;
                        wy = height;
                        wz = z;
                        break;
                    case "yz":
                        wx = height;
                        wy = x;
                        wz = z;
                        break;
                }
                positions[p + 0] = wx;
                positions[p + 1] = wy;
                positions[p + 2] = wz;
                const t = i * 2;
                uvs[t + 0] = ux;
                uvs[t + 1] = 1 - vz;
            }
        }
        Geometry._computeGridNormals(positions, valid, gridX, gridZ, normals);
        const indices: number[] = [];
        for (let iz = 0; iz < gridZ; iz++) {
            for (let ix = 0; ix < gridX; ix++) {
                const a = ix + gridX1 * iz;
                const b = ix + gridX1 * (iz + 1);
                const c = (ix + 1) + gridX1 * (iz + 1);
                const d = (ix + 1) + gridX1 * iz;
                if (skipInvalid && (!valid[a] || !valid[b] || !valid[c] || !valid[d])) continue;
                indices.push(a, b, d, b, c, d);
            }
        }
        if (indices.length === 0) return new Geometry({ positions: new Float32Array(0) });
        const base: GeometryDescriptor = {
            positions,
            normals,
            uvs,
            indices: new Uint32Array(indices)
        };
        return new Geometry(doubleSided ? Geometry._makeDoubleSided(base) : base);
    }

    static parametricCurve(descriptor: ParametricCurveDescriptor): Geometry {
        const f = descriptor.f;
        const tMin = descriptor.tMin ?? 0;
        const tMax = descriptor.tMax ?? 1;
        const segments = Math.max(2, Math.floor(descriptor.segments ?? 256));
        const radius = descriptor.radius ?? 0.01;
        const radialSegments = Math.max(3, Math.floor(descriptor.radialSegments ?? 8));
        const closed = descriptor.closed ?? false;
        const breakOnInvalid = descriptor.breakOnInvalid ?? true;
        const plane: "xy" | "xz" | "yz" = descriptor.plane ?? "xy";
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let vertexOffset = 0;
        const sampleCount = closed ? segments : segments + 1;
        let segmentPoints: number[] = [];
        let anyInvalid = false;
        let upLocal: [number, number, number] | null = descriptor.up ?? null;
        let upWorld: [number, number, number] | null = null;
        if (upLocal) {
            switch (plane) {
                case "xy":
                    upWorld = upLocal;
                    break;
                case "xz":
                    upWorld = [upLocal[0], upLocal[2], upLocal[1]];
                    break;
                case "yz":
                    upWorld = [upLocal[2], upLocal[0], upLocal[1]];
                    break;
            }
        }
        const flushSegment = (close: boolean) => {
            const pointCount = segmentPoints.length / 3;
            if (pointCount >= 2) {
                const upVec: [number, number, number] = upWorld ?? [0, 1, 0];
                vertexOffset = Geometry._appendTubeSegment(new Float32Array(segmentPoints), radius, radialSegments, close, upVec, positions, normals, uvs, indices, vertexOffset);
            }
            segmentPoints = [];
        };
        const range = tMax - tMin;
        for (let i = 0; i < sampleCount; i++) {
            const s = segments > 0 ? (i / segments) : 0;
            const t = tMin + range * s;
            const p = f(t);
            let x: number;
            let y: number;
            let z: number;
            if (p.length === 2) {
                x = p[0];
                y = p[1];
                z = 0;
                if (!upLocal) {
                    upLocal = [0, 0, 1];
                    switch (plane) {
                        case "xy":
                            upWorld = upLocal;
                            break;
                        case "xz":
                            upWorld = [upLocal[0], upLocal[2], upLocal[1]];
                            break;
                        case "yz":
                            upWorld = [upLocal[2], upLocal[0], upLocal[1]];
                            break;
                    }
                }
            } else {
                x = p[0];
                y = p[1];
                z = p[2];
                if (!upLocal) {
                    upLocal = [0, 1, 0];
                    switch (plane) {
                        case "xy":
                            upWorld = upLocal;
                            break;
                        case "xz":
                            upWorld = [upLocal[0], upLocal[2], upLocal[1]];
                            break;
                        case "yz":
                            upWorld = [upLocal[2], upLocal[0], upLocal[1]];
                            break;
                    }
                }
            }
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
                anyInvalid = true;
                if (breakOnInvalid) flushSegment(false);
                continue;
            }
            let wx: number;
            let wy: number;
            let wz: number;
            switch (plane) {
                case "xy":
                    wx = x;
                    wy = y;
                    wz = z;
                    break;
                case "xz":
                    wx = x;
                    wy = z;
                    wz = y;
                    break;
                case "yz":
                    wx = z;
                    wy = x;
                    wz = y;
                    break;
            }
            segmentPoints.push(wx, wy, wz);
        }
        flushSegment(closed && !anyInvalid);
        if (positions.length === 0) return new Geometry({ positions: new Float32Array(0) });
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }

    static parametricSurface(descriptor: ParametricSurfaceDescriptor): Geometry {
        const f = descriptor.f;
        const uMin = descriptor.uMin ?? 0;
        const uMax = descriptor.uMax ?? 1;
        const vMin = descriptor.vMin ?? 0;
        const vMax = descriptor.vMax ?? 1;
        const uSegments = Math.max(1, Math.floor(descriptor.uSegments ?? 128));
        const vSegments = Math.max(1, Math.floor(descriptor.vSegments ?? 128));
        const skipInvalid = descriptor.skipInvalid ?? true;
        const doubleSided = descriptor.doubleSided ?? false;
        const plane: "xy" | "xz" | "yz" = descriptor.plane ?? "xy";
        const gridU = uSegments;
        const gridV = vSegments;
        const gridU1 = gridU + 1;
        const gridV1 = gridV + 1;
        const positions = new Float32Array(gridU1 * gridV1 * 3);
        const normals = new Float32Array(gridU1 * gridV1 * 3);
        const uvs = new Float32Array(gridU1 * gridV1 * 2);
        const valid = new Uint8Array(gridU1 * gridV1);
        const uRange = uMax - uMin;
        const vRange = vMax - vMin;
        for (let iv = 0; iv < gridV1; iv++) {
            const vv = gridV > 0 ? (iv / gridV) : 0;
            const v = vMin + vRange * vv;
            for (let iu = 0; iu < gridU1; iu++) {
                const uu = gridU > 0 ? (iu / gridU) : 0;
                const u = uMin + uRange * uu;
                const i = iu + gridU1 * iv;
                const p = f(u, v);
                const x = p[0];
                const y = p[1];
                const z = p[2];
                const ok = Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
                valid[i] = ok ? 1 : 0;
                const o = i * 3;
                if (ok) {
                    let wx: number;
                    let wy: number;
                    let wz: number;
                    switch (plane) {
                        case "xy":
                            wx = x;
                            wy = y;
                            wz = z;
                            break;
                        case "xz":
                            wx = x;
                            wy = z;
                            wz = y;
                            break;
                        case "yz":
                            wx = z;
                            wy = x;
                            wz = y;
                            break;
                    }
                    positions[o + 0] = wx;
                    positions[o + 1] = wy;
                    positions[o + 2] = wz;
                } else {
                    positions[o + 0] = 0;
                    positions[o + 1] = 0;
                    positions[o + 2] = 0;
                }
                const t = i * 2;
                uvs[t + 0] = uu;
                uvs[t + 1] = 1 - vv;
            }
        }
        Geometry._computeGridNormals(positions, valid, gridU, gridV, normals);
        const indices: number[] = [];
        for (let iv = 0; iv < gridV; iv++) {
            for (let iu = 0; iu < gridU; iu++) {
                const a = iu + gridU1 * iv;
                const b = iu + gridU1 * (iv + 1);
                const c = (iu + 1) + gridU1 * (iv + 1);
                const d = (iu + 1) + gridU1 * iv;
                if (skipInvalid && (!valid[a] || !valid[b] || !valid[c] || !valid[d])) continue;
                indices.push(a, b, d, b, c, d);
            }
        }
        if (indices.length === 0) return new Geometry({ positions: new Float32Array(0) });
        const base: GeometryDescriptor = {
            positions,
            normals,
            uvs,
            indices: new Uint32Array(indices)
        };
        return new Geometry(doubleSided ? Geometry._makeDoubleSided(base) : base);
    }

    private static _appendTubeSegment(points: Float32Array, radius: number, radialSegments: number, closed: boolean, up: [number, number, number], outPositions: number[], outNormals: number[], outUvs: number[], outIndices: number[], vertexOffset: number): number {
        const pointCount = points.length / 3;
        if (pointCount < 2) return vertexOffset;
        const tangents = new Float32Array(pointCount * 3);
        for (let i = 0; i < pointCount; i++) {
            const prev = closed ? (i - 1 + pointCount) % pointCount : Math.max(i - 1, 0);
            const next = closed ? (i + 1) % pointCount : Math.min(i + 1, pointCount - 1);
            let tx = points[next * 3 + 0] - points[prev * 3 + 0];
            let ty = points[next * 3 + 1] - points[prev * 3 + 1];
            let tz = points[next * 3 + 2] - points[prev * 3 + 2];
            const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
            if (tLen > 1e-12) {
                tx /= tLen;
                ty /= tLen;
                tz /= tLen;
            } else {
                tx = 0;
                ty = 1;
                tz = 0;
            }
            tangents[i * 3 + 0] = tx;
            tangents[i * 3 + 1] = ty;
            tangents[i * 3 + 2] = tz;
        }
        const normals = new Float32Array(pointCount * 3);
        const binormals = new Float32Array(pointCount * 3);
        let upX = up[0], upY = up[1], upZ = up[2];
        const t0x = tangents[0], t0y = tangents[1], t0z = tangents[2];
        let n0x = t0y * upZ - t0z * upY;
        let n0y = t0z * upX - t0x * upZ;
        let n0z = t0x * upY - t0y * upX;
        let n0Len = Math.sqrt(n0x * n0x + n0y * n0y + n0z * n0z);
        if (n0Len < 1e-6) {
            if (Math.abs(t0x) < 0.9) { upX = 1; upY = 0; upZ = 0; }
            else { upX = 0; upY = 1; upZ = 0; }
            n0x = t0y * upZ - t0z * upY;
            n0y = t0z * upX - t0x * upZ;
            n0z = t0x * upY - t0y * upX;
            n0Len = Math.sqrt(n0x * n0x + n0y * n0y + n0z * n0z);
        }
        if (n0Len > 1e-12) {
            n0x /= n0Len;
            n0y /= n0Len;
            n0z /= n0Len;
        } else {
            n0x = 1;
            n0y = 0;
            n0z = 0;
        }
        normals[0] = n0x;
        normals[1] = n0y;
        normals[2] = n0z;
        let b0x = t0y * n0z - t0z * n0y;
        let b0y = t0z * n0x - t0x * n0z;
        let b0z = t0x * n0y - t0y * n0x;
        const b0Len = Math.sqrt(b0x * b0x + b0y * b0y + b0z * b0z);
        if (b0Len > 1e-12) {
            b0x /= b0Len;
            b0y /= b0Len;
            b0z /= b0Len;
        }
        binormals[0] = b0x;
        binormals[1] = b0y;
        binormals[2] = b0z;
        for (let i = 1; i < pointCount; i++) {
            const tPrevX = tangents[(i - 1) * 3 + 0];
            const tPrevY = tangents[(i - 1) * 3 + 1];
            const tPrevZ = tangents[(i - 1) * 3 + 2];
            const tCurX = tangents[i * 3 + 0];
            const tCurY = tangents[i * 3 + 1];
            const tCurZ = tangents[i * 3 + 2];
            let ax = tPrevY * tCurZ - tPrevZ * tCurY;
            let ay = tPrevZ * tCurX - tPrevX * tCurZ;
            let az = tPrevX * tCurY - tPrevY * tCurX;
            const aLen = Math.sqrt(ax * ax + ay * ay + az * az);
            let nx = normals[(i - 1) * 3 + 0];
            let ny = normals[(i - 1) * 3 + 1];
            let nz = normals[(i - 1) * 3 + 2];
            if (aLen > 1e-6) {
                ax /= aLen;
                ay /= aLen;
                az /= aLen;
                const dot = Math.max(-1, Math.min(1, tPrevX * tCurX + tPrevY * tCurY + tPrevZ * tCurZ));
                const angle = Math.acos(dot);
                const c = Math.cos(angle);
                const s = Math.sin(angle);
                const oneMinusC = 1 - c;
                const crossX = ay * nz - az * ny;
                const crossY = az * nx - ax * nz;
                const crossZ = ax * ny - ay * nx;
                const aDotN = ax * nx + ay * ny + az * nz;
                const rx = nx * c + crossX * s + ax * aDotN * oneMinusC;
                const ry = ny * c + crossY * s + ay * aDotN * oneMinusC;
                const rz = nz * c + crossZ * s + az * aDotN * oneMinusC;
                nx = rx;
                ny = ry;
                nz = rz;
            }
            const nDotT = nx * tCurX + ny * tCurY + nz * tCurZ;
            nx -= tCurX * nDotT;
            ny -= tCurY * nDotT;
            nz -= tCurZ * nDotT;
            const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (nLen > 1e-12) {
                nx /= nLen;
                ny /= nLen;
                nz /= nLen;
            } else {
                nx = normals[0];
                ny = normals[1];
                nz = normals[2];
            }
            normals[i * 3 + 0] = nx;
            normals[i * 3 + 1] = ny;
            normals[i * 3 + 2] = nz;
            let bx = tCurY * nz - tCurZ * ny;
            let by = tCurZ * nx - tCurX * nz;
            let bz = tCurX * ny - tCurY * nx;
            const bLen = Math.sqrt(bx * bx + by * by + bz * bz);
            if (bLen > 1e-12) {
                bx /= bLen;
                by /= bLen;
                bz /= bLen;
            }
            binormals[i * 3 + 0] = bx;
            binormals[i * 3 + 1] = by;
            binormals[i * 3 + 2] = bz;
        }
        const ring = radialSegments + 1;
        const denomU = closed ? pointCount : (pointCount - 1);
        for (let i = 0; i < pointCount; i++) {
            const u = denomU > 0 ? (i / denomU) : 0;
            const px = points[i * 3 + 0];
            const py = points[i * 3 + 1];
            const pz = points[i * 3 + 2];
            const nx0 = normals[i * 3 + 0];
            const ny0 = normals[i * 3 + 1];
            const nz0 = normals[i * 3 + 2];
            const bx0 = binormals[i * 3 + 0];
            const by0 = binormals[i * 3 + 1];
            const bz0 = binormals[i * 3 + 2];
            for (let j = 0; j <= radialSegments; j++) {
                const v = radialSegments > 0 ? (j / radialSegments) : 0;
                const theta = v * Math.PI * 2;
                const cosT = Math.cos(theta);
                const sinT = Math.sin(theta);
                const rx = cosT * nx0 + sinT * bx0;
                const ry = cosT * ny0 + sinT * by0;
                const rz = cosT * nz0 + sinT * bz0;
                outPositions.push(px + radius * rx, py + radius * ry, pz + radius * rz);
                outNormals.push(rx, ry, rz);
                outUvs.push(u, v);
            }
        }
        const segmentCount = closed ? pointCount : (pointCount - 1);
        for (let i = 0; i < segmentCount; i++) {
            const next = closed ? ((i + 1) % pointCount) : (i + 1);
            for (let j = 0; j < radialSegments; j++) {
                const a = vertexOffset + ring * i + j;
                const b = vertexOffset + ring * next + j;
                const c = vertexOffset + ring * next + j + 1;
                const d = vertexOffset + ring * i + j + 1;
                outIndices.push(a, d, b, b, d, c);
            }
        }
        return vertexOffset + ring * pointCount;
    }

    private static _computeGridNormals(positions: Float32Array, valid: Uint8Array, gridX: number, gridY: number, outNormals: Float32Array): void {
        const gridX1 = gridX + 1;
        const gridY1 = gridY + 1;
        for (let iy = 0; iy < gridY1; iy++) {
            for (let ix = 0; ix < gridX1; ix++) {
                const i = ix + gridX1 * iy;
                const o = i * 3;
                if (!valid[i]) {
                    outNormals[o + 0] = 0;
                    outNormals[o + 1] = 0;
                    outNormals[o + 2] = 0;
                    continue;
                }
                const iL = ix > 0 ? (i - 1) : i;
                const iR = ix < gridX ? (i + 1) : i;
                const iD = iy > 0 ? (i - gridX1) : i;
                const iU = iy < gridY ? (i + gridX1) : i;
                const lx = valid[iL] ? positions[iL * 3 + 0] : positions[o + 0];
                const ly = valid[iL] ? positions[iL * 3 + 1] : positions[o + 1];
                const lz = valid[iL] ? positions[iL * 3 + 2] : positions[o + 2];
                const rx = valid[iR] ? positions[iR * 3 + 0] : positions[o + 0];
                const ry = valid[iR] ? positions[iR * 3 + 1] : positions[o + 1];
                const rz = valid[iR] ? positions[iR * 3 + 2] : positions[o + 2];
                const dx = valid[iD] ? positions[iD * 3 + 0] : positions[o + 0];
                const dy = valid[iD] ? positions[iD * 3 + 1] : positions[o + 1];
                const dz = valid[iD] ? positions[iD * 3 + 2] : positions[o + 2];
                const ux = valid[iU] ? positions[iU * 3 + 0] : positions[o + 0];
                const uy = valid[iU] ? positions[iU * 3 + 1] : positions[o + 1];
                const uz = valid[iU] ? positions[iU * 3 + 2] : positions[o + 2];
                const pux = rx - lx;
                const puy = ry - ly;
                const puz = rz - lz;
                const pvx = ux - dx;
                const pvy = uy - dy;
                const pvz = uz - dz;
                let nx = pvy * puz - pvz * puy;
                let ny = pvz * pux - pvx * puz;
                let nz = pvx * puy - pvy * pux;
                const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
                if (nLen > 1e-12) {
                    nx /= nLen;
                    ny /= nLen;
                    nz /= nLen;
                } else {
                    nx = 0;
                    ny = 1;
                    nz = 0;
                }
                outNormals[o + 0] = nx;
                outNormals[o + 1] = ny;
                outNormals[o + 2] = nz;
            }
        }
    }

    private static _makeDoubleSided(descriptor: GeometryDescriptor): GeometryDescriptor {
        const positions = descriptor.positions;
        const normals = descriptor.normals ?? new Float32Array((positions.length / 3) * 3);
        const uvs = descriptor.uvs ?? new Float32Array((positions.length / 3) * 2);
        const indices = descriptor.indices;
        if (!indices) return descriptor;
        const baseVertexCount = positions.length / 3;
        const outPositions = new Float32Array(positions.length * 2);
        outPositions.set(positions, 0);
        outPositions.set(positions, positions.length);
        const outNormals = new Float32Array(normals.length * 2);
        outNormals.set(normals, 0);
        for (let i = 0; i < baseVertexCount; i++) {
            const o = i * 3;
            outNormals[normals.length + o + 0] = -normals[o + 0];
            outNormals[normals.length + o + 1] = -normals[o + 1];
            outNormals[normals.length + o + 2] = -normals[o + 2];
        }
        const outUvs = new Float32Array(uvs.length * 2);
        outUvs.set(uvs, 0);
        outUvs.set(uvs, uvs.length);
        const outIndices = new Uint32Array(indices.length * 2);
        outIndices.set(indices, 0);
        for (let i = 0; i < indices.length; i += 3) {
            const i0 = indices[i + 0];
            const i1 = indices[i + 1];
            const i2 = indices[i + 2];
            const o = indices.length + i;
            outIndices[o + 0] = baseVertexCount + i0;
            outIndices[o + 1] = baseVertexCount + i2;
            outIndices[o + 2] = baseVertexCount + i1;
        }
        return {
            ...descriptor,
            positions: outPositions,
            normals: outNormals,
            uvs: outUvs,
            indices: outIndices
        };
    }
}
