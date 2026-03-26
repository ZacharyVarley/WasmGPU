# Mesh.cloneWithMaterial

## Summary
Mesh.cloneWithMaterial operates on a Mesh runtime object to update state, query data, or manage lifecycle.

## Syntax
```ts
Mesh.cloneWithMaterial(material: Material): Mesh
const result = mesh.cloneWithMaterial(material);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `material` | `Material` | Yes | Material instance that controls shading, blending, and uniforms. |

## Returns
`Mesh` - Mesh runtime object ready for scene attachment and rendering.

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
const result = mesh.cloneWithMaterial(material);
console.log(result);
```

## See Also
- [Mesh.addChild](./wasmgpu-objects-mesh-addchild.md)
- [Mesh.castShadow](./wasmgpu-objects-mesh-castshadow.md)
- [Mesh.clone](./wasmgpu-objects-mesh-clone.md)
- [Mesh.destroy](./wasmgpu-objects-mesh-destroy.md)
- [Mesh.getBounds](./wasmgpu-objects-mesh-getbounds.md)
- [Mesh.getLocalBounds](./wasmgpu-objects-mesh-getlocalbounds.md)
- [Mesh.getWorldBounds](./wasmgpu-objects-mesh-getworldbounds.md)
- [Mesh.receiveShadow](./wasmgpu-objects-mesh-receiveshadow.md)
- [Mesh.removeChild](./wasmgpu-objects-mesh-removechild.md)
- [Mesh.setParent](./wasmgpu-objects-mesh-setparent.md)
- [Mesh.visible](./wasmgpu-objects-mesh-visible.md)
- [Mesh.worldMatrix](./wasmgpu-objects-mesh-worldmatrix.md)
