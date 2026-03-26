# WasmGPU.interop.heap.allocU8

## Summary
WasmGPU.interop.heap.allocU8 allocates heap-owned byte storage and returns `WasmSlice<Uint8Array>`.
Optional alignment checks can be requested for interop with alignment-sensitive native code.

## Syntax
```ts
WasmGPU.interop.heap.allocU8(len: number, align?: number): WasmSlice<Uint8Array>
const slice = wgpu.interop.heap.allocU8(len, align);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of bytes to allocate. |
| `align` | `number` | No | Alignment requirement check, default `16`. |

## Returns
`WasmSlice<Uint8Array>` - Heap byte slice.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const packet = wgpu.interop.heap.allocU8(64, 16);
packet.view().set([0xde, 0xad, 0xbe, 0xef]);
console.log(packet.ptr.toString(16), packet.byteLength);
packet.free();
```

## See Also
- [WasmGPU.interop.heap.allocF32](./wasmgpu-interop-heap-allocf32.md)
- [WasmGPU.interop.WasmSlice.free](./wasmgpu-interop-wasmslice-free.md)
