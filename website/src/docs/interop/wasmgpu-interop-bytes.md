# WasmGPU.interop.bytes

## Summary
WasmGPU.interop.bytes returns a byte-wide view over the entire WebAssembly memory.
The helper internally refreshes cached view objects when memory buffers change.

## Syntax
```ts
WasmGPU.interop.bytes(): Uint8Array
const bytes = wgpu.interop.bytes();
```

## Parameters
This API does not take parameters.

## Returns
`Uint8Array` - Live byte view on WebAssembly memory.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const ptr = wgpu.frameArena.alloc(16, 16);
const bytes = wgpu.interop.bytes();
bytes[ptr + 0] = 10;
bytes[ptr + 1] = 20;
console.log(bytes.subarray(ptr, ptr + 2));
```

## See Also
- [WasmGPU.interop.buffer](./wasmgpu-interop-buffer.md)
- [WasmGPU.interop.view](./wasmgpu-interop-view.md)
