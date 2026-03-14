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
const { GlyphField, Compute, wasm } = WasmGPU;
assert.ok(GlyphField, "Missing export: GlyphField");
assert.ok(Compute, "Missing export: Compute");
assert.ok(wasm, "Missing export: wasm");
const compute = new Compute(device, device.queue);
assert.ok(compute.kernels && typeof compute.kernels.copyF32 === "function", "Missing kernel: compute.kernels.copyF32");

const baseScaleTransform = { componentCount: 4, componentIndex: 0, stride: 4, offset: 0 };

// CPU data path: setCPUData() -> upload() -> SoA buffers readable by GPU
{
    const instanceCount = 2;

    const positions = new Float32Array([
        1.0, 2.0, 3.0, 0.0,
        4.0, 5.0, 6.0, 0.0
    ]);

    const rotations = new Float32Array([
        0.0, 0.0, 0.0, 1.0,
        0.0, 0.0, 0.70710677, 0.70710677
    ]);

    const scales = new Float32Array([
        1.0, 1.0, 1.0, 0.0,
        2.0, 1.0, 0.5, 0.0
    ]);

    const attributes = new Float32Array([
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 0.5
    ]);

    const gf = new GlyphField({ scaleTransform: baseScaleTransform });
    assert.strictEqual(typeof gf.setCPUData, "function", "GlyphField.setCPUData missing");
    gf.setCPUData(positions, rotations, scales, attributes, { instanceCount });

    assert.strictEqual(gf.instanceCount, instanceCount, "GlyphField.instanceCount mismatch after setCPUData");

    assert.strictEqual(typeof gf.upload, "function", "GlyphField.upload missing");
    gf.upload(device, device.queue);

    assert.ok(gf.positionsBuffer, "GlyphField.positionsBuffer not created after upload");
    assert.ok(gf.rotationsBuffer, "GlyphField.rotationsBuffer not created after upload");
    assert.ok(gf.scalesBuffer, "GlyphField.scalesBuffer not created after upload");
    assert.ok(gf.attributesBuffer, "GlyphField.attributesBuffer not created after upload");

    const outPos = compute.createStorageBuffer({ label: "glyphfield:cpu:positions:out", byteLength: positions.byteLength, copySrc: true });
    const outRot = compute.createStorageBuffer({ label: "glyphfield:cpu:rotations:out", byteLength: rotations.byteLength, copySrc: true });
    const outScl = compute.createStorageBuffer({ label: "glyphfield:cpu:scales:out", byteLength: scales.byteLength, copySrc: true });
    const outAttr = compute.createStorageBuffer({ label: "glyphfield:cpu:attributes:out", byteLength: attributes.byteLength, copySrc: true });

    compute.kernels.copyF32(gf.positionsBuffer, { out: outPos, count: positions.length });
    compute.kernels.copyF32(gf.rotationsBuffer, { out: outRot, count: rotations.length });
    compute.kernels.copyF32(gf.scalesBuffer, { out: outScl, count: scales.length });
    compute.kernels.copyF32(gf.attributesBuffer, { out: outAttr, count: attributes.length });

    await device.queue.onSubmittedWorkDone();

    arraysApproxEqual(await outPos.readAs(Float32Array), positions, 0, "CPU-uploaded positionsBuffer contents mismatch");
    arraysApproxEqual(await outRot.readAs(Float32Array), rotations, 0, "CPU-uploaded rotationsBuffer contents mismatch");
    arraysApproxEqual(await outScl.readAs(Float32Array), scales, 0, "CPU-uploaded scalesBuffer contents mismatch");
    arraysApproxEqual(await outAttr.readAs(Float32Array), attributes, 0, "CPU-uploaded attributesBuffer contents mismatch");

    outPos.destroy();
    outRot.destroy();
    outScl.destroy();
    outAttr.destroy();
    gf.destroy?.();
}

// External storage buffer path: setBuffers() should use caller-provided GPU buffers (compute interop)
{
    const instanceCount = 2;

    const positions = new Float32Array([-1.0, -2.0, -3.0, 0.0, 9.0, 8.0, 7.0, 0.0]);
    const rotations = new Float32Array([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]);
    const scales = new Float32Array([1.0, 2.0, 3.0, 0.0, 0.25, 0.5, 1.0, 0.0]);
    const attributes = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.9, 0.8, 0.7, 0.6]);

    const srcPos = compute.createStorageBuffer({ label: "glyphfield:external:positions:src", data: positions, copySrc: false });
    const srcRot = compute.createStorageBuffer({ label: "glyphfield:external:rotations:src", data: rotations, copySrc: false });
    const srcScl = compute.createStorageBuffer({ label: "glyphfield:external:scales:src", data: scales, copySrc: false });
    const srcAttr = compute.createStorageBuffer({ label: "glyphfield:external:attributes:src", data: attributes, copySrc: false });

    const gf = new GlyphField({ scaleTransform: baseScaleTransform });
    assert.strictEqual(typeof gf.setBuffers, "function", "GlyphField.setBuffers missing");
    gf.setBuffers(srcPos.buffer, srcRot.buffer, srcScl.buffer, srcAttr.buffer, instanceCount);

    gf.upload(device, device.queue);

    assert.strictEqual(gf.positionsBuffer, srcPos.buffer, "GlyphField did not retain the externally provided positionsBuffer");
    assert.strictEqual(gf.rotationsBuffer, srcRot.buffer, "GlyphField did not retain the externally provided rotationsBuffer");
    assert.strictEqual(gf.scalesBuffer, srcScl.buffer, "GlyphField did not retain the externally provided scalesBuffer");
    assert.strictEqual(gf.attributesBuffer, srcAttr.buffer, "GlyphField did not retain the externally provided attributesBuffer");
    assert.strictEqual(gf.instanceCount, instanceCount, "GlyphField.instanceCount mismatch for external buffers");

    const outPos = compute.createStorageBuffer({ label: "glyphfield:external:positions:out", byteLength: positions.byteLength, copySrc: true });
    const outRot = compute.createStorageBuffer({ label: "glyphfield:external:rotations:out", byteLength: rotations.byteLength, copySrc: true });
    const outScl = compute.createStorageBuffer({ label: "glyphfield:external:scales:out", byteLength: scales.byteLength, copySrc: true });
    const outAttr = compute.createStorageBuffer({ label: "glyphfield:external:attributes:out", byteLength: attributes.byteLength, copySrc: true });

    compute.kernels.copyF32(gf.positionsBuffer, { out: outPos, count: positions.length });
    compute.kernels.copyF32(gf.rotationsBuffer, { out: outRot, count: rotations.length });
    compute.kernels.copyF32(gf.scalesBuffer, { out: outScl, count: scales.length });
    compute.kernels.copyF32(gf.attributesBuffer, { out: outAttr, count: attributes.length });

    await device.queue.onSubmittedWorkDone();

    arraysApproxEqual(await outPos.readAs(Float32Array), positions, 0, "External positionsBuffer contents mismatch");
    arraysApproxEqual(await outRot.readAs(Float32Array), rotations, 0, "External rotationsBuffer contents mismatch");
    arraysApproxEqual(await outScl.readAs(Float32Array), scales, 0, "External scalesBuffer contents mismatch");
    arraysApproxEqual(await outAttr.readAs(Float32Array), attributes, 0, "External attributesBuffer contents mismatch");

    outPos.destroy();
    outRot.destroy();
    outScl.destroy();
    outAttr.destroy();
    srcPos.destroy();
    srcRot.destroy();
    srcScl.destroy();
    srcAttr.destroy();
    gf.destroy?.();
}

// WebAssembly-staged SoA path: setWasmSoA() -> upload() reads from WebAssembly memory into GPU buffers
{
    const instanceCount = 2;
    const len4 = instanceCount * 4;

    const positions = new Float32Array([10.0, 20.0, 30.0, 0.0, 40.0, 50.0, 60.0, 0.0]);
    const rotations = new Float32Array([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.70710677, 0.70710677]);
    const scales = new Float32Array([1.0, 1.0, 1.0, 0.0, 3.0, 2.0, 1.0, 0.0]);
    const attributes = new Float32Array([0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.75]);

    const posPtr = wasm.allocF32(len4);
    const rotPtr = wasm.allocF32(len4);
    const sclPtr = wasm.allocF32(len4);
    const attrPtr = wasm.allocF32(len4);

    try {
        wasm.f32view(posPtr, len4).set(positions);
        wasm.f32view(rotPtr, len4).set(rotations);
        wasm.f32view(sclPtr, len4).set(scales);
        wasm.f32view(attrPtr, len4).set(attributes);

        const gf = new GlyphField({ scaleTransform: baseScaleTransform });
        assert.strictEqual(typeof gf.setWasmSoA, "function", "GlyphField.setWasmSoA missing");
        gf.setWasmSoA(posPtr, rotPtr, sclPtr, attrPtr, instanceCount);

        gf.upload(device, device.queue);

        assert.ok(gf.positionsBuffer, "GlyphField.positionsBuffer not created after wasm upload");
        assert.ok(gf.rotationsBuffer, "GlyphField.rotationsBuffer not created after wasm upload");
        assert.ok(gf.scalesBuffer, "GlyphField.scalesBuffer not created after wasm upload");
        assert.ok(gf.attributesBuffer, "GlyphField.attributesBuffer not created after wasm upload");

        const outPos = compute.createStorageBuffer({ label: "glyphfield:wasm:positions:out", byteLength: positions.byteLength, copySrc: true });
        const outRot = compute.createStorageBuffer({ label: "glyphfield:wasm:rotations:out", byteLength: rotations.byteLength, copySrc: true });
        const outScl = compute.createStorageBuffer({ label: "glyphfield:wasm:scales:out", byteLength: scales.byteLength, copySrc: true });
        const outAttr = compute.createStorageBuffer({ label: "glyphfield:wasm:attributes:out", byteLength: attributes.byteLength, copySrc: true });

        compute.kernels.copyF32(gf.positionsBuffer, { out: outPos, count: positions.length });
        compute.kernels.copyF32(gf.rotationsBuffer, { out: outRot, count: rotations.length });
        compute.kernels.copyF32(gf.scalesBuffer, { out: outScl, count: scales.length });
        compute.kernels.copyF32(gf.attributesBuffer, { out: outAttr, count: attributes.length });

        await device.queue.onSubmittedWorkDone();

        arraysApproxEqual(await outPos.readAs(Float32Array), positions, 0, "WebAssembly-uploaded positionsBuffer contents mismatch");
        arraysApproxEqual(await outRot.readAs(Float32Array), rotations, 0, "WebAssembly-uploaded rotationsBuffer contents mismatch");
        arraysApproxEqual(await outScl.readAs(Float32Array), scales, 0, "WebAssembly-uploaded scalesBuffer contents mismatch");
        arraysApproxEqual(await outAttr.readAs(Float32Array), attributes, 0, "WebAssembly-uploaded attributesBuffer contents mismatch");

        outPos.destroy();
        outRot.destroy();
        outScl.destroy();
        outAttr.destroy();
        gf.destroy?.();
    } finally {
        wasm.freeF32(posPtr, len4);
        wasm.freeF32(rotPtr, len4);
        wasm.freeF32(sclPtr, len4);
        wasm.freeF32(attrPtr, len4);
    }
}

// Uniform packing sanity: unified ScaleTransform + visual/solid params.
{
    const gf = new GlyphField({ scaleTransform: baseScaleTransform });

    assert.strictEqual(typeof gf.getUniformBufferSize, "function", "GlyphField.getUniformBufferSize missing");
    assert.strictEqual(typeof gf.getUniformData, "function", "GlyphField.getUniformData missing");

    const byteSize = gf.getUniformBufferSize();
    assert.strictEqual(byteSize, 240, "GlyphField uniform buffer size should be 240 bytes (15 vec4<f32>)");

    assert.ok(("opacity" in gf), "GlyphField.opacity missing");
    assert.ok(("colormap" in gf), "GlyphField.colormap missing");
    assert.ok(("colorMode" in gf), "GlyphField.colorMode missing");
    assert.ok(("lit" in gf), "GlyphField.lit missing");
    assert.ok(("solidColor" in gf), "GlyphField.solidColor missing");
    assert.ok(("scaleTransform" in gf), "GlyphField.scaleTransform missing");
    assert.strictEqual(typeof gf.setScaleTransform, "function", "GlyphField.setScaleTransform missing");

    assert.strictEqual(gf.lit, false, "GlyphField.lit should default to false so glyph colors remain visible without scene lights");

    gf.opacity = 0.25;
    gf.colormap = "plasma";
    gf.colorMode = "scalar";
    gf.lit = false;
    gf.solidColor = [0.1, 0.2, 0.3, 0.4];
    gf.setScaleTransform({
        componentCount: 4,
        componentIndex: 0,
        valueMode: "component",
        stride: 4,
        offset: 0,
        mode: "log",
        clampMode: "range",
        domainMin: 0.1,
        domainMax: 10,
        clampMin: 0.2,
        clampMax: 8,
        percentileLow: 5,
        percentileHigh: 95,
        logBase: 10,
        gamma: 2,
        invert: true
    });

    const u = gf.getUniformData();
    assert.ok(u instanceof Float32Array, "getUniformData() should return Float32Array");
    assert.strictEqual(u.byteLength, 240, "getUniformData() byteLength mismatch");

    numberApproxEqual(u[0], 4.0, 1e-6, "scaleSource.componentCount mismatch");
    numberApproxEqual(u[1], 0.0, 1e-6, "scaleSource.componentIndex mismatch");
    numberApproxEqual(u[3], 4.0, 1e-6, "scaleSource.stride mismatch");

    numberApproxEqual(u[4], 0.1, 1e-6, "scaleDomain.domainMin mismatch");
    numberApproxEqual(u[5], 10.0, 1e-6, "scaleDomain.domainMax mismatch");
    numberApproxEqual(u[7], 1.0, 1e-6, "scaleDomain.clampMode(range) mismatch");

    numberApproxEqual(u[8], 0.2, 1e-6, "scaleClamp.clampMin mismatch");
    numberApproxEqual(u[9], 8.0, 1e-6, "scaleClamp.clampMax mismatch");
    numberApproxEqual(u[12], 1.0, 1e-6, "scaleParams.mode(log) mismatch");
    numberApproxEqual(u[13], 10.0, 1e-6, "scaleParams.logBase mismatch");
    numberApproxEqual(u[15], 2.0, 1e-6, "scaleParams.gamma mismatch");
    numberApproxEqual(u[16], 1.0, 1e-6, "scaleFlags.invert mismatch");

    numberApproxEqual(u[20], 0.25, 1e-6, "visual.opacity mismatch");
    numberApproxEqual(u[22], 1.0, 1e-6, "visual.colorModeId(scalar) mismatch");
    numberApproxEqual(u[23], 0.0, 1e-6, "visual.lit flag mismatch");

    numberApproxEqual(u[24], 0.1, 1e-6, "solidColor.r mismatch");
    numberApproxEqual(u[25], 0.2, 1e-6, "solidColor.g mismatch");
    numberApproxEqual(u[26], 0.3, 1e-6, "solidColor.b mismatch");
    numberApproxEqual(u[27], 0.4, 1e-6, "solidColor.a mismatch");

    assert.ok(("dirtyUniforms" in gf), "GlyphField.dirtyUniforms missing");
    assert.strictEqual(typeof gf.markUniformsClean, "function", "GlyphField.markUniformsClean missing");

    gf.markUniformsClean();
    assert.strictEqual(!!gf.dirtyUniforms, false, "Expected dirtyUniforms to be false after markUniformsClean()");
    gf.setScaleTransform({ ...gf.scaleTransform, domainMin: 0.2 });
    assert.strictEqual(!!gf.dirtyUniforms, true, "Expected dirtyUniforms to become true after setScaleTransform()");

    gf.destroy?.();
}

compute.destroy();
device.destroy();
