# Geometry.boundsRadius

## Summary
Geometry.boundsRadius reads the current `boundsRadius` value from this Geometry instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Geometry.boundsRadius: number
const value = geometry.boundsRadius;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Numeric scalar result produced by this operation.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.sphere(1, 24, 16);
const value = geometry.boundsRadius;
console.log(value);
```

## See Also
- [Geometry.boundsCenter](./wasmgpu-objects-geometry-boundscenter.md)
- [Geometry.boundsMax](./wasmgpu-objects-geometry-boundsmax.md)
- [Geometry.boundsMin](./wasmgpu-objects-geometry-boundsmin.md)
- [Geometry.destroy](./wasmgpu-objects-geometry-destroy.md)
- [Geometry.indexBuffer](./wasmgpu-objects-geometry-indexbuffer.md)
- [Geometry.isIndexed](./wasmgpu-objects-geometry-isindexed.md)
- [Geometry.isSkinned](./wasmgpu-objects-geometry-isskinned.md)
- [Geometry.isSkinned8](./wasmgpu-objects-geometry-isskinned8.md)
- [Geometry.joints1Buffer](./wasmgpu-objects-geometry-joints1buffer.md)
- [Geometry.jointsBuffer](./wasmgpu-objects-geometry-jointsbuffer.md)
- [Geometry.normalBuffer](./wasmgpu-objects-geometry-normalbuffer.md)
- [Geometry.positionBuffer](./wasmgpu-objects-geometry-positionbuffer.md)
