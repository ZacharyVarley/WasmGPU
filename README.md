<p align="center">
    <a href="https://zushah.github.io/WasmGPU">
        <picture>
            <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Zushah/WasmGPU/main/assets/logo-darkmode.png">
            <img alt="WasmGPU logo" src="https://raw.githubusercontent.com/Zushah/WasmGPU/main/assets/logo-lightmode.png" width="50%">
        </picture>
    </a>
</p>
<p align="center">
    <a href="https://www.github.com/Zushah/WasmGPU/releases/tag/v0.7.0"><img src="https://img.shields.io/badge/release-v0.7.0-005a9c?logo=github&logoColor=white" alt="Latest release"></a>
    <a href="https://raw.githubusercontent.com/Zushah/WasmGPU/v0.7.0/dist/WasmGPU.js"><img src="https://img.shields.io/badge/minified-450.6_kB-654ff0?logo=javascript&logoColor=white" alt="450.6 kilobytes minified bundle size"></a>
    <a href="https://www.npmjs.com/package/@zushah/wasmgpu"><img src="https://img.shields.io/npm/dm/%40zushah/wasmgpu?logo=npm&logoColor=white" alt="npm downloads per month"></a>
    <a href="https://www.jsdelivr.com/package/gh/Zushah/WasmGPU"><img src="https://img.shields.io/jsdelivr/gh/hm/Zushah/WasmGPU?color=654ff0&logo=jsdelivr&logoColor=white" alt="jsDelivr requests per month"></a>
    <a href="https://www.github.com/Zushah/WasmGPU/blob/main/LICENSE.md"><img src="https://img.shields.io/badge/license-MPL--2.0-005a9c?logo=gitbook&logoColor=white" alt="Mozilla Public License 2.0"></a>
</p><br>

## About

- 🔥 WebGPU × WebAssembly rendering and computing engine for scientific workloads in the browser.
- 🚀 Latest release: [**`v0.7.0`**](https://github.com/Zushah/WasmGPU/releases/tag/v0.7.0).
- 💡 Website: [https://zushah.github.io/WasmGPU](https://zushah.github.io/WasmGPU)
- ⚙️ WebGPU engine written in TypeScript, spanning **scene & assets** (meshes, pointclouds, glyphfields, data materials, lights, cameras, glTF 2.0 assets, mipmapped texture sampling, transparency, animations, 4- or 8-influence skinning, and richer built-in geometry including 2D primitives plus cartesian and parametric curves and surfaces for graphing); **rendering architecture** (WebAssembly-driven frustum culling, opaque draw batching with automatic instanced rendering, optional subpixel morphological anti-aliasing, configurable canvas format selection, and GPU ID-pass picking for both single-hit queries and rectangular or lasso region queries with typed results); **interaction, overlays, & diagnostics** (orbit/trackball orthographic/perspective camera navigation with bounds-based scene framing, inspection views, and a composable overlay and annotation toolkit with triads, grids, legends, markers, probes, and measurements); and **compute & interop** (a first-class WebGPU compute subsystem with reusable pipelines and buffers, an extensive kernels library, an ndarray abstraction, asynchronous readback utilities, a unified scale-transform model shared across rendering and computing workflows, and Python-in-the-browser interoperability).
- 🦀 WebAssembly driver written in Rust, spanning **data layout & transforms** (transforms stored in SoA memory with per-index dirty tracking and partial local or world propagation plus model and normal matrix packing); **animation & asset hot paths** (animation sampling and joint-matrix generation executed in WebAssembly together with glTF accessor deinterleaving, sparse patch application, numeric conversion, and mesh normal generation); **bounds, culling, & visibility** (world-space bounds computation for geometry, pointclouds, and glyphfields together with frustum plane extraction and sphere-frustum culling kernels); **array semantics & zero-copy staging** (ndarray indexing utilities for explicit shape-and-stride byte-offset math plus uniforms and instance data staged as zero-copy views into WebAssembly memory with explicit typed-slice handles for JavaScript interop); and **performance envelope** (hot-path allocations avoided via cached pipelines and bind-group layouts plus a frame arena and user heap arenas, with builds optimized via LLVM and Binaryen and SIMD128 enabled for even higher throughput).

## Architecture Diagram

The diagram below reflects currently implemented subsystems and runtime flow in WasmGPU v0.7.0.

Solid arrows indicate control flow while dashed arrows indicate data and resource flow.

```mermaid
flowchart LR
    subgraph API["Public API"]
        APP["User Application"]
        ENG["WasmGPU v0.7.0"]
        FAC["Factory surface: scene, camera, controls, geometry, material, texture, mesh, pointcloud, glyphfield, light, asset import, animation, overlay, annotation"]
    end

    subgraph RT["WebGPU Engine"]
        LOOP["Frame loop"]
        REND["Renderer"]
        SCALE["Scaling service"]
        OVER["Overlay framework"]
        ANNO["Annotation toolkit"]
        PICK["Picking utility"]
        CAPI["Compute subsystem"]
        CBUF["Buffer resource manager"]
        CPIPE["Pipeline controller"]
        CPLAN["Dispatch workgroup planner"]
        CKERN["Kernels library"]
        CARR["N-dimensional array abstraction for CPU & GPU memory"]
        CREAD["Asynchronous readback ring"]
        CSCR["Scratch buffer pool"]
    end

    subgraph DATA["Object & Data Model"]
        SCN["Scene"]
        TSTORE["Transform store in SoA memory"]
        MESH["Mesh with geometry, material, & texture"]
        PGG["Pointcloud & glyphfield"]
        CMAP["Colormapping"]
        SKIN["Skin instance data"]
        ASTORE["Annotation store"]
        ALOAD["Loader for glTF 2.0 asset data"]
        ADEC["Accessor decoding & data conversion"]
        AIMP["Importer from asset data to scene resources"]
    end

    subgraph WASM["WebAssembly Driver"]
        WHEAP["Heap allocation for persistent typed memory"]
        WFAR["Frame arena for transient typed memory"]
        WTR["Transform propagation"]
        WMATH["Matrix, vector, & quaternion mathematics"]
        WND["N-dimensional array indexing & stride-offsetting"]
        WMESH["Mesh normal generation"]
        WGLTF["glTF accessor decoding, sparse patching, & numeric conversion"]
        WANI["Animation sampling & joint matrix generation"]
        WBOUNDS["Bounds for mesh, pointcloud, & glyphfield"]
        WCULL["Frustum culling"]
    end

    subgraph GPU["Browser Resources"]
        DEV["Graphics device & queue"]
        CACHE["Pipeline cache & bindgroup cache"]
        RES["Graphics buffers, textures, & samplers"]
        RPASS["Render passes for opaque geometry, transparent geometry, post-processing, & user interaction"]
        CPASS["Compute passes for kernels"]
    end

    classDef darkblue fill:#4E79FF,stroke:#0B2B8F,stroke-width:2px,color:#06153D;
    classDef green fill:#22D37D,stroke:#0A6D3C,stroke-width:2px,color:#04311A;
    classDef lightblue fill:#17C9FF,stroke:#005E80,stroke-width:2px,color:#022433;
    classDef yellow fill:#FFB238,stroke:#9A4D00,stroke-width:2px,color:#5A2C00;
    classDef purple fill:#B18AFF,stroke:#5A2FA6,stroke-width:2px,color:#2E165E;
    classDef pink fill:#FF5EA8,stroke:#9A2E62,stroke-width:2px,color:#4D1532;

    class APP,ENG,FAC darkblue;
    class LOOP,REND,SCALE,OVER,ANNO,PICK green;
    class CAPI,CBUF,CPIPE,CPLAN,CKERN,CARR,CREAD,CSCR lightblue;
    class SCN,TSTORE,MESH,PGG,CMAP,SKIN,ASTORE,ALOAD,ADEC,AIMP yellow;
    class WHEAP,WFAR,WTR,WMATH,WND,WMESH,WGLTF,WANI,WBOUNDS,WCULL purple;
    class DEV,CACHE,RES,RPASS,CPASS pink;
    
    APP --> ENG
    ENG --> FAC
    ENG --> LOOP
    ENG --> OVER
    ENG --> ANNO
    ENG --> PICK
    ENG --> CAPI

    FAC --> SCN
    FAC --> MESH
    FAC --> PGG
    FAC --> CMAP
    FAC --> SKIN
    FAC --> ALOAD
    MESH --> CMAP

    ALOAD --> ADEC --> AIMP
    AIMP -.-> SCN
    AIMP -.-> MESH
    AIMP -.-> SKIN
    AIMP -.-> TSTORE
    ADEC -.-> WGLTF

    LOOP --> REND
    SCN --> REND
    TSTORE --> REND
    MESH --> REND
    PGG --> REND
    CMAP --> REND
    SKIN --> REND
    OVER --> REND
    REND --> PICK
    PICK --> ANNO
    ASTORE --> ANNO
    ANNO --> OVER

    CAPI --> CBUF
    CAPI --> CPIPE
    CAPI --> CPLAN
    CAPI --> CKERN
    CAPI --> CARR
    CAPI --> CREAD
    CAPI --> CSCR
    CAPI --> SCALE
    SCALE --> MESH
    SCALE --> PGG
    SCALE --> CMAP
    CBUF --> CPASS
    CPIPE --> CPASS
    CPLAN --> CPASS
    CKERN --> CPASS
    CSCR --> CPASS
    CPASS --> DEV
    CREAD --> DEV

    REND --> RPASS
    REND --> CACHE
    CACHE --> DEV
    RPASS --> DEV

    ENG -.-> WHEAP
    LOOP -.-> WFAR
    WHEAP -.-> TSTORE
    WHEAP -.-> CARR
    WFAR -.-> REND
    TSTORE -.-> WTR
    WTR -.-> WMATH
    SKIN -.-> WANI
    WANI -.-> WMATH
    MESH -.-> WMESH
    WMESH -.-> MESH
    MESH -.-> WBOUNDS
    PGG -.-> WBOUNDS
    WBOUNDS -.-> WCULL
    REND -.-> WCULL
    WCULL -.-> REND
    WTR -.-> TSTORE
    WANI -.-> RES
    WGLTF -.-> ADEC
    WGLTF -.-> WND
    WND -.-> CARR
    CBUF -.-> MESH
    MESH -.-> RES
    REND -.-> RES
    CBUF -.-> RES
```

## Architecture Comparison Tables

### 1. Platform and Toolchain
|  | **WebGL / WebGPU** | **Three.js / Babylon.js** | **WasmGPU** |
| :--- | :--- | :--- | :--- |
| **Origin** | 2011 / 2023 | 2010 / 2013 | 2026 |
| **Implementation Language** | JavaScript & C++ | JavaScript / TypeScript | TypeScript & Rust |
| **Application Language** | JavaScript & GLSL / WGSL | JavaScript / TypeScript & GLSL / WGSL | JavaScript / TypeScript & WGSL (& Python via Pyodide) |
| **Buildtime Optimization** | Not available | Transpilation, tree-shaking, minification | Transpilation & LLVM, tree-shaking & Binaryen, minification |
| **Graphics Engine** | WebGL / WebGPU | WebGL-native & WebGPU-adoptive | WebGPU-native |
| **Vectorization** | Not available | Scalar | SIMD128 |
| **API Ergonomics** | Verbose | Streamlined | Streamlined |

### 2. Execution Model and Memory Layout
|  | **WebGL / WebGPU** | **Three.js / Babylon.js** | **WasmGPU** |
| :--- | :--- | :--- | :--- |
| **Scene Graph Memory** | Not available | Object-oriented (AoS) | Data-oriented (SoA) |
| **Math Execution** | JavaScript | JavaScript | WebAssembly |
| **Transform Updates** | Not available | Recursive traversal | Linear iteration |
| **Bounds Computation** | Manual | JavaScript | WebAssembly |
| **View Framing** | Manual | Helper-based fitting | Bounds-based scene/object fitting |
| **Garbage Collection** | Manual & low/high pressure via JavaScript engine | Automatic & high pressure via JavaScript engine | Automatic & low pressure via WebAssembly driver |
| **Render Loop** | Run by JavaScript | Run by JavaScript | Run by JavaScript & WebAssembly |

### 3. Rendering Pipeline Infrastructure
|  | **WebGL / WebGPU** | **Three.js / Babylon.js** | **WasmGPU** |
| :--- | :--- | :--- | :--- |
| **Uniform Uploads** | Manual packing | Extraction & packing | Zero-copy views & no packing |
| **Render State Caching** | Manual | State filtering | Pipeline caching |
| **Instancing** | Manual | Manual | Automatic |
| **Visibility Culling** | Not available | Frustum culling in JavaScript | Frustum culling in WebAssembly |
| **Picking** | Manual GPU / CPU picking | Often CPU-centered | GPU ID-pass with typed hits |
| **Skinning** | Not available | Data textures | Storage buffers |
| **Anti-aliasing** | Not available | MSAA | SMAA |
| **Textures** | Manual | Managed objects | Managed objects |
| **Animation System** | Not available | Executed in JavaScript | Executed in WebAssembly |
| **Asset Importing** | Not available | glTF 2.0 | glTF 2.0 |
| **Camera Controls** | Not available | Built-in | Built-in unified orbit & trackball navigation |

### 4. Compute Workloads and Scientific Visualizations
|  | **WebGL / WebGPU** | **Three.js / Babylon.js** | **WasmGPU** |
| :--- | :--- | :--- | :--- |
| **GPGPU** | Manual, low-level, high-boilerplate | Integrated, high-abstraction, scene-centric | Automated, kernel-driven, compute-optimized |
| **Ndarray Abstraction** | Not available | Not available | CPU & GPU ndarrays |
| **GPU Readback** | Manual | Manual | Async readback ring |
| **Python Interoperability** | Not available | Not available | With Pyodide |
| **Scientific Primitives** | Manual | Manual | Point clouds & glyph fields |
| **Mathematical Geometry** | Manual | Manual | Cartesian & parametric curves & surfaces |
| **Scaling Statistics** | Manual | Manual | Min/max & percentile analysis |
| **Colormap Support** | Manual | Manual | Built-ins & custom |
| **Data-driven Materials** | Manual | Manual | Data material |
| **Scientific Overlays** | Manual | Manual | Grids, triads, & legends |
| **Annotation & Measurement** | Manual | Manual | Markers, probes, distance, & angle toolkit |

## Getting Started

Examples: 
1. [`./examples/esm.html`](https://zushah.github.io/WasmGPU/examples/esm.html) to see how to get started with the ESM build.
2. [`./examples/iife.html`](https://zushah.github.io/WasmGPU/examples/iife.html) to see how to get started with the IIFE build.
3. [`./examples/gltf.html`](https://zushah.github.io/WasmGPU/examples/gltf.html) to see how a glTF model of a chessboard can be loaded and imported.
4. [`./examples/controls.html`](https://zushah.github.io/WasmGPU/examples/controls.html) to see how the camera controls and navigation functionalities work.
5. [`./examples/picking.html`](https://zushah.github.io/WasmGPU/examples/picking.html) to see how the picking, probing, and selecting utility works.
6. [`./examples/scaling.html`](https://zushah.github.io/WasmGPU/examples/scaling.html) to see how the scaling service and colormapping works.
7. [`./examples/overlay.html`](https://zushah.github.io/WasmGPU/examples/overlay.html) to see how the overlay framework and annotation toolkit works.
8. [`./examples/mandelbulb.html`](https://zushah.github.io/WasmGPU/examples/mandelbulb.html) to see how the compute subsystem can be used to render a Mandelbulb fractal.
9. [`./examples/galaxy.html`](https://zushah.github.io/WasmGPU/examples/galaxy.html) to see how a point cloud can be used with Python intero via Pyodide and the compute subsystem to render a realistic galaxy.
10. [`./examples/fluid.html`](https://zushah.github.io/WasmGPU/examples/fluid.html) to see how a glyph field and a point cloud can be used with Python interop, the compute subsystem, navigation, selection, and overlay features to render a fluid dynamics demo.
11. [`./examples/graphing.html`](https://zushah.github.io/WasmGPU/examples/graphing.html) to see how the mathematical function primitives and data materials can be used with Python interop, navigation, selection, and overlay features to render for a 3D graphing calculator.
12. [`./examples/protein.html`](https://zushah.github.io/WasmGPU/examples/protein.html) to see how a point cloud can be used with Python interop, navigation, selection, colormap, and overlay features to render a visualization of a protein structure (hemoglobin) from the Protein Data Bank.

Super basic example to render a cube:
```js
// Setup
import { WasmGPU } from "https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.7.0/dist/WasmGPU.min.js";
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas, { antialias: true});

// Scene, camera, and controls
const scene = wgpu.createScene([0.05, 0.05, 0.1]);
const camera = wgpu.createCamera.perspective({
    fov: 60,
    near: 0.1,
    far: 1000
});
camera.transform.setPosition(-2, 2, -2);
camera.lookAt(0, 0, 0);
const controls = wgpu.createControls.orbit(camera, canvas);

// Light
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
    wgpu.render(scene, camera);
});
```

Using the IIFE bundle instead of the ESM bundle is exactly the same as above, except you must use an HTML `script` tag instead of a JavaScript `import` statement:
```html
<script src="https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.7.0/dist/WasmGPU.iife.min.js"></script>
```

## Development

1. Install dev dependencies: `npm install`.
2. Make sure you develop in `./src/` rather than `./dist/`.
3. Build and test: `npm run build` & `npm run test`, or just `npm run dev`.
4. Serve locally to check if the `./examples/` work: `npm run start` or use the [live server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer).
5. Restore latest release build since builds are only committed during releases: `npm run restore`.

The `./dist/` folder contains:
- ESM bundle: `WasmGPU.js` & `WasmGPU.min.js`
- IIFE bundle: `WasmGPU.iife.min.js`
- WebAssembly bridge: `wasm.js`
- WebAssembly driver: `wasm.wasm`

Note: `wasm.js` and `wasm.wasm` must be located beside the WasmGPU bundles, i.e. in the `./dist/` folder. These files are automatically copied from the `./build/` folder by `./esbuild.config.js`, so this should not be a problem, but it could become one.

The `./build/` folder contains:
- WebAssembly bridge: `wasm.js`
- WebAssembly type declarations: `wasm.d.ts`
- WebAssembly driver: `wasm.wasm`
- WebAssembly text format: `wasm.wat`

The WasmGPU logo is built by `npm run logo` which runs `./scripts/rasterize_logo.py` to rasterize the `./assets/logo.svg` file to the `./assets/*.png` files used in the repository and on the website.

The WasmGPU [website](https://zushah.github.io/WasmGPU) is built by `npm run website` which runs `./scripts/build_website.py` to compile the files in `./website/src/` to `./website/build/` and then deploys to GitHub Pages via the `./.github/workflows/deploy_website.yaml` action.

## License
WasmGPU is available under the [Mozilla Public License 2.0 (MPL-2.0)](https://www.github.com/Zushah/WasmGPU/blob/main/LICENSE.md).
