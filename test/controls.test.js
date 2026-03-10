import assert from "assert";
import * as WasmGPU from "../dist/WasmGPU.js";
import { create, globals } from "webgpu";

Object.assign(globalThis, globals);
const navigator = { gpu: create([]) };

const numberApproxEqual = (a, b, tol = 1e-5, msg = "Numbers differ") => {
    assert.ok(Number.isFinite(a) && Number.isFinite(b), "Expected finite numbers");
    assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
};

const arraysApproxEqual = (a, b, tol = 1e-5, msg = "Arrays differ") => {
    assert.strictEqual(a.length, b.length, `${msg}: length ${a.length} vs ${b.length}`);
    for (let i = 0; i < a.length; i++) numberApproxEqual(a[i], b[i], tol, `${msg} at index ${i}`);
};

const makeCanvas = (width = 800, height = 600) => {
    const listeners = new Map();
    return {
        style: {},
        clientWidth: width,
        clientHeight: height,
        addEventListener(type, handler) { listeners.set(type, handler); },
        removeEventListener(type, handler) { if (listeners.get(type) === handler) listeners.delete(type); },
        setPointerCapture() {},
        releasePointerCapture() {},
        getBoundingClientRect() { return { left: 0, top: 0, width, height, right: width, bottom: height }; },
        listeners
    };
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

const { NavigationControls, OrbitControls, TrackballControls, PerspectiveCamera, OrthographicCamera, Geometry, Mesh, PointCloud, GlyphField, Scene, UnlitMaterial, AxisConventions } = WasmGPU;

assert.ok(NavigationControls, "Missing export: NavigationControls");
assert.ok(AxisConventions && AxisConventions.Y_UP_RH, "Missing export: AxisConventions");

{
    const canvas = makeCanvas();
    const camera = new PerspectiveCamera({ fov: 60, aspect: 4 / 3, near: 0.1, far: 200 });
    camera.transform.setPosition(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new OrbitControls(camera, canvas, { target: [0, 0, 0] });
    numberApproxEqual(controls.distance, 10, 1e-5, "Orbit distance mismatch on init");
    numberApproxEqual(controls.azimuthAngle, 0, 1e-5, "Orbit azimuth mismatch on init");
    numberApproxEqual(controls.polarAngle, Math.PI * 0.5, 1e-5, "Orbit polar mismatch on init");

    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls._thetaDelta = Math.PI * 0.5;
    controls.update(1 / 60);
    assert.ok(controls.azimuthAngle > 0 && controls.azimuthAngle < Math.PI * 0.5, "Orbit damping should apply partial azimuth update");
    for (let i = 0; i < 80; i++) controls.update(1 / 60);
    numberApproxEqual(controls.azimuthAngle, Math.PI * 0.5, 1e-2, "Orbit damping should converge toward full rotation");

    controls.setView("right", { animate: false, distance: 6, target: [1, 2, 3] });
    arraysApproxEqual(camera.position, [7, 2, 3], 1e-4, "Orbit named view position mismatch");
    arraysApproxEqual(camera.up, [0, 1, 0], 1e-4, "Orbit right-view up mismatch");
    controls.reset();
    arraysApproxEqual(camera.position, [0, 0, 10], 1e-4, "Orbit reset should restore saved position");

    controls._dollyDelta = Math.log(2);
    controls.enableDamping = false;
    controls.update(1 / 60);
    numberApproxEqual(controls.distance, 20, 1e-4, "Orbit perspective dolly mismatch");
}

{
    const canvas = makeCanvas();
    const camera = new OrthographicCamera({ left: -4, right: 4, top: 4, bottom: -4, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new OrbitControls(camera, canvas, { target: [0, 0, 0] });
    controls.zoom = 2;
    controls.update(1 / 60);
    numberApproxEqual(camera.left, -2, 1e-5, "Orbit orthographic left mismatch after zoom");
    numberApproxEqual(camera.right, 2, 1e-5, "Orbit orthographic right mismatch after zoom");
}

{
    const canvas = makeCanvas();
    const camera = new PerspectiveCamera({ fov: 60, aspect: 4 / 3, near: 0.1, far: 200 });
    camera.transform.setPosition(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new TrackballControls(camera, canvas, { target: [0, 0, 0] });
    numberApproxEqual(controls.distance, 10, 1e-5, "Trackball distance mismatch on init");
    controls._trackballRotationDelta = [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)];
    controls.update(1 / 60);
    assert.ok(Math.abs(camera.position[0]) > 1, "Trackball rotation should move camera off the Z axis");
    arraysApproxEqual(camera.up, [0, 1, 0], 1e-4, "Trackball rotation should preserve up for a Y-axis spin");

    controls.saveState();
    controls._panOffset = [1, -2, 3];
    controls.update(1 / 60);
    arraysApproxEqual(controls.target, [1, -2, 3], 1e-4, "Trackball pan should move target");
    controls.reset();
    arraysApproxEqual(controls.target, [0, 0, 0], 1e-5, "Trackball reset should restore target");
}

{
    const canvas = makeCanvas();
    const camera = new OrthographicCamera({ left: -6, right: 6, top: 3, bottom: -3, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 12);
    camera.lookAt(0, 0, 0);
    const controls = new TrackballControls(camera, canvas, { target: [0, 0, 0] });
    controls.zoom = 3;
    controls.update(1 / 60);
    numberApproxEqual(camera.left, -2, 1e-5, "Trackball orthographic zoom left mismatch");
    numberApproxEqual(camera.right, 2, 1e-5, "Trackball orthographic zoom right mismatch");
}

{
    const canvas = makeCanvas();
    const camera = new PerspectiveCamera({ fov: 60, aspect: 4 / 3, near: 0.1, far: 200 });
    camera.transform.setPosition(0, 0, 8);
    camera.lookAt(0, 0, 0);
    const controls = new NavigationControls(camera, canvas, { target: [0, 0, 0], mode: "orbit" });
    controls.setView("front", { animate: false, distance: 4 });
    arraysApproxEqual(camera.position, [0, 0, 4], 1e-4, "Front view position mismatch");
    arraysApproxEqual(camera.up, [0, 1, 0], 1e-4, "Front view up mismatch");
    controls.setView("back", { animate: false, distance: 4 });
    arraysApproxEqual(camera.position, [0, 0, -4], 1e-4, "Back view position mismatch");
    controls.setView("left", { animate: false, distance: 4 });
    arraysApproxEqual(camera.position, [-4, 0, 0], 1e-4, "Left view position mismatch");
    controls.setView("right", { animate: false, distance: 4 });
    arraysApproxEqual(camera.position, [4, 0, 0], 1e-4, "Right view position mismatch");
    controls.setView("top", { animate: false, distance: 4 });
    arraysApproxEqual(camera.position, [0, 4, 0], 1e-4, "Top view position mismatch");
    arraysApproxEqual(camera.up, [0, 0, -1], 1e-4, "Top view up mismatch");
    controls.setView("bottom", { animate: false, distance: 4 });
    arraysApproxEqual(camera.position, [0, -4, 0], 1e-4, "Bottom view position mismatch");
    arraysApproxEqual(camera.up, [0, 0, 1], 1e-4, "Bottom view up mismatch");

    const positionBefore = Array.from(camera.position);
    controls.target = [1, 2, 3];
    controls.setMode("trackball");
    arraysApproxEqual(controls.target, [1, 2, 3], 1e-5, "Mode switch should preserve target");
    arraysApproxEqual(camera.position, positionBefore, 1e-5, "Mode switch should preserve camera pose");
    controls.setView("front", { animate: true, duration: 0.25 });
    assert.strictEqual(controls.hasActiveTransition, true, "Animated setView should start a transition");
    controls.cancelTransition();
    assert.strictEqual(controls.hasActiveTransition, false, "cancelTransition should clear active transition state");

    camera.transform.setPosition(5, 5, 5);
    camera.lookAtWithUp([1, 2, 3], [0, 1, 0]);
    controls.syncFromCamera();
    numberApproxEqual(controls.distance, Math.sqrt(29), 1e-4, "syncFromCamera should refresh distance from external camera edits");
}

{
    const scene = new Scene();
    const mesh = new Mesh(Geometry.box(2, 4, 6), new UnlitMaterial());
    mesh.transform.setPosition(-4, 0, 0);
    const pointCloud = new PointCloud({
        data: new Float32Array([2, -1, 1, 0.2, 5, 1, 2, 0.8]),
        keepCPUData: true
    });
    const glyphField = new GlyphField({
        geometry: Geometry.box(1, 1, 1),
        instanceCount: 1,
        positions: new Float32Array([0, 5, 0, 0]),
        rotations: new Float32Array([0, 0, 0, 1]),
        scales: new Float32Array([1, 2, 1, 0]),
        attributes: new Float32Array([0, 0, 0, 0]),
        keepCPUData: true
    });
    scene.add(mesh).add(pointCloud).add(glyphField);
    const bounds = scene.getBounds();
    assert.strictEqual(bounds.empty, false, "Mixed-scene bounds should not be empty");
    assert.ok(bounds.boxMin[0] <= -5, "Mesh bounds should contribute to scene min X");
    assert.ok(bounds.boxMax[0] >= 5, "Point-cloud bounds should contribute to scene max X");
    assert.ok(bounds.boxMax[1] >= 5.5, "Glyph-field bounds should contribute to scene max Y");

    const canvas = makeCanvas(1200, 400);
    const perspective = new PerspectiveCamera({ fov: 55, aspect: 3, near: 0.1, far: 500 });
    perspective.transform.setPosition(0, 0, 20);
    perspective.lookAt(0, 0, 0);
    const controls = new NavigationControls(perspective, canvas, { target: [0, 0, 0], mode: "orbit" });
    controls.fitScene(scene, { animate: false, padding: 1.2 });
    assert.ok(perspective.near > 0, "Perspective fit should keep near > 0");
    assert.ok(perspective.far > perspective.near, "Perspective fit should widen depth range");
    assert.ok(controls.distance > bounds.sphereRadius, "Perspective fit should place camera outside the scene sphere");

    const orthographic = new OrthographicCamera({ left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 10 });
    orthographic.transform.copyFrom(perspective.transform);
    const orthoControls = new NavigationControls(orthographic, canvas, { target: Array.from(controls.target), mode: "orbit" });
    orthoControls.fitScene(scene, { animate: false, padding: 1.1, view: "front" });
    assert.ok((orthographic.right - orthographic.left) >= (orthographic.top - orthographic.bottom), "Orthographic fit should respect wide aspect framing");
    assert.ok(orthographic.far > orthographic.near, "Orthographic fit should stabilize depth range");
}

{
    const explicit = new PointCloud({ pointCount: 4, boundsMin: [-1, -2, -3], boundsMax: [4, 5, 6] });
    const explicitBounds = explicit.getBounds();
    arraysApproxEqual(explicitBounds.boxMin, [-1, -2, -3], 1e-6, "Explicit point-cloud bounds min mismatch");
    arraysApproxEqual(explicitBounds.boxMax, [4, 5, 6], 1e-6, "Explicit point-cloud bounds max mismatch");

    const scene = new Scene();
    scene.add(explicit);
    scene.add(new PointCloud({ pointCount: 8 }));
    const bounds = scene.getBounds();
    assert.strictEqual(bounds.empty, false, "Partial scene with one bounded contributor should still have finite bounds");
    assert.strictEqual(bounds.partial, true, "Scene bounds should report partial when visible contributors lack bounds");

    const canvas = makeCanvas();
    const camera = new PerspectiveCamera({ fov: 60, aspect: 4 / 3, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new NavigationControls(camera, canvas, { target: [0, 0, 0], mode: "orbit" });
    controls.fitScene(scene, { animate: false });
    assert.ok(Number.isFinite(controls.distance), "Fit on a partial scene should still produce a finite camera distance from bounded contributors");
}

device.destroy();
