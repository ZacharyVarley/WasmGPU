# WasmGPU.geometry.custom

## Summary
WasmGPU.geometry.custom builds geometry data for a primitive or procedural shape. The returned Geometry can be reused by multiple meshes.

## Syntax
```ts
WasmGPU.geometry.custom(descriptor: GeometryDescriptor): Geometry
const result = wgpu.geometry.custom(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `GeometryDescriptor` | Yes | Descriptor object that defines the initial configuration for this runtime object. |

## Returns
`Geometry` - Generated Geometry object containing vertex/index data and computed bounds.

## Type Details
### GeometryDescriptor

```ts
type GeometryDescriptor = {
    positions: Float32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    joints?: Uint16Array;
    weights?: Float32Array;
    joints1?: Uint16Array;
    weights1?: Float32Array;
    indices?: Uint32Array;
};
```

#### GeometryDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `positions` | `Float32Array` | Yes | Packed per-instance positions. |
| `normals` | `Float32Array` | No | Typed numeric/binary data consumed by this operation. |
| `uvs` | `Float32Array` | No | Typed numeric/binary data consumed by this operation. |
| `joints` | `Uint16Array` | No | Joint transforms in skin order. |
| `weights` | `Float32Array` | No | Typed numeric/binary data consumed by this operation. |
| `joints1` | `Uint16Array` | No | Typed numeric/binary data consumed by this operation. |
| `weights1` | `Float32Array` | No | Typed numeric/binary data consumed by this operation. |
| `indices` | `Uint32Array` | No | Typed numeric/binary data consumed by this operation. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const descriptor = { positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), indices: new Uint32Array([0, 1, 2]) };
const result = wgpu.geometry.custom(descriptor);
console.log(result);
```

## See Also
- [WasmGPU.geometry.box](./wasmgpu-geometry-box.md)
- [WasmGPU.geometry.cartesianCurve](./wasmgpu-geometry-cartesiancurve.md)
- [WasmGPU.geometry.cartesianSurface](./wasmgpu-geometry-cartesiansurface.md)
- [WasmGPU.geometry.circle](./wasmgpu-geometry-circle.md)
- [WasmGPU.geometry.cylinder](./wasmgpu-geometry-cylinder.md)
- [WasmGPU.geometry.ellipse](./wasmgpu-geometry-ellipse.md)
- [WasmGPU.geometry.line](./wasmgpu-geometry-line.md)
- [WasmGPU.geometry.parametricCurve](./wasmgpu-geometry-parametriccurve.md)
- [WasmGPU.geometry.parametricSurface](./wasmgpu-geometry-parametricsurface.md)
- [WasmGPU.geometry.plane](./wasmgpu-geometry-plane.md)
- [WasmGPU.geometry.point](./wasmgpu-geometry-point.md)
- [WasmGPU.geometry.prism](./wasmgpu-geometry-prism.md)
