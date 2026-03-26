# WasmGPU.frameArena.reset

## Summary
WasmGPU.frameArena.reset discards all frame-arena allocations and advances the arena epoch.
Any frame-based `WasmSlice` allocated before reset is no longer valid.

## Syntax
```ts
WasmGPU.frameArena.reset(): void
wgpu.frameArena.reset();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const ptr = wgpu.frameArena.alloc(256, 16);
console.log(ptr, wgpu.frameArena.epoch());
wgpu.frameArena.reset();
console.log(wgpu.frameArena.epoch(), wgpu.frameArena.usedBytes());
```

## See Also
- [WasmGPU.frameArena.epoch](./wasmgpu-framearena-epoch.md)
- [WasmGPU.frameArena.usedBytes](./wasmgpu-framearena-usedbytes.md)
- [WasmGPU.interop.frame.allocU8](./wasmgpu-interop-frame-allocu8.md)
