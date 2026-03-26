# WasmGPU.interop.frame.allocU8

## Summary
WasmGPU.interop.frame.allocU8 allocates frame-scoped byte storage as `WasmSlice<Uint8Array>`.
It is useful for temporary packed structs and upload staging blobs.

## Syntax
```ts
WasmGPU.interop.frame.allocU8(len: number, align?: number): WasmSlice<Uint8Array>
const slice = wgpu.interop.frame.allocU8(len, align);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of bytes to allocate. |
| `align` | `number` | No | Allocation alignment in bytes, default `16`. |

## Returns
`WasmSlice<Uint8Array>` - Frame-scoped byte slice.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const blob = wgpu.interop.frame.allocU8(48, 16);
blob.view().set([1, 3, 3, 7]);
console.log(blob.ptr, blob.byteLength, blob.isAlive());
```

## See Also
- [WasmGPU.interop.frame.allocF32](./wasmgpu-interop-frame-allocf32.md)
- [WasmGPU.frameArena.reset](./wasmgpu-framearena-reset.md)
