# WasmGPU.createHeapArena().alloc

## Summary
WasmGPU.createHeapArena().alloc reserves a raw byte block from an arena.
Use this low-level method for custom layouts; typed methods (`allocF32`, `allocU32`, etc.) are usually safer.

## Syntax
```ts
WasmGPU.createHeapArena().alloc(bytes: number, alignBytes?: number): number
const ptr = arena.alloc(bytes, alignBytes);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `bytes` | `number` | Yes | Number of bytes to allocate from this arena. |
| `alignBytes` | `number` | No | Alignment requirement in bytes, default `16`. |

## Returns
`number` - Wasm pointer to the allocated byte region.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const arena = wgpu.createHeapArena(1 * 1024 * 1024);
const ptr = arena.alloc(256, 32);
const bytes = wgpu.interop.view(Uint8Array, ptr, 256);
bytes.fill(0xaa);
```

## See Also
- [WasmGPU.createHeapArena().allocU8](./wasmgpu-interop-wasmheaparena-allocu8.md)
- [WasmGPU.createHeapArena().reset](./wasmgpu-interop-wasmheaparena-reset.md)
