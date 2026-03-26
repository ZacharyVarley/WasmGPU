# Mesh.setParent

## Summary
Mesh.setParent updates parent state on this Mesh and marks dependent GPU data for refresh.

## Syntax
```ts
Mesh.setParent(parent: Mesh | null): this
const result = mesh.setParent(parent);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `parent` | `Mesh \| null` | Yes | Parent mesh/transform reference; use null to detach. |

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
const parent = null;
const result = mesh.setParent(parent);
console.log(result);
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
- [Mesh.receiveShadow](./wasmgpu-objects-mesh-receiveshadow.md)
- [Mesh.removeChild](./wasmgpu-objects-mesh-removechild.md)
- [Mesh.visible](./wasmgpu-objects-mesh-visible.md)
- [Mesh.worldMatrix](./wasmgpu-objects-mesh-worldmatrix.md)
