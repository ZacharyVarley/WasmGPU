# Texture2D.height

## Summary
Texture2D.height reads the current `height` value from this Texture2D instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Texture2D.height: number
const value = texture.height;
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

const texture = wgpu.texture.create2D({ source: { kind: "url", url: "./albedo.png" }, mipmaps: true });
const value = texture.height;
console.log(value);
```

## See Also
- [Texture2D.destroy](./wasmgpu-objects-texture2d-destroy.md)
- [Texture2D.ensureUploaded](./wasmgpu-objects-texture2d-ensureuploaded.md)
- [Texture2D.getSampler](./wasmgpu-objects-texture2d-getsampler.md)
- [Texture2D.getView](./wasmgpu-objects-texture2d-getview.md)
- [Texture2D.revision](./wasmgpu-objects-texture2d-revision.md)
- [Texture2D.uploaded](./wasmgpu-objects-texture2d-uploaded.md)
- [Texture2D.width](./wasmgpu-objects-texture2d-width.md)
