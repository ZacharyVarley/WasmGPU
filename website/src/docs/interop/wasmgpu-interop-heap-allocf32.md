# WasmGPU.interop.heap.allocF32

## Summary
WasmGPU.interop.heap.allocF32 allocates heap-owned float32 storage and returns it as `WasmSlice<Float32Array>`.
Heap slices remain valid until freed explicitly with `slice.free()`.

## Syntax
```ts
WasmGPU.interop.heap.allocF32(len: number): WasmSlice<Float32Array>
const slice = wgpu.interop.heap.allocF32(len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of float32 elements to allocate. |

## Returns
`WasmSlice<Float32Array>` - Heap slice wrapper for the allocated region.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const slice = wgpu.interop.heap.allocF32(1024);
const view = slice.view();
for (let i = 0; i < view.length; i++) view[i] = i * 0.5;
console.log(slice.handle());
slice.free();
```

## See Also
- [WasmGPU.interop.heap.allocU32](./wasmgpu-interop-heap-allocu32.md)
- [WasmGPU.interop.WasmSlice.free](./wasmgpu-interop-wasmslice-free.md)
- [WasmGPU.interop.frame.allocF32](./wasmgpu-interop-frame-allocf32.md)
