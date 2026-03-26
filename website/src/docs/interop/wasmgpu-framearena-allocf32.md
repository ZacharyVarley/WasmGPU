# WasmGPU.frameArena.allocF32

## Summary
WasmGPU.frameArena.allocF32 allocates contiguous float32 storage in the global frame arena.
It returns a raw pointer; use `WasmGPU.interop.view(Float32Array, ptr, len)` to access values.

## Syntax
```ts
WasmGPU.frameArena.allocF32(len: number): number
const ptr = wgpu.frameArena.allocF32(len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of `float32` elements to allocate. |

## Returns
`number` - Pointer to the first float32 element.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const ptr = wgpu.frameArena.allocF32(16);
const m = wgpu.interop.view(Float32Array, ptr, 16);
m.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
```

## See Also
- [WasmGPU.frameArena.alloc](./wasmgpu-framearena-alloc.md)
- [WasmGPU.interop.frame.allocF32](./wasmgpu-interop-frame-allocf32.md)
- [WasmGPU.interop.view](./wasmgpu-interop-view.md)
