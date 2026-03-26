# WasmGPU.interop.WasmSlice.write

## Summary
WasmGPU.interop.WasmSlice.write copies numeric source data into a slice view.
It supports optional source offset and optional zero-fill before copy.
This is convenient for quickly initializing slice contents from JS arrays or typed arrays.

## Syntax
```ts
WasmGPU.interop.WasmSlice.write(src: ArrayLike<number> | null | undefined, srcOffset?: number, zeroFill?: boolean): void
slice.write(src, srcOffset, zeroFill);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `ArrayLike<number> \| null \| undefined` | Yes | Source values to copy into the slice. |
| `srcOffset` | `number` | No | Starting source index, default `0`. |
| `zeroFill` | `boolean` | No | Whether to clear destination before copy, default `true`. |

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const slice = wgpu.interop.heap.allocU32(6);
slice.write([10, 20, 30, 40, 50], 1, true);
console.log(slice.view());
slice.free();
```

## See Also
- [WasmGPU.interop.WasmSlice.view](./wasmgpu-interop-wasmslice-view.md)
- [WasmGPU.interop.WasmSlice.handle](./wasmgpu-interop-wasmslice-handle.md)
