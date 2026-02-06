<p align="center"><a href="https://www.github.com/Zushah/WasmGPU"><img src="./assets/logo.png" width="50%"></a></p>
<h3 align="center"><b>W a s m G P U &nbsp;&nbsp;=&nbsp;&nbsp;  W e b A s s e m b l y &nbsp;&nbsp;⨯&nbsp;&nbsp; W e b G P U</b></h3>
<p align="center"><a href="https://zushah.github.io/WasmGPU">https://zushah.github.io/WasmGPU</a></p>

## Status

- 🚀 Latest release: [**`v0.2.1`**](https://github.com/Zushah/WasmGPU/releases/tag/v0.2.1).
- ✅ WebGPU core able to render scenes, meshes, materials, lights, camera.
- ✅ WebAssembly math module wired into TypeScript.
- ✅ Bundles for both ESM and IIFE users.
- 🛠️ API still evolving so expect breaking changes often!

## Getting Started

Check out the docs [here](https://zushah.github.io/WasmGPU).

Basic examples: [`./examples/esm.html`](https://zushah.github.io/WasmGPU/examples/esm.html) and [`./examples/iife.html`](https://zushah.github.io/WasmGPU/examples/iife.html).

```html
<canvas></canvas>
<script type="module">
    // Setup
    import { WasmGPU } from "https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.2.1/dist/WasmGPU.min.js";
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
<script src="https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.2.1/dist/WasmGPU.iife.min.js"></script>
```

## Development
1. Install dependencies: `npm install`.
2. Make sure you develop in `./src/` rather than `./dist/`.
3. Build: `npm run build`.
4. Serve locally: `npm run start` or use the [live server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer).

The `./dist/` folder generates:
- `WasmGPU.js` / `WasmGPU.min.js` — ESM bundle
- `WasmGPU.iife.min.js` — IIFE bundle
- `math.js` — Bridge to load WebAssembly
- `math.wasm` — WebAssembly math module

Note: `math.js` and `math.wasm` must be located beside the WasmGPU bundles, i.e. in the `./dist/` folder. These files are automatically copied from the `./build/` folder by `esbuild.config.js` so this should not be a problem, but it could become one.

The `./build/` folder generates:
- `math.js` — Bridge to load WebAssembly
- `math.d.ts` — AssemblyScript type declarations
- `math.wasm` — WebAssembly math module
- `math.wasm.map` — WebAssembly source map
- `math.wat` — WebAssembly text format

## License
WasmGPU is available under the [Mozilla Public License 2.0 (MPL-2.0)](https://www.github.com/Zushah/WasmGPU/blob/main/LICENSE.md).
