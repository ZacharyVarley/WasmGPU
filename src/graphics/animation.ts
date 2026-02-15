import { animf, WasmPtr, wasm } from "../wasm";
import { Transform, TransformStore } from "../core/transform";

export type AnimationClipDescriptor = {
    name: string;
    samplerCount: number;
    channelCount: number;
    samplersPtr: WasmPtr;
    channelsPtr: WasmPtr;
    startTime: number;
    endTime: number;
    ownedF32Allocs?: ReadonlyArray<{ ptr: WasmPtr; len: number }>;
    ownedU32Allocs?: ReadonlyArray<{ ptr: WasmPtr; len: number }>;
};

export class AnimationClip {
    readonly name: string;
    readonly samplerCount: number;
    readonly channelCount: number;
    readonly samplersPtr: WasmPtr;
    readonly channelsPtr: WasmPtr;
    readonly startTime: number;
    readonly endTime: number;
    private _ownedF32Allocs: ReadonlyArray<{ ptr: WasmPtr; len: number }> | null;
    private _ownedU32Allocs: ReadonlyArray<{ ptr: WasmPtr; len: number }> | null;
    private _disposed: boolean = false;

    constructor(desc: AnimationClipDescriptor) {
        this.name = desc.name;
        this.samplerCount = desc.samplerCount | 0;
        this.channelCount = desc.channelCount | 0;
        this.samplersPtr = desc.samplersPtr;
        this.channelsPtr = desc.channelsPtr;
        this.startTime = desc.startTime;
        this.endTime = desc.endTime;
        this._ownedF32Allocs = desc.ownedF32Allocs ?? null;
        this._ownedU32Allocs = desc.ownedU32Allocs ?? null;
    }

    get duration(): number {
        return Math.max(0, this.endTime - this.startTime);
    }

    sample(timeSeconds: number): void {
        const store = TransformStore.global();
        const soa = {
            posPtr: store.posPtr as WasmPtr,
            rotPtr: store.rotPtr as WasmPtr,
            sclPtr: store.sclPtr as WasmPtr
        }
        animf.sampleClipTRS(
            soa.posPtr,
            soa.rotPtr,
            soa.sclPtr,
            store.count | 0,
            this.samplersPtr,
            this.samplerCount,
            this.channelsPtr,
            this.channelCount,
            timeSeconds
        );
        store.markDirty();
    }

    dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        if (this._ownedF32Allocs) for (const a of this._ownedF32Allocs) if (a.ptr) wasm.freeF32(a.ptr, a.len | 0);
        if (this._ownedU32Allocs) for (const a of this._ownedU32Allocs) if (a.ptr) wasm.freeU32(a.ptr, a.len | 0);
        this._ownedF32Allocs = null;
        this._ownedU32Allocs = null;
    }
}

export class AnimationPlayer {
    readonly clip: AnimationClip;
    time: number = 0;
    speed: number = 1;
    loop: boolean = true;
    playing: boolean = true;

    constructor(clip: AnimationClip, opts: Partial<Pick<AnimationPlayer, "speed" | "loop" | "playing">> = {}) {
        this.clip = clip;
        if (opts.speed !== undefined) this.speed = opts.speed;
        if (opts.loop !== undefined) this.loop = opts.loop;
        if (opts.playing !== undefined) this.playing = opts.playing;
        this.time = clip.startTime;
    }

    update(dtSeconds: number): void {
        if (!this.playing) return;
        const dur = this.clip.duration;
        if (dur <= 0) {
            this.clip.sample(this.clip.startTime);
            return;
        }
        this.time += dtSeconds * this.speed;
        if (this.loop) {
            const start = this.clip.startTime;
            const end = this.clip.endTime;
            while (this.time < start) this.time += dur;
            while (this.time >= end) this.time -= dur;
        } else {
            this.time = Math.max(this.clip.startTime, Math.min(this.time, this.clip.endTime));
        }
        this.clip.sample(this.time);
    }
}

export class Skin {
    readonly name: string;
    readonly joints: Transform[];
    readonly jointCount: number;
    readonly jointIndicesPtr: WasmPtr;
    readonly invBindPtr: WasmPtr;
    private _disposed: boolean = false;

    constructor(name: string, joints: Transform[], inverseBindMatrices: Float32Array | null) {
        this.name = name;
        this.joints = joints;
        this.jointCount = joints.length | 0;
        this.jointIndicesPtr = wasm.allocU32(this.jointCount) as WasmPtr;
        const u32 = wasm.u32view(this.jointIndicesPtr, this.jointCount);
        for (let i = 0; i < this.jointCount; i++) u32[i] = joints[i]!.index >>> 0;
        this.invBindPtr = wasm.allocF32(this.jointCount * 16) as WasmPtr;
        const f32 = wasm.f32view(this.invBindPtr, this.jointCount * 16);
        if (inverseBindMatrices && inverseBindMatrices.length === this.jointCount * 16) {
            f32.set(inverseBindMatrices);
        } else {
            for (let j = 0; j < this.jointCount; j++) {
                const o = j * 16;
                f32[o + 0] = 1; f32[o + 1] = 0; f32[o + 2] = 0; f32[o + 3] = 0;
                f32[o + 4] = 0; f32[o + 5] = 1; f32[o + 6] = 0; f32[o + 7] = 0;
                f32[o + 8] = 0; f32[o + 9] = 0; f32[o + 10] = 1; f32[o + 11] = 0;
                f32[o + 12] = 0; f32[o + 13] = 0; f32[o + 14] = 0; f32[o + 15] = 1;
            }
        }
    }

    createInstance(meshTransform: Transform): SkinInstance {
        return new SkinInstance(this, meshTransform);
    }

    dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        if (this.jointIndicesPtr) wasm.freeU32(this.jointIndicesPtr, this.jointCount);
        if (this.invBindPtr) wasm.freeF32(this.invBindPtr, this.jointCount * 16);
    }
}

export class SkinInstance {
    readonly skin: Skin;
    readonly meshTransform: Transform;
    boneBuffer: GPUBuffer | null = null;
    bindGroup: GPUBindGroup | null = null;

    constructor(skin: Skin, meshTransform: Transform) {
        this.skin = skin;
        this.meshTransform = meshTransform;
    }

    get jointCount(): number {
        return this.skin.jointCount;
    }

    ensureGpuResources(device: GPUDevice, layout: GPUBindGroupLayout): void {
        if (this.boneBuffer && this.bindGroup) return;
        const byteSize = this.skin.jointCount * 16 * 4;
        this.boneBuffer = device.createBuffer({
            size: byteSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.bindGroup = device.createBindGroup({
            layout,
            entries: [{ binding: 0, resource: { buffer: this.boneBuffer } }]
        });
    }

    dispose(): void {
        this.boneBuffer?.destroy();
        this.boneBuffer = null;
        this.bindGroup = null;
    }
}
