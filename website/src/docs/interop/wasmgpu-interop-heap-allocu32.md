# WasmGPU.interop.heap.allocU32

## Summary
WasmGPU.interop.heap.allocU32 allocates heap-owned unsigned 32-bit storage as a `WasmSlice<Uint32Array>`.
Use this for index lists, counts, and integer metadata that must persist across frames.

## Syntax
```ts
WasmGPU.interop.heap.allocU32(len: number): WasmSlice<Uint32Array>
const slice = wgpu.interop.heap.allocU32(len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of uint32 elements to allocate. |

## Returns
`WasmSlice<Uint32Array>` - Heap slice of uint32 data.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const ids = wgpu.interop.heap.allocU32(5);
ids.write([2, 4, 6, 8, 10]);
console.log(ids.view()[3]);
ids.free();
```

## See Also
- [WasmGPU.interop.heap.allocI32](./wasmgpu-interop-heap-alloci32.md)
- [WasmGPU.interop.WasmSlice.write](./wasmgpu-interop-wasmslice-write.md)
