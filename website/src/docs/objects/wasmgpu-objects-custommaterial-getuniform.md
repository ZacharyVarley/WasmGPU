# CustomMaterial.getUniform

## Summary
CustomMaterial.getUniform returns the current uniform value derived from this CustomMaterial runtime state.

## Syntax
```ts
CustomMaterial.getUniform(name: string): number | number[] | undefined
const result = material.getUniform(name);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Human-readable identifier used for labels, debugging, or lookup keys. |

## Returns
`number | number[] | undefined` - Result produced by this API call as `number | number[] | undefined`.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.custom({ fragmentShader: "@fragment fn fs_main() -> @location(0) vec4f { return vec4f(1.0, 0.8, 0.2, 1.0); }" });
const name = "example";
const result = material.getUniform(name);
console.log(result);
```

## See Also
- [CustomMaterial.createBindGroupLayout](./wasmgpu-objects-custommaterial-createbindgrouplayout.md)
- [CustomMaterial.getShaderCode](./wasmgpu-objects-custommaterial-getshadercode.md)
- [CustomMaterial.getUniformBufferSize](./wasmgpu-objects-custommaterial-getuniformbuffersize.md)
- [CustomMaterial.getUniformData](./wasmgpu-objects-custommaterial-getuniformdata.md)
- [CustomMaterial.setUniform](./wasmgpu-objects-custommaterial-setuniform.md)
