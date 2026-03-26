# WasmGPU.render

## Summary
WasmGPU.render submits one frame using the provided scene and camera.
If the engine is not currently running a loop, the frame arena is reset before rendering.
Use this for manual render control (single-frame rendering, external timing loops, or headless-style stepping).

## Syntax
```ts
WasmGPU.render(scene: Scene, camera: Camera): void
wgpu.render(scene, camera);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `scene` | `Scene` | Yes | Scene graph containing meshes, point clouds, glyph fields, and light nodes to draw. |
| `camera` | `Camera` | Yes | Active camera supplying the view and projection transforms for this frame. |

## Returns
`void` - Encodes/submits render work for the current frame.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene([0.06, 0.07, 0.09]);
const camera = wgpu.createCamera.perspective({ fov: Math.PI / 3, aspect: canvas.width / Math.max(1, canvas.height), near: 0.1, far: 1000 });
camera.position[2] = 5;
wgpu.render(scene, camera);
```

## See Also
- [WasmGPU.run](./wasmgpu-run.md)
- [WasmGPU.stop](./wasmgpu-stop.md)
- [WasmGPU.createScene](../world/wasmgpu-createscene.md)
- [WasmGPU.createCamera.perspective](../world/wasmgpu-createcamera-perspective.md)
- [WasmGPU.gpu](./wasmgpu-gpu.md)
