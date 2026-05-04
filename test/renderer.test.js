/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "assert";
import { create, globals } from "webgpu";
import { initWebAssembly, Renderer, Scene, PerspectiveCamera, Geometry, Mesh, UnlitMaterial, StandardMaterial, CustomMaterial, DataMaterial, BlendMode, CullMode } from "../dist/WasmGPU.js";

Object.assign(globalThis, globals);

const baseGpu = create([]);
const originalRequestAdapter = baseGpu.requestAdapter.bind(baseGpu);
const capturedAdapterOptions = [];
const capturedDeviceDescriptors = [];
const wrappedGpu = { requestAdapter: async (options) => { capturedAdapterOptions.push(options); const adapter = await originalRequestAdapter(options); assert.ok(adapter, "Failed to acquire a WebGPU adapter"); return { features: adapter.features, limits: adapter.limits, requestDevice: async (descriptor = {}) => { capturedDeviceDescriptors.push(descriptor); return await adapter.requestDevice(descriptor); } }; } };
if (typeof baseGpu.getPreferredCanvasFormat === "function") wrappedGpu.getPreferredCanvasFormat = baseGpu.getPreferredCanvasFormat.bind(baseGpu);
Object.defineProperty(globalThis, "navigator", { value: { gpu: wrappedGpu }, configurable: true });
if (!globalThis.window) globalThis.window = {};
globalThis.window.devicePixelRatio = 1;

const approxEqual = (actual, expected, tol = 1e-6, msg = "Numbers differ") => {
    assert.ok(Number.isFinite(actual) && Number.isFinite(expected), `${msg}: expected finite numbers`);
    assert.ok(Math.abs(actual - expected) <= tol, `${msg}: ${actual} vs ${expected}`);
};

const makeCanvas = (width = 640, height = 480) => {
    const canvas = {
        width,
        height,
        clientWidth: width,
        clientHeight: height,
        style: {},
        configureCalls: [],
        currentTextureCount: 0,
        addEventListener() {},
        removeEventListener() {},
        getBoundingClientRect() {
            return {
                left: 0,
                top: 0,
                width: this.clientWidth,
                height: this.clientHeight,
                right: this.clientWidth,
                bottom: this.clientHeight
            };
        }
    };
    let device = null;
    let format = "rgba8unorm";
    let usage = GPUTextureUsage.RENDER_ATTACHMENT;
    const context = {
        configure(descriptor) {
            device = descriptor.device;
            format = descriptor.format ?? format;
            usage = descriptor.usage ?? usage;
            canvas.configureCalls.push(descriptor);
        },
        unconfigure() {
            device = null;
        },
        getCurrentTexture() {
            assert.ok(device, "GPUCanvasContext.configure() must be called before getCurrentTexture().");
            canvas.currentTextureCount++;
            return device.createTexture({
                size: {
                    width: Math.max(1, canvas.width | 0),
                    height: Math.max(1, canvas.height | 0),
                    depthOrArrayLayers: 1
                },
                format,
                usage: usage | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            });
        }
    };
    canvas.getContext = (kind) => kind === "webgpu" ? context : null;
    return canvas;
};

const createCamera = (aspect = 1) => {
    const camera = new PerspectiveCamera({ fov: 60, aspect, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 5);
    return camera;
};

await initWebAssembly(new URL("../dist/", import.meta.url).toString());

// 1) Renderer creation configures WebGPU, canvas sizing, device limits, and GPU handles.
{
    const canvas = makeCanvas(320, 160);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: false,
        canvasFormat: "rgba8unorm",
        powerPreference: "low-power",
        maxUniformBufferBindingSize: 16384
    });

    assert.equal(renderer.canvas, canvas);
    assert.equal(renderer.gpu.format, "rgba8unorm");
    assert.ok(renderer.gpu.device);
    assert.ok(renderer.gpu.queue);
    assert.equal(canvas.configureCalls.length, 1);
    assert.equal(canvas.width, 320);
    assert.equal(canvas.height, 160);
    approxEqual(renderer.aspectRatio, 2);
    assert.equal(capturedAdapterOptions.at(-1).powerPreference, "low-power");
    assert.equal(capturedDeviceDescriptors.at(-1).requiredLimits.maxUniformBufferBindingSize, 16384);
    assert.ok(!Object.prototype.hasOwnProperty.call(capturedDeviceDescriptors.at(-1).requiredLimits, "maxSampledTexturesPerShaderStage"));
    assert.ok(!Object.prototype.hasOwnProperty.call(capturedDeviceDescriptors.at(-1).requiredLimits, "maxSamplersPerShaderStage"));

    canvas.clientWidth = 200;
    canvas.clientHeight = 50;
    renderer.resize();
    assert.equal(canvas.width, 200);
    assert.equal(canvas.height, 50);
    approxEqual(renderer.aspectRatio, 4);
    renderer.enableGpuTiming(true);
    assert.equal(typeof renderer.isGpuTimingSupported, "boolean");
    assert.equal(renderer.gpuTimeNs === null || Number.isFinite(renderer.gpuTimeNs), true);
    renderer.enableGpuTiming(false);
    renderer.destroy();
}

// 2) Render submits core mesh/material paths and updates GPU-side material state.
{
    const canvas = makeCanvas(256, 256);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: false,
        canvasFormat: "rgba8unorm"
    });
    const scene = new Scene({ background: [0.02, 0.03, 0.04] });
    const camera = createCamera();
    const unlit = new UnlitMaterial({ color: [0.8, 0.2, 0.1] });
    const standard = new StandardMaterial({
        color: [0.2, 0.6, 0.9],
        opacity: 0.6,
        metallic: 0.1,
        roughness: 0.7,
        blendMode: BlendMode.Transparent,
        cullMode: CullMode.None
    });
    const custom = new CustomMaterial({
        fragmentShader: `
            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4f {
                return vec4f(custom.gain, in.uv.x, in.uv.y, 1.0);
            }
        `,
        uniforms: { gain: { type: "f32", value: 0.5 } }
    });
    const data = new DataMaterial({
        data: new Float32Array([0, 0.5, 1]),
        scaleTransform: {
            componentCount: 1,
            componentIndex: 0,
            stride: 1,
            offset: 0,
            mode: "linear",
            clampMode: "range",
            domainMin: 0,
            domainMax: 1,
            clampMin: 0,
            clampMax: 1
        }
    });

    const meshA = new Mesh(Geometry.box(), unlit);
    const meshB = new Mesh(Geometry.triangle(), standard);
    const meshC = new Mesh(Geometry.triangle(), custom);
    const meshD = new Mesh(Geometry.triangle(), data);
    meshA.transform.setPosition(-1.5, 0, 0);
    meshB.transform.setPosition(1.5, 0, 0);
    meshC.transform.setPosition(0, 1.25, 0);
    meshD.transform.setPosition(0, -1.25, 0);
    scene.add(meshA).add(meshB).add(meshC).add(meshD);

    assert.doesNotThrow(() => renderer.render(scene, camera));
    assert.equal(canvas.currentTextureCount, 1);
    approxEqual(camera.aspect, 1);
    assert.ok(unlit.uniformBuffer);
    assert.ok(standard.uniformBuffer);
    assert.ok(custom.uniformBuffer);
    assert.ok(data.uniformBuffer);
    assert.ok(data.dataBuffer);
    assert.equal(unlit.dirty, false);
    assert.equal(standard.dirty, false);
    assert.equal(custom.dirty, false);
    assert.equal(data.dirty, false);
    assert.ok(meshA.geometry.positionBuffer);
    assert.ok(meshB.geometry.indexBuffer);

    scene.destroy();
    renderer.destroy();
}

// 3) Frustum culling and visibility stats track renderable mesh candidates.
{
    const canvas = makeCanvas(192, 192);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: true,
        frustumCullingStats: true,
        canvasFormat: "rgba8unorm"
    });
    const scene = new Scene();
    const camera = createCamera();
    const geometry = Geometry.box();
    const material = new UnlitMaterial();
    const near = new Mesh(geometry.retain(), material.retain());
    const far = new Mesh(geometry, material);
    far.transform.setPosition(10000, 0, 0);
    scene.add(near).add(far);

    renderer.render(scene, camera);
    assert.equal(renderer.cullingStats.tested, 2);
    assert.equal(renderer.cullingStats.visible, 1);
    far.visible = false;
    renderer.render(scene, camera);
    assert.equal(renderer.cullingStats.tested, 1);
    assert.equal(renderer.cullingStats.visible, 1);

    scene.destroy();
    renderer.destroy();
}

// 4) Picking APIs return stable empty and region result shapes.
{
    const canvas = makeCanvas(128, 128);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: false,
        canvasFormat: "rgba8unorm"
    });
    const scene = new Scene();
    const camera = createCamera();

    assert.equal(await renderer.pick(scene, camera, 64, 64), null);
    const emptyRect = await renderer.pickRect(scene, camera, 0, 0, 16, 16, { maxHits: 4 });
    assert.equal(emptyRect.mode, "rect");
    assert.deepEqual(emptyRect.hits, []);
    assert.equal(emptyRect.truncated, false);
    assert.deepEqual(emptyRect.bounds, { x: 0, y: 0, width: 16, height: 16 });
    assert.equal(emptyRect.sampledPixels, 256);

    const emptyLasso = await renderer.pickLasso(scene, camera, [
        { x: 0, y: 0 },
        { x: 32, y: 0 },
        { x: 16, y: 32 }
    ], { maxHits: 2 });
    assert.equal(emptyLasso.mode, "lasso");
    assert.deepEqual(emptyLasso.hits, []);
    assert.equal(emptyLasso.truncated, false);
    assert.deepEqual(emptyLasso.bounds, { x: 0, y: 0, width: 32, height: 32 });
    assert.ok(emptyLasso.sampledPixels > 0);

    scene.destroy();
    renderer.destroy();
}

// 5) SMAA render path and destroyed scene objects clean up without poisoning later frames.
{
    const canvas = makeCanvas(160, 120);
    const renderer = await Renderer.create(canvas, {
        antialias: true,
        frustumCulling: false,
        canvasFormat: "rgba8unorm"
    });
    const scene = new Scene();
    const camera = createCamera();
    const mesh = new Mesh(Geometry.box(), new UnlitMaterial());
    scene.add(mesh);
    assert.equal(scene.meshes.length, 1);
    mesh.destroy();
    assert.equal(scene.meshes.length, 0);
    assert.doesNotThrow(() => renderer.render(scene, camera));
    assert.equal(canvas.currentTextureCount, 1);

    renderer.destroy();
}
