# StandardMaterial.emissive

## Summary
StandardMaterial.emissive reads the current `emissive` value from this StandardMaterial instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
StandardMaterial.emissive: Color
const value = material.emissive;
```

## Parameters
This API does not take parameters.

## Returns
`Color` - Current accessor value exposed by the runtime object.

## Type Details
### Color

```ts
type Color = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.standard({ color: [0.8, 0.8, 0.9], roughness: 0.5, metallic: 0.2 });
const value = material.emissive;
console.log(value);
```

## See Also
- [StandardMaterial.alphaCutoff](./wasmgpu-objects-standardmaterial-alphacutoff.md)
- [StandardMaterial.baseColorTexture](./wasmgpu-objects-standardmaterial-basecolortexture.md)
- [StandardMaterial.color](./wasmgpu-objects-standardmaterial-color.md)
- [StandardMaterial.createBindGroupLayout](./wasmgpu-objects-standardmaterial-createbindgrouplayout.md)
- [StandardMaterial.emissiveIntensity](./wasmgpu-objects-standardmaterial-emissiveintensity.md)
- [StandardMaterial.emissiveTexture](./wasmgpu-objects-standardmaterial-emissivetexture.md)
- [StandardMaterial.getShaderCode](./wasmgpu-objects-standardmaterial-getshadercode.md)
- [StandardMaterial.getUniformBufferSize](./wasmgpu-objects-standardmaterial-getuniformbuffersize.md)
- [StandardMaterial.getUniformData](./wasmgpu-objects-standardmaterial-getuniformdata.md)
- [StandardMaterial.metallic](./wasmgpu-objects-standardmaterial-metallic.md)
- [StandardMaterial.metallicRoughnessTexture](./wasmgpu-objects-standardmaterial-metallicroughnesstexture.md)
- [StandardMaterial.normalScale](./wasmgpu-objects-standardmaterial-normalscale.md)
