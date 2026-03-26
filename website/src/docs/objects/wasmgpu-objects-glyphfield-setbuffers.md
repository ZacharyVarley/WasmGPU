# GlyphField.setBuffers

## Summary
GlyphField.setBuffers updates buffers state on this GlyphField and marks dependent GPU data for refresh.

## Syntax
```ts
GlyphField.setBuffers(positions: GPUBuffer, rotations: GPUBuffer, scales: GPUBuffer, attributes: GPUBuffer | null, instanceCount: number): void
glyphField.setBuffers(positions, rotations, scales, attributes, instanceCount);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `positions` | `GPUBuffer` | Yes | Packed per-instance positions. |
| `rotations` | `GPUBuffer` | Yes | Packed per-instance quaternion rotations. |
| `scales` | `GPUBuffer` | Yes | Packed per-instance scales. |
| `attributes` | `GPUBuffer \| null` | Yes | Packed per-instance attribute values. |
| `instanceCount` | `number` | Yes | Number of instances represented by supplied data inputs. |

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

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const positions = new Float32Array([0, 0, 0, 0]);
const rotations = new Float32Array([0, 0, 0, 1]);
const scales = new Float32Array([1, 1, 1, 0]);
const attributes = new Float32Array([0.5, 0, 0, 0]);
const instanceCount = 1;
glyphField.setBuffers(positions, rotations, scales, attributes, instanceCount);
console.log("updated");
```

## See Also
- [GlyphField.applyScaleStats](./wasmgpu-objects-glyphfield-applyscalestats.md)
- [GlyphField.colormap](./wasmgpu-objects-glyphfield-colormap.md)
- [GlyphField.colormapStops](./wasmgpu-objects-glyphfield-colormapstops.md)
- [GlyphField.colorMode](./wasmgpu-objects-glyphfield-colormode.md)
- [GlyphField.computeBoundsFromCPUData](./wasmgpu-objects-glyphfield-computeboundsfromcpudata.md)
- [GlyphField.destroy](./wasmgpu-objects-glyphfield-destroy.md)
- [GlyphField.dirtyUniforms](./wasmgpu-objects-glyphfield-dirtyuniforms.md)
- [GlyphField.getAttributeRecord](./wasmgpu-objects-glyphfield-getattributerecord.md)
- [GlyphField.getBounds](./wasmgpu-objects-glyphfield-getbounds.md)
- [GlyphField.getColormapForBinding](./wasmgpu-objects-glyphfield-getcolormapforbinding.md)
- [GlyphField.getColormapKey](./wasmgpu-objects-glyphfield-getcolormapkey.md)
- [GlyphField.getLocalBounds](./wasmgpu-objects-glyphfield-getlocalbounds.md)
