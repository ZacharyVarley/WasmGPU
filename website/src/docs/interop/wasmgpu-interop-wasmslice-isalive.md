# WasmGPU.interop.WasmSlice.isAlive

## Summary
WasmGPU.interop.WasmSlice.isAlive checks whether a slice can still be safely accessed.
Heap slices become not alive after `free()`, while frame/arena slices also depend on epoch validity.

## Syntax
```ts
WasmGPU.interop.WasmSlice.isAlive(): boolean
const alive = slice.isAlive();
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - `true` when the slice is currently valid for access.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const slice = wgpu.interop.frame.allocU32(4);
console.log(slice.isAlive());
wgpu.frameArena.reset();
console.log(slice.isAlive());
```

## See Also
- [WasmGPU.interop.WasmSlice.assertAlive](./wasmgpu-interop-wasmslice-assertalive.md)
- [WasmGPU.interop.WasmSlice.free](./wasmgpu-interop-wasmslice-free.md)
