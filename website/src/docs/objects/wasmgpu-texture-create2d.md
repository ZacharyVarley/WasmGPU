# WasmGPU.texture.create2D

## Summary
WasmGPU.texture.create2D constructs a Texture2D wrapper with deferred upload settings. Texture upload is triggered when needed by rendering paths.

## Syntax
```ts
WasmGPU.texture.create2D(descriptor: Texture2DDescriptor): Texture2D
const result = wgpu.texture.create2D(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `Texture2DDescriptor` | Yes | Descriptor object that defines the initial configuration for this runtime object. |

## Returns
`Texture2D` - Texture2D runtime object that manages upload state, sampler creation, and texture views.

## Type Details
### Texture2DDescriptor

```ts
type Texture2DDescriptor = {
    source: TextureSource;
    mipmaps?: boolean;
    sampler?: TextureSamplerOptions;
};
```

#### Texture2DDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `TextureSource` | Yes | glTF/GLB source as URL/path string or in-memory ArrayBuffer payload. |
| `mipmaps` | `boolean` | No | Boolean flag that toggles `mipmaps` behavior. |
| `sampler` | `TextureSamplerOptions` | No | Descriptor/options object controlling structure and behavior for this operation. |

### TextureSource

```ts
type TextureSource =
    | { kind: "bytes"; bytes: ArrayBuffer; mimeType?: string }
    | { kind: "url"; url: string; mimeType?: string }
    | { kind: "bitmap"; bitmap: ImageBitmap };
```

### TextureSamplerOptions

```ts
type TextureSamplerOptions = {
    addressModeU?: GPUAddressMode;
    addressModeV?: GPUAddressMode;
    addressModeW?: GPUAddressMode;
    magFilter?: GPUFilterMode;
    minFilter?: GPUFilterMode;
    mipmapFilter?: GPUMipmapFilterMode;
    lodMinClamp?: number;
    lodMaxClamp?: number;
};
```

#### TextureSamplerOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `addressModeU` | `GPUAddressMode` | No | Sampler address mode for U coordinates. |
| `addressModeV` | `GPUAddressMode` | No | Sampler address mode for V coordinates. |
| `addressModeW` | `GPUAddressMode` | No | Sampler address mode for W coordinates. |
| `magFilter` | `GPUFilterMode` | No | Sampler magnification filter mode. |
| `minFilter` | `GPUFilterMode` | No | Sampler minification filter mode. |
| `mipmapFilter` | `GPUMipmapFilterMode` | No | Sampler mip-level filter mode. |
| `lodMinClamp` | `number` | No | Numeric input controlling `lodMinClamp` for this operation. |
| `lodMaxClamp` | `number` | No | Numeric input controlling `lodMaxClamp` for this operation. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const texture = wgpu.texture.create2D({ source: { kind: "url", url: "./albedo.png" }, mipmaps: true });
const descriptor = { source: { kind: "url", url: "./albedo.png" }, mipmaps: true };
const result = wgpu.texture.create2D(descriptor);
console.log(result);
```

## See Also
- [WasmGPU.animation.createClip](./wasmgpu-animation-createclip.md)
- [WasmGPU.animation.createPlayer](./wasmgpu-animation-createplayer.md)
- [WasmGPU.animation.createSkin](./wasmgpu-animation-createskin.md)
- [WasmGPU.colormap.builtin](./wasmgpu-colormap-builtin.md)
- [WasmGPU.colormap.fromPalette](./wasmgpu-colormap-frompalette.md)
- [WasmGPU.colormap.fromStops](./wasmgpu-colormap-fromstops.md)
