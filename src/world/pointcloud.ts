import { Transform } from "../core/transform";
import { BlendMode, type Color4 } from "../graphics/material";
import { Colormap, type BuiltinColormapName } from "../graphics/colormap";
import { assert, createBuffer } from "../utils";
import { Bounds3, boundsFromBox, boundsFromBoxAndSphere, boundsFromSphere, emptyBounds, transformBounds } from "./bounds";

export type PointCloudColormap = BuiltinColormapName | "custom";

export type PointCloudDescriptor = {
    data?: Float32Array;
    pointsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    pointCount?: number;
    boundsMin?: [number, number, number];
    boundsMax?: [number, number, number];
    boundsCenter?: [number, number, number];
    boundsRadius?: number;
    blendMode?: BlendMode;
    depthWrite?: boolean;
    depthTest?: boolean;
    basePointSize?: number;
    minPointSize?: number;
    maxPointSize?: number;
    sizeAttenuation?: number;
    scalarMin?: number;
    scalarMax?: number;
    opacity?: number;
    gamma?: number;
    invert?: boolean;
    colormap?: PointCloudColormap | Colormap;
    colormapStops?: Color4[];
    softness?: number;
    visible?: boolean;
    name?: string;
    keepCPUData?: boolean;
};

const UNIFORM_FLOAT_COUNT = 44;
const UNIFORM_BYTE_SIZE = UNIFORM_FLOAT_COUNT * 4;

type BoundsSourceMode = "none" | "explicit" | "computed";

const clamp01 = (x: number): number => x < 0 ? 0 : x > 1 ? 1 : x;

const clampMin = (x: number, min: number): number => x < min ? min : x;

const normalizeStops = (stops: ReadonlyArray<Color4> | undefined | null): Color4[] => {
    if (!stops || stops.length === 0) {
        return [
            [0.0, 0.0, 0.0, 1.0],
            [1.0, 1.0, 1.0, 1.0]
        ];
    }
    const out: Color4[] = [];
    const n = Math.min(8, stops.length);
    for (let i = 0; i < n; i++) {
        const c = stops[i];
        out.push([c[0], c[1], c[2], c[3]]);
    }
    return out;
};

const colormapId = (name: PointCloudColormap): number => {
    switch (name) {
        case "grayscale": return 0;
        case "turbo": return 1;
        case "viridis": return 2;
        case "magma": return 3;
        case "plasma": return 4;
        case "inferno": return 5;
        case "custom": return 6;
    }
}

export class PointCloud {
    readonly transform: Transform = new Transform();
    name: string | null = null;
    visible: boolean = true;
    boundsMin: [number, number, number] = [0, 0, 0];
    boundsMax: [number, number, number] = [0, 0, 0];
    boundsCenter: [number, number, number] = [0, 0, 0];
    boundsRadius: number = 0;
    blendMode: BlendMode = BlendMode.Additive;
    depthWrite: boolean = false;
    depthTest: boolean = true;
    private _basePointSize: number = 2.0;
    private _minPointSize: number = 1.0;
    private _maxPointSize: number = 16.0;
    private _sizeAttenuation: number = 1.0;
    private _scalarMin: number = 0.0;
    private _scalarMax: number = 1.0;
    private _opacity: number = 1.0;
    private _gamma: number = 1.0;
    private _invert: boolean = false;
    private _colormap: PointCloudColormap | Colormap = "viridis";
    private _colormapStops: Color4[] = [[0.26700, 0.00487, 0.32942, 1.0], [0.99325, 0.90616, 0.14394, 1.0]];
    private _softness: number = 0.15;
    private _CPUData: Float32Array | null = null;
    private _keepCPUData: boolean = false;
    private _boundsSource: BoundsSourceMode = "none";
    pointsBuffer: GPUBuffer | null = null;
    uniformBuffer: GPUBuffer | null = null;
    bindGroup: GPUBindGroup | null = null;
    bindGroupKey: string | null = null;
    private _pointCount: number = 0;
    private _uniformDirty: boolean = true;
    private _pointsDirty: boolean = true;

    constructor(desc: PointCloudDescriptor = {}) {
        if (desc.name !== undefined) this.name = desc.name;
        if (desc.visible !== undefined) this.visible = !!desc.visible;
        if (desc.blendMode !== undefined) this.blendMode = desc.blendMode;
        if (desc.depthWrite !== undefined) this.depthWrite = !!desc.depthWrite;
        if (desc.depthTest !== undefined) this.depthTest = !!desc.depthTest;
        if (desc.basePointSize !== undefined) this._basePointSize = desc.basePointSize;
        if (desc.minPointSize !== undefined) this._minPointSize = desc.minPointSize;
        if (desc.maxPointSize !== undefined) this._maxPointSize = desc.maxPointSize;
        if (desc.sizeAttenuation !== undefined) this._sizeAttenuation = desc.sizeAttenuation;
        if (desc.scalarMin !== undefined) this._scalarMin = desc.scalarMin;
        if (desc.scalarMax !== undefined) this._scalarMax = desc.scalarMax;
        if (desc.opacity !== undefined) this._opacity = desc.opacity;
        if (desc.gamma !== undefined) this._gamma = desc.gamma;
        if (desc.invert !== undefined) this._invert = !!desc.invert;
        if (desc.colormap !== undefined) this._colormap = desc.colormap;
        if (desc.colormapStops !== undefined) this._colormapStops = normalizeStops(desc.colormapStops);
        if (desc.softness !== undefined) this._softness = desc.softness;
        if (desc.keepCPUData !== undefined) this._keepCPUData = !!desc.keepCPUData;
        this.applyExplicitBounds(desc);
        if (desc.data) {
            this.setData(desc.data, { keepCPUData: this._keepCPUData });
        } else if (desc.pointsBuffer) {
            const buf = (desc.pointsBuffer as { buffer?: GPUBuffer }).buffer ? (desc.pointsBuffer as { buffer: GPUBuffer }).buffer : (desc.pointsBuffer as GPUBuffer);
            const count = desc.pointCount ?? 0;
            assert(count > 0, "PointCloud: pointCount is required when using pointsBuffer.");
            this.setPointsBuffer(buf, count);
        } else if (desc.pointCount !== undefined) {
            this._pointCount = desc.pointCount;
            this._pointsDirty = false;
        }
    }

    private applyExplicitBounds(desc: PointCloudDescriptor): void {
        if (desc.boundsMin && desc.boundsMax) {
            const bounds = boundsFromBox(desc.boundsMin, desc.boundsMax);
            this.setBounds(bounds, "explicit");
            if (desc.boundsCenter) this.boundsCenter = [desc.boundsCenter[0], desc.boundsCenter[1], desc.boundsCenter[2]];
            if (desc.boundsRadius !== undefined) this.boundsRadius = Math.max(0, desc.boundsRadius);
            return;
        }
        if (desc.boundsCenter || desc.boundsRadius !== undefined) {
            const center = desc.boundsCenter ?? [0, 0, 0];
            const radius = desc.boundsRadius ?? 0;
            this.setBounds(boundsFromSphere(center, radius), "explicit");
        }
    }

    private setBounds(bounds: Bounds3, source: BoundsSourceMode): void {
        this.boundsMin = [bounds.boxMin[0], bounds.boxMin[1], bounds.boxMin[2]];
        this.boundsMax = [bounds.boxMax[0], bounds.boxMax[1], bounds.boxMax[2]];
        this.boundsCenter = [bounds.sphereCenter[0], bounds.sphereCenter[1], bounds.sphereCenter[2]];
        this.boundsRadius = bounds.sphereRadius;
        this._boundsSource = source;
    }

    private clearComputedBoundsIfNeeded(): void {
        if (this._boundsSource !== "computed") return;
        this._boundsSource = "none";
        this.boundsMin = [0, 0, 0];
        this.boundsMax = [0, 0, 0];
        this.boundsCenter = [0, 0, 0];
        this.boundsRadius = 0;
    }

    get pointCount(): number {
        return this._pointCount;
    }

    get basePointSize(): number {
        return this._basePointSize;
    }

    set basePointSize(v: number) {
        if (v === this._basePointSize) return;
        this._basePointSize = v;
        this._uniformDirty = true;
    }

    get minPointSize(): number {
        return this._minPointSize;
    }

    set minPointSize(v: number) {
        if (v === this._minPointSize) return;
        this._minPointSize = v;
        this._uniformDirty = true;
    }

    get maxPointSize(): number {
        return this._maxPointSize;
    }

    set maxPointSize(v: number) {
        if (v === this._maxPointSize) return;
        this._maxPointSize = v;
        this._uniformDirty = true;
    }

    get sizeAttenuation(): number {
        return this._sizeAttenuation;
    }

    set sizeAttenuation(v: number) {
        if (v === this._sizeAttenuation) return;
        this._sizeAttenuation = v;
        this._uniformDirty = true;
    }

    get scalarMin(): number {
        return this._scalarMin;
    }

    set scalarMin(v: number) {
        if (v === this._scalarMin) return;
        this._scalarMin = v;
        this._uniformDirty = true;
    }

    get scalarMax(): number {
        return this._scalarMax;
    }

    set scalarMax(v: number) {
        if (v === this._scalarMax) return;
        this._scalarMax = v;
        this._uniformDirty = true;
    }

    get opacity(): number {
        return this._opacity;
    }

    set opacity(v: number) {
        if (v === this._opacity) return;
        this._opacity = v;
        this._uniformDirty = true;
    }

    get gamma(): number {
        return this._gamma;
    }

    set gamma(v: number) {
        if (v === this._gamma) return;
        this._gamma = v;
        this._uniformDirty = true;
    }

    get invert(): boolean {
        return this._invert;
    }

    set invert(v: boolean) {
        if (v === this._invert) return;
        this._invert = v;
        this._uniformDirty = true;
    }

    get colormap(): PointCloudColormap | Colormap {
        return this._colormap;
    }

    set colormap(v: PointCloudColormap | Colormap) {
        this._colormap = v;
        this._uniformDirty = true;
        this.bindGroupKey = null;
    }

    get colormapStops(): ReadonlyArray<Color4> {
        return this._colormapStops;
    }

    set colormapStops(stops: ReadonlyArray<Color4>) {
        this._colormapStops = normalizeStops(stops);
        this._uniformDirty = true;
    }

    getColormapKey(): string {
        const c = this._colormap;
        return (c instanceof Colormap) ? `cm:${c.id}` : `cm:${c}`;
    }

    getColormapForBinding(): Colormap {
        const c = this._colormap;
        if (c instanceof Colormap) return c;
        if (c === "custom") return Colormap.builtin("grayscale");
        return Colormap.builtin(c);
    }

    get softness(): number {
        return this._softness;
    }

    set softness(v: number) {
        if (v === this._softness) return;
        this._softness = v;
        this._uniformDirty = true;
    }

    setData(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void {
        assert((data.length % 4) === 0, "PointCloud: data length must be a multiple of 4 (x,y,z,scalar per point).");
        this._CPUData = data;
        this._pointCount = data.length / 4;
        this._pointsDirty = true;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this.clearComputedBoundsIfNeeded();
    }

    setPointsBuffer(buffer: GPUBuffer, pointCount: number): void {
        assert(pointCount > 0, "PointCloud: pointCount must be > 0.");
        this._CPUData = null;
        this._pointCount = pointCount;
        this.pointsBuffer = buffer;
        this._pointsDirty = false;
        this.bindGroupKey = null;
        this.clearComputedBoundsIfNeeded();
    }

    dropCPUData(): void {
        this._CPUData = null;
    }

    computeBoundsFromCPUData(): void {
        const data = this._CPUData;
        if (!data || data.length < 4) return;
        let minX = data[0], maxX = data[0];
        let minY = data[1], maxY = data[1];
        let minZ = data[2], maxZ = data[2];
        for (let i = 0; i < data.length; i += 4) {
            const x = data[i + 0];
            const y = data[i + 1];
            const z = data[i + 2];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
        }
        const cx = 0.5 * (minX + maxX);
        const cy = 0.5 * (minY + maxY);
        const cz = 0.5 * (minZ + maxZ);
        let r2 = 0;
        for (let i = 0; i < data.length; i += 4) {
            const dx = data[i + 0] - cx;
            const dy = data[i + 1] - cy;
            const dz = data[i + 2] - cz;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > r2) r2 = d2;
        }
        this.setBounds(boundsFromBoxAndSphere([minX, minY, minZ], [maxX, maxY, maxZ], [cx, cy, cz], Math.sqrt(r2)), "computed");
    }

    computeScalarRangeFromCPUData(): void {
        const data = this._CPUData;
        if (!data || data.length < 4) return;
        let minS = data[3];
        let maxS = data[3];
        for (let i = 0; i < data.length; i += 4) {
            const s = data[i + 3];
            if (s < minS) minS = s;
            if (s > maxS) maxS = s;
        }
        this._scalarMin = minS;
        this._scalarMax = maxS;
        this._uniformDirty = true;
    }

    getLocalBounds(): Bounds3 {
        if (this._boundsSource === "none" && this._CPUData) this.computeBoundsFromCPUData();
        if (this._boundsSource === "none") return emptyBounds(this._pointCount > 0);
        return boundsFromBoxAndSphere(this.boundsMin, this.boundsMax, this.boundsCenter, this.boundsRadius);
    }

    getWorldBounds(): Bounds3 {
        return transformBounds(this.getLocalBounds(), this.transform.worldMatrix);
    }

    getBounds(): Bounds3 {
        return this.getWorldBounds();
    }

    upload(device: GPUDevice, queue: GPUQueue): void {
        if (!this._pointsDirty) return;
        if (this.pointsBuffer && !this._CPUData) {
            this._pointsDirty = false;
            return;
        }
        const data = this._CPUData;
        if (!data) {
            this._pointsDirty = false;
            return;
        }
        const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
        if (!this.pointsBuffer) {
            this.pointsBuffer = createBuffer(device, data, usage);
        } else {
            try {
                queue.writeBuffer(this.pointsBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
            } catch {
                this.pointsBuffer.destroy();
                this.pointsBuffer = createBuffer(device, data, usage);
            }
        }
        if (!this._keepCPUData) this._CPUData = null;
        this._pointsDirty = false;
        this.bindGroupKey = null;
    }

    getUniformBufferSize(): number {
        return UNIFORM_BYTE_SIZE;
    }

    getUniformData(): Float32Array {
        const out = new Float32Array(UNIFORM_FLOAT_COUNT);
        const base = Math.max(0, this._basePointSize);
        const minSize = Math.max(0, this._minPointSize);
        const maxSize = Math.max(minSize, this._maxPointSize);
        const atten = Math.max(0, this._sizeAttenuation);
        out[0] = base;
        out[1] = minSize;
        out[2] = maxSize;
        out[3] = atten;
        out[4] = this._scalarMin;
        out[5] = this._scalarMax;
        out[6] = clamp01(this._opacity);
        out[7] = clampMin(this._gamma, 1e-6);
        out[8] = this._invert ? 1.0 : 0.0;
        out[9] = (this._colormap instanceof Colormap) ? 0 : colormapId(this._colormap);
        out[10] = (typeof this._colormap === "string" && this._colormap === "custom") ? Math.min(8, Math.max(2, this._colormapStops.length)) : 0;
        out[11] = clamp01(this._softness);
        const stops = this._colormapStops;
        const nStops = Math.min(8, Math.max(2, stops.length));
        for (let i = 0; i < 8; i++) {
            const src = stops[Math.min(i, nStops - 1)];
            const o = 12 + i * 4;
            out[o + 0] = src[0];
            out[o + 1] = src[1];
            out[o + 2] = src[2];
            out[o + 3] = src[3];
        }
        return out;
    }

    get dirtyUniforms(): boolean {
        return this._uniformDirty;
    }

    markUniformsClean(): void {
        this._uniformDirty = false;
    }

    destroy(): void {
        this.pointsBuffer?.destroy();
        this.uniformBuffer?.destroy();
        this.pointsBuffer = null;
        this.uniformBuffer = null;
        this.bindGroup = null;
        this.bindGroupKey = null;
        this._CPUData = null;
        this._pointCount = 0;
        this.transform.dispose();
    }
}
