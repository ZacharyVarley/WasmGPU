# Scene.remove

## Summary
Scene.remove removes a `Mesh`, `PointCloud`, or `GlyphField` instance from the scene if it exists. Removing a missing object is a no-op. The method returns the same scene for chaining.

## Syntax
```ts
Scene.remove(mesh: Mesh): Scene
Scene.remove(pointCloud: PointCloud): Scene
Scene.remove(glyphField: GlyphField): Scene
const result = scene.remove(object);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mesh` | `Mesh` | Conditional | Mesh instance to remove from `scene.meshes`. |
| `pointCloud` | `PointCloud` | Conditional | Point cloud instance to remove from `scene.pointClouds`. |
| `glyphField` | `GlyphField` | Conditional | Glyph field instance to remove from `scene.glyphFields`. |

## Returns
`Scene` - The same scene instance after removal attempt.

## Type Details
```ts
type SceneObject = Mesh | PointCloud | GlyphField;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const mesh = wgpu.createMesh(wgpu.geometry.box(1, 1, 1), wgpu.material.unlit({ color: [1, 0.6, 0.2] }));
scene.add(mesh);
scene.remove(mesh);
```

## See Also
- [Scene.add](./wasmgpu-world-scene-add.md)
- [Scene.clear](./wasmgpu-world-scene-clear.md)
- [Scene.meshes](./wasmgpu-world-scene-meshes.md)
- [Scene.pointClouds](./wasmgpu-world-scene-pointclouds.md)
- [Scene.glyphFields](./wasmgpu-world-scene-glyphfields.md)
