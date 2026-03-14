import { alignTo, assert } from "../utils";
import { StorageBuffer } from "./buffer";
import { ComputePipeline, storageBufferLayout, uniformBufferLayout, type BufferResource } from "./pipeline";
import type { ComputeDispatchCommand } from "./dispatch";
import { encodeDispatchBatch, validateWorkgroupsForDevice } from "./dispatch";
import { ceilDiv, makeWorkgroupCounts, workgroups1D } from "./workgroups";
import { ScratchBufferPool } from "./scratch";
import reduceMaxF32WGSL from "../wgsl/compute/reduce-max-f32.wgsl";
import reduceMaxU32WGSL from "../wgsl/compute/reduce-max-u32.wgsl";
import reduceMinF32WGSL from "../wgsl/compute/reduce-min-f32.wgsl";
import reduceMinU32WGSL from "../wgsl/compute/reduce-min-u32.wgsl";
import reduceSumF32WGSL from "../wgsl/compute/reduce-sum-f32.wgsl";
import reduceSumU32WGSL from "../wgsl/compute/reduce-sum-u32.wgsl";
import argreduceArgmaxInitialWGSL from "../wgsl/compute/argreduce-argmax-initial.wgsl";
import argreduceArgmaxPairsWGSL from "../wgsl/compute/argreduce-argmax-pairs.wgsl";
import argreduceArgminInitialWGSL from "../wgsl/compute/argreduce-argmin-initial.wgsl";
import argreduceArgminPairsWGSL from "../wgsl/compute/argreduce-argmin-pairs.wgsl";
import scanBlockExclusiveU32WGSL from "../wgsl/compute/scan-block-exclusive-u32.wgsl";
import scanAddBlockOffsetsU32WGSL from "../wgsl/compute/scan-add-block-offsets-u32.wgsl";
import histogramClearAtomicU32WGSL from "../wgsl/compute/histogram-clear-atomic-u32.wgsl";
import histogramU32WGSL from "../wgsl/compute/histogram-u32.wgsl";
import compactF32WGSL from "../wgsl/compute/compact-f32.wgsl";
import compactU32WGSL from "../wgsl/compute/compact-u32.wgsl";
import sortRadixFlagsU32WGSL from "../wgsl/compute/sort-radix-flags-u32.wgsl";
import sortRadixScatterU32WGSL from "../wgsl/compute/sort-radix-scatter-u32.wgsl";
import copyF32WGSL from "../wgsl/compute/copy-f32.wgsl";
import copyU32WGSL from "../wgsl/compute/copy-u32.wgsl";
import scaleExtractF32WGSL from "../wgsl/compute/scale-extract-f32.wgsl";
import scaleHistogramF32WGSL from "../wgsl/compute/scale-histogram-f32.wgsl";
import scaleRemapF32WGSL from "../wgsl/compute/scale-remap-f32.wgsl";
import { normalizeScaleTransform, packScaleTransform, scaleClampModeToId, scaleModeToId, scaleValueModeToId } from "../scaling/transform";
import type { ScaleTransform, ScaleValueMode } from "../scaling/types";

export type KernelDispatchOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
};

export type ReduceOptions = KernelDispatchOptions & {
    count?: number;
    out?: StorageBuffer;
};

export type ArgReduceOptions = KernelDispatchOptions & {
    count?: number;
    out?: StorageBuffer;
};

export type ReduceOp = "sum" | "min" | "max";

export type ArgReduceOp = "argmin" | "argmax";

export type ScanOptions = KernelDispatchOptions & {
    count?: number;
    out?: StorageBuffer;
};

export type HistogramOptions = KernelDispatchOptions & {
    count?: number;
    bins?: StorageBuffer;
    clear?: boolean;
};

export type CompactOptions = KernelDispatchOptions & {
    count?: number;
    out?: StorageBuffer;
};

export type RadixSortOptions = KernelDispatchOptions & {
    count?: number;
    out?: StorageBuffer;
    inPlace?: boolean;
};

export type CopyOptions = KernelDispatchOptions & {
    count?: number;
    out?: StorageBuffer;
};

export type ScaleExtractOptions = KernelDispatchOptions & {
    count: number;
    componentCount?: number;
    componentIndex?: number;
    valueMode?: ScaleValueMode;
    stride?: number;
    offset?: number;
    values?: StorageBuffer;
    flags?: StorageBuffer;
};

export type ScaleExtractResult = {
    values: StorageBuffer;
    flags: StorageBuffer;
};

export type ScaleHistogramOptions = KernelDispatchOptions & {
    count?: number;
    bins?: StorageBuffer;
    clear?: boolean;
    minValue: number;
    maxValue: number;
};

export type ScaleRemapOptions = KernelDispatchOptions & {
    count?: number;
    out?: StorageBuffer;
    transform: ScaleTransform;
};

export type CompactResult = {
    output: StorageBuffer;
    count: StorageBuffer;
};

type ReduceType = "u32" | "f32";

const isGpuBuffer = (r: BufferResource): r is GPUBuffer => {
    return (r as GPUBuffer).mapState !== undefined;
};

const resolveGpuBuffer = (r: BufferResource): GPUBuffer => {
    if (isGpuBuffer(r)) return r;
    return r.buffer;
};

const bytesPerElement = (type: ReduceType): number => {
    return 4;
};

const identityU32 = (op: ReduceOp): number => {
    if (op === "sum") return 0;
    if (op === "min") return 0xFFFFFFFF;
    return 0;
};

const identityF32Bits = (op: ReduceOp): number => {
    if (op === "sum") return 0x00000000;
    if (op === "min") return 0x7F800000;
    return 0xFF800000;
};

const identityArgPairBits = (op: ArgReduceOp): { valueBits: number; index: number } => {
    if (op === "argmin") return { valueBits: 0x7F800000, index: 0xFFFFFFFF };
    return { valueBits: 0xFF800000, index: 0xFFFFFFFF };
};

const assertByteLengthMultipleOf = (byteLength: number, unit: number, label: string): void => {
    assert((byteLength % unit) === 0, `${label}: byteLength (${byteLength}) must be divisible by ${unit}`);
};

export class ComputeKernels {
    readonly device: GPUDevice;
    readonly queue: GPUQueue;
    private readonly scratch: ScratchBufferPool;
    private readonly pipelines: Map<string, ComputePipeline>;

    constructor(device: GPUDevice, queue: GPUQueue) {
        this.device = device;
        this.queue = queue;
        this.scratch = new ScratchBufferPool(device, {
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            labelPrefix: "kernels:scratch"
        });
        this.pipelines = new Map();
    }

    destroy(): void {
        this.scratch.destroy();
        this.pipelines.clear();
    }

    private getPipeline(key: string, create: () => ComputePipeline): ComputePipeline {
        let p = this.pipelines.get(key);
        if (!p) {
            p = create();
            this.pipelines.set(key, p);
        }
        return p;
    }

    private bindSized(res: BufferResource, sizeBytes: number): { buffer: BufferResource; size: number } {
        assert(Number.isInteger(sizeBytes) && sizeBytes >= 0, `bindSized: sizeBytes must be an integer >= 0 (got ${sizeBytes})`);
        const aligned = alignTo(sizeBytes, 4);
        return { buffer: res, size: Math.max(4, aligned) };
    }

    private resolveCount(buf: StorageBuffer, elemBytes: number, count?: number): number {
        assertByteLengthMultipleOf(buf.byteLength, elemBytes, "resolveCount");
        const total = buf.byteLength / elemBytes;
        if (count === undefined) return total;
        assert(Number.isInteger(count) && count >= 0, `count must be an integer >= 0 (got ${count})`);
        assert(count <= total, `count (${count}) exceeds buffer element capacity (${total})`);
        return count;
    }

    private execute(commands: ComputeDispatchCommand[], opts?: KernelDispatchOptions): void {
        if (commands.length === 0) return;
        const encoder = opts?.encoder ?? this.device.createCommandEncoder();
        if (opts?.validateLimits) for (const cmd of commands) validateWorkgroupsForDevice(this.device, cmd.workgroups);
        encodeDispatchBatch(encoder, commands, opts?.label);
        if (!opts?.encoder) {
            this.queue.submit([encoder.finish()]);
            this.scratch.reset();
        }
    }

    private writeScalarU32(dst: BufferResource, value: number): void {
        const buf = resolveGpuBuffer(dst);
        const tmp = new Uint32Array([value >>> 0]);
        this.queue.writeBuffer(buf, 0, tmp);
    }

    private writeScalarF32(dst: BufferResource, value: number): void {
        const buf = resolveGpuBuffer(dst);
        const tmp = new Float32Array([value]);
        this.queue.writeBuffer(buf, 0, tmp);
    }

    private writeScalarF32Bits(dst: BufferResource, bits: number): void {
        const buf = resolveGpuBuffer(dst);
        const tmp = new Uint32Array([bits >>> 0]);
        this.queue.writeBuffer(buf, 0, tmp);
    }

    private writeArgPairBits(dst: BufferResource, valueBits: number, index: number): void {
        const buf = resolveGpuBuffer(dst);
        const tmp = new Uint32Array([valueBits >>> 0, index >>> 0]);
        this.queue.writeBuffer(buf, 0, tmp);
    }

    private getReducePipeline(type: ReduceType, op: ReduceOp): ComputePipeline {
        const key = `kernels:reduce:${type}:${op}`;
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: (type === "f32") ?
                    ((op === "sum") ? reduceSumF32WGSL : (op === "max") ? reduceMaxF32WGSL : reduceMinF32WGSL) :
                    ((op === "sum") ? reduceSumU32WGSL : (op === "max") ? reduceMaxU32WGSL : reduceMinU32WGSL),
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getArgReduceInitialPipeline(op: ArgReduceOp): ComputePipeline {
        const key = `kernels:argreduce:init:${op}`;
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: (op === "argmax") ? argreduceArgmaxInitialWGSL : argreduceArgminInitialWGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getArgReducePairsPipeline(op: ArgReduceOp): ComputePipeline {
        const key = `kernels:argreduce:pairs:${op}`;
        return this.getPipeline(key, () => {
            const code = (op === "argmax") ? argreduceArgmaxPairsWGSL : argreduceArgminPairsWGSL;
            return new ComputePipeline(this.device, {
                label: key,
                code,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private encodeReduceScalar(commands: ComputeDispatchCommand[], type: ReduceType, op: ReduceOp, input: BufferResource, inputCount: number, out: BufferResource, labelPrefix: string): void {
        assert(Number.isInteger(inputCount) && inputCount > 0, "encodeReduceScalar expects inputCount > 0");
        const elemBytes = bytesPerElement(type);
        let inRes: BufferResource = input;
        let n = inputCount;
        let pass = 0;
        while (true) {
            const outCount = ceilDiv(n, 512);
            const isFinal = outCount <= 1;
            const outRes: BufferResource = isFinal ? out : this.scratch.acquire(outCount * elemBytes, `${labelPrefix}:reduce:${pass}`);
            const pipeline = this.getReducePipeline(type, op);
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(inRes, n * elemBytes),
                1: this.bindSized(outRes, outCount * elemBytes)
            }, `${labelPrefix}:reduce:${pass}:bg`);
            commands.push({
                pipeline,
                bindGroups: [bg],
                workgroups: makeWorkgroupCounts(outCount, 1, 1),
                label: `${labelPrefix}:reduce:${pass}`
            });
            if (isFinal) break;
            inRes = outRes;
            n = outCount;
            pass++;
        }
    }

    private encodeArgReduceF32Scalar(commands: ComputeDispatchCommand[], op: ArgReduceOp, input: BufferResource, inputCount: number, out: BufferResource, labelPrefix: string): void {
        assert(Number.isInteger(inputCount) && inputCount > 0, "encodeArgReduceF32Scalar expects inputCount > 0");
        let inRes: BufferResource = input;
        let n = inputCount;
        let inStrideBytes = 4;
        let pass = 0;
        while (true) {
            const outCount = ceilDiv(n, 512);
            const isFinal = outCount <= 1;
            const outRes: BufferResource = isFinal ? out : this.scratch.acquire(outCount * 8, `${labelPrefix}:argreduce:${pass}`);
            const pipeline = (pass === 0) ? this.getArgReduceInitialPipeline(op) : this.getArgReducePairsPipeline(op);
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(inRes, n * inStrideBytes),
                1: this.bindSized(outRes, outCount * 8)
            }, `${labelPrefix}:argreduce:${pass}:bg`);
            commands.push({
                pipeline,
                bindGroups: [bg],
                workgroups: makeWorkgroupCounts(outCount, 1, 1),
                label: `${labelPrefix}:argreduce:${pass}`
            });
            if (isFinal) break;
            inRes = outRes;
            n = outCount;
            inStrideBytes = 8;
            pass++;
        }
    }

    private getScanBlockExclusiveU32Pipeline(): ComputePipeline {
        const key = "kernels:scan:blockExclusiveU32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: scanBlockExclusiveU32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            storageBufferLayout({ binding: 2, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getScanAddBlockOffsetsU32Pipeline(): ComputePipeline {
        const key = "kernels:scan:addBlockOffsetsU32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: scanAddBlockOffsetsU32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: false }),
                            storageBufferLayout({ binding: 1, readOnly: true })
                        ]
                    }
                ]
            });
        });
    }

    private encodeScanExclusiveU32Into(commands: ComputeDispatchCommand[], input: BufferResource, count: number, out: BufferResource, labelPrefix: string): void {
        assert(Number.isInteger(count) && count >= 0, `encodeScanExclusiveU32Into: count must be an integer >= 0 (got ${count})`);
        if (count === 0) return;
        const numBlocks = ceilDiv(count, 512);
        const blockSums: BufferResource = this.scratch.acquire(numBlocks * 4, `${labelPrefix}:blockSums`);
        {
            const pipeline = this.getScanBlockExclusiveU32Pipeline();
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(input, count * 4),
                1: this.bindSized(out, count * 4),
                2: this.bindSized(blockSums, numBlocks * 4)
            }, `${labelPrefix}:scanBlocks:bg`);
            commands.push({
                pipeline,
                bindGroups: [bg],
                workgroups: makeWorkgroupCounts(numBlocks, 1, 1),
                label: `${labelPrefix}:scanBlocks`
            });
        }
        if (numBlocks <= 1) return;
        const blockOffsets: BufferResource = this.scratch.acquire(numBlocks * 4, `${labelPrefix}:blockOffsets`);
        this.encodeScanExclusiveU32Into(commands, blockSums, numBlocks, blockOffsets, `${labelPrefix}:scanBlockSums`);
        {
            const pipeline = this.getScanAddBlockOffsetsU32Pipeline();
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(out, count * 4),
                1: this.bindSized(blockOffsets, numBlocks * 4)
            }, `${labelPrefix}:addOffsets:bg`);
            commands.push({
                pipeline,
                bindGroups: [bg],
                workgroups: workgroups1D(count, 256),
                label: `${labelPrefix}:addOffsets`
            });
        }
    }

    private getHistogramClearPipeline(): ComputePipeline {
        const key = "kernels:histogram:clearAtomicU32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: histogramClearAtomicU32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getHistogramPipeline(): ComputePipeline {
        const key = "kernels:histogram:u32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: histogramU32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getCompactPipeline(type: "u32" | "f32"): ComputePipeline {
        const key = `kernels:compact:${type}`;
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: (type === "u32") ? compactU32WGSL : compactF32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: true }),
                            storageBufferLayout({ binding: 3, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getRadixFlagsPipeline(bit: number): ComputePipeline {
        const b = bit | 0;
        const key = `kernels:radix:flags:bit${b}`;
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: sortRadixFlagsU32WGSL,
                entryPoint: "main",
                constants: { BIT: b },
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getRadixScatterPipeline(bit: number): ComputePipeline {
        const b = bit | 0;
        const key = `kernels:radix:scatter:bit${b}`;
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: sortRadixScatterU32WGSL,
                entryPoint: "main",
                constants: { BIT: b },
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: true }),
                            storageBufferLayout({ binding: 2, readOnly: true }),
                            storageBufferLayout({ binding: 3, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getCopyF32Pipeline(): ComputePipeline {
        const key = "kernels:copy:f32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: copyF32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getCopyU32Pipeline(): ComputePipeline {
        const key = "kernels:copy:u32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: copyU32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false })
                        ]
                    }
                ]
            });
        });
    }

    private getScaleExtractF32Pipeline(): ComputePipeline {
        const key = "kernels:scale:extractF32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: scaleExtractF32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            storageBufferLayout({ binding: 2, readOnly: false }),
                            uniformBufferLayout({ binding: 3 })
                        ]
                    }
                ]
            });
        });
    }

    private getScaleHistogramF32Pipeline(): ComputePipeline {
        const key = "kernels:scale:histogramF32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: scaleHistogramF32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            uniformBufferLayout({ binding: 2 })
                        ]
                    }
                ]
            });
        });
    }

    private getScaleRemapF32Pipeline(): ComputePipeline {
        const key = "kernels:scale:remapF32";
        return this.getPipeline(key, () => {
            return new ComputePipeline(this.device, {
                label: key,
                code: scaleRemapF32WGSL,
                entryPoint: "main",
                bindGroups: [
                    {
                        label: `${key}:bg0`,
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            uniformBufferLayout({ binding: 2 })
                        ]
                    }
                ]
            });
        });
    }

    private encodeCopyF32(commands: ComputeDispatchCommand[], src: BufferResource, count: number, dst: BufferResource, labelPrefix: string): void {
        assert(Number.isInteger(count) && count >= 0, `encodeCopyF32: count must be an integer >= 0 (got ${count})`);
        if (count === 0) return;
        const pipeline = this.getCopyF32Pipeline();
        const bg = pipeline.createBindGroup(0, {
            0: this.bindSized(src, count * 4),
            1: this.bindSized(dst, count * 4)
        }, `${labelPrefix}:copy:bg`);
        commands.push({
            pipeline,
            bindGroups: [bg],
            workgroups: workgroups1D(count, 256),
            label: `${labelPrefix}:copy`
        });
    }

    private encodeCopyU32(commands: ComputeDispatchCommand[], src: BufferResource, count: number, dst: BufferResource, labelPrefix: string): void {
        assert(Number.isInteger(count) && count >= 0, `encodeCopyU32: count must be an integer >= 0 (got ${count})`);
        if (count === 0) return;
        const pipeline = this.getCopyU32Pipeline();
        const bg = pipeline.createBindGroup(0, {
            0: this.bindSized(src, count * 4),
            1: this.bindSized(dst, count * 4)
        }, `${labelPrefix}:copy:bg`);
        commands.push({
            pipeline,
            bindGroups: [bg],
            workgroups: workgroups1D(count, 256),
            label: `${labelPrefix}:copy`
        });
    }

    copyU32(src: BufferResource, opts: CopyOptions = {}): StorageBuffer {
        let count = opts.count;
        if (count === undefined) {
            if (src instanceof StorageBuffer) count = this.resolveCount(src, 4, undefined);
            else assert(false, "copyU32: opts.count is required when src is not a StorageBuffer");
        }
        assert(Number.isInteger(count) && count >= 0, `copyU32: count must be an integer >= 0 (got ${count})`);
        const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
            label: "copyU32:out",
            byteLength: count * 4,
            copySrc: true
        });
        assert(out.byteLength >= count * 4, "copyU32: out buffer is too small for requested count");
        const commands: ComputeDispatchCommand[] = [];
        this.encodeCopyU32(commands, src, count, out, "copyU32");
        this.execute(commands, opts);
        return out;
    }

    reduceU32(input: StorageBuffer, op: ReduceOp, opts: ReduceOptions = {}): StorageBuffer {
        const count = this.resolveCount(input, 4, opts.count);
        const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
            label: `reduceU32:${op}`,
            byteLength: 4,
            copySrc: true
        });
        assert(out.byteLength >= 4, "reduceU32: out buffer must be at least 4 bytes");
        if (count === 0) {
            this.writeScalarU32(out, identityU32(op));
            return out;
        }
        const commands: ComputeDispatchCommand[] = [];
        this.encodeReduceScalar(commands, "u32", op, input, count, out, `reduceU32:${op}`);
        this.execute(commands, opts);
        return out;
    }

    sumU32(input: StorageBuffer, opts: ReduceOptions = {}): StorageBuffer {
        return this.reduceU32(input, "sum", opts);
    }

    minU32(input: StorageBuffer, opts: ReduceOptions = {}): StorageBuffer {
        return this.reduceU32(input, "min", opts);
    }

    maxU32(input: StorageBuffer, opts: ReduceOptions = {}): StorageBuffer {
        return this.reduceU32(input, "max", opts);
    }

    copyF32(src: BufferResource, opts: CopyOptions = {}): StorageBuffer {
        let count = opts.count;
        if (count === undefined) {
            if (src instanceof StorageBuffer) count = this.resolveCount(src, 4, undefined);
            else assert(false, "copyF32: opts.count is required when src is not a StorageBuffer");
        }
        assert(Number.isInteger(count) && count >= 0, `copyF32: count must be an integer >= 0 (got ${count})`);
        const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
            label: "copyF32:out",
            byteLength: count * 4,
            copySrc: true
        });
        assert(out.byteLength >= count * 4, "copyF32: out buffer is too small for requested count");
        const commands: ComputeDispatchCommand[] = [];
        this.encodeCopyF32(commands, src, count, out, "copyF32");
        this.execute(commands, opts);
        return out;
    }

    extractScaleValuesF32(src: BufferResource, opts: ScaleExtractOptions): ScaleExtractResult {
        assert(!opts.encoder, "extractScaleValuesF32 does not support opts.encoder");
        const count = opts.count;
        assert(Number.isInteger(count) && count >= 0, `extractScaleValuesF32: count must be an integer >= 0 (got ${count})`);
        const componentCount = Math.max(1, Math.min(4, Math.floor(opts.componentCount ?? 1)));
        const componentIndex = Math.max(0, Math.min(3, Math.floor(opts.componentIndex ?? 0)));
        const stride = Math.max(componentCount, Math.floor(opts.stride ?? componentCount));
        const offset = Math.max(0, Math.floor(opts.offset ?? 0));
        const valueMode = opts.valueMode ?? "component";
        assert(valueMode === "component" || valueMode === "magnitude", `extractScaleValuesF32: invalid valueMode ${String(valueMode)}`);
        const requiredSourceFloats = count > 0 ? (offset + ((count - 1) * stride) + componentCount) : 0;
        const srcByteLength = src instanceof StorageBuffer ? src.byteLength : resolveGpuBuffer(src).size;
        assert((requiredSourceFloats * 4) <= srcByteLength, `extractScaleValuesF32: source range exceeds source buffer capacity (required ${requiredSourceFloats} f32, capacity ${Math.floor(srcByteLength / 4)} f32)`);
        const values = opts.values ?? new StorageBuffer(this.device, this.queue, {
            label: "scale:extract:values",
            byteLength: count * 4,
            copySrc: true
        });
        const flags = opts.flags ?? new StorageBuffer(this.device, this.queue, {
            label: "scale:extract:flags",
            byteLength: count * 4,
            copySrc: true
        });
        assert(values.byteLength >= count * 4, "extractScaleValuesF32: values buffer too small for count");
        assert(flags.byteLength >= count * 4, "extractScaleValuesF32: flags buffer too small for count");
        if (count === 0) return { values, flags };
        const params = this.device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: "scale:extract:params"
        });
        this.queue.writeBuffer(params, 0, new Uint32Array([
            count >>> 0,
            componentCount >>> 0,
            componentIndex >>> 0,
            scaleValueModeToId(valueMode) >>> 0,
            stride >>> 0,
            offset >>> 0,
            0,
            0
        ]));
        const commands: ComputeDispatchCommand[] = [];
        const pipeline = this.getScaleExtractF32Pipeline();
        const bg = pipeline.createBindGroup(0, {
            0: this.bindSized(src, requiredSourceFloats * 4),
            1: this.bindSized(values, count * 4),
            2: this.bindSized(flags, count * 4),
            3: { buffer: params, size: 32 }
        }, "scale:extract:bg");
        commands.push({
            pipeline,
            bindGroups: [bg],
            workgroups: workgroups1D(count, 256),
            label: "scale:extract"
        });
        this.execute(commands, opts);
        params.destroy();
        return { values, flags };
    }

    histogramF32(values: StorageBuffer, binCount: number, opts: ScaleHistogramOptions): StorageBuffer {
        assert(!opts.encoder, "histogramF32 does not support opts.encoder");
        assert(Number.isInteger(binCount) && binCount >= 0, `histogramF32: binCount must be an integer >= 0 (got ${binCount})`);
        const count = this.resolveCount(values, 4, opts.count);
        const bins = opts.bins ?? new StorageBuffer(this.device, this.queue, {
            label: "histogramF32:bins",
            byteLength: binCount * 4,
            copySrc: true
        });
        assert(bins.byteLength >= binCount * 4, "histogramF32: bins buffer is too small for binCount");
        const commands: ComputeDispatchCommand[] = [];
        if (binCount > 0 && (opts.clear ?? true)) {
            const pipelineClear = this.getHistogramClearPipeline();
            const bgClear = pipelineClear.createBindGroup(0, {
                0: this.bindSized(bins, binCount * 4)
            }, "histogramF32:clear:bg");
            commands.push({
                pipeline: pipelineClear,
                bindGroups: [bgClear],
                workgroups: workgroups1D(binCount, 256),
                label: "histogramF32:clear"
            });
        }
        let params: GPUBuffer | null = null;
        if (count > 0 && binCount > 0 && Number.isFinite(opts.minValue) && Number.isFinite(opts.maxValue) && opts.maxValue > opts.minValue) {
            params = this.device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                label: "histogramF32:params"
            });
            const raw = new ArrayBuffer(16);
            const dv = new DataView(raw);
            dv.setUint32(0, count >>> 0, true);
            dv.setUint32(4, binCount >>> 0, true);
            dv.setFloat32(8, opts.minValue, true);
            dv.setFloat32(12, opts.maxValue, true);
            this.queue.writeBuffer(params, 0, raw);

            const pipelineHist = this.getScaleHistogramF32Pipeline();
            const bgHist = pipelineHist.createBindGroup(0, {
                0: this.bindSized(values, count * 4),
                1: this.bindSized(bins, binCount * 4),
                2: { buffer: params, size: 16 }
            }, "histogramF32:hist:bg");
            commands.push({
                pipeline: pipelineHist,
                bindGroups: [bgHist],
                workgroups: workgroups1D(count, 256),
                label: "histogramF32:accum"
            });
        }
        this.execute(commands, opts);
        params?.destroy();
        return bins;
    }

    remapScaleF32(input: StorageBuffer, opts: ScaleRemapOptions): StorageBuffer {
        assert(!opts.encoder, "remapScaleF32 does not support opts.encoder");
        const count = this.resolveCount(input, 4, opts.count);
        const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
            label: "scale:remap:out",
            byteLength: count * 4,
            copySrc: true
        });
        assert(out.byteLength >= count * 4, "remapScaleF32: out buffer is too small for requested count");
        if (count === 0) return out;
        const transform = normalizeScaleTransform(opts.transform);
        const packed = new Float32Array(20);
        packScaleTransform(transform, packed, 0);
        const params = this.device.createBuffer({
            size: 80,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: "scale:remap:params"
        });
        const raw = new ArrayBuffer(80);
        const dv = new DataView(raw);
        dv.setUint32(0, count >>> 0, true);
        const f32 = new Float32Array(raw);
        f32[4] = packed[4];
        f32[5] = packed[5];
        f32[6] = 0;
        f32[7] = scaleClampModeToId(transform.clampMode);
        f32[8] = packed[8];
        f32[9] = packed[9];
        f32[10] = packed[10];
        f32[11] = packed[11];
        f32[12] = scaleModeToId(transform.mode);
        f32[13] = packed[13];
        f32[14] = packed[14];
        f32[15] = packed[15];
        f32[16] = packed[16];
        f32[17] = 0;
        f32[18] = 0;
        f32[19] = 0;
        this.queue.writeBuffer(params, 0, raw);
        const pipeline = this.getScaleRemapF32Pipeline();
        const bg = pipeline.createBindGroup(0, {
            0: this.bindSized(input, count * 4),
            1: this.bindSized(out, count * 4),
            2: { buffer: params, size: 80 }
        }, "scale:remap:bg");
        this.execute([
            {
                pipeline,
                bindGroups: [bg],
                workgroups: workgroups1D(count, 256),
                label: "scale:remap"
            }
        ], opts);
        params.destroy();
        return out;
    }

    reduceF32(input: StorageBuffer, op: ReduceOp, opts: ReduceOptions = {}): StorageBuffer {
        const count = this.resolveCount(input, 4, opts.count);
        const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
            label: `reduceF32:${op}`,
            byteLength: 4,
            copySrc: true
        });
        assert(out.byteLength >= 4, "reduceF32: out buffer must be at least 4 bytes");
        if (count === 0) {
            this.writeScalarF32Bits(out, identityF32Bits(op));
            return out;
        }
        const commands: ComputeDispatchCommand[] = [];
        this.encodeReduceScalar(commands, "f32", op, input, count, out, `reduceF32:${op}`);
        this.execute(commands, opts);
        return out;
    }

    sumF32(input: StorageBuffer, opts: ReduceOptions = {}): StorageBuffer {
        return this.reduceF32(input, "sum", opts);
    }

    minF32(input: StorageBuffer, opts: ReduceOptions = {}): StorageBuffer {
        return this.reduceF32(input, "min", opts);
    }

    maxF32(input: StorageBuffer, opts: ReduceOptions = {}): StorageBuffer {
        return this.reduceF32(input, "max", opts);
    }

    argminF32(input: StorageBuffer, opts: ArgReduceOptions = {}): StorageBuffer {
        return this.argReduceF32(input, "argmin", opts);
    }

    argmaxF32(input: StorageBuffer, opts: ArgReduceOptions = {}): StorageBuffer {
        return this.argReduceF32(input, "argmax", opts);
    }

    argReduceF32(input: StorageBuffer, op: ArgReduceOp, opts: ArgReduceOptions = {}): StorageBuffer {
        const count = this.resolveCount(input, 4, opts.count);
        const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
            label: `argReduceF32:${op}`,
            byteLength: 8,
            copySrc: true
        });
        assert(out.byteLength >= 8, "argReduceF32: out buffer must be at least 8 bytes");
        if (count === 0) {
            const id = identityArgPairBits(op);
            this.writeArgPairBits(out, id.valueBits, id.index);
            return out;
        }
        const commands: ComputeDispatchCommand[] = [];
        this.encodeArgReduceF32Scalar(commands, op, input, count, out, `argReduceF32:${op}`);
        this.execute(commands, opts);
        return out;
    }

    scanExclusiveU32(input: StorageBuffer, opts: ScanOptions = {}): StorageBuffer {
        const count = this.resolveCount(input, 4, opts.count);
        const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
            label: "scanExclusiveU32",
            byteLength: count * 4,
            copySrc: true
        });
        assert(out.byteLength >= count * 4, "scanExclusiveU32: out buffer is too small for requested count");
        if (count === 0) return out;
        const commands: ComputeDispatchCommand[] = [];
        this.encodeScanExclusiveU32Into(commands, input, count, out, "scanExclusiveU32");
        this.execute(commands, opts);
        return out;
    }

    histogramU32(keys: StorageBuffer, binCount: number, opts: HistogramOptions = {}): StorageBuffer {
        assert(Number.isInteger(binCount) && binCount >= 0, `binCount must be an integer >= 0 (got ${binCount})`);
        const count = this.resolveCount(keys, 4, opts.count);
        const bins = opts.bins ?? new StorageBuffer(this.device, this.queue, {
            label: "histogramU32:bins",
            byteLength: binCount * 4,
            copySrc: true
        });
        assert(bins.byteLength >= binCount * 4, "histogramU32: bins buffer is too small for binCount");
        const commands: ComputeDispatchCommand[] = [];
        if (binCount > 0 && (opts.clear ?? true)) {
            const pipelineClear = this.getHistogramClearPipeline();
            const bgClear = pipelineClear.createBindGroup(0, {
                0: this.bindSized(bins, binCount * 4)
            }, "histogramU32:clear:bg");
            commands.push({
                pipeline: pipelineClear,
                bindGroups: [bgClear],
                workgroups: workgroups1D(binCount, 256),
                label: "histogramU32:clear"
            });
        }
        if (count > 0 && binCount > 0) {
            const pipelineHist = this.getHistogramPipeline();
            const bgHist = pipelineHist.createBindGroup(0, {
                0: this.bindSized(keys, count * 4),
                1: this.bindSized(bins, binCount * 4)
            }, "histogramU32:hist:bg");
            commands.push({
                pipeline: pipelineHist,
                bindGroups: [bgHist],
                workgroups: workgroups1D(count, 256),
                label: "histogramU32:accum"
            });
        }
        this.execute(commands, opts);
        return bins;
    }

    compactU32(input: StorageBuffer, flags: StorageBuffer, opts: CompactOptions = {}): CompactResult {
        return this.compactTyped(input, flags, "u32", opts);
    }

    compactF32(input: StorageBuffer, flags: StorageBuffer, opts: CompactOptions = {}): CompactResult {
        return this.compactTyped(input, flags, "f32", opts);
    }

    private compactTyped(input: StorageBuffer, flags: StorageBuffer, type: "u32" | "f32", opts: CompactOptions): CompactResult {
        const count = this.resolveCount(flags, 4, opts.count);
        const inputCount = this.resolveCount(input, 4, opts.count);
        assert(inputCount === count, "compact: input and flags counts must match");
        const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
            label: `compact:${type}:out`,
            byteLength: count * 4,
            copySrc: true
        });
        assert(out.byteLength >= count * 4, "compact: out buffer is too small for requested count");
        const countOut = new StorageBuffer(this.device, this.queue, {
            label: `compact:${type}:count`,
            byteLength: 4,
            copySrc: true
        });
        if (count === 0) {
            this.writeScalarU32(countOut, 0);
            return { output: out, count: countOut };
        }
        const prefix: BufferResource = this.scratch.acquire(count * 4, `compact:${type}:prefix`);
        const commands: ComputeDispatchCommand[] = [];
        this.encodeScanExclusiveU32Into(commands, flags, count, prefix, `compact:${type}:scan`);
        this.encodeReduceScalar(commands, "u32", "sum", flags, count, countOut, `compact:${type}:count`);
        {
            const pipeline = this.getCompactPipeline(type);
            const bg = pipeline.createBindGroup(0, {
                0: this.bindSized(input, count * 4),
                1: this.bindSized(flags, count * 4),
                2: this.bindSized(prefix, count * 4),
                3: this.bindSized(out, count * 4)
            }, `compact:${type}:compact:bg`);
            commands.push({
                pipeline,
                bindGroups: [bg],
                workgroups: workgroups1D(count, 256),
                label: `compact:${type}:scatter`
            });
        }
        this.execute(commands, opts);
        return { output: out, count: countOut };
    }

    radixSortKeysU32(keys: StorageBuffer, opts: RadixSortOptions = {}): StorageBuffer {
        const count = this.resolveCount(keys, 4, opts.count);
        const inPlace = opts.inPlace ?? false;
        const out = inPlace ? keys : (opts.out ?? new StorageBuffer(this.device, this.queue, {
            label: "radixSortKeysU32:out",
            byteLength: count * 4,
            copySrc: true
        }));
        if (!inPlace) assert(out.byteLength >= count * 4, "radixSortKeysU32: out buffer is too small for requested count");

        if (count <= 1) {
            if (!inPlace && count === 1) {
                const commands: ComputeDispatchCommand[] = [];
                this.encodeCopyU32(commands, keys, 1, out, "radixSortKeysU32");
                this.execute(commands, opts);
            }
            return out;
        }
        const flags: BufferResource = this.scratch.acquire(count * 4, "radix:flags");
        const prefix: BufferResource = this.scratch.acquire(count * 4, "radix:prefix");
        const zerosCount: BufferResource = this.scratch.acquire(4, "radix:zerosCount");
        const scratchKeys: BufferResource = this.scratch.acquire(count * 4, "radix:keysScratch");
        const bufA: BufferResource = scratchKeys;
        const bufB: BufferResource = out;
        let inBuf: BufferResource = keys;
        let outBuf: BufferResource = bufA;
        const commands: ComputeDispatchCommand[] = [];
        for (let bit = 0; bit < 32; bit++) {
            {
                const pipeline = this.getRadixFlagsPipeline(bit);
                const bg = pipeline.createBindGroup(0, {
                    0: this.bindSized(inBuf, count * 4),
                    1: this.bindSized(flags, count * 4)
                }, `radix:bit${bit}:flags:bg`);
                commands.push({
                    pipeline,
                    bindGroups: [bg],
                    workgroups: workgroups1D(count, 256),
                    label: `radix:bit${bit}:flags`
                });
            }
            this.encodeScanExclusiveU32Into(commands, flags, count, prefix, `radix:bit${bit}:scan`);
            this.encodeReduceScalar(commands, "u32", "sum", flags, count, zerosCount, `radix:bit${bit}:zerosCount`);
            {
                const pipeline = this.getRadixScatterPipeline(bit);
                const bg = pipeline.createBindGroup(0, {
                    0: this.bindSized(inBuf, count * 4),
                    1: this.bindSized(prefix, count * 4),
                    2: this.bindSized(zerosCount, 4),
                    3: this.bindSized(outBuf, count * 4)
                }, `radix:bit${bit}:scatter:bg`);
                commands.push({
                    pipeline,
                    bindGroups: [bg],
                    workgroups: workgroups1D(count, 256),
                    label: `radix:bit${bit}:scatter`
                });
            }
            inBuf = outBuf;
            outBuf = (outBuf === bufA) ? bufB : bufA;
        }
        if (inPlace) {
            if (inBuf !== keys) {
                this.encodeCopyU32(commands, inBuf, count, keys, "radixSortKeysU32:finalize");
            }
        } else {
            if (inBuf !== out) {
                this.encodeCopyU32(commands, inBuf, count, out, "radixSortKeysU32:finalize");
            }
        }
        this.execute(commands, opts);
        return out;
    }
}
