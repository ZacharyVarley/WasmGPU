# WasmGPU.material.standard

## Summary
WasmGPU.material.standard creates a material configured for the selected shading model. Use the result to control appearance and shader behavior.

## Syntax
```ts
WasmGPU.material.standard(options?: StandardMaterialDescriptor): StandardMaterial
const result = wgpu.material.standard(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `StandardMaterialDescriptor` | No | Optional configuration object that customizes behavior for this call. |

## Returns
`StandardMaterial` - New `StandardMaterial` runtime material instance.

## Type Details
### StandardMaterialDescriptor

```ts
type StandardMaterialDescriptor = MaterialDescriptor & {
    color?: Color;
    opacity?: number;
    metallic?: number;
    roughness?: number;
    emissive?: Color;
    emissiveIntensity?: number;
    baseColorTexture?: Texture2D | null;
    metallicRoughnessTexture?: Texture2D | null;
    normalTexture?: Texture2D | null;
    occlusionTexture?: Texture2D | null;
    emissiveTexture?: Texture2D | null;
    normalScale?: number;
    occlusionStrength?: number;
    alphaCutoff?: number;
};
```

#### StandardMaterialDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `color` | `Color` | No | Color value used by this operation or descriptor field. |
| `opacity` | `number` | No | Numeric input controlling `opacity` for this operation. |
| `metallic` | `number` | No | Numeric input controlling `metallic` for this operation. |
| `roughness` | `number` | No | Numeric input controlling `roughness` for this operation. |
| `emissive` | `Color` | No | RGB emissive color contribution used by the material. |
| `emissiveIntensity` | `number` | No | Numeric input controlling `emissiveIntensity` for this operation. |
| `baseColorTexture` | `Texture2D \| null` | No | Optional base-color texture used by the material. |
| `metallicRoughnessTexture` | `Texture2D \| null` | No | Optional metallic/roughness texture sampled by the material. |
| `normalTexture` | `Texture2D \| null` | No | Optional normal-map texture sampled by the material. |
| `occlusionTexture` | `Texture2D \| null` | No | Optional ambient-occlusion texture sampled by the material. |
| `emissiveTexture` | `Texture2D \| null` | No | Optional emissive texture sampled by the material. |
| `normalScale` | `number` | No | Numeric input controlling `normalScale` for this operation. |

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

### Color

```ts
type Color = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const options = { color: [0.85, 0.85, 0.9], metallic: 0.2, roughness: 0.6, opacity: 1.0 };
const result = wgpu.material.standard(options);
console.log(result);
```

## See Also
- [WasmGPU.material.custom](./wasmgpu-material-custom.md)
- [WasmGPU.material.data](./wasmgpu-material-data.md)
- [WasmGPU.material.unlit](./wasmgpu-material-unlit.md)
