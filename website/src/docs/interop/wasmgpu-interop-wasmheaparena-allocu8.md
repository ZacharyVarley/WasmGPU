# WasmGPU.createHeapArena().allocU8

## Summary
WasmGPU.createHeapArena().allocU8 allocates byte storage from an arena and returns `WasmSlice<Uint8Array>`.
This is useful for packed binary payloads, headers, and staging buffers.

## Syntax
```ts
WasmGPU.createHeapArena().allocU8(len: number, alignBytes?: number): WasmSlice<Uint8Array>
const slice = arena.allocU8(len, alignBytes);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of bytes to allocate. |
| `alignBytes` | `number` | No | Byte alignment for this allocation, default `16`. |

## Returns
`WasmSlice<Uint8Array>` - Arena-scoped byte slice.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const arena = wgpu.createHeapArena(256 * 1024);
const payload = arena.allocU8(32, 16);
payload.view().set([1, 2, 3, 4, 5, 6]);
console.log(payload.byteLength, payload.ptr);
```

## See Also
- [WasmGPU.createHeapArena().alloc](./wasmgpu-interop-wasmheaparena-alloc.md)
- [WasmGPU.createHeapArena().usedBytes](./wasmgpu-interop-wasmheaparena-usedbytes.md)
