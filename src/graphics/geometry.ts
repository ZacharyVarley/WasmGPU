import { createBuffer } from "../utils";

export type GeometryAttribute = {
    data: Float32Array;
    itemSize: number;
};

export type GeometryDescriptor = {
    positions: Float32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    indices?: Uint32Array;
};

export class Geometry {
    readonly positions: Float32Array;
    readonly normals: Float32Array;
    readonly uvs: Float32Array;
    readonly indices: Uint32Array | null;
    readonly vertexCount: number;
    readonly indexCount: number;
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
        this.indices = descriptor.indices ?? null;
        this.indexCount = this.indices?.length ?? this.vertexCount;
    }

    upload(device: GPUDevice): void {
        if (this._device === device) return;
        this._device = device;
        this._positionBuffer = createBuffer(device, this.positions, GPUBufferUsage.VERTEX);
        this._normalBuffer = createBuffer(device, this.normals, GPUBufferUsage.VERTEX);
        this._uvBuffer = createBuffer(device, this.uvs, GPUBufferUsage.VERTEX);
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

    get indexBuffer(): GPUBuffer | null {
        return this._indexBuffer;
    }

    get isIndexed(): boolean {
        return this._indexBuffer !== null;
    }

    destroy(): void {
        this._positionBuffer?.destroy();
        this._normalBuffer?.destroy();
        this._uvBuffer?.destroy();
        this._indexBuffer?.destroy();
        this._positionBuffer = null;
        this._normalBuffer = null;
        this._uvBuffer = null;
        this._indexBuffer = null;
        this._device = null;
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
                indices.push(a, b, d, b, c, d);
            }
        }
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
            const n = faceNormal(t0, b0, t1);
            positions.push(...t0, ...b0, ...b1, ...t1);
            normals.push(...n, ...n, ...n, ...n);
            const u0 = i / sides;
            const u1 = (i + 1) / sides;
            uvs.push(u0, 0, u0, 1, u1, 1, u1, 0);
            indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
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
            indices.push(topCenterIdx, topCenterIdx + 1 + i, topCenterIdx + 1 + next);
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
            indices.push(bottomCenterIdx, bottomCenterIdx + 1 + next, bottomCenterIdx + 1 + i);
        }
        return new Geometry({
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        });
    }
}
