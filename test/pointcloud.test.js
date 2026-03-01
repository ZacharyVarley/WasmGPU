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

// CPU data path: setData() -> upload() -> pointsBuffer readable by GPU
{
    const data = new Float32Array([
        // point 0: x, y, z, scalar
        1.0, 2.0, 3.0, 0.50,
        // point 1
        4.0, 6.0, 8.0, 0.25,
    ]);

    const pc = new PointCloud();
    assert.strictEqual(typeof pc.setData, "function", "PointCloud.setData missing");
    pc.setData(data);

    assert.strictEqual(pc.pointCount, 2, "PointCloud.pointCount mismatch after setData");

    assert.strictEqual(typeof pc.upload, "function", "PointCloud.upload missing");
    pc.upload(device, device.queue);

    assert.ok(pc.pointsBuffer, "PointCloud.pointsBuffer not created after upload");

    // Copy back via kernels (does not require copySrc on pointsBuffer).
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
        // default copyDst is fine; this is primarily testing STORAGE interop
        copySrc: false
    });

    const pc = new PointCloud();
    assert.strictEqual(typeof pc.setPointsBuffer, "function", "PointCloud.setPointsBuffer missing");
    pc.setPointsBuffer(src.buffer, 2);

    // upload() should be a no-op for points when an external GPU buffer is provided
    pc.upload(device, device.queue);

    assert.strictEqual(pc.pointsBuffer, src.buffer, "PointCloud did not retain the externally provided pointsBuffer");
    assert.strictEqual(pc.pointCount, 2, "PointCloud.pointCount mismatch for external buffer");

    // Copy back via kernels to validate layout (x,y,z,scalar packed as f32s).
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

// Uniform packing sanity: buffer size + ordering of the first few parameters
// The renderer expects minBindingSize: 176, and the shader expects sizeParams/scalarParams/options first
{
    const pc = new PointCloud();

    assert.strictEqual(typeof pc.getUniformBufferSize, "function", "PointCloud.getUniformBufferSize missing");
    assert.strictEqual(typeof pc.getUniformData, "function", "PointCloud.getUniformData missing");

    const byteSize = pc.getUniformBufferSize();
    assert.strictEqual(byteSize, 176, "PointCloud uniform buffer size should be 176 bytes (11 vec4<f32>)");

    // Ensure we can mutate key parameters used by the shader (size attenuation & scalar mapping)
    assert.ok(("basePointSize" in pc), "PointCloud.basePointSize missing");
    assert.ok(("minPointSize" in pc), "PointCloud.minPointSize missing");
    assert.ok(("maxPointSize" in pc), "PointCloud.maxPointSize missing");
    assert.ok(("sizeAttenuation" in pc), "PointCloud.sizeAttenuation missing");
    assert.ok(("scalarMin" in pc), "PointCloud.scalarMin missing");
    assert.ok(("scalarMax" in pc), "PointCloud.scalarMax missing");
    assert.ok(("opacity" in pc), "PointCloud.opacity missing");
    assert.ok(("gamma" in pc), "PointCloud.gamma missing");

    pc.basePointSize = 6.0;
    pc.minPointSize = 2.0;
    pc.maxPointSize = 12.0;
    pc.sizeAttenuation = 3.0;

    pc.scalarMin = -5.0;
    pc.scalarMax = 5.0;
    pc.opacity = 0.25;
    pc.gamma = 2.0;

    const u = pc.getUniformData();
    assert.ok(u instanceof Float32Array, "getUniformData() should return Float32Array");
    assert.strictEqual(u.byteLength, 176, "getUniformData() byteLength mismatch");

    // sizeParams: [base, min, max, attenuation]
    numberApproxEqual(u[0], 6.0, 1e-6, "sizeParams.x mismatch");
    numberApproxEqual(u[1], 2.0, 1e-6, "sizeParams.y mismatch");
    numberApproxEqual(u[2], 12.0, 1e-6, "sizeParams.z mismatch");
    numberApproxEqual(u[3], 3.0, 1e-6, "sizeParams.w mismatch");

    // scalarParams: [min, max, opacity, gamma]
    numberApproxEqual(u[4], -5.0, 1e-6, "scalarParams.x mismatch");
    numberApproxEqual(u[5], 5.0, 1e-6, "scalarParams.y mismatch");
    numberApproxEqual(u[6], 0.25, 1e-6, "scalarParams.z mismatch");
    numberApproxEqual(u[7], 2.0, 1e-6, "scalarParams.w mismatch");

    // Dirty flag behavior should exist because the renderer relies on it.
    assert.ok(("dirtyUniforms" in pc), "PointCloud.dirtyUniforms missing");
    assert.strictEqual(typeof pc.markUniformsClean, "function", "PointCloud.markUniformsClean missing");

    pc.markUniformsClean();
    assert.strictEqual(!!pc.dirtyUniforms, false, "Expected dirtyUniforms to be false after markUniformsClean()");
    pc.basePointSize = 7.0;
    assert.strictEqual(!!pc.dirtyUniforms, true, "Expected dirtyUniforms to become true after parameter mutation");

    pc.destroy?.();
}

// CPU-side analysis helpers (bounds & scalar range) if implemented
{
    const data = new Float32Array([
        1.0, 2.0, 3.0, 0.50,
        4.0, 6.0, 8.0, 0.25,
    ]);

    const pc = new PointCloud();
    pc.setData(data);

    assert.strictEqual(typeof pc.computeBoundsFromCPUData, "function", "PointCloud.computeBoundsFromCPUData missing");
    assert.strictEqual(typeof pc.computeScalarRangeFromCPUData, "function", "PointCloud.computeScalarRangeFromCPUData missing");

    pc.computeBoundsFromCPUData();
    assert.ok(Array.isArray(pc.boundsCenter) && pc.boundsCenter.length === 3, "boundsCenter should be a vec3 array");
    assert.ok(Number.isFinite(pc.boundsRadius), "boundsRadius should be finite");

    // For these two points:
    // min = (1,2,3), max = (4,6,8) -> center = (2.5, 4.0, 5.5)
    numberApproxEqual(pc.boundsCenter[0], 2.5, 1e-6, "boundsCenter.x mismatch");
    numberApproxEqual(pc.boundsCenter[1], 4.0, 1e-6, "boundsCenter.y mismatch");
    numberApproxEqual(pc.boundsCenter[2], 5.5, 1e-6, "boundsCenter.z mismatch");
    assert.ok(pc.boundsRadius > 0, "Expected boundsRadius > 0");

    pc.computeScalarRangeFromCPUData();
    numberApproxEqual(pc.scalarMin, 0.25, 1e-6, "scalarMin mismatch after computeScalarRangeFromCpuData()");
    numberApproxEqual(pc.scalarMax, 0.50, 1e-6, "scalarMax mismatch after computeScalarRangeFromCpuData()");

    pc.destroy?.();
}

compute.destroy();
device.destroy();

console.log("Point cloud tests passed.");
