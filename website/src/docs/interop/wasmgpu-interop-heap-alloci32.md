# WasmGPU.interop.heap.allocI32

## Summary
WasmGPU.interop.heap.allocI32 allocates heap-owned signed 32-bit storage as `WasmSlice<Int32Array>`.
This is useful for offsets, signed indices, and sentinel-based metadata.

## Syntax
```ts
WasmGPU.interop.heap.allocI32(len: number): WasmSlice<Int32Array>
const slice = wgpu.interop.heap.allocI32(len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of int32 elements to allocate. |

## Returns
`WasmSlice<Int32Array>` - Heap slice of int32 data.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const signed = wgpu.interop.heap.allocI32(4);
signed.write([-1, 0, 1, 2]);
console.log(signed.view());
signed.free();
```

## See Also
- [WasmGPU.interop.heap.allocU32](./wasmgpu-interop-heap-allocu32.md)
- [WasmGPU.interop.WasmSlice.view](./wasmgpu-interop-wasmslice-view.md)
