# WasmGPU.createHeapArena

## Summary
WasmGPU.createHeapArena creates a reusable heap-backed arena allocator for WebAssembly memory.
Allocations returned from this arena are represented as `WasmSlice` views and remain valid until the arena is reset or destroyed.
Use heap arenas for longer-lived temporary buffers that should outlive a single frame.

## Syntax
```ts
WasmGPU.createHeapArena(capBytes: number, align?: number): WasmHeapArena
const arena = wgpu.createHeapArena(capBytes, align);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `capBytes` | `number` | Yes | Total arena capacity in bytes; must be greater than zero. |
| `align` | `number` | No | Base alignment expectation for the arena allocation, default `16`. |

## Returns
`WasmHeapArena` - Arena object with allocation and lifecycle methods.

## Type Details
```ts
type WasmHeapArena = {
    readonly basePtr: number;
    readonly capBytes: number;
    epoch(): number;
    usedBytes(): number;
    reset(): void;
    destroy(): void;
    alloc(bytes: number, alignBytes?: number): number;
    allocF32(len: number): WasmSlice<Float32Array>;
    allocU32(len: number): WasmSlice<Uint32Array>;
    allocI32(len: number): WasmSlice<Int32Array>;
    allocU8(len: number, alignBytes?: number): WasmSlice<Uint8Array>;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const arena = wgpu.createHeapArena(4 * 1024 * 1024, 16);
const weights = arena.allocF32(1024);
weights.write(new Float32Array(1024).fill(1));

console.log(arena.usedBytes(), arena.epoch());
arena.reset();
arena.destroy();
```

## See Also
- [WasmGPU.interop.createHeapArena](./wasmgpu-interop-createheaparena.md)
- [WasmGPU.interop.WasmHeapArena.allocF32](./wasmgpu-interop-wasmheaparena-allocf32.md)
- [WasmGPU.frameArena](./wasmgpu-framearena.md)
