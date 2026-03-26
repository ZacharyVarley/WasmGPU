# WasmGPU.createHeapArena().reset

## Summary
WasmGPU.createHeapArena().reset rewinds arena allocation state to the beginning and advances epoch.
All slices from prior epochs become invalid after reset.

## Syntax
```ts
WasmGPU.createHeapArena().reset(): void
arena.reset();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const arena = wgpu.createHeapArena(256 * 1024);
const slice = arena.allocF32(128);
console.log(slice.isAlive(), arena.usedBytes());
arena.reset();
console.log(slice.isAlive(), arena.usedBytes());
```

## See Also
- [WasmGPU.createHeapArena().epoch](./wasmgpu-interop-wasmheaparena-epoch.md)
- [WasmGPU.createHeapArena().destroy](./wasmgpu-interop-wasmheaparena-destroy.md)
