# WasmGPU.createHeapArena().destroy

## Summary
WasmGPU.createHeapArena().destroy marks the arena as destroyed and invalidates future allocations.
After destroy, arena methods that require a live arena throw.

## Syntax
```ts
WasmGPU.createHeapArena().destroy(): void
arena.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const arena = wgpu.createHeapArena(128 * 1024);
arena.destroy();
try {
    arena.allocF32(8);
} catch (error) {
    console.error(error);
}
```

## See Also
- [WasmGPU.createHeapArena().reset](./wasmgpu-interop-wasmheaparena-reset.md)
- [WasmGPU.createHeapArena().allocF32](./wasmgpu-interop-wasmheaparena-allocf32.md)
