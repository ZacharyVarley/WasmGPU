# WasmGPU.interop.WasmSlice.handle

## Summary
WasmGPU.interop.WasmSlice.handle serializes slice identity and layout metadata.
Handles are useful for passing Wasm memory references across API boundaries.

## Syntax
```ts
WasmGPU.interop.WasmSlice.handle(): WasmSliceHandle
const handle = slice.handle();
```

## Parameters
This API does not take parameters.

## Returns
`WasmSliceHandle` - Object containing kind, dtype, pointer, length, and optional epoch.

## Type Details
```ts
type WasmSliceHandle = {
    kind: "heap" | "frame" | "arena";
    dtype: "f32" | "u32" | "i32" | "u8";
    ptr: number;
    length: number;
    epoch?: number;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const slice = wgpu.interop.frame.allocI32(3);
const handle = slice.handle();
console.log(handle.kind, handle.dtype, handle.ptr, handle.epoch);
```

## See Also
- [WasmGPU.interop.viewFromHandle](./wasmgpu-interop-viewfromhandle.md)
- [WasmGPU.interop.WasmSlice.isAlive](./wasmgpu-interop-wasmslice-isalive.md)
