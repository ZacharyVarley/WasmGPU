# WasmGPU.interop.WasmSlice.free

## Summary
WasmGPU.interop.WasmSlice.free releases heap-owned slice memory.
This method is only valid for `kind: "heap"` slices.
Calling it on frame or arena slices throws because those lifetimes are managed by reset/destroy operations.

## Syntax
```ts
WasmGPU.interop.WasmSlice.free(): void
slice.free();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const heapSlice = wgpu.interop.heap.allocU8(128);
heapSlice.free();
console.log(heapSlice.isAlive());
```

## See Also
- [WasmGPU.interop.heap.allocU8](./wasmgpu-interop-heap-allocu8.md)
- [WasmGPU.interop.WasmSlice.isAlive](./wasmgpu-interop-wasmslice-isalive.md)
- [WasmGPU.frameArena.reset](./wasmgpu-framearena-reset.md)
