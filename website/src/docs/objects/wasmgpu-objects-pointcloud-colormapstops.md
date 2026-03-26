# PointCloud.colormapStops

## Summary
PointCloud.colormapStops reads the current `colormapStops` value from this PointCloud instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
PointCloud.colormapStops: ReadonlyArray<Color4>
const value = pointCloud.colormapStops;
```

## Parameters
This API does not take parameters.

## Returns
`ReadonlyArray<Color4>` - Current accessor value exposed by the runtime object.

## Type Details
### Color4

```ts
type Color4 = [number, number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const value = pointCloud.colormapStops;
console.log(value);
```

## See Also
- [PointCloud.applyScaleStats](./wasmgpu-objects-pointcloud-applyscalestats.md)
- [PointCloud.basePointSize](./wasmgpu-objects-pointcloud-basepointsize.md)
- [PointCloud.colormap](./wasmgpu-objects-pointcloud-colormap.md)
- [PointCloud.computeBoundsFromCPUData](./wasmgpu-objects-pointcloud-computeboundsfromcpudata.md)
- [PointCloud.destroy](./wasmgpu-objects-pointcloud-destroy.md)
- [PointCloud.dirtyUniforms](./wasmgpu-objects-pointcloud-dirtyuniforms.md)
- [PointCloud.dropCPUData](./wasmgpu-objects-pointcloud-dropcpudata.md)
- [PointCloud.getBounds](./wasmgpu-objects-pointcloud-getbounds.md)
- [PointCloud.getColormapForBinding](./wasmgpu-objects-pointcloud-getcolormapforbinding.md)
- [PointCloud.getColormapKey](./wasmgpu-objects-pointcloud-getcolormapkey.md)
- [PointCloud.getLocalBounds](./wasmgpu-objects-pointcloud-getlocalbounds.md)
- [PointCloud.getPointRecord](./wasmgpu-objects-pointcloud-getpointrecord.md)
