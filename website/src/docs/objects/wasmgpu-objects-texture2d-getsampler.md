# Texture2D.getSampler

## Summary
Texture2D.getSampler returns the current sampler value derived from this Texture2D runtime state.

## Syntax
```ts
Texture2D.getSampler(device: GPUDevice, fallback?: GPUSampler): GPUSampler
const result = texture.getSampler(device, fallback);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | GPUDevice used to allocate pipelines, buffers, layouts, or textures. |
| `fallback` | `GPUSampler` | No | Fallback sampler returned when preferred sampler creation fails. |

## Returns
`GPUSampler` - Result produced by this API call as `GPUSampler`.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const texture = wgpu.texture.create2D({ source: { kind: "url", url: "./albedo.png" }, mipmaps: true });
const device = wgpu.gpu.device;
const fallback = wgpu.gpu.device.createSampler();
const result = texture.getSampler(device, fallback);
console.log(result);
```

## See Also
- [Texture2D.destroy](./wasmgpu-objects-texture2d-destroy.md)
- [Texture2D.ensureUploaded](./wasmgpu-objects-texture2d-ensureuploaded.md)
- [Texture2D.getView](./wasmgpu-objects-texture2d-getview.md)
- [Texture2D.height](./wasmgpu-objects-texture2d-height.md)
- [Texture2D.revision](./wasmgpu-objects-texture2d-revision.md)
- [Texture2D.uploaded](./wasmgpu-objects-texture2d-uploaded.md)
- [Texture2D.width](./wasmgpu-objects-texture2d-width.md)
