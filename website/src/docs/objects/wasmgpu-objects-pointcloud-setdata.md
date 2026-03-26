# PointCloud.setData

## Summary
PointCloud.setData updates data state on this PointCloud and marks dependent GPU data for refresh.

## Syntax
```ts
PointCloud.setData(data: Float32Array, opts?: { keepCPUData?: boolean }): void
pointCloud.setData(data, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | `Float32Array` | Yes | Packed numeric data consumed by this API. |
| `opts` | `{ keepCPUData?: boolean }` | No | Optional configuration object that customizes behavior for this call. |

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
### SetDataopts

```ts
type SetDataopts = {

    keepCPUData?: boolean;

};
```

#### SetDataopts Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `keepCPUData` | `boolean` | No | When true, CPU arrays are retained after upload. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const data = new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]);
const opts = { keepCPUData: true };
pointCloud.setData(data, opts);
console.log("updated");
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
