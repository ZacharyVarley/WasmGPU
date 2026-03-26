# WasmGPU.interop.createHeapArena

## Summary
WasmGPU.interop.createHeapArena creates a `WasmHeapArena` through the interop surface.
It is functionally equivalent to `WasmGPU.createHeapArena`.
Use whichever path is clearer for your integration layer.

## Syntax
```ts
WasmGPU.interop.createHeapArena(capBytes: number, align?: number): WasmHeapArena
const arena = wgpu.interop.createHeapArena(capBytes, align);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `capBytes` | `number` | Yes | Heap arena capacity in bytes. |
| `align` | `number` | No | Requested base alignment, default `16`. |

## Returns
`WasmHeapArena` - Heap arena allocator instance.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const arena = wgpu.interop.createHeapArena(2 * 1024 * 1024, 16);
const bytes = arena.allocU8(256, 16);
bytes.view().fill(1);
arena.reset();
arena.destroy();
```

## See Also
- [WasmGPU.createHeapArena](./wasmgpu-createheaparena.md)
- [WasmGPU.interop.WasmHeapArena.allocU8](./wasmgpu-interop-wasmheaparena-allocu8.md)
