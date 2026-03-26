# WasmGPU.interop

## Summary
WasmGPU.interop exposes low-level WebAssembly memory interop primitives.
It provides direct memory views, heap and frame allocators returning `WasmSlice`, shared-memory checks, and arena creation helpers.
Use this surface when integrating custom kernels, external runtimes, or zero-copy pipelines.

## Syntax
```ts
WasmGPU.interop: WasmInterop
const interop = wgpu.interop;
```

## Parameters
This accessor does not take parameters.

## Returns
`WasmInterop` - Object containing memory/view/allocation helpers.

## Type Details
```ts
type WasmInterop = {
    buffer(): ArrayBufferLike;
    bytes(): Uint8Array;
    isSharedMemory(): boolean;
    requireSharedMemory(): SharedArrayBuffer;
    viewOn<T extends TypedArray>(ctor: TypedArrayCtor<T>, buffer: ArrayBufferLike, ptr: number, len: number): T;
    view<T extends TypedArray>(ctor: TypedArrayCtor<T>, ptr: number, len: number): T;
    createHeapArena(capBytes: number, align?: number): WasmHeapArena;
    viewFromHandle(buffer: ArrayBufferLike, handle: WasmSliceHandle): ArrayBufferView;
    heap: {
        allocF32(len: number): WasmSlice<Float32Array>;
        allocU32(len: number): WasmSlice<Uint32Array>;
        allocI32(len: number): WasmSlice<Int32Array>;
        allocU8(len: number, align?: number): WasmSlice<Uint8Array>;
    };
    frame: {
        allocF32(len: number): WasmSlice<Float32Array>;
        allocU32(len: number): WasmSlice<Uint32Array>;
        allocI32(len: number): WasmSlice<Int32Array>;
        allocU8(len: number, align?: number): WasmSlice<Uint8Array>;
    };
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scratch = wgpu.interop.frame.allocF32(256);
const values = scratch.view();
for (let i = 0; i < values.length; i++) values[i] = Math.sin(i * 0.01);
console.log(scratch.handle(), scratch.isAlive());
wgpu.frameArena.reset();
```

## See Also
- [WasmGPU.interop.heap.allocF32](./wasmgpu-interop-heap-allocf32.md)
- [WasmGPU.interop.frame.allocF32](./wasmgpu-interop-frame-allocf32.md)
- [WasmGPU.interop.createHeapArena](./wasmgpu-interop-createheaparena.md)
- [WasmGPU.interop.WasmSlice.view](./wasmgpu-interop-wasmslice-view.md)
