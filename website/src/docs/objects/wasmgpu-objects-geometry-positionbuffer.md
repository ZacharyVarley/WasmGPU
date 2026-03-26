# Geometry.positionBuffer

## Summary
Geometry.positionBuffer reads the current `positionBuffer` value from this Geometry instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Geometry.positionBuffer: GPUBuffer
const value = geometry.positionBuffer;
```

## Parameters
This API does not take parameters.

## Returns
`GPUBuffer` - Current accessor value exposed by the runtime object.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.sphere(1, 24, 16);
const value = geometry.positionBuffer;
console.log(value);
```

## See Also
- [Geometry.boundsCenter](./wasmgpu-objects-geometry-boundscenter.md)
- [Geometry.boundsMax](./wasmgpu-objects-geometry-boundsmax.md)
- [Geometry.boundsMin](./wasmgpu-objects-geometry-boundsmin.md)
- [Geometry.boundsRadius](./wasmgpu-objects-geometry-boundsradius.md)
- [Geometry.destroy](./wasmgpu-objects-geometry-destroy.md)
- [Geometry.indexBuffer](./wasmgpu-objects-geometry-indexbuffer.md)
- [Geometry.isIndexed](./wasmgpu-objects-geometry-isindexed.md)
- [Geometry.isSkinned](./wasmgpu-objects-geometry-isskinned.md)
- [Geometry.isSkinned8](./wasmgpu-objects-geometry-isskinned8.md)
- [Geometry.joints1Buffer](./wasmgpu-objects-geometry-joints1buffer.md)
- [Geometry.jointsBuffer](./wasmgpu-objects-geometry-jointsbuffer.md)
- [Geometry.normalBuffer](./wasmgpu-objects-geometry-normalbuffer.md)
