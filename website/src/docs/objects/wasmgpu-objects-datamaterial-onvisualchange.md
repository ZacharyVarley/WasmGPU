# DataMaterial.onVisualChange

## Summary
DataMaterial.onVisualChange registers a listener for visual-state changes and returns an unsubscribe callback.

## Syntax
```ts
DataMaterial.onVisualChange(listener: (kind: DataMaterialVisualChangeKind) => void): () => void
const result = material.onVisualChange(listener);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `(kind: DataMaterialVisualChangeKind) => void` | Yes | Callback invoked when visual-relevant state changes. |

## Returns
`() => void` - Function that unsubscribes or unregisters the listener created by this call.

## Type Details
### DataMaterialVisualChangeKind

```ts
type DataMaterialVisualChangeKind = "scale" | "colormap" | "visual";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const listener = (kind) => console.log(kind);
const result = material.onVisualChange(listener);
console.log(result);
```

## See Also
- [DataMaterial.colormap](./wasmgpu-objects-datamaterial-colormap.md)
- [DataMaterial.createBindGroupLayout](./wasmgpu-objects-datamaterial-createbindgrouplayout.md)
- [DataMaterial.destroy](./wasmgpu-objects-datamaterial-destroy.md)
- [DataMaterial.dropCPUData](./wasmgpu-objects-datamaterial-dropcpudata.md)
- [DataMaterial.getColormapForBinding](./wasmgpu-objects-datamaterial-getcolormapforbinding.md)
- [DataMaterial.getColormapKey](./wasmgpu-objects-datamaterial-getcolormapkey.md)
- [DataMaterial.getScaleSourceDescriptor](./wasmgpu-objects-datamaterial-getscalesourcedescriptor.md)
- [DataMaterial.getShaderCode](./wasmgpu-objects-datamaterial-getshadercode.md)
- [DataMaterial.getUniformBufferSize](./wasmgpu-objects-datamaterial-getuniformbuffersize.md)
- [DataMaterial.getUniformData](./wasmgpu-objects-datamaterial-getuniformdata.md)
- [DataMaterial.opacity](./wasmgpu-objects-datamaterial-opacity.md)
- [DataMaterial.scaleTransform](./wasmgpu-objects-datamaterial-scaletransform.md)
