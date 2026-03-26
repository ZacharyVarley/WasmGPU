# WasmGPU.interop.frame.allocI32

## Summary
WasmGPU.interop.frame.allocI32 allocates frame-scoped int32 storage as `WasmSlice<Int32Array>`.
Use this for short-lived signed scratch vectors and temporary index transforms.

## Syntax
```ts
WasmGPU.interop.frame.allocI32(len: number): WasmSlice<Int32Array>
const slice = wgpu.interop.frame.allocI32(len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of int32 elements to allocate. |

## Returns
`WasmSlice<Int32Array>` - Frame-scoped int32 slice.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const offsets = wgpu.interop.frame.allocI32(6);
offsets.write([-3, -2, -1, 0, 1, 2]);
console.log(offsets.handle());
```

## See Also
- [WasmGPU.interop.frame.allocU32](./wasmgpu-interop-frame-allocu32.md)
- [WasmGPU.interop.frame.allocU8](./wasmgpu-interop-frame-allocu8.md)
