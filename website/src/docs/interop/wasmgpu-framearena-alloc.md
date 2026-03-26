# WasmGPU.frameArena.alloc

## Summary
WasmGPU.frameArena.alloc allocates raw bytes from the global frame arena.
This is the low-level pointer API used when you need custom byte layouts.
Memory becomes invalid after `frameArena.reset()`.

## Syntax
```ts
WasmGPU.frameArena.alloc(bytes: number, align?: number): number
const ptr = wgpu.frameArena.alloc(bytes, align);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `bytes` | `number` | Yes | Number of bytes to reserve from the frame arena. |
| `align` | `number` | No | Alignment in bytes, default `16`. |

## Returns
`number` - Wasm pointer to the allocated byte region.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const ptr = wgpu.frameArena.alloc(4096, 32);
const view = wgpu.interop.view(Uint8Array, ptr, 4096);
view.fill(0);
```

## See Also
- [WasmGPU.frameArena.allocF32](./wasmgpu-framearena-allocf32.md)
- [WasmGPU.interop.view](./wasmgpu-interop-view.md)
- [WasmGPU.frameArena.reset](./wasmgpu-framearena-reset.md)
