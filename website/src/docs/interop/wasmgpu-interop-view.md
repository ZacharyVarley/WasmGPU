# WasmGPU.interop.view

## Summary
WasmGPU.interop.view creates a typed-array view into current WebAssembly memory.
It is a convenience wrapper over `interop.buffer()` + `interop.viewOn(...)`.

## Syntax
```ts
WasmGPU.interop.view<T extends WasmTypedArray>(ctor: WasmTypedArrayConstructor<T>, ptr: number, len: number): T
const view = wgpu.interop.view(ctor, ptr, len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `ctor` | `WasmTypedArrayConstructor<T>` | Yes | Typed-array constructor for the desired element type. |
| `ptr` | `number` | Yes | Wasm byte pointer where the view starts. |
| `len` | `number` | Yes | Number of elements in the view. |

## Returns
`T` - Typed view on live Wasm memory.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const ptr = wgpu.frameArena.alloc(64, 16);
const u32 = wgpu.interop.view(Uint32Array, ptr, 16);
u32.fill(42);
```

## See Also
- [WasmGPU.interop.viewOn](./wasmgpu-interop-viewon.md)
- [WasmGPU.interop.bytes](./wasmgpu-interop-bytes.md)
