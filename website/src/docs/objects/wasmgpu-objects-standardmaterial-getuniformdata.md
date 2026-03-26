# StandardMaterial.getUniformData

## Summary
StandardMaterial.getUniformData returns the current uniform data value derived from this StandardMaterial runtime state.

## Syntax
```ts
StandardMaterial.getUniformData(): Float32Array
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

const material = wgpu.material.standard({ color: [0.8, 0.8, 0.9], roughness: 0.5, metallic: 0.2 });
const result = material.getUniformData();
console.log(result);
```

## See Also
- [StandardMaterial.alphaCutoff](./wasmgpu-objects-standardmaterial-alphacutoff.md)
- [StandardMaterial.baseColorTexture](./wasmgpu-objects-standardmaterial-basecolortexture.md)
- [StandardMaterial.color](./wasmgpu-objects-standardmaterial-color.md)
- [StandardMaterial.createBindGroupLayout](./wasmgpu-objects-standardmaterial-createbindgrouplayout.md)
- [StandardMaterial.emissive](./wasmgpu-objects-standardmaterial-emissive.md)
- [StandardMaterial.emissiveIntensity](./wasmgpu-objects-standardmaterial-emissiveintensity.md)
- [StandardMaterial.emissiveTexture](./wasmgpu-objects-standardmaterial-emissivetexture.md)
- [StandardMaterial.getShaderCode](./wasmgpu-objects-standardmaterial-getshadercode.md)
- [StandardMaterial.getUniformBufferSize](./wasmgpu-objects-standardmaterial-getuniformbuffersize.md)
- [StandardMaterial.metallic](./wasmgpu-objects-standardmaterial-metallic.md)
- [StandardMaterial.metallicRoughnessTexture](./wasmgpu-objects-standardmaterial-metallicroughnesstexture.md)
- [StandardMaterial.normalScale](./wasmgpu-objects-standardmaterial-normalscale.md)
