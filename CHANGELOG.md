# WasmGPU changelog
All release notes of WasmGPU are recorded in this file.

## [v0.5.0](https://github.com/Zushah/WasmGPU/releases/tag/v0.5.0) - 02/23/2026
The sixth prerelease of WasmGPU. Commits: [`v0.4.0...v0.5.0`](https://github.com/Zushah/WasmGPU/compare/v0.4.0...v0.5.0)
- Added a sophisticated WebGPU compute API (pipelines, storage/uniform buffers, dispatch helpers, batching, and limit validation) so GPGPU workloads can be run alongside rendering.
- Added a library of GPU parallel primitives (reduce/argreduce, exclusive scan, stream compaction, radix sort, and histogram) so common data workloads don’t require rewriting core kernels per project.
- Added camera controls for orbit/pan/zoom navigation and a configurable HUD for FPS, CPU, GPU, memory, and culling stats.
- Changed core performance paths to reduce unnecessary work and CPU overhead by skipping projection dirtying when camera parameters are unchanged, adding per-index transform dirty tracking with partial updates, and optimizing frustum culling as well as renderer buffer-view hot paths.
- Changed the build/runtime performance envelope by enabling SIMD128 on the WebAssembly driver, optimizing it with Binaryen's wasm-opt.exe, and bumping the TypeScript target to ES2023.
- Fixed glTF correctness and coverage by allocating normal scratch indices as u32, adding 8-influence skinning support, supporting the specular glossiness material extension, improving the UV-set selection, and correcting skinning to use the mesh bind matrix rather than the current world inverse.
- Fixed robustness and shader correctness by hardening texture upload handling and correcting SMAA uniform layout alignment and fullscreen UV winding.

## [v0.4.0](https://github.com/Zushah/WasmGPU/releases/tag/v0.4.0) - 02/15/2026
The fifth prerelease of WasmGPU. Commits: [`v0.3.0...v0.4.0`](https://github.com/Zushah/WasmGPU/compare/v0.3.0...v0.4.0)
- Added a glTF 2.0 loading & importing pipeline that constructs runtime scenes/meshes/materials from `.gltf` & `.glb` files, including PBR/unlit material translation and a real texture abstraction with mipmaps and sampler mapping.
- Added glTF animation and skinning support, with TRS sampling executed in WebAssembly and per-skin joint matrices generated and streamed to WebGPU storage buffers.
- Added frustum culling to skip submitting off-screen meshes, using world-space bounds with a WebAssembly sphere-frustum kernel and optional culling stats for visibility debugging.
- Added SMAA as an optional post-process anti-aliasing path (offscreen scene-color & edge/weight/neighborhood passes) to improve visual quality on single-sampled swapchains.
- Fixed renderer internals to eliminate per-frame WebAssembly allocations in camera/lighting/model uniform staging buffers, pipeline cache keys, uniform packing, per-mesh world matrix reads, instanced pointer allocations, material uniform arrays, and bind group layouts.

## [v0.3.0](https://github.com/Zushah/WasmGPU/releases/tag/v0.3.0) - 02/08/2026
The fourth prerelease of WasmGPU. Commits: [`v0.2.1...v0.3.0`](https://github.com/Zushah/WasmGPU/compare/v0.2.1...v0.3.0)
- Changed the WebAssembly backend from AssemblyScript to Rust and expanded the WebAssembly integration into a pointer-first runtime layer suitable for high-performance engine subsystems.
- Changed renderer data flow to be WebAssembly-memory-first: uniform data is staged in WebAssembly and uploaded zero-copy to WebGPU buffers, with model matrices uploaded directly from Transform WebAssembly storage and normal matrices computed in WebAssembly.
- Changed Transform into a WebAssembly-owned structure-of-arrays (SoA) store with batched local/world matrix updates, enabling fewer allocations and fewer cross-boundary calls in the hot path.
- Added bounded per-frame scratch allocation via a WebAssembly frame arena (reset every frame) to avoid unbounded heap growth and keep transient buffers in WebAssembly memory.
- Changed renderer submission to reduce CPU overhead by caching global bind groups, batching opaque draw submission, and adding WebGPU instancing support for large runs of identical pipeline/material/geometry.
- Fixed Transform lifetime management by adding disposal and slot reuse via a free list, preventing long-running scenes from leaking Transform slots.

## [v0.2.1](https://github.com/Zushah/WasmGPU/releases/tag/v0.2.1) - 02/05/2026
The third prerelease of WasmGPU. Commits: [`v0.2.0...v0.2.1`](https://github.com/Zushah/WasmGPU/compare/v0.2.0...v0.2.1)
- Added base64 backup for WebAssembly embedded in `./dist/math.js` so that it can be utilized even if `./dist/math.wasm` is unavailable or inaccessible to the client.
- Fixed distorted cylinder and prism geometry.
- Fixed incorrect normal matrix calculation.

## [v0.2.0](https://github.com/Zushah/WasmGPU/releases/tag/v0.2.0) - 02/03/2026
The second prerelease of WasmGPU. Commits: [`v0.1.0...v0.2.0`](https://github.com/Zushah/WasmGPU/compare/v0.1.0...v0.2.0)
- Engine and scene graph: new engine/renderer separation with a high-level render loop, scene/mesh/transform primitives and parented transforms, built-in geometry helpers (box, plane, sphere, torus, cylinder, pyramid, prism), and perspective/orthographic camera functions with `lookAt()` and aspect handling.
- Materials and lighting: PBR-ish `StandardMaterial` (color, metallic, roughness, emissive) as well as `UnlitMaterial` and `CustomMaterial` support, material uniform and bind-group management, texture/sampler support, and proper model/normal matrix handling for lighting.
- Builds, WebAssembly, and runtime: AssemblyScript math module (`./build/math.wasm` and `./build/math.js`) with lazy initialization, both ESM and IIFE `./dist/` bundles ready for CDN use, and shader/pipeline and GPU buffer (vertex/index/uniform) management.

## [v0.1.0](https://github.com/Zushah/WasmGPU/releases/tag/v0.1.0) - 02/01/2026
The first prerelease of WasmGPU. Commits: [`v0.0.0...v0.1.0`](https://github.com/Zushah/WasmGPU/compare/ae3c900860a218f8c52db1d86f9ce54163e9bb6a...v0.1.0)
- WebGPU renderer is up and running with a rotating cube demo.
- AssemblyScript → WebAssembly math module integrated and callable from TypeScript.
- Build outputs provided for both ESM and CDN consumers.
