<p align="center">
    <a href="https://www.github.com/Zushah/WasmGPU">
        <picture>
            <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-darkmode.png">
            <img alt="WasmGPU logo" src="./assets/logo-lightmode.png" width="50%">
        </picture>
    </a>
</p>

## Status

- 🚀 Latest release: [**`v0.4.0`**](https://github.com/Zushah/WasmGPU/releases/tag/v0.4.0).
- 💡 Documentation: [https://zushah.github.io/WasmGPU](https://zushah.github.io/WasmGPU)
- ⚙️ WebGPU engine renders scenes with meshes, materials, lights, and camera, as well as glTF 2.0 assets (PBR/unlit materials with normal/occlusion/emissive maps, Texture2D sampling with mipmaps, transparency, animations, and skinning), combining frustum culling, opaque draw batching, and automatic instanced rendering plus optional SMAA to minimize CPU overhead while keeping edges clean.
- 🦀 WebAssembly driver with a Rust runtime backend where transforms live in SoA memory, local/world updates and animation sampling run in WASM, joint matrices for skinned meshes are generated in WASM and streamed to GPU storage buffers, uniforms/instance data are staged as zero-copy views into WASM memory, and hot-path allocations are avoided via cached pipelines/bind-group layouts/uniform arrays and a reset-every-frame arena.
- 🛠️ API still evolving so expect breaking changes often!

## Architecture Comparison Table

|  | **WebGL / WebGPU** | **Three.js / Babylon.js** | **WasmGPU** |
| :--- | :--- | :--- | :--- |
| **Origin** | 2011 / 2023 | 2010 / 2013 | 2026 |
| **Primary Implementation Language** | JavaScript & C++ | JavaScript / TypeScript | TypeScript & Rust |
| **Graphics Engine** | WebGL / WebGPU | WebGL-native & WebGPU-adoptive | WebGPU-native |
| **Scene Graph Memory** | Not available | Object-oriented (AoS) | Data-oriented (SoA) |
| **Math Execution** | JavaScript | JavaScript | WebAssembly |
| **Transform Updates** | Not available | Recursive traversal | Linear iteration |
| **Uniform Uploads** | Manual packing | Extraction & packing | Zero-copy views & no packing |
| **Garbage Collection** | Manual & low/high pressure via JavaScript engine | Automatic & high pressure via JavaScript engine | Automatic & low pressure via WebAssembly driver |
| **Instancing** | Manual | Manual | Automatic |
| **Asset Importing** | Not available | glTF 2.0 | glTF 2.0 |
| **Textures** | Manual | Managed objects | Managed objects |
| **Animation System** | Not available | Executed in JavaScript | Executed in WebAssembly |
| **Skinning** | Not available | Data textures | Storage buffers |
| **Visibility Culling** | Not available | Frustum culling in JavaScript | Frustum culling in WebAssembly |
| **Anti-aliasing** | Not available | MSAA | SMAA |
| **Render State Caching** | Not available | State filtering | Pipeline caching |
| **Render Loop** | Run by JavaScript | Run by JavaScript | Run by JavaScript & WebAssembly |

## Getting Started

Basic examples: 
- [`./examples/esm.html`](https://zushah.github.io/WasmGPU/examples/esm.html)
- [`./examples/iife.html`](https://zushah.github.io/WasmGPU/examples/iife.html)
- [`./examples/gltf.html`](https://zushah.github.io/WasmGPU/examples/gltf.html)

```html
<canvas></canvas>
<script type="module">
    // Setup
    import { WasmGPU } from "https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.4.0/dist/WasmGPU.min.js";
    const canvas = document.querySelector("canvas");
    const wgpu = await WasmGPU.create(canvas);

    // Scene and camera
    const scene = wgpu.createScene([0.05, 0.05, 0.1]);
    const camera = wgpu.createCamera.perspective({ fov: 60, near: 0.1, far: 1000 });
    camera.transform.setPosition(0, 4, 2);
    camera.lookAt(0, 0, 0);

    // Lights
    scene.addLight(wgpu.createLight.ambient({
        color: [1, 1, 1],
        intensity: 0.01
    }));
    scene.addLight(wgpu.createLight.directional({
        direction: [1, -1, -1],
        color: [1, 0.95, 0.9],
        intensity: 1.5
    }));

    // Cube
    const cube = wgpu.createMesh(
        wgpu.geometry.box(1, 1, 1),
        wgpu.material.standard({
            color: [1, 0, 0],
            metallic: 0.7
        })
    );
    scene.add(cube);

    // Render
    wgpu.run((dt, time) => {
        cube.transform.rotateY(dt * 0.8);
        cube.transform.rotateX(dt * 0.3);
        cube.transform.setPosition(0, 0.8 + Math.sin(time * 2) * 0.15, 0);
        wgpu.render(scene, camera);
    });
</script>
```

Using the IIFE bundle instead of the ESM bundle is exactly the same as above, except you must use a `script` tag instead of an `import` statement:
```html
<script src="https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.4.0/dist/WasmGPU.iife.min.js"></script>
```

## Development
1. Install dependencies: `npm install`.
2. Make sure you develop in `./src/` rather than `./dist/`.
3. Build: `npm run build`.
4. Serve locally: `npm run start` or use the [live server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer).

The `./dist/` folder generates:
- `WasmGPU.js` / `WasmGPU.min.js` — ESM bundle
- `WasmGPU.iife.min.js` — IIFE bundle
- `wasm.js` — Bridge to load WebAssembly
- `wasm.wasm` — WebAssembly driver

Note: `wasm.js` and `wasm.wasm` must be located beside the WasmGPU bundles, i.e. in the `./dist/` folder. These files are automatically copied from the `./build/` folder by `esbuild.config.js` so this should not be a problem, but it could become one.

The `./build/` folder generates:
- `wasm.js` — Bridge to load WebAssembly
- `wasm.d.ts` — WebAssembly type declarations
- `wasm.wasm` — WebAssembly driver
- `wasm.wat` — WebAssembly text format

## License
WasmGPU is available under the [Mozilla Public License 2.0 (MPL-2.0)](https://www.github.com/Zushah/WasmGPU/blob/main/LICENSE.md).
