# WasmGPU.interop.viewFromHandle

## Summary
WasmGPU.interop.viewFromHandle reconstructs a typed view from a serialized `WasmSliceHandle`.
This is useful when passing handles across API boundaries and restoring typed access later.

## Syntax
```ts
WasmGPU.interop.viewFromHandle(buffer: ArrayBufferLike, handle: WasmSliceHandle): ArrayBufferView
const view = wgpu.interop.viewFromHandle(buffer, handle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `buffer` | `ArrayBufferLike` | Yes | Buffer that owns the pointer region described by `handle`. |
| `handle` | `WasmSliceHandle` | Yes | Handle containing kind/dtype/pointer/length metadata. |

## Returns
`ArrayBufferView` - Typed array instance selected from `handle.dtype`.

## Type Details
```ts
type WasmSliceHandle = {
    kind: "heap" | "frame" | "arena";
    dtype: "f32" | "u32" | "i32" | "u8";
    ptr: number;
    length: number;
    epoch?: number;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const slice = wgpu.interop.heap.allocU32(4);
slice.write([11, 22, 33, 44]);
const handle = slice.handle();
const restored = wgpu.interop.viewFromHandle(wgpu.interop.buffer(), handle);
console.log(restored);
slice.free();
```

## See Also
- [WasmGPU.interop.WasmSlice.handle](./wasmgpu-interop-wasmslice-handle.md)
- [WasmGPU.interop.WasmSlice.view](./wasmgpu-interop-wasmslice-view.md)
