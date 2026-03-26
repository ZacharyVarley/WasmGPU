# WasmGPU.cullingStats

## Summary
WasmGPU.cullingStats exposes frustum-culling counters from the renderer.
The values are updated as frames are rendered (with culling/stats enabled in renderer options).
Use this for diagnostics, profiling overlays, and quality/performance tuning.

## Syntax
```ts
WasmGPU.cullingStats: { tested: number; visible: number }
const stats = wgpu.cullingStats;
```

## Parameters
This API does not take parameters.

## Returns
`{ tested: number; visible: number }` - Number of objects tested for culling and number considered visible.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas, { frustumCulling: true, frustumCullingStats: true });
const scene = wgpu.createScene([0.05, 0.05, 0.08]);
const camera = wgpu.createCamera.perspective({ fov: Math.PI / 3, aspect: canvas.width / Math.max(1, canvas.height), near: 0.1, far: 1000 });
wgpu.render(scene, camera);
console.log(wgpu.cullingStats.tested, wgpu.cullingStats.visible);
```

## See Also
- [WasmGPU.render](./wasmgpu-render.md)
- [WasmGPU.createPerformanceStats](./wasmgpu-createperformancestats.md)
- [WasmGPU.gpu](./wasmgpu-gpu.md)
