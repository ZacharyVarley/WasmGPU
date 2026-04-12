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
Object.defineProperty(globalThis, "navigator", { value: navigator, configurable: true });
if (!globalThis.window) globalThis.window = {};
if (typeof globalThis.window.devicePixelRatio !== "number") globalThis.window.devicePixelRatio = 1;

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

const { NodeLink, Compute, Scene, WasmGPU: Engine } = WasmGPU;
assert.ok(NodeLink, "Missing export: NodeLink");
assert.ok(Compute, "Missing export: Compute");
assert.ok(Scene, "Missing export: Scene");
assert.ok(Engine, "Missing export: WasmGPU");
assert.strictEqual(typeof Engine.prototype.createNodeLink, "function", "Missing API: WasmGPU.createNodeLink(descriptor)");

const compute = new Compute(device, device.queue);
assert.ok(compute.kernels && typeof compute.kernels.copyF32 === "function", "Missing kernel: copyF32");
assert.ok(typeof compute.kernels.copyU32 === "function", "Missing kernel: copyU32");

// Constructor / descriptor validation and mode enums.
{
    assert.throws(() => new NodeLink({ nodeGeometryMode: "foo" }), /nodeGeometryMode/, "Expected invalid nodeGeometryMode to throw");
    assert.throws(() => new NodeLink({ edgeGeometryMode: "foo" }), /edgeGeometryMode/, "Expected invalid edgeGeometryMode to throw");
    assert.throws(() => new NodeLink({ nodeColorMode: "foo" }), /nodeColorMode/, "Expected invalid nodeColorMode to throw");
    assert.throws(() => new NodeLink({ edgeColorMode: "foo" }), /edgeColorMode/, "Expected invalid edgeColorMode to throw");
    const extPos = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const extEdges = device.createBuffer({ size: 8, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    try {
        assert.throws(() => new NodeLink({ nodePositionsBuffer: extPos }), /nodeCount is required/, "Expected nodeCount requirement for nodePositionsBuffer");
        assert.throws(() => new NodeLink({ edgesBuffer: extEdges }), /edgeCount is required/, "Expected edgeCount requirement for edgesBuffer");
    } finally {
        extPos.destroy();
        extEdges.destroy();
    }
    assert.throws(
        () => new NodeLink({ nodePositions: new Float32Array([0, 0, 0]), edges: new Uint32Array([0, 2]) }),
        /out of range/,
        "Expected out-of-range edge index validation"
    );
    assert.throws(
        () => new NodeLink({ nodePositions: new Float32Array([0, 0, 0, 1, 1, 1]), edges: [0, 1] }),
        /Uint16Array|Uint32Array/,
        "Expected typed-array validation for edges"
    );
}

// CPU upload path: positions/edges/scalars/colors upload and keep packed layouts.
{
    const nodePositions = new Float32Array([
        0.0, 0.0, 0.0,
        1.0, 2.0, 3.0,
        -2.0, 1.0, 0.5
    ]);
    const edges = new Uint16Array([0, 1, 1, 2]);
    const nodeScalars = new Float32Array([0.10, 0.20, 0.30]);
    const edgeScalars = new Float32Array([0.45, 0.65]);
    const nodeColors = new Float32Array([
        1, 0, 0, 1,
        0, 1, 0, 1,
        0, 0, 1, 1
    ]);
    const edgeColors = new Float32Array([
        1, 1, 1, 1,
        0.4, 0.4, 0.4, 1
    ]);
    const link = new NodeLink({
        nodePositions,
        nodePositionsStride: 3,
        edges,
        nodeScalars,
        edgeScalars,
        nodeColors,
        edgeColors,
        keepCPUData: true,
        nodeScaleTransform: { componentCount: 1, componentIndex: 0, stride: 1, offset: 0 },
        edgeScaleTransform: { componentCount: 1, componentIndex: 0, stride: 1, offset: 0 }
    });

    assert.strictEqual(link.nodeCount, 3, "NodeLink.nodeCount mismatch");
    assert.strictEqual(link.edgeCount, 2, "NodeLink.edgeCount mismatch");

    link.upload(device, device.queue);
    assert.ok(link.nodePositionsBuffer, "NodeLink.nodePositionsBuffer missing after upload");
    assert.ok(link.edgesBuffer, "NodeLink.edgesBuffer missing after upload");
    assert.ok(link.nodeScalarsBuffer, "NodeLink.nodeScalarsBuffer missing after upload");
    assert.ok(link.edgeScalarsBuffer, "NodeLink.edgeScalarsBuffer missing after upload");
    assert.ok(link.nodeColorsBuffer, "NodeLink.nodeColorsBuffer missing after upload");
    assert.ok(link.edgeColorsBuffer, "NodeLink.edgeColorsBuffer missing after upload");

    const expectedPackedPositions = new Float32Array([
        0.0, 0.0, 0.0, 0.0,
        1.0, 2.0, 3.0, 0.0,
        -2.0, 1.0, 0.5, 0.0
    ]);
    const expectedPackedEdges = new Uint32Array([0, 1, 1, 2]);

    const outPos = compute.createStorageBuffer({ label: "nodelink:cpu:positions:out", byteLength: expectedPackedPositions.byteLength, copySrc: true });
    const outEdges = compute.createStorageBuffer({ label: "nodelink:cpu:edges:out", byteLength: expectedPackedEdges.byteLength, copySrc: true });
    const outNodeScalars = compute.createStorageBuffer({ label: "nodelink:cpu:nodeScalars:out", byteLength: nodeScalars.byteLength, copySrc: true });
    const outEdgeScalars = compute.createStorageBuffer({ label: "nodelink:cpu:edgeScalars:out", byteLength: edgeScalars.byteLength, copySrc: true });
    const outNodeColors = compute.createStorageBuffer({ label: "nodelink:cpu:nodeColors:out", byteLength: nodeColors.byteLength, copySrc: true });
    const outEdgeColors = compute.createStorageBuffer({ label: "nodelink:cpu:edgeColors:out", byteLength: edgeColors.byteLength, copySrc: true });

    compute.kernels.copyF32(link.nodePositionsBuffer, { out: outPos, count: expectedPackedPositions.length });
    compute.kernels.copyU32(link.edgesBuffer, { out: outEdges, count: expectedPackedEdges.length });
    compute.kernels.copyF32(link.nodeScalarsBuffer, { out: outNodeScalars, count: nodeScalars.length });
    compute.kernels.copyF32(link.edgeScalarsBuffer, { out: outEdgeScalars, count: edgeScalars.length });
    compute.kernels.copyF32(link.nodeColorsBuffer, { out: outNodeColors, count: nodeColors.length });
    compute.kernels.copyF32(link.edgeColorsBuffer, { out: outEdgeColors, count: edgeColors.length });
    await device.queue.onSubmittedWorkDone();

    arraysApproxEqual(await outPos.readAs(Float32Array), expectedPackedPositions, 0, "CPU node positions upload mismatch");
    assert.deepStrictEqual(Array.from(await outEdges.readAs(Uint32Array)), Array.from(expectedPackedEdges), "CPU edge index upload mismatch");
    arraysApproxEqual(await outNodeScalars.readAs(Float32Array), nodeScalars, 0, "CPU node scalar upload mismatch");
    arraysApproxEqual(await outEdgeScalars.readAs(Float32Array), edgeScalars, 0, "CPU edge scalar upload mismatch");
    arraysApproxEqual(await outNodeColors.readAs(Float32Array), nodeColors, 0, "CPU node color upload mismatch");
    arraysApproxEqual(await outEdgeColors.readAs(Float32Array), edgeColors, 0, "CPU edge color upload mismatch");

    const nodeScaleSource = link.getNodeScaleSourceDescriptor();
    const edgeScaleSource = link.getEdgeScaleSourceDescriptor();
    assert.ok(nodeScaleSource, "Expected node scale source descriptor after upload");
    assert.ok(edgeScaleSource, "Expected edge scale source descriptor after upload");
    assert.strictEqual(nodeScaleSource.count, 3, "Node scale source count mismatch");
    assert.strictEqual(edgeScaleSource.count, 2, "Edge scale source count mismatch");

    outPos.destroy();
    outEdges.destroy();
    outNodeScalars.destroy();
    outEdgeScalars.destroy();
    outNodeColors.destroy();
    outEdgeColors.destroy();
    link.destroy();
}

// External GPU-buffer path for positions/edges/scalars/colors.
{
    const packedPositions = new Float32Array([
        -1, -2, -3, 0,
        4, 5, 6, 0
    ]);
    const packedEdges = new Uint32Array([0, 1]);
    const nodeScalars = new Float32Array([0.25, 0.75]);
    const edgeScalars = new Float32Array([0.5]);
    const nodeColors = new Float32Array([1, 0, 0, 1, 0, 1, 1, 1]);
    const edgeColors = new Float32Array([0.2, 0.3, 0.4, 1.0]);

    const srcPos = compute.createStorageBuffer({ label: "nodelink:external:pos:src", data: packedPositions, copySrc: false });
    const srcEdges = compute.createStorageBuffer({ label: "nodelink:external:edges:src", data: packedEdges, copySrc: false });
    const srcNodeScalars = compute.createStorageBuffer({ label: "nodelink:external:nodeScalars:src", data: nodeScalars, copySrc: false });
    const srcEdgeScalars = compute.createStorageBuffer({ label: "nodelink:external:edgeScalars:src", data: edgeScalars, copySrc: false });
    const srcNodeColors = compute.createStorageBuffer({ label: "nodelink:external:nodeColors:src", data: nodeColors, copySrc: false });
    const srcEdgeColors = compute.createStorageBuffer({ label: "nodelink:external:edgeColors:src", data: edgeColors, copySrc: false });

    const link = new NodeLink();
    link.setNodePositionsBuffer(srcPos.buffer, 2);
    link.setEdgesBuffer(srcEdges.buffer, 1);
    link.setNodeScalarsBuffer(srcNodeScalars.buffer);
    link.setEdgeScalarsBuffer(srcEdgeScalars.buffer);
    link.setNodeColorsBuffer(srcNodeColors.buffer);
    link.setEdgeColorsBuffer(srcEdgeColors.buffer);
    link.upload(device, device.queue);

    assert.strictEqual(link.nodePositionsBuffer, srcPos.buffer, "NodeLink should retain provided external node positions buffer");
    assert.strictEqual(link.edgesBuffer, srcEdges.buffer, "NodeLink should retain provided external edge buffer");
    assert.strictEqual(link.nodeScalarsBuffer, srcNodeScalars.buffer, "NodeLink should retain provided external node scalar buffer");
    assert.strictEqual(link.edgeScalarsBuffer, srcEdgeScalars.buffer, "NodeLink should retain provided external edge scalar buffer");
    assert.strictEqual(link.nodeColorsBuffer, srcNodeColors.buffer, "NodeLink should retain provided external node color buffer");
    assert.strictEqual(link.edgeColorsBuffer, srcEdgeColors.buffer, "NodeLink should retain provided external edge color buffer");

    const outPos = compute.createStorageBuffer({ label: "nodelink:external:pos:out", byteLength: packedPositions.byteLength, copySrc: true });
    const outEdges = compute.createStorageBuffer({ label: "nodelink:external:edges:out", byteLength: packedEdges.byteLength, copySrc: true });
    compute.kernels.copyF32(link.nodePositionsBuffer, { out: outPos, count: packedPositions.length });
    compute.kernels.copyU32(link.edgesBuffer, { out: outEdges, count: packedEdges.length });
    await device.queue.onSubmittedWorkDone();

    arraysApproxEqual(await outPos.readAs(Float32Array), packedPositions, 0, "External node positions path mismatch");
    assert.deepStrictEqual(Array.from(await outEdges.readAs(Uint32Array)), Array.from(packedEdges), "External edge path mismatch");

    outPos.destroy();
    outEdges.destroy();
    link.destroy();
    srcPos.destroy();
    srcEdges.destroy();
    srcNodeScalars.destroy();
    srcEdgeScalars.destroy();
    srcNodeColors.destroy();
    srcEdgeColors.destroy();
}

// Streaming updates: only requested node/edge ranges mutate.
{
    const link = new NodeLink({
        nodePositions: new Float32Array([
            0, 0, 0,
            1, 0, 0,
            2, 0, 0,
            3, 0, 0
        ]),
        edges: new Uint16Array([0, 1, 1, 2, 2, 3]),
        nodeScalars: new Float32Array([0.1, 0.2, 0.3, 0.4]),
        edgeScalars: new Float32Array([0.5, 0.6, 0.7]),
        nodeColors: new Float32Array([
            1, 0, 0, 1,
            0, 1, 0, 1,
            0, 0, 1, 1,
            1, 1, 1, 1
        ]),
        edgeColors: new Float32Array([
            0.1, 0.1, 0.1, 1,
            0.2, 0.2, 0.2, 1,
            0.3, 0.3, 0.3, 1
        ]),
        keepCPUData: true
    });
    link.upload(device, device.queue);

    link.updateNodePositions(new Float32Array([9, 9, 9]), 1, 3);
    link.updateEdges(new Uint16Array([3, 0]), 1);
    link.updateNodeScalars(new Float32Array([0.22, 0.33]), 1);
    link.updateEdgeScalars(new Float32Array([0.77]), 2);
    link.updateNodeColors(new Float32Array([0.4, 0.5, 0.6, 0.7]), 2);
    link.updateEdgeColors(new Float32Array([0.9, 0.8, 0.7, 1.0]), 0);
    link.upload(device, device.queue);

    const outPos = compute.createStorageBuffer({ label: "nodelink:update:pos:out", byteLength: 16 * 4, copySrc: true });
    const outEdges = compute.createStorageBuffer({ label: "nodelink:update:edges:out", byteLength: 4 * 6, copySrc: true });
    const outNodeScalars = compute.createStorageBuffer({ label: "nodelink:update:nodeScalars:out", byteLength: 4 * 4, copySrc: true });
    const outEdgeScalars = compute.createStorageBuffer({ label: "nodelink:update:edgeScalars:out", byteLength: 4 * 3, copySrc: true });
    const outNodeColors = compute.createStorageBuffer({ label: "nodelink:update:nodeColors:out", byteLength: 4 * 16, copySrc: true });
    const outEdgeColors = compute.createStorageBuffer({ label: "nodelink:update:edgeColors:out", byteLength: 4 * 12, copySrc: true });
    compute.kernels.copyF32(link.nodePositionsBuffer, { out: outPos, count: 16 });
    compute.kernels.copyU32(link.edgesBuffer, { out: outEdges, count: 6 });
    compute.kernels.copyF32(link.nodeScalarsBuffer, { out: outNodeScalars, count: 4 });
    compute.kernels.copyF32(link.edgeScalarsBuffer, { out: outEdgeScalars, count: 3 });
    compute.kernels.copyF32(link.nodeColorsBuffer, { out: outNodeColors, count: 16 });
    compute.kernels.copyF32(link.edgeColorsBuffer, { out: outEdgeColors, count: 12 });
    await device.queue.onSubmittedWorkDone();

    arraysApproxEqual(
        await outPos.readAs(Float32Array),
        new Float32Array([
            0, 0, 0, 0,
            9, 9, 9, 0,
            2, 0, 0, 0,
            3, 0, 0, 0
        ]),
        0,
        "Partial node position update mismatch"
    );
    assert.deepStrictEqual(
        Array.from(await outEdges.readAs(Uint32Array)),
        [0, 1, 3, 0, 2, 3],
        "Partial edge update mismatch"
    );
    arraysApproxEqual(await outNodeScalars.readAs(Float32Array), new Float32Array([0.1, 0.22, 0.33, 0.4]), 0, "Partial node scalar update mismatch");
    arraysApproxEqual(await outEdgeScalars.readAs(Float32Array), new Float32Array([0.5, 0.6, 0.77]), 0, "Partial edge scalar update mismatch");
    arraysApproxEqual(
        await outNodeColors.readAs(Float32Array),
        new Float32Array([
            1, 0, 0, 1,
            0, 1, 0, 1,
            0.4, 0.5, 0.6, 0.7,
            1, 1, 1, 1
        ]),
        0,
        "Partial node color update mismatch"
    );
    arraysApproxEqual(
        await outEdgeColors.readAs(Float32Array),
        new Float32Array([
            0.9, 0.8, 0.7, 1,
            0.2, 0.2, 0.2, 1,
            0.3, 0.3, 0.3, 1
        ]),
        0,
        "Partial edge color update mismatch"
    );

    outPos.destroy();
    outEdges.destroy();
    outNodeScalars.destroy();
    outEdgeScalars.destroy();
    outNodeColors.destroy();
    outEdgeColors.destroy();
    link.destroy();
}

// Uniform packing sanity for independent node/edge scale and colormap channels.
{
    const link = new NodeLink({
        nodePositions: new Float32Array([0, 0, 0, 1, 0, 0]),
        edges: new Uint16Array([0, 1]),
        nodeScalars: new Float32Array([0.2, 0.8]),
        edgeScalars: new Float32Array([0.5]),
        nodeRadii: new Float32Array([1, 2, 3, 2, 2, 2]),
        keepCPUData: true
    });
    link.nodeGeometryMode = "ellipsoids";
    link.edgeGeometryMode = "cylinders";
    link.nodeColorMode = "scalar";
    link.edgeColorMode = "scalar";
    link.nodeColormap = "custom";
    link.nodeColormapStops = [
        [1, 0, 0, 1],
        [0, 1, 0, 1],
        [0, 0, 1, 1]
    ];
    link.edgeColormap = "custom";
    link.edgeColormapStops = [
        [0.2, 0.2, 0.9, 1],
        [0.9, 0.2, 0.2, 1]
    ];
    link.nodeSolidColor = [0.1, 0.2, 0.3, 0.4];
    link.edgeSolidColor = [0.8, 0.7, 0.6, 0.5];
    link.nodeSize = 1.5;
    link.edgeSize = 0.15;
    link.opacity = 0.35;
    link.lit = true;
    link.minPointSize = 2.5;
    link.maxPointSize = 9.5;
    link.pointSizeAttenuation = 6.0;
    link.setNodeScaleTransform({
        componentCount: 1,
        componentIndex: 0,
        stride: 1,
        offset: 0,
        mode: "symlog",
        clampMode: "range",
        domainMin: -5,
        domainMax: 5,
        clampMin: -2,
        clampMax: 2,
        symlogLinThresh: 0.5,
        gamma: 2
    });
    link.setEdgeScaleTransform({
        componentCount: 1,
        componentIndex: 0,
        stride: 1,
        offset: 0,
        mode: "log",
        clampMode: "range",
        domainMin: 0.1,
        domainMax: 10,
        clampMin: 0.2,
        clampMax: 8,
        logBase: 10,
        gamma: 1.5
    });
    link.upload(device, device.queue);

    assert.strictEqual(link.getUniformBufferSize(), 512, "NodeLink uniform size must be 512 bytes");
    const u = link.getUniformData();
    assert.strictEqual(u.byteLength, 512, "NodeLink uniform byteLength mismatch");

    numberApproxEqual(u[0], 1.5, 1e-6, "global.nodeSize mismatch");
    numberApproxEqual(u[1], 0.15, 1e-6, "global.edgeSize mismatch");
    numberApproxEqual(u[2], 0.35, 1e-6, "global.opacity mismatch");
    numberApproxEqual(u[3], 1.0, 1e-6, "global.lit mismatch");

    numberApproxEqual(u[4], 1.0, 1e-6, "nodeScale.componentCount mismatch");
    numberApproxEqual(u[5], 0.0, 1e-6, "nodeScale.componentIndex mismatch");
    numberApproxEqual(u[8], -5.0, 1e-6, "nodeScale.domainMin mismatch");
    numberApproxEqual(u[9], 5.0, 1e-6, "nodeScale.domainMax mismatch");
    numberApproxEqual(u[12], -2.0, 1e-6, "nodeScale.clampMin mismatch");
    numberApproxEqual(u[13], 2.0, 1e-6, "nodeScale.clampMax mismatch");
    numberApproxEqual(u[24], 1.0, 1e-6, "nodeVisual.colorMode(scalar) mismatch");
    numberApproxEqual(u[25], 3.0, 1e-6, "nodeVisual.customStopCount mismatch");
    numberApproxEqual(u[26], 2.0, 1e-6, "nodeVisual.geometryMode(ellipsoids) mismatch");
    numberApproxEqual(u[27], 1.0, 1e-6, "nodeVisual.radiiEnabled mismatch");

    numberApproxEqual(u[28], 1.0, 1e-6, "edgeScale.componentCount mismatch");
    numberApproxEqual(u[32], 0.1, 1e-6, "edgeScale.domainMin mismatch");
    numberApproxEqual(u[33], 10.0, 1e-6, "edgeScale.domainMax mismatch");
    numberApproxEqual(u[48], 1.0, 1e-6, "edgeVisual.colorMode(scalar) mismatch");
    numberApproxEqual(u[49], 2.0, 1e-6, "edgeVisual.customStopCount mismatch");
    numberApproxEqual(u[50], 1.0, 1e-6, "edgeVisual.geometryMode(cylinders) mismatch");

    numberApproxEqual(u[52], 0.1, 1e-6, "nodeSolid.r mismatch");
    numberApproxEqual(u[53], 0.2, 1e-6, "nodeSolid.g mismatch");
    numberApproxEqual(u[54], 0.3, 1e-6, "nodeSolid.b mismatch");
    numberApproxEqual(u[55], 0.4, 1e-6, "nodeSolid.a mismatch");
    numberApproxEqual(u[56], 0.8, 1e-6, "edgeSolid.r mismatch");
    numberApproxEqual(u[57], 0.7, 1e-6, "edgeSolid.g mismatch");
    numberApproxEqual(u[58], 0.6, 1e-6, "edgeSolid.b mismatch");
    numberApproxEqual(u[59], 0.5, 1e-6, "edgeSolid.a mismatch");
    numberApproxEqual(u[60], 2.5, 1e-6, "pointParams.minPointSize mismatch");
    numberApproxEqual(u[61], 9.5, 1e-6, "pointParams.maxPointSize mismatch");
    numberApproxEqual(u[62], 6.0, 1e-6, "pointParams.attenuation mismatch");

    numberApproxEqual(u[64], 1.0, 1e-6, "node stop[0].r mismatch");
    numberApproxEqual(u[65], 0.0, 1e-6, "node stop[0].g mismatch");
    numberApproxEqual(u[66], 0.0, 1e-6, "node stop[0].b mismatch");
    numberApproxEqual(u[68], 0.0, 1e-6, "node stop[1].r mismatch");
    numberApproxEqual(u[69], 1.0, 1e-6, "node stop[1].g mismatch");
    numberApproxEqual(u[96], 0.2, 1e-6, "edge stop[0].r mismatch");
    numberApproxEqual(u[97], 0.2, 1e-6, "edge stop[0].g mismatch");
    numberApproxEqual(u[98], 0.9, 1e-6, "edge stop[0].b mismatch");

    link.destroy();
}

// Bounds + Scene aggregate and traversal support.
{
    const linkA = new NodeLink({
        nodePositions: new Float32Array([
            -1, -2, -3,
            4, 5, 6
        ]),
        edges: new Uint16Array([0, 1]),
        keepCPUData: true
    });
    const linkB = new NodeLink({
        nodePositions: new Float32Array([
            10, 0, 0,
            11, 0, 0
        ]),
        edges: new Uint16Array([0, 1]),
        keepCPUData: true
    });
    linkA.transform.setPosition(2, 0, 0);
    linkB.visible = false;

    const worldA = linkA.getWorldBounds();
    assert.strictEqual(worldA.empty, false, "NodeLink world bounds should be non-empty with CPU positions");
    numberApproxEqual(worldA.sphereCenter[0], 3.5, 1e-6, "NodeLink world bounds center.x mismatch after transform");
    assert.ok(worldA.sphereRadius > 0, "NodeLink world bounds radius should be positive");
    assert.ok(worldA.boxMin[0] <= 1, "NodeLink world bounds min.x should include transformed geometry");
    assert.ok(worldA.boxMax[0] >= 6, "NodeLink world bounds max.x should include transformed geometry");

    const scene = new Scene();
    scene.add(linkA).add(linkB);
    const visibleBounds = scene.getBounds({ visibleOnly: true });
    const allBounds = scene.getBounds({ visibleOnly: false });
    assert.strictEqual(visibleBounds.empty, false, "Visible bounds should include visible NodeLink");
    assert.ok(visibleBounds.boxMin[0] <= 1, "Scene visible bounds min.x should include transformed NodeLink");
    assert.ok(visibleBounds.boxMax[0] >= 6, "Scene visible bounds max.x should include transformed NodeLink");
    assert.ok(allBounds.boxMax[0] >= 11, "Scene full bounds should include hidden NodeLink when visibleOnly=false");

    let traverseCount = 0;
    let traverseVisibleCount = 0;
    scene.traverseNodeLinks(() => { traverseCount++; });
    scene.traverseVisibleNodeLinks(() => { traverseVisibleCount++; });
    assert.strictEqual(traverseCount, 2, "Scene.traverseNodeLinks should visit all NodeLinks");
    assert.strictEqual(traverseVisibleCount, 1, "Scene.traverseVisibleNodeLinks should visit only visible NodeLinks");
    assert.strictEqual(scene.findNodeLinkByName("missing"), undefined, "findNodeLinkByName should return undefined for missing names");

    scene.clearNodeLinks();
    assert.strictEqual(scene.nodeLinks.length, 0, "Scene.clearNodeLinks should remove all NodeLinks");
    linkA.destroy();
    linkB.destroy();
}

compute.destroy();
device.destroy();
