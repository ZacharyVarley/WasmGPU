# PointCloud.onVisualChange

## Summary
PointCloud.onVisualChange registers a listener for visual-state changes and returns an unsubscribe callback.

## Syntax
```ts
PointCloud.onVisualChange(listener: (kind: PointCloudVisualChangeKind) => void): () => void
const result = pointCloud.onVisualChange(listener);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `(kind: PointCloudVisualChangeKind) => void` | Yes | Callback invoked when visual-relevant state changes. |

## Returns
`() => void` - Function that unsubscribes or unregisters the listener created by this call.

## Type Details
### PointCloudVisualChangeKind

```ts
type PointCloudVisualChangeKind = "scale" | "colormap" | "visual";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const listener = (kind) => console.log(kind);
const result = pointCloud.onVisualChange(listener);
console.log(result);
```

## See Also
- [PointCloud.applyScaleStats](./wasmgpu-objects-pointcloud-applyscalestats.md)
- [PointCloud.basePointSize](./wasmgpu-objects-pointcloud-basepointsize.md)
- [PointCloud.colormap](./wasmgpu-objects-pointcloud-colormap.md)
- [PointCloud.colormapStops](./wasmgpu-objects-pointcloud-colormapstops.md)
- [PointCloud.computeBoundsFromCPUData](./wasmgpu-objects-pointcloud-computeboundsfromcpudata.md)
- [PointCloud.destroy](./wasmgpu-objects-pointcloud-destroy.md)
- [PointCloud.dirtyUniforms](./wasmgpu-objects-pointcloud-dirtyuniforms.md)
- [PointCloud.dropCPUData](./wasmgpu-objects-pointcloud-dropcpudata.md)
- [PointCloud.getBounds](./wasmgpu-objects-pointcloud-getbounds.md)
- [PointCloud.getColormapForBinding](./wasmgpu-objects-pointcloud-getcolormapforbinding.md)
- [PointCloud.getColormapKey](./wasmgpu-objects-pointcloud-getcolormapkey.md)
- [PointCloud.getLocalBounds](./wasmgpu-objects-pointcloud-getlocalbounds.md)
