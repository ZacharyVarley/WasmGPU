# WasmGPU.frameArena

## Summary
WasmGPU.frameArena exposes a global frame-scoped allocator backed by WebAssembly memory.
This arena is intended for transient scratch data and is typically reset once per rendered frame.
Pointers and slices allocated from the frame arena become invalid after reset (epoch change).

## Syntax
```ts
WasmGPU.frameArena: FrameArena
const frameArena = wgpu.frameArena;
```

## Parameters
This accessor does not take parameters.

## Returns
`FrameArena` - Frame allocator interface with init, alloc, reset, and stats methods.

## Type Details
```ts
type FrameArena = {
    init(capBytes?: number): number;
    reset(): void;
    alloc(bytes: number, align?: number): number;
    allocF32(len: number): number;
    epoch(): number;
    usedBytes(): number;
    capBytes(): number;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const frameArena = wgpu.frameArena;
const ptr = frameArena.alloc(1024, 16);
console.log(ptr, frameArena.usedBytes(), frameArena.capBytes());
frameArena.reset();
```

## See Also
- [WasmGPU.frameArena.init](./wasmgpu-framearena-init.md)
- [WasmGPU.frameArena.alloc](./wasmgpu-framearena-alloc.md)
- [WasmGPU.frameArena.reset](./wasmgpu-framearena-reset.md)
- [WasmGPU.interop.frame.allocF32](./wasmgpu-interop-frame-allocf32.md)
