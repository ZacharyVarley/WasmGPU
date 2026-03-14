/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "assert";
import * as WasmGPU from "../dist/WasmGPU.js";
import { create, globals } from "webgpu";

Object.assign(globalThis, globals);
const navigator = { gpu: create([]) };

const numberApproxEqual = (a, b, tol = 1e-6, msg = "Numbers differ") => {
    assert.ok(Number.isFinite(a) && Number.isFinite(b), "Expected finite numbers");
    assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
};

const arraysApproxEqual = (a, b, tol = 1e-6, msg = "Arrays differ") => {
    assert.strictEqual(a.length, b.length, `${msg}: length ${a.length} vs ${b.length}`);
    for (let i = 0; i < a.length; i++) numberApproxEqual(a[i], b[i], tol, `${msg} at index ${i}`);
};

const gpu = navigator.gpu;
assert.ok(gpu, "WebGPU not available. Ensure the dev dependency 'webgpu' is installed.");
const adapter = await gpu.requestAdapter();
assert.ok(adapter, "Failed to acquire a WebGPU adapter");
const device = await adapter.requestDevice();
assert.ok(device, "Failed to acquire a WebGPU device");
device.addEventListener("uncapturederror", (e) => {
    throw new Error(`Uncaptured WebGPU error: ${e.error ? e.error.message : String(e)}`);
});

await WasmGPU.initWebAssembly(new URL("../dist/", import.meta.url).toString());
const { PointCloud, Compute } = WasmGPU;
assert.ok(PointCloud, "Missing export: PointCloud");
assert.ok(Compute, "Missing export: Compute");
const compute = new Compute(device, device.queue);
assert.ok(compute.kernels && typeof compute.kernels.copyF32 === "function", "Missing kernel: compute.kernels.copyF32");

const baseScaleTransform = { componentCount: 4, componentIndex: 3, stride: 4, offset: 0 };

// CPU data path: setData() -> upload() -> pointsBuffer readable by GPU
{
    const data = new Float32Array([
        1.0, 2.0, 3.0, 0.50,
        4.0, 6.0, 8.0, 0.25,
    ]);

    const pc = new PointCloud({ scaleTransform: baseScaleTransform });
    assert.strictEqual(typeof pc.setData, "function", "PointCloud.setData missing");
    pc.setData(data);

    assert.strictEqual(pc.pointCount, 2, "PointCloud.pointCount mismatch after setData");

    assert.strictEqual(typeof pc.upload, "function", "PointCloud.upload missing");
    pc.upload(device, device.queue);

    assert.ok(pc.pointsBuffer, "PointCloud.pointsBuffer not created after upload");

    const out = compute.createStorageBuffer({
        label: "pc:cpu_upload:out",
        byteLength: data.byteLength,
        copySrc: true
    });

    compute.kernels.copyF32(pc.pointsBuffer, { out, count: data.length });
    await device.queue.onSubmittedWorkDone();

    const got = await out.readAs(Float32Array);
    arraysApproxEqual(got, data, 0, "CPU-uploaded pointsBuffer contents mismatch");

    out.destroy();
    pc.destroy?.();
}

// External storage buffer path: setPointsBuffer() should use caller-provided buffer (compute interop)
{
    const data = new Float32Array([
        -1.0, -2.0, -3.0, 10.0,
        9.0, 8.0, 7.0, 20.0
    ]);

    const src = compute.createStorageBuffer({
        label: "pc:external:src",
        data,
        copySrc: false
    });

    const pc = new PointCloud({ scaleTransform: baseScaleTransform });
    assert.strictEqual(typeof pc.setPointsBuffer, "function", "PointCloud.setPointsBuffer missing");
    pc.setPointsBuffer(src.buffer, 2);

    pc.upload(device, device.queue);

    assert.strictEqual(pc.pointsBuffer, src.buffer, "PointCloud did not retain the externally provided pointsBuffer");
    assert.strictEqual(pc.pointCount, 2, "PointCloud.pointCount mismatch for external buffer");

    const out = compute.createStorageBuffer({
        label: "pc:external:out",
        byteLength: data.byteLength,
        copySrc: true
    });

    compute.kernels.copyF32(pc.pointsBuffer, { out, count: data.length });
    await device.queue.onSubmittedWorkDone();

    const got = await out.readAs(Float32Array);
    arraysApproxEqual(got, data, 0, "External pointsBuffer contents mismatch");

    out.destroy();
    src.destroy();
    pc.destroy?.();
}

// Uniform packing sanity for unified ScaleTransform + visual params.
{
    const pc = new PointCloud({ scaleTransform: baseScaleTransform });

    assert.strictEqual(typeof pc.getUniformBufferSize, "function", "PointCloud.getUniformBufferSize missing");
    assert.strictEqual(typeof pc.getUniformData, "function", "PointCloud.getUniformData missing");

    const byteSize = pc.getUniformBufferSize();
    assert.strictEqual(byteSize, 240, "PointCloud uniform buffer size should be 240 bytes (15 vec4<f32>)");

    assert.ok(("basePointSize" in pc), "PointCloud.basePointSize missing");
    assert.ok(("minPointSize" in pc), "PointCloud.minPointSize missing");
    assert.ok(("maxPointSize" in pc), "PointCloud.maxPointSize missing");
    assert.ok(("sizeAttenuation" in pc), "PointCloud.sizeAttenuation missing");
    assert.ok(("opacity" in pc), "PointCloud.opacity missing");
    assert.ok(("softness" in pc), "PointCloud.softness missing");
    assert.ok(("scaleTransform" in pc), "PointCloud.scaleTransform missing");
    assert.strictEqual(typeof pc.setScaleTransform, "function", "PointCloud.setScaleTransform missing");

    pc.basePointSize = 6.0;
    pc.minPointSize = 2.0;
    pc.maxPointSize = 12.0;
    pc.sizeAttenuation = 3.0;
    pc.opacity = 0.25;
    pc.softness = 0.6;
    pc.setScaleTransform({
        componentCount: 4,
        componentIndex: 3,
        valueMode: "component",
        stride: 4,
        offset: 0,
        mode: "symlog",
        clampMode: "range",
        domainMin: -5,
        domainMax: 5,
        clampMin: -2,
        clampMax: 2,
        percentileLow: 5,
        percentileHigh: 95,
        logBase: 10,
        symlogLinThresh: 0.25,
        gamma: 2,
        invert: true
    });

    const u = pc.getUniformData();
    assert.ok(u instanceof Float32Array, "getUniformData() should return Float32Array");
    assert.strictEqual(u.byteLength, 240, "getUniformData() byteLength mismatch");

    numberApproxEqual(u[0], 6.0, 1e-6, "sizeParams.x mismatch");
    numberApproxEqual(u[1], 2.0, 1e-6, "sizeParams.y mismatch");
    numberApproxEqual(u[2], 12.0, 1e-6, "sizeParams.z mismatch");
    numberApproxEqual(u[3], 3.0, 1e-6, "sizeParams.w mismatch");

    numberApproxEqual(u[4], 4.0, 1e-6, "scaleSource.componentCount mismatch");
    numberApproxEqual(u[5], 3.0, 1e-6, "scaleSource.componentIndex mismatch");
    numberApproxEqual(u[7], 4.0, 1e-6, "scaleSource.stride mismatch");

    numberApproxEqual(u[8], -5.0, 1e-6, "scaleDomain.domainMin mismatch");
    numberApproxEqual(u[9], 5.0, 1e-6, "scaleDomain.domainMax mismatch");
    numberApproxEqual(u[11], 1.0, 1e-6, "scaleDomain.clampMode(range) mismatch");

    numberApproxEqual(u[12], -2.0, 1e-6, "scaleClamp.clampMin mismatch");
    numberApproxEqual(u[13], 2.0, 1e-6, "scaleClamp.clampMax mismatch");
    numberApproxEqual(u[16], 2.0, 1e-6, "scaleParams.mode(symlog) mismatch");
    numberApproxEqual(u[18], 0.25, 1e-6, "scaleParams.symlogLinThresh mismatch");
    numberApproxEqual(u[19], 2.0, 1e-6, "scaleParams.gamma mismatch");
    numberApproxEqual(u[20], 1.0, 1e-6, "scaleFlags.invert mismatch");

    numberApproxEqual(u[24], 0.25, 1e-6, "visual.opacity mismatch");
    numberApproxEqual(u[25], 0.6, 1e-6, "visual.softness mismatch");

    assert.ok(("dirtyUniforms" in pc), "PointCloud.dirtyUniforms missing");
    assert.strictEqual(typeof pc.markUniformsClean, "function", "PointCloud.markUniformsClean missing");

    pc.markUniformsClean();
    assert.strictEqual(!!pc.dirtyUniforms, false, "Expected dirtyUniforms to be false after markUniformsClean()");
    pc.setScaleTransform({ ...pc.scaleTransform, domainMin: -6 });
    assert.strictEqual(!!pc.dirtyUniforms, true, "Expected dirtyUniforms to become true after setScaleTransform()");

    pc.destroy?.();
}

// CPU-side helpers: bounds + scale stats application/source descriptor.
{
    const data = new Float32Array([
        1.0, 2.0, 3.0, 0.50,
        4.0, 6.0, 8.0, 0.25,
    ]);

    const pc = new PointCloud({ scaleTransform: baseScaleTransform });
    pc.setData(data);

    assert.strictEqual(typeof pc.computeBoundsFromCPUData, "function", "PointCloud.computeBoundsFromCPUData missing");
    assert.strictEqual(typeof pc.applyScaleStats, "function", "PointCloud.applyScaleStats missing");
    assert.strictEqual(typeof pc.getScaleSourceDescriptor, "function", "PointCloud.getScaleSourceDescriptor missing");

    pc.computeBoundsFromCPUData();
    assert.ok(Array.isArray(pc.boundsCenter) && pc.boundsCenter.length === 3, "boundsCenter should be a vec3 array");
    assert.ok(Number.isFinite(pc.boundsRadius), "boundsRadius should be finite");

    numberApproxEqual(pc.boundsCenter[0], 2.5, 1e-6, "boundsCenter.x mismatch");
    numberApproxEqual(pc.boundsCenter[1], 4.0, 1e-6, "boundsCenter.y mismatch");
    numberApproxEqual(pc.boundsCenter[2], 5.5, 1e-6, "boundsCenter.z mismatch");
    assert.ok(pc.boundsRadius > 0, "Expected boundsRadius > 0");

    pc.applyScaleStats({
        count: 2,
        finiteCount: 2,
        min: 0.25,
        max: 0.50,
        percentileMin: 0.3,
        percentileMax: 0.45,
        histogramBins: 128
    });
    const t = pc.scaleTransform;
    numberApproxEqual(t.domainMin, 0.25, 1e-6, "scaleTransform.domainMin mismatch after applyScaleStats()");
    numberApproxEqual(t.domainMax, 0.50, 1e-6, "scaleTransform.domainMax mismatch after applyScaleStats()");
    numberApproxEqual(t.clampMin, 0.3, 1e-6, "scaleTransform.clampMin mismatch after applyScaleStats()");
    numberApproxEqual(t.clampMax, 0.45, 1e-6, "scaleTransform.clampMax mismatch after applyScaleStats()");

    pc.upload(device, device.queue);
    const source = pc.getScaleSourceDescriptor();
    assert.ok(source, "getScaleSourceDescriptor() should return a descriptor once pointsBuffer exists");
    assert.strictEqual(source.count, 2, "Scale source count mismatch");
    assert.strictEqual(source.componentIndex, 3, "Scale source componentIndex mismatch");

    pc.destroy?.();
}

compute.destroy();
device.destroy();
