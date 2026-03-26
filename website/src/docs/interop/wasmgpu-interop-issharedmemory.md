# WasmGPU.interop.isSharedMemory

## Summary
WasmGPU.interop.isSharedMemory reports whether WebAssembly memory is a `SharedArrayBuffer`.
Use this check before enabling cross-thread workflows that require shared memory semantics.

## Syntax
```ts
WasmGPU.interop.isSharedMemory(): boolean
const shared = wgpu.interop.isSharedMemory();
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - `true` when memory is shared, otherwise `false`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

if (!wgpu.interop.isSharedMemory()) {
    console.warn("Shared memory disabled; use cross-origin isolation + shared build.");
}
```

## See Also
- [WasmGPU.interop.requireSharedMemory](./wasmgpu-interop-requiresharedmemory.md)
- [WasmGPU.interop.buffer](./wasmgpu-interop-buffer.md)
