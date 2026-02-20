import { assert } from "../utils";
import { StorageBuffer, UniformBuffer } from "./buffer";

export type StorageBufferBindingLayout = {
    binding: number;
    readOnly?: boolean;
    visibility?: GPUShaderStageFlags;
    hasDynamicOffset?: boolean;
    minBindingSize?: number;
};

export const storageBufferLayout = (opts: StorageBufferBindingLayout): GPUBindGroupLayoutEntry => {
    return {
        binding: opts.binding,
        visibility: opts.visibility ?? GPUShaderStage.COMPUTE,
        buffer: {
            type: opts.readOnly ? "read-only-storage" : "storage",
            hasDynamicOffset: opts.hasDynamicOffset ?? false,
            minBindingSize: opts.minBindingSize
        }
    };
};

export type UniformBufferBindingLayout = {
    binding: number;
    visibility?: GPUShaderStageFlags;
    hasDynamicOffset?: boolean;
    minBindingSize?: number;
};

export const uniformBufferLayout = (opts: UniformBufferBindingLayout): GPUBindGroupLayoutEntry => {
    return {
        binding: opts.binding,
        visibility: opts.visibility ?? GPUShaderStage.COMPUTE,
        buffer: {
            type: "uniform",
            hasDynamicOffset: opts.hasDynamicOffset ?? false,
            minBindingSize: opts.minBindingSize
        }
    };
};

export type ComputeBindGroupLayoutDescriptor = {
    label?: string;
    entries: GPUBindGroupLayoutEntry[];
};

export type ComputePipelineDescriptor = {
    label?: string;
    code: string;
    entryPoint?: string;
    constants?: Record<string, number>;
    bindGroups?: ComputeBindGroupLayoutDescriptor[];
};

export type BufferResource = GPUBuffer | StorageBuffer | UniformBuffer;

export type BufferBindingResource = BufferResource | { buffer: BufferResource; offset?: number; size?: number };

export type ComputeBindGroupResources = Record<number, BufferBindingResource> | Array<{ binding: number; resource: BufferBindingResource }>;

const isGpuBuffer = (r: BufferResource | { buffer: BufferResource }): r is GPUBuffer => {
    return (r as GPUBuffer).mapState !== undefined;
};

const resolveBuffer = (res: BufferResource): GPUBuffer => {
    if (isGpuBuffer(res)) return res;
    return res.buffer;
};

const resolveBufferBinding = (resource: BufferBindingResource): GPUBufferBinding => {
    if (isGpuBuffer(resource)) return { buffer: resource };
    if ((resource as StorageBuffer).buffer !== undefined && (resource as StorageBuffer).device !== undefined) {
        const buf = resolveBuffer(resource as BufferResource);
        return { buffer: buf };
    }
    const bb = resource as { buffer: BufferResource; offset?: number; size?: number };
    const buf = resolveBuffer(bb.buffer);
    return {
        buffer: buf,
        offset: bb.offset,
        size: bb.size
    };
};

const resourcesToEntries = (resources: ComputeBindGroupResources): GPUBindGroupEntry[] => {
    const entries: GPUBindGroupEntry[] = [];
    if (Array.isArray(resources)) {
        for (const e of resources) {
            entries.push({
                binding: e.binding,
                resource: resolveBufferBinding(e.resource)
            });
        }
        return entries;
    }
    const keys = Object.keys(resources).map((k) => Number(k)).filter((n) => Number.isFinite(n));
    keys.sort((a, b) => a - b);
    for (const binding of keys) {
        const resource = resources[binding];
        if (!resource) continue;
        entries.push({ binding, resource: resolveBufferBinding(resource) });
    }
    return entries;
};

export class ComputePipeline {
    readonly device: GPUDevice;
    readonly shaderCode: string;
    readonly entryPoint: string;
    readonly constants: Record<string, number> | undefined;
    readonly pipeline: GPUComputePipeline;
    readonly bindGroupLayouts: GPUBindGroupLayout[];
    readonly label: string | null;

    constructor(device: GPUDevice, desc: ComputePipelineDescriptor) {
        this.device = device;
        this.shaderCode = desc.code;
        this.entryPoint = desc.entryPoint ?? "main";
        this.constants = desc.constants;
        this.label = desc.label ?? null;
        const module = device.createShaderModule({ code: desc.code });
        if (desc.bindGroups && desc.bindGroups.length > 0) {
            const layouts = desc.bindGroups.map((g) => device.createBindGroupLayout({ label: g.label, entries: g.entries }));
            const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: layouts });
            this.pipeline = device.createComputePipeline({
                label: desc.label,
                layout: pipelineLayout,
                compute: {
                    module,
                    entryPoint: this.entryPoint,
                    constants: this.constants
                }
            });
            this.bindGroupLayouts = layouts;
        } else {
            this.pipeline = device.createComputePipeline({
                label: desc.label,
                layout: "auto",
                compute: {
                    module,
                    entryPoint: this.entryPoint,
                    constants: this.constants
                }
            });
            this.bindGroupLayouts = [];
        }
    }

    getBindGroupLayout(groupIndex: number): GPUBindGroupLayout {
        if (this.bindGroupLayouts.length > 0) {
            const layout = this.bindGroupLayouts[groupIndex];
            assert(!!layout, `Bind group layout ${groupIndex} not found (pipeline has ${this.bindGroupLayouts.length} explicit groups)`);
            return layout;
        }
        return this.pipeline.getBindGroupLayout(groupIndex);
    }

    createBindGroup(groupIndex: number, resources: ComputeBindGroupResources, label?: string): GPUBindGroup {
        const layout = this.getBindGroupLayout(groupIndex);
        const entries = resourcesToEntries(resources);
        return this.device.createBindGroup({
            label,
            layout,
            entries
        });
    }
}
