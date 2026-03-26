# CustomMaterial.createBindGroupLayout

## Summary
CustomMaterial.createBindGroupLayout operates on a CustomMaterial runtime object to update state, query data, or manage lifecycle.

## Syntax
```ts
CustomMaterial.createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout
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

const material = wgpu.material.custom({ fragmentShader: "@fragment fn fs_main() -> @location(0) vec4f { return vec4f(1.0, 0.8, 0.2, 1.0); }" });
const device = wgpu.gpu.device;
const result = material.createBindGroupLayout(device);
console.log(result);
```

## See Also
- [CustomMaterial.getShaderCode](./wasmgpu-objects-custommaterial-getshadercode.md)
- [CustomMaterial.getUniform](./wasmgpu-objects-custommaterial-getuniform.md)
- [CustomMaterial.getUniformBufferSize](./wasmgpu-objects-custommaterial-getuniformbuffersize.md)
- [CustomMaterial.getUniformData](./wasmgpu-objects-custommaterial-getuniformdata.md)
- [CustomMaterial.setUniform](./wasmgpu-objects-custommaterial-setuniform.md)
