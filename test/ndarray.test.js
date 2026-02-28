import assert from "assert";
import { initWebAssembly, Compute } from "../dist/WasmGPU.js";
import { create, globals } from "webgpu";

await initWebAssembly(new URL("../dist/", import.meta.url).toString());
Object.assign(globalThis, globals);
const navigator = { gpu: create([]) };
const adapter = await navigator.gpu.requestAdapter();
assert.ok(adapter, "Failed to acquire a WebGPU adapter");
const device = await adapter.requestDevice();
assert.ok(device, "Failed to acquire a WebGPU device");
device.addEventListener("uncapturederror", (e) => { throw new Error(`Uncaptured WebGPU error: ${e.error ? e.error.message : String(e)}`); });
const compute = new Compute(device, device.queue);

// CPU: contiguous row-major
{
    const a = compute.CPUndarray.zeros("f32", { shape: [2, 3] });
    assert.strictEqual(a.residency, "cpu-webassembly");
    assert.strictEqual(a.isContiguousC, true);
    assert.strictEqual(a.numel, 6);

    const v = a.data();
    assert.ok(v instanceof Float32Array, "Expected Float32Array view");
    for (let i = 0; i < v.length; i++) v[i] = i + 1;

    assert.strictEqual(a.get(0, 0), 1);
    assert.strictEqual(a.get(0, 2), 3);
    assert.strictEqual(a.get(1, 0), 4);
    assert.strictEqual(a.get(1, 2), 6);

    a.set(123, 1, 1);
    assert.strictEqual(a.get(1, 1), 123);
}

// CPU: custom stride (interleaved / gapped layout)
{
    // 2x3 f32 where each element is 8 bytes apart (4 bytes padding between elements).
    const a = compute.CPUndarray.zeros("f32", {
        shape: [2, 3],
        stridesBytes: [3 * 8, 8],
        offsetBytes: 0
    });

    assert.strictEqual(a.isContiguousC, false);
    assert.throws(() => a.data(), /contiguous row-major/i);

    a.set(10, 0, 0);
    a.set(11, 0, 1);
    a.set(12, 0, 2);
    a.set(20, 1, 0);
    a.set(21, 1, 1);
    a.set(22, 1, 2);

    assert.strictEqual(a.get(0, 0), 10);
    assert.strictEqual(a.get(0, 1), 11);
    assert.strictEqual(a.get(0, 2), 12);
    assert.strictEqual(a.get(1, 0), 20);
    assert.strictEqual(a.get(1, 1), 21);
    assert.strictEqual(a.get(1, 2), 22);
}

// Contiguous roundtrip
{
    const a = compute.CPUndarray.fromArray("f32", [2, 3], [1, 2, 3, 4, 5, 6]);
    const ga = a.uploadToGPU(compute, { copySrc: true, label: "ndarray_roundtrip_contiguous" });
    assert.strictEqual(ga.residency, "gpu-storagebuffer");

    const b = await ga.readbackToCPU();
    assert.strictEqual(b.residency, "cpu-webassembly");
    assert.strictEqual(b.isContiguousC, true);

    assert.deepStrictEqual(Array.from(b.data()), [1, 2, 3, 4, 5, 6]);
    ga.destroy();
}

// Gapped/interleaved roundtrip
{
    const a = compute.CPUndarray.zeros("f32", {
        shape: [2, 3],
        stridesBytes: [3 * 8, 8],
        offsetBytes: 0
    });

    a.set(10, 0, 0);
    a.set(11, 0, 1);
    a.set(12, 0, 2);
    a.set(20, 1, 0);
    a.set(21, 1, 1);
    a.set(22, 1, 2);

    const ga = a.uploadToGPU(compute, { copySrc: true, label: "ndarray_roundtrip_gapped" });
    const b = await ga.readbackToCPU();

    assert.strictEqual(b.isContiguousC, false);
    assert.strictEqual(b.get(0, 0), 10);
    assert.strictEqual(b.get(0, 1), 11);
    assert.strictEqual(b.get(0, 2), 12);
    assert.strictEqual(b.get(1, 0), 20);
    assert.strictEqual(b.get(1, 1), 21);
    assert.strictEqual(b.get(1, 2), 22);
    ga.destroy();
}

// Readback requires copySrc: true
{
    const a = compute.CPUndarray.fromArray("f32", [1], [42]);
    const ga = a.uploadToGPU(compute, { copySrc: false });

    let threw = false;
    try {
        await ga.readbackToCPU();
    } catch (e) {
        threw = true;
    }
    assert.strictEqual(threw, true, "Expected readbackToCPU() to throw when copySrc is not enabled");
    ga.destroy();
}

compute.destroy();

console.log("Ndarray tests passed.");
