# WasmGPU.material.unlit

## Summary
WasmGPU.material.unlit creates a material configured for the selected shading model. Use the result to control appearance and shader behavior.

## Syntax
```ts
WasmGPU.material.unlit(options?: UnlitMaterialDescriptor): UnlitMaterial
const result = wgpu.material.unlit(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `UnlitMaterialDescriptor` | No | Optional configuration object that customizes behavior for this call. |

## Returns
`UnlitMaterial` - New `UnlitMaterial` runtime material instance.

## Type Details
### UnlitMaterialDescriptor

```ts
type UnlitMaterialDescriptor = MaterialDescriptor & {
    color?: Color;
    opacity?: number;
    baseColorTexture?: Texture2D | null;
    alphaCutoff?: number;
};
```

#### UnlitMaterialDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `color` | `Color` | No | Color value used by this operation or descriptor field. |
| `opacity` | `number` | No | Numeric input controlling `opacity` for this operation. |
| `baseColorTexture` | `Texture2D \| null` | No | Optional base-color texture used by the material. |
| `alphaCutoff` | `number` | No | Numeric input controlling `alphaCutoff` for this operation. |

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

const options = { color: [0.95, 0.75, 0.2], opacity: 1.0 };
const result = wgpu.material.unlit(options);
console.log(result);
```

## See Also
- [WasmGPU.material.custom](./wasmgpu-material-custom.md)
- [WasmGPU.material.data](./wasmgpu-material-data.md)
- [WasmGPU.material.standard](./wasmgpu-material-standard.md)
