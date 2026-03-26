# WasmGPU.createHeapArena().allocU32

## Summary
WasmGPU.createHeapArena().allocU32 allocates uint32 storage from an arena as a `WasmSlice<Uint32Array>`.
Use this for persistent integer metadata within a controlled arena lifetime.

## Syntax
```ts
WasmGPU.createHeapArena().allocU32(len: number): WasmSlice<Uint32Array>
const slice = arena.allocU32(len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of uint32 elements. |

## Returns
`WasmSlice<Uint32Array>` - Arena-scoped uint32 slice.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const arena = wgpu.createHeapArena(512 * 1024);
const ids = arena.allocU32(128);
ids.write([10, 20, 30, 40]);
console.log(ids.view()[1]);
```

## See Also
- [WasmGPU.createHeapArena().allocI32](./wasmgpu-interop-wasmheaparena-alloci32.md)
- [WasmGPU.createHeapArena().usedBytes](./wasmgpu-interop-wasmheaparena-usedbytes.md)
