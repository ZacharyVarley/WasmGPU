import assert from "assert";
import * as WasmGPU from "../dist/WasmGPU.js";
import { create, globals } from "webgpu";

Object.assign(globalThis, globals);
const navigator = { gpu: create([]) };

const numberApproxEqual = (a, b, tol = 1e-5, msg = "Numbers differ") => {
    assert.ok(Number.isFinite(a) && Number.isFinite(b), "Expected finite numbers");
    assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
};

const arraysEqualU32 = (a, b, msg = "Arrays differ") => {
    assert.strictEqual(a.length, b.length, `${msg}: length ${a.length} vs ${b.length}`);
    for (let i = 0; i < a.length; i++) {
        assert.strictEqual(a[i] >>> 0, b[i] >>> 0, `${msg} at index ${i}: ${a[i]} vs ${b[i]}`);
    }
};

const arraysApproxEqualF32 = (a, b, tol = 1e-5, msg = "Arrays differ") => {
    assert.strictEqual(a.length, b.length, `${msg}: length ${a.length} vs ${b.length}`);
    for (let i = 0; i < a.length; i++) numberApproxEqual(a[i], b[i], tol, `${msg} at index ${i}`);
};

const makeRandomU32Array = (n, maxInclusive = 1024) => {
    const a = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        a[i] = (Math.floor(Math.random() * (maxInclusive + 1)) >>> 0);
    }
    return a;
};

const makeRandomF32Array = (n, min = -10, max = 10) => {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        a[i] = min + (max - min) * Math.random();
    }
    return a;
};

const gpu = navigator.gpu;
assert.ok(gpu, "WebGPU not available. Ensure the dev dependency 'webgpu' is installed.");
const adapter = await gpu.requestAdapter();
assert.ok(adapter, "Failed to acquire a WebGPU adapter");
const device = await adapter.requestDevice();
assert.ok(device, "Failed to acquire a WebGPU device");

// Make any validation errors fail the test loudly.
device.addEventListener("uncapturederror", (e) => {
    throw new Error(`Uncaptured WebGPU error: ${e.error ? e.error.message : String(e)}`);
});

const { Compute, ComputeKernels } = WasmGPU;
assert.ok(Compute, "Missing export: Compute");

const compute = new Compute(device, device.queue);

const kernels = compute.kernels ?? (ComputeKernels ? new ComputeKernels(device, device.queue) : null);
assert.ok(kernels, "Kernels not available. Expected compute.kernels or exported ComputeKernels.");

// Copy kernels u32 / f32
{
    assert.strictEqual(typeof kernels.copyU32, "function", "Missing kernel: copyU32");
    assert.strictEqual(typeof kernels.copyF32, "function", "Missing kernel: copyF32");

    // copyU32 (full)
    {
        const n = 8192 + 17;
        const a = makeRandomU32Array(n, 0xFFFFFFFF >>> 0);
        const bufA = compute.createStorageBuffer({ label: "copy:u32:in", data: a, copySrc: false });
        const out = compute.createStorageBuffer({ label: "copy:u32:out", byteLength: n * 4, copySrc: true });
        const outRef = kernels.copyU32(bufA, { out, count: n }) ?? out;
        const got = await outRef.readAs(Uint32Array);
        arraysEqualU32(got, a, "copyU32 mismatch");
    }

    // copyU32 (partial count)
    {
        const n = 4096 + 9;
        const a = makeRandomU32Array(n, 1000);
        const bufA = compute.createStorageBuffer({ label: "copy:u32:in_partial", data: a, copySrc: false });
        const m = 1024 + 3;
        const out = compute.createStorageBuffer({ label: "copy:u32:out_partial", byteLength: m * 4, copySrc: true });
        const outRef = kernels.copyU32(bufA, { out, count: m }) ?? out;
        const got = await outRef.readAs(Uint32Array);
        arraysEqualU32(got, a.subarray(0, m), "copyU32 partial mismatch");
    }

    // copyF32 (full)
    {
        const n = 8192 + 7;
        const a = makeRandomF32Array(n, -50, 50);
        const bufA = compute.createStorageBuffer({ label: "copy:f32:in", data: a, copySrc: false });
        const out = compute.createStorageBuffer({ label: "copy:f32:out", byteLength: n * 4, copySrc: true });
        const outRef = kernels.copyF32(bufA, { out, count: n }) ?? out;
        const got = await outRef.readAs(Float32Array);
        arraysApproxEqualF32(got, a, 1e-5, "copyF32 mismatch");
    }

    // copyF32 (partial count)
    {
        const n = 4096 + 11;
        const a = makeRandomF32Array(n, -5, 5);
        const bufA = compute.createStorageBuffer({ label: "copy:f32:in_partial", data: a, copySrc: false });
        const m = 777;
        const out = compute.createStorageBuffer({ label: "copy:f32:out_partial", byteLength: m * 4, copySrc: true });
        const outRef = kernels.copyF32(bufA, { out, count: m }) ?? out;
        const got = await outRef.readAs(Float32Array);
        arraysApproxEqualF32(got, a.subarray(0, m), 1e-5, "copyF32 partial mismatch");
    }
}

// Reduction kernels u32
{
    const n = 10000;
    const a = makeRandomU32Array(n, 10);
    const bufA = compute.createStorageBuffer({ label: "reduce:u32:in", data: a, copySrc: false });
    const outSum = kernels.sumU32(bufA);
    const outMin = kernels.minU32(bufA);
    const outMax = kernels.maxU32(bufA);
    let sum = 0 >>> 0;
    let mn = 0xFFFFFFFF >>> 0;
    let mx = 0 >>> 0;
    for (let i = 0; i < a.length; i++) {
        sum = (sum + (a[i] >>> 0)) >>> 0;
        mn = Math.min(mn, a[i] >>> 0) >>> 0;
        mx = Math.max(mx, a[i] >>> 0) >>> 0;
    }
    const gotSum = (await outSum.readAs(Uint32Array))[0] >>> 0;
    const gotMin = (await outMin.readAs(Uint32Array))[0] >>> 0;
    const gotMax = (await outMax.readAs(Uint32Array))[0] >>> 0;
    assert.strictEqual(gotSum, sum, "sumU32 mismatch");
    assert.strictEqual(gotMin, mn, "minU32 mismatch");
    assert.strictEqual(gotMax, mx, "maxU32 mismatch");
}

// Reduction kernels f32
{
    const n = 8192 + 37;
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = 1.0;
    const bufA = compute.createStorageBuffer({ label: "reduce:f32:in", data: a, copySrc: false });
    const outSum = kernels.sumF32(bufA);
    const outMin = kernels.minF32(bufA);
    const outMax = kernels.maxF32(bufA);
    const gotSum = (await outSum.readAs(Float32Array))[0];
    const gotMin = (await outMin.readAs(Float32Array))[0];
    const gotMax = (await outMax.readAs(Float32Array))[0];
    numberApproxEqual(gotSum, n, 1e-3, "sumF32 mismatch");
    numberApproxEqual(gotMin, 1.0, 1e-6, "minF32 mismatch");
    numberApproxEqual(gotMax, 1.0, 1e-6, "maxF32 mismatch");
}

// Argmin / argmax f32
{
    const a = new Float32Array([3.0, -2.5, 8.0, 1.25, -2.5, 7.0]);
    const bufA = compute.createStorageBuffer({ label: "argreduce:f32:in", data: a, copySrc: false });
    const outMin = kernels.argminF32(bufA);
    const outMax = kernels.argmaxF32(bufA);
    const minBytes = await outMin.read(0, 8);
    const maxBytes = await outMax.read(0, 8);
    const dvMin = new DataView(minBytes);
    const dvMax = new DataView(maxBytes);
    const minVal = dvMin.getFloat32(0, true);
    const minIdx = dvMin.getUint32(4, true);
    const maxVal = dvMax.getFloat32(0, true);
    const maxIdx = dvMax.getUint32(4, true);
    numberApproxEqual(minVal, -2.5, 1e-6, "argminF32 value mismatch");
    assert.strictEqual(minIdx, 1, "argminF32 index mismatch");
    numberApproxEqual(maxVal, 8.0, 1e-6, "argmaxF32 value mismatch");
    assert.strictEqual(maxIdx, 2, "argmaxF32 index mismatch");
}

// Exclusive scan u32
{
    const n = 4096 + 13;
    const a = makeRandomU32Array(n, 7);
    const bufA = compute.createStorageBuffer({ label: "scan:u32:in", data: a, copySrc: false });
    const out = kernels.scanExclusiveU32(bufA);
    const got = await out.readAs(Uint32Array);
    const expected = new Uint32Array(n);
    let acc = 0 >>> 0;
    for (let i = 0; i < n; i++) {
        expected[i] = acc;
        acc = (acc + (a[i] >>> 0)) >>> 0;
    }
    arraysEqualU32(got, expected, "scanExclusiveU32 mismatch");
}

// Histogram u32 keys
{
    const bins = 32;
    const n = 20000;
    const keys = new Uint32Array(n);
    for (let i = 0; i < n; i++) keys[i] = (Math.floor(Math.random() * bins) >>> 0);
    const bufKeys = compute.createStorageBuffer({ label: "hist:u32:keys", data: keys, copySrc: false });
    const outBins = kernels.histogramU32(bufKeys, bins, { clear: true });
    const got = await outBins.readAs(Uint32Array);
    const expected = new Uint32Array(bins);
    for (let i = 0; i < n; i++) expected[keys[i]]++;
    arraysEqualU32(got, expected, "histogramU32 mismatch");
}

// Compaction u32
{
    const n = 4096 + 17;
    const input = makeRandomU32Array(n, 1000);
    const flags = new Uint32Array(n);
    for (let i = 0; i < n; i++) flags[i] = (Math.random() < 0.35) ? 1 : 0;
    const bufIn = compute.createStorageBuffer({ label: "compact:u32:in", data: input, copySrc: false });
    const bufFlags = compute.createStorageBuffer({ label: "compact:u32:flags", data: flags, copySrc: false });
    const { output, count } = kernels.compactU32(bufIn, bufFlags);
    const gotCount = (await count.readAs(Uint32Array))[0] >>> 0;
    const gotOut = await output.readAs(Uint32Array);
    const expected = [];
    for (let i = 0; i < n; i++) if (flags[i] !== 0) expected.push(input[i] >>> 0);
    assert.strictEqual(gotCount, expected.length >>> 0, "compactU32 count mismatch");
    for (let i = 0; i < expected.length; i++) assert.strictEqual(gotOut[i] >>> 0, expected[i] >>> 0, `compactU32 output mismatch at index ${i}`);
}

// Compaction f32
{
    const n = 2048 + 9;
    const input = makeRandomF32Array(n, -5, 5);
    const flags = new Uint32Array(n);
    for (let i = 0; i < n; i++) flags[i] = (Math.random() < 0.5) ? 1 : 0;
    const bufIn = compute.createStorageBuffer({ label: "compact:f32:in", data: input, copySrc: false });
    const bufFlags = compute.createStorageBuffer({ label: "compact:f32:flags", data: flags, copySrc: false });
    const { output, count } = kernels.compactF32(bufIn, bufFlags);
    const gotCount = (await count.readAs(Uint32Array))[0] >>> 0;
    const gotOut = await output.readAs(Float32Array);
    const expected = [];
    for (let i = 0; i < n; i++) if (flags[i] !== 0) expected.push(input[i]);
    assert.strictEqual(gotCount, expected.length >>> 0, "compactF32 count mismatch");
    for (let i = 0; i < expected.length; i++) numberApproxEqual(gotOut[i], expected[i], 1e-5, `compactF32 output mismatch at index ${i}`);
}

// Radix sort u32 keys
{
    const n = 10000 + 3;
    const keys = makeRandomU32Array(n, 0xFFFFFFFF >>> 0);
    const bufKeys = compute.createStorageBuffer({ label: "radix:u32:keys", data: keys, copySrc: false });
    const out = kernels.radixSortKeysU32(bufKeys, { inPlace: false });
    const got = await out.readAs(Uint32Array);
    const expected = Array.from(keys, (x) => x >>> 0).sort((a, b) => a - b);
    for (let i = 0; i < n; i++) assert.strictEqual(got[i] >>> 0, expected[i] >>> 0, `radixSortKeysU32 mismatch at index ${i}`);
}

compute.destroy();
device.destroy();
