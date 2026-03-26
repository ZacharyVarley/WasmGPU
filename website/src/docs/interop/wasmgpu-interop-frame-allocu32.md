# WasmGPU.interop.frame.allocU32

## Summary
WasmGPU.interop.frame.allocU32 allocates frame-scoped uint32 storage as `WasmSlice<Uint32Array>`.
The allocation is lightweight and automatically invalidated on frame reset.

## Syntax
```ts
WasmGPU.interop.frame.allocU32(len: number): WasmSlice<Uint32Array>
const slice = wgpu.interop.frame.allocU32(len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of uint32 elements to allocate. |

## Returns
`WasmSlice<Uint32Array>` - Frame-scoped uint32 slice.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const counts = wgpu.interop.frame.allocU32(16);
counts.write([1, 2, 3, 4]);
console.log(counts.view()[2]);
```

## See Also
- [WasmGPU.interop.frame.allocI32](./wasmgpu-interop-frame-alloci32.md)
- [WasmGPU.frameArena.epoch](./wasmgpu-framearena-epoch.md)
