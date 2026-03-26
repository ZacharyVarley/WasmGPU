# WasmGPU.material.custom

## Summary
WasmGPU.material.custom creates a material configured for the selected shading model. Use the result to control appearance and shader behavior.

## Syntax
```ts
WasmGPU.material.custom(options: CustomMaterialDescriptor): CustomMaterial
const result = wgpu.material.custom(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `CustomMaterialDescriptor` | Yes | Optional configuration object that customizes behavior for this call. |

## Returns
`CustomMaterial` - New `CustomMaterial` runtime material instance.

## Type Details
### CustomMaterialDescriptor

```ts
type CustomMaterialDescriptor = MaterialDescriptor & {
    vertexShader?: string;
    fragmentShader: string;
    uniforms?: Record<string, UniformDefinition>;
};
```

#### CustomMaterialDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `vertexShader` | `string` | No | String input controlling `vertexShader` for this operation. |
| `fragmentShader` | `string` | Yes | String input controlling `fragmentShader` for this operation. |
| `uniforms` | `Record<string, UniformDefinition>` | No | Custom-material uniform definition map keyed by uniform name. |

### MaterialDescriptor

```ts
type MaterialDescriptor = {
    blendMode?: BlendMode;
    cullMode?: CullMode;
    depthWrite?: boolean;
    depthTest?: boolean;
};
```

#### MaterialDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `blendMode` | `BlendMode` | No | Blend mode controlling fragment compositing behavior. |
| `cullMode` | `CullMode` | No | Face-culling mode used during rasterization. |
| `depthWrite` | `boolean` | No | Boolean flag that toggles `depthWrite` behavior. |
| `depthTest` | `boolean` | No | Boolean flag that toggles `depthTest` behavior. |

### UniformDefinition

```ts
type UniformDefinition = {
    type: UniformType;
    value: number | number[];
};
```

#### UniformDefinition Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `UniformType` | Yes | Type discriminator used by the associated descriptor or glTF field. |
| `value` | `number \| number[]` | Yes | Array input for `value` used by this API call. |

### UniformType

```ts
type UniformType = "f32" | "vec2f" | "vec3f" | "vec4f" | "mat4x4f";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const options = { fragmentShader: "@fragment fn fs_main() -> @location(0) vec4f { return vec4f(0.9, 0.7, 0.2, 1.0); }", uniforms: { gain: { type: "f32", value: 1.0 } } };
const result = wgpu.material.custom(options);
console.log(result);
```

## See Also
- [WasmGPU.material.data](./wasmgpu-material-data.md)
- [WasmGPU.material.standard](./wasmgpu-material-standard.md)
- [WasmGPU.material.unlit](./wasmgpu-material-unlit.md)
