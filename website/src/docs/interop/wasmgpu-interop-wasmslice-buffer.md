# WasmGPU.interop.WasmSlice.buffer

## Summary
WasmGPU.interop.WasmSlice.buffer returns the live memory buffer that backs this slice.
This call validates slice liveness before returning the buffer.

## Syntax
```ts
WasmGPU.interop.WasmSlice.buffer(): ArrayBufferLike
const buffer = slice.buffer();
```

## Parameters
This API does not take parameters.

## Returns
`ArrayBufferLike` - Current WebAssembly memory buffer for the slice.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const slice = wgpu.interop.heap.allocU8(8);
const buffer = slice.buffer();
console.log(buffer.byteLength);
slice.free();
```

## See Also
- [WasmGPU.interop.WasmSlice.view](./wasmgpu-interop-wasmslice-view.md)
- [WasmGPU.interop.buffer](./wasmgpu-interop-buffer.md)
