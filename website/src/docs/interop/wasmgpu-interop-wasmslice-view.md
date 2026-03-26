# WasmGPU.interop.WasmSlice.view

## Summary
WasmGPU.interop.WasmSlice.view returns the typed-array view for this slice.
The view is cached and refreshed internally when WebAssembly memory buffer objects change.

## Syntax
```ts
WasmGPU.interop.WasmSlice.view(): T
const view = slice.view();
```

## Parameters
This API does not take parameters.

## Returns
`T` - Typed array matching the slice dtype (`Float32Array`, `Uint32Array`, `Int32Array`, or `Uint8Array`).

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const slice = wgpu.interop.heap.allocF32(4);
const v = slice.view();
v.set([0.5, 1.5, 2.5, 3.5]);
console.log(v[2]);
slice.free();
```

## See Also
- [WasmGPU.interop.WasmSlice.write](./wasmgpu-interop-wasmslice-write.md)
- [WasmGPU.interop.WasmSlice.buffer](./wasmgpu-interop-wasmslice-buffer.md)
