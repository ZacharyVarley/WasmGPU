# WasmGPU.createTransform().worldMatrix

## Summary
WasmGPU.createTransform().worldMatrix returns the composed world-space 4x4 matrix.
It includes local TRS plus all ancestor transforms in parent order.
WasmGPU updates dirty transforms before returning, so the matrix reflects the latest hierarchy state.
Use this for world-space bounds, custom culling, and external renderer interop.

## Syntax
```ts
WasmGPU.createTransform().worldMatrix: number[]
const world = transform.worldMatrix;
```

## Parameters
This API does not take parameters.

## Returns
`number[]` - World transform matrix as 16 numbers in column-major layout.

## Type Details
```ts
type Mat4 = [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const parent = wgpu.createTransform().setPosition(5, 0, 0);
const child = wgpu.createTransform().setPosition(1, 0, 0).setParent(parent);

const world = child.worldMatrix;
console.log(world[12], world[13], world[14]);
```

## See Also
- [WasmGPU.createTransform().localMatrix](./wasmgpu-render-transform-localmatrix.md)
- [WasmGPU.createTransform().worldPosition](./wasmgpu-render-transform-worldposition.md)
- [WasmGPU.createTransform().worldMatrixPtr](./wasmgpu-render-transform-worldmatrixptr.md)
- [WasmGPU.createTransform().setParent](./wasmgpu-render-transform-setparent.md)
- [WasmGPU.createTransform().traverse](./wasmgpu-render-transform-traverse.md)
