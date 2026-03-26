# WasmGPU.createHeapArena().usedBytes

## Summary
WasmGPU.createHeapArena().usedBytes reports consumed bytes in the arena head.
Track this value to estimate required arena capacity.

## Syntax
```ts
WasmGPU.createHeapArena().usedBytes(): number
const used = arena.usedBytes();
```

## Parameters
This API does not take parameters.

## Returns
`number` - Bytes currently allocated in this arena epoch.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const arena = wgpu.createHeapArena(64 * 1024);
arena.alloc(1024, 16);
arena.alloc(2048, 16);
console.log(arena.usedBytes(), arena.capBytes);
```

## See Also
- [WasmGPU.createHeapArena().alloc](./wasmgpu-interop-wasmheaparena-alloc.md)
- [WasmGPU.createHeapArena().reset](./wasmgpu-interop-wasmheaparena-reset.md)
