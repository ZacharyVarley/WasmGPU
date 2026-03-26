# WasmGPU.interop.buffer

## Summary
WasmGPU.interop.buffer returns the current WebAssembly linear-memory buffer object.
When memory grows, the underlying buffer reference can change, so reacquire it when needed.

## Syntax
```ts
WasmGPU.interop.buffer(): ArrayBufferLike
const memoryBuffer = wgpu.interop.buffer();
```

## Parameters
This API does not take parameters.

## Returns
`ArrayBufferLike` - The live WebAssembly memory buffer (`ArrayBuffer` or `SharedArrayBuffer`).

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const buffer = wgpu.interop.buffer();
console.log(buffer.byteLength, buffer instanceof SharedArrayBuffer);
```

## See Also
- [WasmGPU.interop.bytes](./wasmgpu-interop-bytes.md)
- [WasmGPU.interop.isSharedMemory](./wasmgpu-interop-issharedmemory.md)
- [WasmGPU.interop.requireSharedMemory](./wasmgpu-interop-requiresharedmemory.md)
