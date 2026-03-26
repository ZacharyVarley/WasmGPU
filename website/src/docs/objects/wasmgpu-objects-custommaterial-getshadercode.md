# CustomMaterial.getShaderCode

## Summary
CustomMaterial.getShaderCode returns the current shader code value derived from this CustomMaterial runtime state.

## Syntax
```ts
CustomMaterial.getShaderCode(opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string
const result = material.getShaderCode(opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `opts` | `{ instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}` | Yes | Optional configuration object that customizes behavior for this call. |

## Returns
`string` - String result produced by this operation.

## Type Details
### GetShaderCodeopts

```ts
type GetShaderCodeopts = {

    instanced?: boolean;

    skinned?: boolean;

    skinned8?: boolean;

};
```

#### GetShaderCodeopts Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `instanced` | `boolean` | No | Boolean flag that toggles `instanced` behavior. |
| `skinned` | `boolean` | No | Boolean flag that toggles `skinned` behavior. |
| `skinned8` | `boolean` | No | Boolean flag that toggles `skinned8` behavior. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.custom({ fragmentShader: "@fragment fn fs_main() -> @location(0) vec4f { return vec4f(1.0, 0.8, 0.2, 1.0); }" });
const opts = { instanced: true, skinned: false, skinned8: false };
const result = material.getShaderCode(opts);
console.log(result);
```

## See Also
- [CustomMaterial.createBindGroupLayout](./wasmgpu-objects-custommaterial-createbindgrouplayout.md)
- [CustomMaterial.getUniform](./wasmgpu-objects-custommaterial-getuniform.md)
- [CustomMaterial.getUniformBufferSize](./wasmgpu-objects-custommaterial-getuniformbuffersize.md)
- [CustomMaterial.getUniformData](./wasmgpu-objects-custommaterial-getuniformdata.md)
- [CustomMaterial.setUniform](./wasmgpu-objects-custommaterial-setuniform.md)
