# WasmGPU.interop.frame.allocF32

## Summary
WasmGPU.interop.frame.allocF32 allocates frame-scoped float32 storage and returns `WasmSlice<Float32Array>`.
The slice is valid only for the current frame epoch and becomes stale after `frameArena.reset()`.

## Syntax
```ts
WasmGPU.interop.frame.allocF32(len: number): WasmSlice<Float32Array>
const slice = wgpu.interop.frame.allocF32(len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of float32 elements to allocate. |

## Returns
`WasmSlice<Float32Array>` - Frame-owned slice with epoch tracking.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scratch = wgpu.interop.frame.allocF32(128);
scratch.view().fill(1.0);
console.log(scratch.isAlive(), scratch.handle().epoch);
wgpu.frameArena.reset();
console.log(scratch.isAlive());
```

## See Also
- [WasmGPU.interop.frame.allocU32](./wasmgpu-interop-frame-allocu32.md)
- [WasmGPU.interop.WasmSlice.isAlive](./wasmgpu-interop-wasmslice-isalive.md)
- [WasmGPU.frameArena.reset](./wasmgpu-framearena-reset.md)
