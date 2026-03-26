# StandardMaterial.createBindGroupLayout

## Summary
StandardMaterial.createBindGroupLayout operates on a StandardMaterial runtime object to update state, query data, or manage lifecycle.

## Syntax
```ts
StandardMaterial.createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout
const result = material.createBindGroupLayout(device);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | GPUDevice used to allocate pipelines, buffers, layouts, or textures. |

## Returns
`GPUBindGroupLayout` - GPU bind-group layout describing required shader bindings for this object.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.standard({ color: [0.8, 0.8, 0.9], roughness: 0.5, metallic: 0.2 });
const device = wgpu.gpu.device;
const result = material.createBindGroupLayout(device);
console.log(result);
```

## See Also
- [StandardMaterial.alphaCutoff](./wasmgpu-objects-standardmaterial-alphacutoff.md)
- [StandardMaterial.baseColorTexture](./wasmgpu-objects-standardmaterial-basecolortexture.md)
- [StandardMaterial.color](./wasmgpu-objects-standardmaterial-color.md)
- [StandardMaterial.emissive](./wasmgpu-objects-standardmaterial-emissive.md)
- [StandardMaterial.emissiveIntensity](./wasmgpu-objects-standardmaterial-emissiveintensity.md)
- [StandardMaterial.emissiveTexture](./wasmgpu-objects-standardmaterial-emissivetexture.md)
- [StandardMaterial.getShaderCode](./wasmgpu-objects-standardmaterial-getshadercode.md)
- [StandardMaterial.getUniformBufferSize](./wasmgpu-objects-standardmaterial-getuniformbuffersize.md)
- [StandardMaterial.getUniformData](./wasmgpu-objects-standardmaterial-getuniformdata.md)
- [StandardMaterial.metallic](./wasmgpu-objects-standardmaterial-metallic.md)
- [StandardMaterial.metallicRoughnessTexture](./wasmgpu-objects-standardmaterial-metallicroughnesstexture.md)
- [StandardMaterial.normalScale](./wasmgpu-objects-standardmaterial-normalscale.md)
