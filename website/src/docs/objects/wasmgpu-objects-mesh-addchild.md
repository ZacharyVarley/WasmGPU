# Mesh.addChild

## Summary
Mesh.addChild operates on a Mesh runtime object to update state, query data, or manage lifecycle.

## Syntax
```ts
Mesh.addChild(child: Mesh): this
const result = mesh.addChild(child);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `child` | `Mesh` | Yes | Child mesh/transform reference used for hierarchy operations. |

## Returns
`this` - The same object instance, returned for fluent chaining.

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
const child = {};
const result = mesh.addChild(child);
console.log(result);
```

## See Also
- [Mesh.castShadow](./wasmgpu-objects-mesh-castshadow.md)
- [Mesh.clone](./wasmgpu-objects-mesh-clone.md)
- [Mesh.cloneWithMaterial](./wasmgpu-objects-mesh-clonewithmaterial.md)
- [Mesh.destroy](./wasmgpu-objects-mesh-destroy.md)
- [Mesh.getBounds](./wasmgpu-objects-mesh-getbounds.md)
- [Mesh.getLocalBounds](./wasmgpu-objects-mesh-getlocalbounds.md)
- [Mesh.getWorldBounds](./wasmgpu-objects-mesh-getworldbounds.md)
- [Mesh.receiveShadow](./wasmgpu-objects-mesh-receiveshadow.md)
- [Mesh.removeChild](./wasmgpu-objects-mesh-removechild.md)
- [Mesh.setParent](./wasmgpu-objects-mesh-setparent.md)
- [Mesh.visible](./wasmgpu-objects-mesh-visible.md)
- [Mesh.worldMatrix](./wasmgpu-objects-mesh-worldmatrix.md)
