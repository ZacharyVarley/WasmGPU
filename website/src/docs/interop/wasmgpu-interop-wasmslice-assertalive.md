# WasmGPU.interop.WasmSlice.assertAlive

## Summary
WasmGPU.interop.WasmSlice.assertAlive throws if a slice is no longer valid.
Use this in defensive pathways before handing slice pointers to lower-level routines.

## Syntax
```ts
WasmGPU.interop.WasmSlice.assertAlive(): void
slice.assertAlive();
```

## Parameters
This API does not take parameters.

## Returns
`void` - Throws on invalid state; otherwise returns normally.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const slice = wgpu.interop.frame.allocF32(2);
wgpu.frameArena.reset();
try {
    slice.assertAlive();
} catch (error) {
    console.error(error);
}
```

## See Also
- [WasmGPU.interop.WasmSlice.isAlive](./wasmgpu-interop-wasmslice-isalive.md)
- [WasmGPU.interop.WasmSlice.view](./wasmgpu-interop-wasmslice-view.md)
