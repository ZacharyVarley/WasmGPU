# DataMaterial.getUniformData

## Summary
DataMaterial.getUniformData returns the current uniform data value derived from this DataMaterial runtime state.

## Syntax
```ts
DataMaterial.getUniformData(): Float32Array
const result = material.getUniformData();
```

## Parameters
This API does not take parameters.

## Returns
`Float32Array` - Array-like result returned by this operation.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const result = material.getUniformData();
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
- [DataMaterial.onVisualChange](./wasmgpu-objects-datamaterial-onvisualchange.md)
- [DataMaterial.opacity](./wasmgpu-objects-datamaterial-opacity.md)
- [DataMaterial.scaleTransform](./wasmgpu-objects-datamaterial-scaletransform.md)
