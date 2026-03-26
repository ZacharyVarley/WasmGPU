# WasmGPU.interop.requireSharedMemory

## Summary
WasmGPU.interop.requireSharedMemory returns the WebAssembly memory as `SharedArrayBuffer`.
If memory is not shared, it throws with guidance about shared-memory build/runtime requirements.

## Syntax
```ts
WasmGPU.interop.requireSharedMemory(): SharedArrayBuffer
const shared = wgpu.interop.requireSharedMemory();
```

## Parameters
This API does not take parameters.

## Returns
`SharedArrayBuffer` - Shared linear-memory buffer.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

try {
    const shared = wgpu.interop.requireSharedMemory();
    console.log("shared bytes:", shared.byteLength);
} catch (error) {
    console.error(error);
}
```

## See Also
- [WasmGPU.interop.isSharedMemory](./wasmgpu-interop-issharedmemory.md)
- [WasmGPU.interop.buffer](./wasmgpu-interop-buffer.md)
