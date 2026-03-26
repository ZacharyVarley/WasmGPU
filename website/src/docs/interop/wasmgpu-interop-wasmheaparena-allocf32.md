# WasmGPU.createHeapArena().allocF32

## Summary
WasmGPU.createHeapArena().allocF32 allocates float32 elements from an arena and returns a `WasmSlice<Float32Array>`.
The slice remains valid until arena reset or destroy.

## Syntax
```ts
WasmGPU.createHeapArena().allocF32(len: number): WasmSlice<Float32Array>
const slice = arena.allocF32(len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of float32 elements to allocate. |

## Returns
`WasmSlice<Float32Array>` - Arena-scoped float32 slice.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const arena = wgpu.createHeapArena(2 * 1024 * 1024);
const coeffs = arena.allocF32(256);
coeffs.view().fill(0.25);
console.log(coeffs.handle());
```

## See Also
- [WasmGPU.createHeapArena().allocU32](./wasmgpu-interop-wasmheaparena-allocu32.md)
- [WasmGPU.createHeapArena().epoch](./wasmgpu-interop-wasmheaparena-epoch.md)
