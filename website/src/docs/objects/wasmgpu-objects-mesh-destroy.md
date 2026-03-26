# Mesh.destroy

## Summary
Mesh.destroy releases GPU resources and clears owned runtime state for this Mesh. Call it when the object is no longer needed.

## Syntax
```ts
Mesh.destroy(): void
mesh.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

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
mesh.destroy();
console.log("updated");
```

## See Also
- [Mesh.addChild](./wasmgpu-objects-mesh-addchild.md)
- [Mesh.castShadow](./wasmgpu-objects-mesh-castshadow.md)
- [Mesh.clone](./wasmgpu-objects-mesh-clone.md)
- [Mesh.cloneWithMaterial](./wasmgpu-objects-mesh-clonewithmaterial.md)
- [Mesh.getBounds](./wasmgpu-objects-mesh-getbounds.md)
- [Mesh.getLocalBounds](./wasmgpu-objects-mesh-getlocalbounds.md)
- [Mesh.getWorldBounds](./wasmgpu-objects-mesh-getworldbounds.md)
- [Mesh.receiveShadow](./wasmgpu-objects-mesh-receiveshadow.md)
- [Mesh.removeChild](./wasmgpu-objects-mesh-removechild.md)
- [Mesh.setParent](./wasmgpu-objects-mesh-setparent.md)
- [Mesh.visible](./wasmgpu-objects-mesh-visible.md)
- [Mesh.worldMatrix](./wasmgpu-objects-mesh-worldmatrix.md)
