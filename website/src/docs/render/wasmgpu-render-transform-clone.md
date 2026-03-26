# WasmGPU.createTransform().clone

## Summary
WasmGPU.createTransform().clone creates a new transform with the same local position, rotation, and scale as the source transform.
The cloned transform is a fresh object with a new internal store index.
Parent and children relationships are not copied, so the clone starts as a root node.
Use this for instancing local transforms without duplicating hierarchy links.

## Syntax
```ts
WasmGPU.createTransform().clone(): Transform
const clone = transform.clone();
```

## Parameters
This API does not take parameters.

## Returns
`Transform` - New transform initialized from the source transform's local TRS values.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const base = wgpu.createTransform();
base.setPosition(3, 1, -2).setRotationFromEuler(0, Math.PI / 4, 0).setScale(1.5, 1.5, 1.5);

const copy = base.clone();
console.log(copy.position, copy.rotation, copy.scale);
console.log(copy !== base, copy.parent === null);
```

## See Also
- [WasmGPU.createTransform().copyFrom](./wasmgpu-render-transform-copyfrom.md)
- [WasmGPU.createTransform().setPosition](./wasmgpu-render-transform-setposition.md)
- [WasmGPU.createTransform().setRotation](./wasmgpu-render-transform-setrotation.md)
- [WasmGPU.createTransform().setScale](./wasmgpu-render-transform-setscale.md)
- [WasmGPU.createTransform().reset](./wasmgpu-render-transform-reset.md)
