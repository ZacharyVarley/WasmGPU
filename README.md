<p align="center">
    <a href="https://www.github.com/Zushah/WasmGPU">
        <picture>
            <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Zushah/WasmGPU/main/assets/logo-darkmode.png">
            <img alt="WasmGPU logo" src="https://raw.githubusercontent.com/Zushah/WasmGPU/main/assets/logo-lightmode.png" width="50%">
        </picture>
    </a>
</p>
<p align="center">
    <a href="https://www.github.com/Zushah/WasmGPU/releases/tag/v0.5.0"><img src="https://img.shields.io/badge/release-v0.5.0-005a9c?logo=github&logoColor=white" alt="Latest release"></a>
    <a href="https://raw.githubusercontent.com/Zushah/WasmGPU/v0.5.0/dist/WasmGPU.js"><img src="https://img.shields.io/badge/minified-218.72_kB-654ff0?logo=javascript&logoColor=white" alt="218.72 kilobytes minified size"></a>
    <a href="https://www.npmjs.com/~zushah"><img src="https://img.shields.io/badge/downloads-coming_soon-9b8df5?logo=npm&logoColor=white" alt="npm package coming soon"></a>
    <a href="https://www.jsdelivr.com/package/gh/Zushah/WasmGPU"><img src="https://img.shields.io/jsdelivr/gh/hm/Zushah/WasmGPU?color=654ff0&logo=jsdelivr&logoColor=white" alt="jsDelivr requests per month"></a>
    <a href="https://www.github.com/Zushah/WasmGPU/blob/main/LICENSE.md"><img src="https://img.shields.io/badge/license-MPL--2.0-005a9c?logo=gitbook&logoColor=white" alt="Mozilla Public License 2.0"></a>
</p><br>

## Status

- 🚀 Latest release: [**`v0.5.0`**](https://github.com/Zushah/WasmGPU/releases/tag/v0.5.0).
- 💡 Documentation: [https://zushah.github.io/WasmGPU](https://zushah.github.io/WasmGPU)
- ⚙️ WebGPU engine written in TypeScript, for scenes with meshes, materials, lights, and camera plus glTF 2.0 assets (PBR/unlit materials, texture sampling with mipmaps and robust async uploads, transparency, animations, and 4- or 8‑influence skinning), combining WebAssembly-driven frustum culling, opaque draw batching with automatic instanced rendering, optional subpixel morphological anti-aliasing (SMAA), built-in orbit controls, and an in-engine PerformanceStats HUD, and now also shipping a first-class WebGPU compute API with reusable pipelines/buffers and built-in parallel primitives (reduce/scan/compact/radix sort/histogram) for scientific workloads.
- 🦀 WebAssembly driver written in Rust, where transforms live in SoA memory with per-index dirty tracking and partial local/world propagation, animation sampling and joint-matrix generation run in WebAssembly and stream to WebGPU storage buffers, uniforms/instance data are staged as zero-copy views into WebAssembly memory, hot-path allocations are avoided via cached pipelines/bind-group layouts and a reset-every-frame arena, the build is optimized with Binaryen, and SIMD128 enabled for higher throughput.
- 🛠️ API still evolving so expect breaking changes often!

## Architecture Comparison Table

|  | **WebGL / WebGPU** | **Three.js / Babylon.js** | **WasmGPU** |
| :--- | :--- | :--- | :--- |
| **Origin** | 2011 / 2023 | 2010 / 2013 | 2026 |
| **Primary Implementation Language** | JavaScript & C++ | JavaScript / TypeScript | TypeScript & Rust |
| **Graphics Engine** | WebGL / WebGPU | WebGL-native & WebGPU-adoptive | WebGPU-native |
| **GPGPU** | Manual, low-level, high-boilerplate | Integrated, high-abstraction, scene-centric | Automated, kernel-driven, compute-optimized |
| **Scene Graph Memory** | Not available | Object-oriented (AoS) | Data-oriented (SoA) |
| **Math Execution** | JavaScript | JavaScript | WebAssembly |
| **Transform Updates** | Not available | Recursive traversal | Linear iteration |
| **Uniform Uploads** | Manual packing | Extraction & packing | Zero-copy views & no packing |
| **Garbage Collection** | Manual & low/high pressure via JavaScript engine | Automatic & high pressure via JavaScript engine | Automatic & low pressure via WebAssembly driver |
| **Instancing** | Manual | Manual | Automatic |
| **Camera Controls** | Not available | Built-in | Built-in |
| **Asset Importing** | Not available | glTF 2.0 | glTF 2.0 |
| **Textures** | Manual | Managed objects | Managed objects |
| **Animation System** | Not available | Executed in JavaScript | Executed in WebAssembly |
| **Skinning** | Not available | Data textures | Storage buffers |
| **Visibility Culling** | Not available | Frustum culling in JavaScript | Frustum culling in WebAssembly |
| **Anti-aliasing** | Not available | MSAA | SMAA |
| **Render State Caching** | Not available | State filtering | Pipeline caching |
| **Vectorization** | Not available | Scalar | SIMD128 |
| **Buildtime Optimization** | Not available | Transpilation, tree-shaking, minification | Transpilation & LLVM, tree-shaking & Binaryen, minification |
| **Render Loop** | Run by JavaScript | Run by JavaScript | Run by JavaScript & WebAssembly |
| **API Ergonomics** | Verbose | Streamlined | Streamlined |

## Getting Started

Basic examples: 
- [`./examples/esm.html`](https://zushah.github.io/WasmGPU/examples/esm.html)
- [`./examples/iife.html`](https://zushah.github.io/WasmGPU/examples/iife.html)
- [`./examples/gltf.html`](https://zushah.github.io/WasmGPU/examples/gltf.html)
- [`./examples/compute.html`](https://zushah.github.io/WasmGPU/examples/compute.html)

```html
<canvas></canvas>
<script type="module">
    // Setup
    import { WasmGPU } from "https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.5.0/dist/WasmGPU.min.js";
    const canvas = document.querySelector("canvas");
    const wgpu = await WasmGPU.create(canvas, { antialias: true});

    // Scene, camera, and controls
    const scene = wgpu.createScene([0.05, 0.05, 0.1]);
    const camera = wgpu.createCamera.perspective({ fov: 60, near: 0.1, far: 1000 });
    camera.transform.setPosition(0, 4, 2);
    camera.lookAt(0, 0, 0);
    const controls = wgpu.createControls.orbit(camera, canvas);

    // Lights
    scene.addLight(wgpu.createLight.ambient({
        color: [1, 1, 1],
        intensity: 0.01
    }));
    scene.addLight(wgpu.createLight.directional({
        direction: [1, -1, -1],
        color: [1, 1, 1],
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
        controls.update(dt);
        cube.transform.rotateY(dt * 0.8);
        cube.transform.rotateX(dt * 0.3);
        cube.transform.setPosition(0, 0.1 * Math.sin(time * 2), 0);
        wgpu.render(scene, camera);
    });
</script>
```

Using the IIFE bundle instead of the ESM bundle is exactly the same as above, except you must use a `script` tag instead of an `import` statement:
```html
<script src="https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.5.0/dist/WasmGPU.iife.min.js"></script>
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
