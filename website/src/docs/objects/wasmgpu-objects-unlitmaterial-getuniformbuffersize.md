# UnlitMaterial.getUniformBufferSize

## Summary
UnlitMaterial.getUniformBufferSize returns the current uniform buffer size value derived from this UnlitMaterial runtime state.

## Syntax
```ts
UnlitMaterial.getUniformBufferSize(): number
const result = material.getUniformBufferSize();
```

## Parameters
This API does not take parameters.

## Returns
`number` - Numeric scalar result produced by this operation.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const result = material.getUniformBufferSize();
console.log(result);
```

## See Also
- [UnlitMaterial.alphaCutoff](./wasmgpu-objects-unlitmaterial-alphacutoff.md)
- [UnlitMaterial.baseColorTexture](./wasmgpu-objects-unlitmaterial-basecolortexture.md)
- [UnlitMaterial.color](./wasmgpu-objects-unlitmaterial-color.md)
- [UnlitMaterial.createBindGroupLayout](./wasmgpu-objects-unlitmaterial-createbindgrouplayout.md)
- [UnlitMaterial.getShaderCode](./wasmgpu-objects-unlitmaterial-getshadercode.md)
- [UnlitMaterial.getUniformData](./wasmgpu-objects-unlitmaterial-getuniformdata.md)
- [UnlitMaterial.opacity](./wasmgpu-objects-unlitmaterial-opacity.md)
