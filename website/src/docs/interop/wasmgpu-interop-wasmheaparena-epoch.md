# WasmGPU.createHeapArena().epoch

## Summary
WasmGPU.createHeapArena().epoch returns the arena generation counter.
The epoch increments when the arena is reset or destroyed, invalidating previously issued slices.

## Syntax
```ts
WasmGPU.createHeapArena().epoch(): number
const epoch = arena.epoch();
```

## Parameters
This API does not take parameters.

## Returns
`number` - Current arena epoch.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const arena = wgpu.createHeapArena(128 * 1024);
const e0 = arena.epoch();
arena.reset();
const e1 = arena.epoch();
console.log(e0, e1);
```

## See Also
- [WasmGPU.createHeapArena().reset](./wasmgpu-interop-wasmheaparena-reset.md)
- [WasmGPU.interop.WasmSlice.isAlive](./wasmgpu-interop-wasmslice-isalive.md)
