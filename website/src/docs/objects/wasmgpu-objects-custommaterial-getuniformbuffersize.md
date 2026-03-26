# CustomMaterial.getUniformBufferSize

## Summary
CustomMaterial.getUniformBufferSize returns the current uniform buffer size value derived from this CustomMaterial runtime state.

## Syntax
```ts
CustomMaterial.getUniformBufferSize(): number
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

const material = wgpu.material.custom({ fragmentShader: "@fragment fn fs_main() -> @location(0) vec4f { return vec4f(1.0, 0.8, 0.2, 1.0); }" });
const result = material.getUniformBufferSize();
console.log(result);
```

## See Also
- [CustomMaterial.createBindGroupLayout](./wasmgpu-objects-custommaterial-createbindgrouplayout.md)
- [CustomMaterial.getShaderCode](./wasmgpu-objects-custommaterial-getshadercode.md)
- [CustomMaterial.getUniform](./wasmgpu-objects-custommaterial-getuniform.md)
- [CustomMaterial.getUniformData](./wasmgpu-objects-custommaterial-getuniformdata.md)
- [CustomMaterial.setUniform](./wasmgpu-objects-custommaterial-setuniform.md)
