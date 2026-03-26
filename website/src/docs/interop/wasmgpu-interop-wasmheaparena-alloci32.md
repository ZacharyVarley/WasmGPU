# WasmGPU.createHeapArena().allocI32

## Summary
WasmGPU.createHeapArena().allocI32 allocates int32 storage from an arena as `WasmSlice<Int32Array>`.
The slice carries arena epoch metadata for stale-access detection.

## Syntax
```ts
WasmGPU.createHeapArena().allocI32(len: number): WasmSlice<Int32Array>
const slice = arena.allocI32(len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of int32 elements. |

## Returns
`WasmSlice<Int32Array>` - Arena-scoped int32 slice.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const arena = wgpu.createHeapArena(512 * 1024);
const deltas = arena.allocI32(16);
deltas.write([-8, -4, 0, 4, 8]);
console.log(deltas.isAlive());
```

## See Also
- [WasmGPU.createHeapArena().allocU32](./wasmgpu-interop-wasmheaparena-allocu32.md)
- [WasmGPU.createHeapArena().reset](./wasmgpu-interop-wasmheaparena-reset.md)
