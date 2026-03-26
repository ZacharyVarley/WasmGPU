# Mesh.receiveShadow

## Summary
Mesh.receiveShadow reads the current `receiveShadow` value from this Mesh instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Mesh.receiveShadow: boolean
const value = mesh.receiveShadow;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Boolean result indicating whether the queried condition is satisfied.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.box(1, 1, 1);
const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const mesh = wgpu.createMesh(geometry, material);
const value = mesh.receiveShadow;
console.log(value);
```

## See Also
- [Mesh.addChild](./wasmgpu-objects-mesh-addchild.md)
- [Mesh.castShadow](./wasmgpu-objects-mesh-castshadow.md)
- [Mesh.clone](./wasmgpu-objects-mesh-clone.md)
- [Mesh.cloneWithMaterial](./wasmgpu-objects-mesh-clonewithmaterial.md)
- [Mesh.destroy](./wasmgpu-objects-mesh-destroy.md)
- [Mesh.getBounds](./wasmgpu-objects-mesh-getbounds.md)
- [Mesh.getLocalBounds](./wasmgpu-objects-mesh-getlocalbounds.md)
- [Mesh.getWorldBounds](./wasmgpu-objects-mesh-getworldbounds.md)
- [Mesh.removeChild](./wasmgpu-objects-mesh-removechild.md)
- [Mesh.setParent](./wasmgpu-objects-mesh-setparent.md)
- [Mesh.visible](./wasmgpu-objects-mesh-visible.md)
- [Mesh.worldMatrix](./wasmgpu-objects-mesh-worldmatrix.md)
