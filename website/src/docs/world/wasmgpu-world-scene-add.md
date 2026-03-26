# Scene.add

## Summary
Scene.add inserts a renderable object into the scene. The method accepts `Mesh`, `PointCloud`, or `GlyphField` and ignores duplicate insertions of the same instance. It returns the same scene to support fluent setup code.

## Syntax
```ts
Scene.add(mesh: Mesh): Scene
Scene.add(pointCloud: PointCloud): Scene
Scene.add(glyphField: GlyphField): Scene
const result = scene.add(object);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mesh` | `Mesh` | Conditional | Triangle mesh object for surface rendering. |
| `pointCloud` | `PointCloud` | Conditional | Point cloud object for particle/sampled data rendering. |
| `glyphField` | `GlyphField` | Conditional | Glyph field object for vector/tensor style visualization. |

## Returns
`Scene` - The same scene instance after insertion.

## Type Details
```ts
type SceneObject = Mesh | PointCloud | GlyphField;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const geometry = wgpu.geometry.sphere(0.6, 24, 16);
const material = wgpu.material.unlit({ color: [0.2, 0.7, 0.95], opacity: 1.0 });
const mesh = wgpu.createMesh(geometry, material);
mesh.name = "sample-sphere";

scene.add(mesh);
```

## See Also
- [Scene.remove](./wasmgpu-world-scene-remove.md)
- [Scene.clear](./wasmgpu-world-scene-clear.md)
- [Scene.meshes](./wasmgpu-world-scene-meshes.md)
- [Scene.pointClouds](./wasmgpu-world-scene-pointclouds.md)
- [Scene.glyphFields](./wasmgpu-world-scene-glyphfields.md)
