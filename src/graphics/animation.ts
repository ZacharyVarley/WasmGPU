/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { clamp01 } from "../utils";
import { animf, WasmPtr, wasm } from "../wasm";
import { Transform, TransformStore } from "../core/transform";
import type { Mesh } from "../world/mesh";
import { setMeshMorphWeights } from "../world/mesh";

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

type AnimationWeightSampler = {
    interpolation: "LINEAR" | "STEP" | "CUBICSPLINE";
    input: Float32Array;
    output: Float32Array;
    valueSize: number;
};

type AnimationWeightChannel = {
    sampler: number;
    meshes: ReadonlyArray<Mesh>;
    scratch: Float32Array;
};

type AnimationClipInternalDescriptor = AnimationClipDescriptor & {
    weightSamplers?: ReadonlyArray<AnimationWeightSampler>;
    weightChannels?: ReadonlyArray<AnimationWeightChannel>;
};

const findKeyframe = (times: Float32Array, time: number): { i0: number; i1: number; alpha: number; dt: number } => {
    const n = times.length | 0;
    if (n <= 1) return { i0: 0, i1: 0, alpha: 0, dt: 0 };
    if (time <= times[0]) return { i0: 0, i1: 0, alpha: 0, dt: times[1] - times[0] };
    if (time >= times[n - 1]) return { i0: n - 1, i1: n - 1, alpha: 0, dt: times[n - 1] - times[n - 2] };
    let lo = 0;
    let hi = n - 1;
    while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (times[mid] <= time) lo = mid;
        else hi = mid;
    }
    const i0 = lo;
    const i1 = lo + 1;
    const dt = times[i1] - times[i0];
    if (dt === 0) return { i0, i1: i0, alpha: 0, dt: 0 };
    return { i0, i1, alpha: clamp01((time - times[i0]) / dt), dt };
};

const hermite = (t: number): [number, number, number, number] => {
    const t2 = t * t;
    const t3 = t2 * t;
    return [
        (2 * t3) - (3 * t2) + 1,
        t3 - (2 * t2) + t,
        (-2 * t3) + (3 * t2),
        t3 - t2
    ];
};

const sampleWeightSampler = (sampler: AnimationWeightSampler, time: number, out: Float32Array): void => {
    out.fill(0);
    const valueSize = sampler.valueSize | 0;
    if (valueSize <= 0) return;
    const { i0, i1, alpha, dt } = findKeyframe(sampler.input, time);
    switch (sampler.interpolation) {
        case "STEP": {
            const base = i0 * valueSize;
            for (let i = 0; i < valueSize; i++) out[i] = sampler.output[base + i] ?? 0;
            return;
        }
        case "CUBICSPLINE": {
            const [h00, h10, h01, h11] = hermite(alpha);
            const stride = valueSize * 3;
            const base0 = i0 * stride;
            const base1 = i1 * stride;
            const v0 = base0 + valueSize;
            const out0 = base0 + (valueSize * 2);
            const in1 = base1;
            const v1 = base1 + valueSize;
            for (let i = 0; i < valueSize; i++) {
                const p0 = sampler.output[v0 + i] ?? 0;
                const m0 = (sampler.output[out0 + i] ?? 0) * dt;
                const p1 = sampler.output[v1 + i] ?? 0;
                const m1 = (sampler.output[in1 + i] ?? 0) * dt;
                out[i] = (h00 * p0) + (h10 * m0) + (h01 * p1) + (h11 * m1);
            }
            return;
        }
        case "LINEAR":
        default: {
            const base0 = i0 * valueSize;
            const base1 = i1 * valueSize;
            for (let i = 0; i < valueSize; i++) {
                const v0 = sampler.output[base0 + i] ?? 0;
                const v1 = sampler.output[base1 + i] ?? 0;
                out[i] = v0 + ((v1 - v0) * alpha);
            }
            return;
        }
    }
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
    private _weightSamplers: ReadonlyArray<AnimationWeightSampler> | null;
    private _weightChannels: ReadonlyArray<AnimationWeightChannel> | null;
    private _disposed: boolean = false;

    constructor(desc: AnimationClipInternalDescriptor) {
        this.name = desc.name;
        this.samplerCount = desc.samplerCount | 0;
        this.channelCount = desc.channelCount | 0;
        this.samplersPtr = desc.samplersPtr;
        this.channelsPtr = desc.channelsPtr;
        this.startTime = desc.startTime;
        this.endTime = desc.endTime;
        this._ownedF32Allocs = desc.ownedF32Allocs ?? null;
        this._ownedU32Allocs = desc.ownedU32Allocs ?? null;
        this._weightSamplers = desc.weightSamplers ?? null;
        this._weightChannels = desc.weightChannels ?? null;
    }

    get duration(): number {
        return Math.max(0, this.endTime - this.startTime);
    }

    sample(timeSeconds: number): void {
        if (this.channelCount > 0) {
            const store = TransformStore.global();
            const soa = { posPtr: store.posPtr as WasmPtr, rotPtr: store.rotPtr as WasmPtr, sclPtr: store.sclPtr as WasmPtr };
            animf.sampleClipTRS(soa.posPtr, soa.rotPtr, soa.sclPtr, store.count | 0, this.samplersPtr, this.samplerCount, this.channelsPtr, this.channelCount, timeSeconds);
            store.markDirty();
        }
        if (this._weightSamplers && this._weightChannels) {
            for (const channel of this._weightChannels) {
                const sampler = this._weightSamplers[channel.sampler];
                if (!sampler || channel.meshes.length === 0) continue;
                sampleWeightSampler(sampler, timeSeconds, channel.scratch);
                for (const mesh of channel.meshes) setMeshMorphWeights(mesh, channel.scratch);
            }
        }
    }

    dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        if (this._ownedF32Allocs) for (const a of this._ownedF32Allocs) if (a.ptr) wasm.freeF32(a.ptr, a.len | 0);
        if (this._ownedU32Allocs) for (const a of this._ownedU32Allocs) if (a.ptr) wasm.freeU32(a.ptr, a.len | 0);
        this._ownedF32Allocs = null;
        this._ownedU32Allocs = null;
        this._weightSamplers = null;
        this._weightChannels = null;
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
    bindMatrixPtr: WasmPtr = 0;
    boneBuffer: GPUBuffer | null = null;
    bindGroup: GPUBindGroup | null = null;

    constructor(skin: Skin, meshTransform: Transform) {
        this.skin = skin;
        this.meshTransform = meshTransform;
        this.bindMatrixPtr = wasm.allocF32(16) as WasmPtr;
        const dst = wasm.f32view(this.bindMatrixPtr, 16);
        const m = meshTransform.worldMatrix;
        for (let i = 0; i < 16; i++) dst[i] = (m[i] ?? (i % 5 === 0 ? 1 : 0)) as number;
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
        if (this.bindMatrixPtr) {
            wasm.freeF32(this.bindMatrixPtr, 16);
            this.bindMatrixPtr = 0;
        }
    }
}
