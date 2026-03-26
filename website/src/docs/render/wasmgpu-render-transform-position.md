# WasmGPU.createTransform().position

## Summary
WasmGPU.createTransform().position exposes the transform's local translation vector.
This value is local to the transform's parent coordinate space.
Use `setPosition` or `translate` to update it so store synchronization and dirty tracking happen correctly.
Reading this property is inexpensive and safe in per-frame update code.

## Syntax
```ts
WasmGPU.createTransform().position: number[]
const position = transform.position;
```

## Parameters
This API does not take parameters.

## Returns
`number[]` - Local translation as `[x, y, z]`.

## Type Details
```ts
type LocalPosition = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const transform = wgpu.createTransform();
transform.setPosition(0, 1.5, -4);

const [x, y, z] = transform.position;
console.log(x, y, z);
```

## See Also
- [WasmGPU.createTransform().setPosition](./wasmgpu-render-transform-setposition.md)
- [WasmGPU.createTransform().translate](./wasmgpu-render-transform-translate.md)
- [WasmGPU.createTransform().worldPosition](./wasmgpu-render-transform-worldposition.md)
- [WasmGPU.createTransform().positionPtr](./wasmgpu-render-transform-positionptr.md)
- [WasmGPU.createTransform().localMatrix](./wasmgpu-render-transform-localmatrix.md)
