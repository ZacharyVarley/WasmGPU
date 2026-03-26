# StandardMaterial.normalTexture

## Summary
StandardMaterial.normalTexture reads the current `normalTexture` value from this StandardMaterial instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
StandardMaterial.normalTexture: Texture2D | null
const value = material.normalTexture;
```

## Parameters
This API does not take parameters.

## Returns
`Texture2D | null` - Current accessor value exposed by the runtime object.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.standard({ color: [0.8, 0.8, 0.9], roughness: 0.5, metallic: 0.2 });
const value = material.normalTexture;
console.log(value);
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
- [StandardMaterial.getUniformData](./wasmgpu-objects-standardmaterial-getuniformdata.md)
- [StandardMaterial.metallic](./wasmgpu-objects-standardmaterial-metallic.md)
- [StandardMaterial.metallicRoughnessTexture](./wasmgpu-objects-standardmaterial-metallicroughnesstexture.md)
