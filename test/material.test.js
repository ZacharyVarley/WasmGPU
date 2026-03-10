import assert from "assert";
import * as WasmGPU from "../dist/WasmGPU.js";
import { create, globals } from "webgpu";

Object.assign(globalThis, globals);
const navigator = { gpu: create([]) };

const numberApproxEqual = (a, b, tol = 1e-6, msg = "Numbers differ") => {
    assert.ok(Number.isFinite(a) && Number.isFinite(b), "Expected finite numbers");
    assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
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

const { UnlitMaterial, StandardMaterial, CustomMaterial, DataMaterial, Colormap } = WasmGPU;

assert.ok(UnlitMaterial, "Missing export: UnlitMaterial");
assert.ok(StandardMaterial, "Missing export: StandardMaterial");
assert.ok(CustomMaterial, "Missing export: CustomMaterial");
assert.ok(DataMaterial, "Missing export: DataMaterial");
assert.ok(Colormap, "Missing export: Colormap");

const create1x1 = (queue, rgba, wantSrgbView) => {
    const tex = device.createTexture({
        size: { width: 1, height: 1 },
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        viewFormats: ["rgba8unorm-srgb"]
    });
    const data = new Uint8Array(256);
    data[0] = rgba[0];
    data[1] = rgba[1];
    data[2] = rgba[2];
    data[3] = rgba[3];
    queue.writeTexture(
        { texture: tex },
        data,
        { bytesPerRow: 256, rowsPerImage: 1 },
        { width: 1, height: 1 }
    );
    const linear = tex.createView({ format: "rgba8unorm" });
    const srgb = wantSrgbView ? tex.createView({ format: "rgba8unorm-srgb" }) : linear;
    return { tex, linear, srgb };
};
const fallbackSampler = device.createSampler({
    addressModeU: "repeat",
    addressModeV: "repeat",
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear"
});
const white = create1x1(device.queue, [255, 255, 255, 255], true);
const normal = create1x1(device.queue, [128, 128, 255, 255], false);
const mr = create1x1(device.queue, [0, 255, 255, 255], false);
const occ = create1x1(device.queue, [255, 0, 0, 255], false);

// UnlitMaterial
{
    const m = new UnlitMaterial({
        color: [0.25, 0.5, 0.75],
        opacity: 0.8,
        alphaCutoff: 0.1
    });

    assert.strictEqual(m.getUniformBufferSize(), 32, "UnlitMaterial uniform buffer size should be 32 bytes");
    const u = m.getUniformData();
    assert.strictEqual(u.length, 8, "UnlitMaterial uniform data should have 8 floats");
    numberApproxEqual(u[0], 0.25, 1e-6, "unlit.color.r");
    numberApproxEqual(u[1], 0.5, 1e-6, "unlit.color.g");
    numberApproxEqual(u[2], 0.75, 1e-6, "unlit.color.b");
    numberApproxEqual(u[3], 0.8, 1e-6, "unlit.opacity");
    numberApproxEqual(u[4], 0.1, 1e-6, "unlit.alphaCutoff");

    const ub = device.createBuffer({
        size: m.getUniformBufferSize(),
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(ub, 0, u.buffer, u.byteOffset, u.byteLength);

    const layout = m.createBindGroupLayout(device);
    const bg = device.createBindGroup({
        layout,
        entries: [
            { binding: 0, resource: { buffer: ub } },
            { binding: 1, resource: fallbackSampler },
            { binding: 2, resource: white.srgb }
        ]
    });
    assert.ok(bg, "Expected UnlitMaterial bind group to be created");
}

// StandardMaterial
{
    const m = new StandardMaterial({
        color: [1, 0, 0],
        opacity: 1,
        metallic: 0.2,
        roughness: 0.7,
        emissive: [0, 0, 1],
        emissiveIntensity: 0.5,
        normalScale: 1.25,
        occlusionStrength: 0.9,
        alphaCutoff: 0
    });

    assert.strictEqual(m.getUniformBufferSize(), 64, "StandardMaterial uniform buffer size should be 64 bytes");
    const u = m.getUniformData();
    assert.strictEqual(u.length, 16, "StandardMaterial uniform data should have 16 floats");

    numberApproxEqual(u[0], 1, 1e-6, "standard.color.r");
    numberApproxEqual(u[1], 0, 1e-6, "standard.color.g");
    numberApproxEqual(u[2], 0, 1e-6, "standard.color.b");
    numberApproxEqual(u[3], 1, 1e-6, "standard.opacity");
    numberApproxEqual(u[8], 0.2, 1e-6, "standard.metallic");
    numberApproxEqual(u[9], 0.7, 1e-6, "standard.roughness");
    numberApproxEqual(u[10], 1.25, 1e-6, "standard.normalScale");
    numberApproxEqual(u[11], 0.9, 1e-6, "standard.occlusionStrength");
    numberApproxEqual(u[12], 0, 1e-6, "standard.alphaCutoff");

    const ub = device.createBuffer({
        size: m.getUniformBufferSize(),
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(ub, 0, u.buffer, u.byteOffset, u.byteLength);

    const layout = m.createBindGroupLayout(device);
    const bg = device.createBindGroup({
        layout,
        entries: [
            { binding: 0, resource: { buffer: ub } },
            { binding: 1, resource: fallbackSampler },
            { binding: 2, resource: white.srgb },
            { binding: 3, resource: fallbackSampler },
            { binding: 4, resource: mr.linear },
            { binding: 5, resource: fallbackSampler },
            { binding: 6, resource: normal.linear },
            { binding: 7, resource: fallbackSampler },
            { binding: 8, resource: occ.linear },
            { binding: 9, resource: fallbackSampler },
            { binding: 10, resource: white.srgb }
        ]
    });
    assert.ok(bg, "Expected StandardMaterial bind group to be created");
}

// DataMaterial
{
    const tryConstruct = () => {
        const attempts = [];

        attempts.push(() => new DataMaterial());
        attempts.push(() => new DataMaterial({}));

        for (const fn of attempts) {
            try {
                const m = fn();
                if (m) return m;
            } catch {
                // try next
            }
        }
        throw new Error("Failed to construct DataMaterial with either new DataMaterial() or new DataMaterial({}).");
    };

    const m = tryConstruct();
    assert.ok(typeof m.getUniformBufferSize === "function", "DataMaterial should implement getUniformBufferSize()");
    assert.ok(typeof m.getUniformData === "function", "DataMaterial should implement getUniformData()");
    assert.ok(typeof m.createBindGroupLayout === "function", "DataMaterial should implement createBindGroupLayout()");
    assert.ok(typeof m.getShaderCode === "function", "DataMaterial should implement getShaderCode()");

    if (typeof m.upload === "function") {
        m.upload(device, device.queue);
    }

    const ub = device.createBuffer({
        size: m.getUniformBufferSize(),
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const u = m.getUniformData();
    device.queue.writeBuffer(ub, 0, u.buffer, u.byteOffset, u.byteLength);

    const dummyDataBuffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(dummyDataBuffer, 0, new Uint8Array(4));

    const cmap = (typeof m.getColormapForBinding === "function")
        ? m.getColormapForBinding()
        : Colormap.builtin("viridis");
    const cmapRes = cmap.getGPUResources(device, device.queue);

    const layout = m.createBindGroupLayout(device);
    const bg = device.createBindGroup({
        layout,
        entries: [
            { binding: 0, resource: { buffer: ub } },
            { binding: 1, resource: { buffer: m.dataBuffer ?? dummyDataBuffer } },
            { binding: 2, resource: cmapRes.sampler },
            { binding: 3, resource: cmapRes.view }
        ]
    });
    assert.ok(bg, "Expected DataMaterial bind group to be created");
}

// CustomMaterial
{
    const m = new CustomMaterial({
        fragmentShader: `
            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4f {
                return vec4f(custom.myValue, 0.0, 0.0, 1.0);
            }
        `,
        uniforms: {
            myValue: { type: "f32", value: 0.5 }
        }
    });

    const size = m.getUniformBufferSize();
    assert.ok(Number.isInteger(size) && size >= 16, "CustomMaterial uniform buffer size should be >= 16 bytes");
    const u = m.getUniformData();
    assert.ok(u.length * 4 === size, "CustomMaterial uniform data length should match buffer size");

    m.setUniform("myValue", 0.75);
    const u2 = m.getUniformData();
    numberApproxEqual(u2[0], 0.75, 1e-6, "custom.myValue");

    const ub = device.createBuffer({
        size: m.getUniformBufferSize(),
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(ub, 0, u2.buffer, u2.byteOffset, u2.byteLength);

    const layout = m.createBindGroupLayout(device);
    const bg = device.createBindGroup({
        layout,
        entries: [{ binding: 0, resource: { buffer: ub } }]
    });
    assert.ok(bg, "Expected CustomMaterial bind group to be created");
}
