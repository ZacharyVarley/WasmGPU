import assert from "assert";
import { initMath, wasm, frameArena, cullf, frustumf } from "../dist/WasmGPU.js";

await initMath(new URL("../dist/", import.meta.url).toString());

const approx = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

const approxArray = (a, b, tol = 1e-6) => {
    assert.strictEqual(a.length, b.length, "Array lengths differ");
    for (let i = 0; i < a.length; i++) {
        assert.ok(approx(a[i], b[i], tol), `Arrays differ at index ${i}: ${a[i]} vs ${b[i]}`);
    }
};

{
    frameArena.reset();

    const vp = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];

    const frustumPtr = frameArena.allocF32(24);
    frustumf.writePlanesFromViewProjection(frustumPtr, vp);
    const planes = wasm.f32view(frustumPtr, 24);

    // Expected planes (nx, ny, nz, d), inward facing, normalized.
    // left:   x >= -1  ->  ( 1, 0, 0, 1)
    // right:  x <=  1  ->  (-1, 0, 0, 1)
    // bottom: y >= -1  ->  ( 0, 1, 0, 1)
    // top:    y <=  1  ->  ( 0,-1, 0, 1)
    // near:   z >=  0  ->  ( 0, 0, 1, 0)
    // far:    z <=  1  ->  ( 0, 0,-1, 1)
    const expectedPlanes = new Float32Array([
        1, 0, 0, 1,
        -1, 0, 0, 1,
        0, 1, 0, 1,
        0, -1, 0, 1,
        0, 0, 1, 0,
        0, 0, -1, 1,
    ]);
    approxArray(Array.from(planes), Array.from(expectedPlanes), 1e-6);

    const count = 6;
    const centersPtr = frameArena.allocF32(count * 3);
    const radiiPtr = frameArena.allocF32(count);
    const centers = wasm.f32view(centersPtr, count * 3);
    const radii = wasm.f32view(radiiPtr, count);

    // 0: inside
    centers.set([0, 0, 0.5], 0);
    radii[0] = 0.1;

    // 1: outside right
    centers.set([2, 0, 0.5], 3);
    radii[1] = 0.1;

    // 2: outside near (z < 0)
    centers.set([0, 0, -0.5], 6);
    radii[2] = 0.1;

    // 3: outside far (z > 1)
    centers.set([0, 0, 1.5], 9);
    radii[3] = 0.1;

    // 4: intersects left plane (still visible)
    centers.set([-1.05, 0, 0.5], 12);
    radii[4] = 0.1;

    // 5: intersects top plane (still visible)
    centers.set([0, 0.95, 0.5], 15);
    radii[5] = 0.1;

    const outPtr = frameArena.alloc(count * 4, 4);
    const visibleCount = cullf.spheresFrustum(outPtr, centersPtr, radiiPtr, count, frustumPtr);
    const out = wasm.u32view(outPtr, visibleCount);

    assert.strictEqual(visibleCount, 3, "Expected 3 visible spheres");
    assert.deepStrictEqual(Array.from(out), [0, 4, 5], "Visible indices mismatch");
}

console.log("Frustum culling tests passed.");
