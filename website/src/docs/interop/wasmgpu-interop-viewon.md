# WasmGPU.interop.viewOn

## Summary
WasmGPU.interop.viewOn creates a typed-array view on an explicit buffer at a Wasm pointer offset.
Use this when you already have the target buffer reference and want typed access.

## Syntax
```ts
WasmGPU.interop.viewOn<T extends WasmTypedArray>(ctor: WasmTypedArrayConstructor<T>, buffer: ArrayBufferLike, ptr: number, len: number): T
const view = wgpu.interop.viewOn(ctor, buffer, ptr, len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `ctor` | `WasmTypedArrayConstructor<T>` | Yes | Typed-array constructor (`Float32Array`, `Uint32Array`, `Int32Array`, `Uint8Array`, etc.). |
| `buffer` | `ArrayBufferLike` | Yes | Backing buffer to view. |
| `ptr` | `number` | Yes | Byte offset (Wasm pointer) into `buffer`. |
| `len` | `number` | Yes | Element count for the typed view. |

## Returns
`T` - Typed array view on the requested buffer segment.

## Type Details
```ts
type WasmTypedArray = Float32Array | Uint32Array | Int32Array | Uint8Array;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const ptr = wgpu.frameArena.allocF32(8);
const buffer = wgpu.interop.buffer();
const f32 = wgpu.interop.viewOn(Float32Array, buffer, ptr, 8);
f32.set([0, 1, 2, 3, 4, 5, 6, 7]);
```

## See Also
- [WasmGPU.interop.view](./wasmgpu-interop-view.md)
- [WasmGPU.interop.buffer](./wasmgpu-interop-buffer.md)
