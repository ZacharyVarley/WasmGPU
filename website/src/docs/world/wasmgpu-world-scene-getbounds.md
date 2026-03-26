# Scene.getBounds

## Summary
Scene.getBounds computes an aggregate bounding volume from meshes, point clouds, and glyph fields. By default it only considers visible objects, but you can include hidden objects with `visibleOnly: false`. The result includes box and sphere bounds plus empty/partial flags.

## Syntax
```ts
Scene.getBounds(options?: SceneBoundsOptions): Bounds3
const bounds = scene.getBounds(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `SceneBoundsOptions` | No | Controls whether hidden objects are included in the aggregation. |

## Returns
`Bounds3` - Aggregated world-space bounds for the selected object subset.

## Type Details
### SceneBoundsOptions

```ts
type SceneBoundsOptions = {
    visibleOnly?: boolean;
};
```

#### SceneBoundsOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `visibleOnly` | `boolean` | No | When true (default), ignore objects with `visible === false`. |

### Vec3

```ts
type Vec3 = [number, number, number];
```

### Bounds3

```ts
type Bounds3 = {
    boxMin: Vec3;
    boxMax: Vec3;
    sphereCenter: Vec3;
    sphereRadius: number;
    empty: boolean;
    partial: boolean;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.add(wgpu.createMesh(wgpu.geometry.box(2, 1, 1), wgpu.material.unlit({ color: [0.7, 0.8, 1.0] })));
const visibleBounds = scene.getBounds();
const allBounds = scene.getBounds({ visibleOnly: false });
console.log(visibleBounds, allBounds);
```

## See Also
- [Scene.visibleMeshes](./wasmgpu-world-scene-visiblemeshes.md)
- [Scene.visiblePointClouds](./wasmgpu-world-scene-visiblepointclouds.md)
- [Scene.visibleGlyphFields](./wasmgpu-world-scene-visibleglyphfields.md)
- [Scene.traverseVisible](./wasmgpu-world-scene-traversevisible.md)
