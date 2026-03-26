# WasmGPU.createPointCloud

## Summary
WasmGPU.createPointCloud creates a GPU-backed point cloud from packed point/scalar data. It supports scale transforms and colormap-driven visual mapping.

## Syntax
```ts
WasmGPU.createPointCloud(descriptor: PointCloudDescriptor): PointCloud
const result = wgpu.createPointCloud(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `PointCloudDescriptor` | Yes | Descriptor object that defines the initial configuration for this runtime object. |

## Returns
`PointCloud` - PointCloud runtime object configured for scalar-based point rendering.

## Type Details
### PointCloudDescriptor

```ts
type PointCloudDescriptor = {
    data?: Float32Array;
    pointsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    pointCount?: number;
    boundsMin?: [number, number, number];
    boundsMax?: [number, number, number];
    boundsCenter?: [number, number, number];
    boundsRadius?: number;
    blendMode?: BlendMode;
    depthWrite?: boolean;
    depthTest?: boolean;
    basePointSize?: number;
    minPointSize?: number;
    maxPointSize?: number;
    sizeAttenuation?: number;
    opacity?: number;
    colormap?: PointCloudColormap | Colormap;
    colormapStops?: Color4[];
    softness?: number;
    scaleTransform: ScaleTransformDescriptor;
    visible?: boolean;
    name?: string;
    keepCPUData?: boolean;
    ndShape?: number[];
};
```

#### PointCloudDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | `Float32Array` | No | Packed numeric data consumed by this API. |
| `pointsBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | GPU buffer handle used by this operation. |
| `pointCount` | `number` | No | Number of points represented by the supplied data source. |
| `boundsMin` | `[number, number, number]` | No | Explicit minimum bounds corner supplied in descriptor space. |
| `boundsMax` | `[number, number, number]` | No | Explicit maximum bounds corner supplied in descriptor space. |
| `boundsCenter` | `[number, number, number]` | No | Explicit bounds sphere center supplied in descriptor space. |
| `boundsRadius` | `number` | No | Numeric input controlling `boundsRadius` for this operation. |
| `blendMode` | `BlendMode` | No | Blend mode controlling fragment compositing behavior. |
| `depthWrite` | `boolean` | No | Boolean flag that toggles `depthWrite` behavior. |
| `depthTest` | `boolean` | No | Boolean flag that toggles `depthTest` behavior. |
| `basePointSize` | `number` | No | Numeric input controlling `basePointSize` for this operation. |
| `minPointSize` | `number` | No | Numeric input controlling `minPointSize` for this operation. |

### PointCloudColormap

```ts
type PointCloudColormap = BuiltinColormapName | "custom";
```

### Color4

```ts
type Color4 = [number, number, number, number];
```

### ScaleTransformDescriptor

```ts
type ScaleTransformDescriptor = {
    mode?: ScaleMode;
    clampMode?: ScaleClampMode;
    valueMode?: ScaleValueMode;
    componentCount?: number;
    componentIndex?: number;
    stride?: number;
    offset?: number;
    domainMin?: number;
    domainMax?: number;
    clampMin?: number;
    clampMax?: number;
    percentileLow?: number;
    percentileHigh?: number;
    logBase?: number;
    symlogLinThresh?: number;
    gamma?: number;
    invert?: boolean;
};
```

#### ScaleTransformDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | `ScaleMode` | No | Mode selector controlling behavior for this operation or descriptor. |
| `clampMode` | `ScaleClampMode` | No | Clamping mode used by scale transforms. |
| `valueMode` | `ScaleValueMode` | No | Value extraction mode used when mapping source data into scale inputs. |
| `componentCount` | `number` | No | Numeric input controlling `componentCount` for this operation. |
| `componentIndex` | `number` | No | Numeric input controlling `componentIndex` for this operation. |
| `stride` | `number` | No | Numeric input controlling `stride` for this operation. |
| `offset` | `number` | No | Numeric input controlling `offset` for this operation. |
| `domainMin` | `number` | No | Numeric input controlling `domainMin` for this operation. |
| `domainMax` | `number` | No | Numeric input controlling `domainMax` for this operation. |
| `clampMin` | `number` | No | Numeric input controlling `clampMin` for this operation. |
| `clampMax` | `number` | No | Numeric input controlling `clampMax` for this operation. |
| `percentileLow` | `number` | No | Numeric input controlling `percentileLow` for this operation. |

### BuiltinColormapName

```ts
type BuiltinColormapName = "grayscale" | "turbo" | "viridis" | "magma" | "plasma" | "inferno";
```

### ScaleMode

```ts
type ScaleMode = "linear" | "log" | "symlog";
```

### ScaleClampMode

```ts
type ScaleClampMode = "none" | "range" | "percentile";
```

### ScaleValueMode

```ts
type ScaleValueMode = "component" | "magnitude";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const descriptor = { data: new Float32Array([0, 0, 0, 0.2, 1, 0, 0, 0.9]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } };
const result = wgpu.createPointCloud(descriptor);
console.log(result);
```

## See Also
- [WasmGPU.animation.createClip](./wasmgpu-animation-createclip.md)
- [WasmGPU.animation.createPlayer](./wasmgpu-animation-createplayer.md)
- [WasmGPU.animation.createSkin](./wasmgpu-animation-createskin.md)
- [WasmGPU.colormap.builtin](./wasmgpu-colormap-builtin.md)
- [WasmGPU.colormap.fromPalette](./wasmgpu-colormap-frompalette.md)
- [WasmGPU.colormap.fromStops](./wasmgpu-colormap-fromstops.md)
