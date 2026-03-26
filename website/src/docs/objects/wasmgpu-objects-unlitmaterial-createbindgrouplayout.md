# UnlitMaterial.createBindGroupLayout

## Summary
UnlitMaterial.createBindGroupLayout operates on a UnlitMaterial runtime object to update state, query data, or manage lifecycle.

## Syntax
```ts
UnlitMaterial.createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout
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

const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const device = wgpu.gpu.device;
const result = material.createBindGroupLayout(device);
console.log(result);
```

## See Also
- [UnlitMaterial.alphaCutoff](./wasmgpu-objects-unlitmaterial-alphacutoff.md)
- [UnlitMaterial.baseColorTexture](./wasmgpu-objects-unlitmaterial-basecolortexture.md)
- [UnlitMaterial.color](./wasmgpu-objects-unlitmaterial-color.md)
- [UnlitMaterial.getShaderCode](./wasmgpu-objects-unlitmaterial-getshadercode.md)
- [UnlitMaterial.getUniformBufferSize](./wasmgpu-objects-unlitmaterial-getuniformbuffersize.md)
- [UnlitMaterial.getUniformData](./wasmgpu-objects-unlitmaterial-getuniformdata.md)
- [UnlitMaterial.opacity](./wasmgpu-objects-unlitmaterial-opacity.md)
