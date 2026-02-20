import assert from "assert";
import { Compute, ComputePipeline, makeWorkgroupSize, makeWorkgroupCounts, workgroups1D, workgroups2D, workgroups3D, normalizeWorkgroups } from "../dist/WasmGPU.js";
import { create, globals } from "webgpu";

Object.assign(globalThis, globals);
const navigator = { gpu: create([]) };

const numberApproxEqual = (a, b, tol = 1e-5, msg = "Numbers differ") => {
    assert.ok(Number.isFinite(a) && Number.isFinite(b), "Expected finite numbers");
    assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
};

const arraysApproxEqual = (a, b, tol = 1e-5, msg = "Arrays differ") => {
    assert.strictEqual(a.length, b.length, `${msg}: length ${a.length} vs ${b.length}`);
    for (let i = 0; i < a.length; i++) numberApproxEqual(a[i], b[i], tol, `${msg} at index ${i}`);
};

const randFloat = (min, max) => {
    return min + (max - min) * Math.random();
};

const makeRandomArray = (n, min = -10, max = 10) => {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = randFloat(min, max);
    return a;
};

const gpu = navigator.gpu;
assert.ok(gpu, "WebGPU not available. Run with: node --experimental-webgpu ./test/compute.test.js");
const adapter = await gpu.requestAdapter();
assert.ok(adapter, "Failed to acquire a WebGPU adapter");
const device = await adapter.requestDevice();
assert.ok(device, "Failed to acquire a WebGPU device");

// Make any validation errors fail the test loudly.
device.addEventListener("uncapturederror", (e) => {
    throw new Error(`Uncaptured WebGPU error: ${e.error ? e.error.message : String(e)}`);
});

const compute = new Compute(device, device.queue);

// Sanity check: helpers are correct.
{
    assert.deepStrictEqual(makeWorkgroupSize(64, 1, 1), [64, 1, 1]);
    assert.deepStrictEqual(makeWorkgroupCounts(10, 2, 3), [10, 2, 3]);
    assert.deepStrictEqual(workgroups1D(0, 64), [0, 1, 1]);
    assert.deepStrictEqual(workgroups2D(33, 33, 16, 16), [3, 3, 1]);
    assert.deepStrictEqual(workgroups3D(9, 8, 8, 8, 8, 8), [2, 1, 1]);
    assert.deepStrictEqual(normalizeWorkgroups([5, 2, 3]), { x: 5, y: 2, z: 3 });
    assert.deepStrictEqual(normalizeWorkgroups({ x: 5 }), { x: 5, y: 1, z: 1 });
}

// WGSL for two-step compute:
// 1) out[i] = a[i] * 2
// 2) out[i] = out[i] + b[i]
// This intentionally exercises:
// - storage buffers read-only/read-write
// - pipeline creation via ComputePipeline wrapper
// - bind group creation via pipeline.createBindGroup
// - dispatch1D convenience AND dispatchBatch utility
const mul2WGSL = `
    @group(0) @binding(0) var<storage, read> a : array<f32>;
    @group(0) @binding(1) var<storage, read_write> out : array<f32>;
    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
        let i = gid.x;
        if (i < arrayLength(&out)) {
            out[i] = a[i] * 2.0;
        }
    }
`;
const addinplaceWGSL = `
    @group(0) @binding(0) var<storage, read> b : array<f32>;
    @group(0) @binding(1) var<storage, read_write> out : array<f32>;
    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
        let i = gid.x;
        if (i < arrayLength(&out)) {
            out[i] = out[i] + b[i];
        }
    }
`;
const pipelineMul2 = new ComputePipeline(device, { label: "mul2", code: mul2WGSL, entryPoint: "main" });
const pipelineAdd = new ComputePipeline(device, { label: "add", code: addinplaceWGSL, entryPoint: "main" });

// Run a few sizes including non-multiples of 64 to validate bounds logic.
const sizes = [1, 2, 63, 64, 65, 127, 128, 129, 1024];

for (const n of sizes) {
    const a = makeRandomArray(n);
    const b = makeRandomArray(n);
    const bufA = compute.createStorageBuffer({ label: `A_${n}`, data: a, copySrc: false });
    const bufB = compute.createStorageBuffer({ label: `B_${n}`, data: b, copySrc: false });
    const bufOut = compute.createStorageBuffer({ label: `OUT_${n}`, byteLength: n * 4, copySrc: true });
    const bgMul2 = pipelineMul2.createBindGroup(0, { 0: bufA, 1: bufOut });
    const bgAdd = pipelineAdd.createBindGroup(0, { 0: bufB, 1: bufOut });

    // 1) Test single-dispatch convenience path.
    compute.dispatch1D(pipelineMul2, [bgMul2], n, 64, `mul2_${n}`);
    await device.queue.onSubmittedWorkDone();
    {
        const out1 = await bufOut.readAs(Float32Array);
        const expected1 = new Float32Array(n);
        for (let i = 0; i < n; i++) expected1[i] = a[i] * 2.0;
        arraysApproxEqual(out1, expected1, 1e-5, `mul2 output mismatch for n=${n}`);
    }

    // 2) Test batch dispatch utility (two commands, one compute pass).
    compute.dispatchBatch(
        [
            { pipeline: pipelineMul2, bindGroups: [bgMul2], workgroups: workgroups1D(n, 64), label: `mul2_${n}_batch` },
            { pipeline: pipelineAdd, bindGroups: [bgAdd], workgroups: workgroups1D(n, 64), label: `add_${n}_batch` }
        ],
        `batch_${n}`
    );
    await device.queue.onSubmittedWorkDone();
    {
        const out2 = await bufOut.readAs(Float32Array);
        const expected2 = new Float32Array(n);
        for (let i = 0; i < n; i++) expected2[i] = a[i] * 2.0 + b[i];
        arraysApproxEqual(out2, expected2, 1e-5, `mul2+add output mismatch for n=${n}`);
    }

    bufA.destroy();
    bufB.destroy();
    bufOut.destroy();
}

// This checks UniformBuffer creation + writing + binding works end-to-end. We’ll compute: out[i] = a[i] * scale + bias
{
    const affineWGSL = `
        struct Params {
            scale : f32,
            bias : f32,
            _pad0 : f32,
            _pad1 : f32,
        }
        @group(0) @binding(0) var<uniform> params : Params;
        @group(0) @binding(1) var<storage, read> a : array<f32>;
        @group(0) @binding(2) var<storage, read_write> out : array<f32>;
        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
            let i = gid.x;
            if (i < arrayLength(&out)) {
                out[i] = a[i] * params.scale + params.bias;
            }
        }
    `;
    const n = 513;
    const a = makeRandomArray(n);
    const scale = 3.25;
    const bias = -1.75;
    const params = compute.createUniformBuffer({ label: "params", data: new Float32Array([scale, bias, 0, 0]) });
    const bufA = compute.createStorageBuffer({ label: "a_affine", data: a });
    const bufOut = compute.createStorageBuffer({ label: "out_affine", byteLength: n * 4, copySrc: true });
    const pipelineAffine = compute.createPipeline({ label: "affine", code: affineWGSL, entryPoint: "main" });
    const bg = pipelineAffine.createBindGroup(0, { 0: params, 1: bufA, 2: bufOut });
    compute.dispatch1D(pipelineAffine, [bg], n, 64, "affine");
    await device.queue.onSubmittedWorkDone();
    const out = await bufOut.readAs(Float32Array);
    const expected = new Float32Array(n);
    for (let i = 0; i < n; i++) expected[i] = a[i] * scale + bias;
    arraysApproxEqual(out, expected, 1e-5, "affine output mismatch");
    params.destroy();
    bufA.destroy();
    bufOut.destroy();
}

compute.destroy();
device.destroy();

console.log("Compute tests passed.");
