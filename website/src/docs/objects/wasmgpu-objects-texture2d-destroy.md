# Texture2D.destroy

## Summary
Texture2D.destroy releases GPU resources and clears owned runtime state for this Texture2D. Call it when the object is no longer needed.

## Syntax
```ts
Texture2D.destroy(): void
texture.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const texture = wgpu.texture.create2D({ source: { kind: "url", url: "./albedo.png" }, mipmaps: true });
texture.destroy();
console.log("updated");
```

## See Also
- [Texture2D.ensureUploaded](./wasmgpu-objects-texture2d-ensureuploaded.md)
- [Texture2D.getSampler](./wasmgpu-objects-texture2d-getsampler.md)
- [Texture2D.getView](./wasmgpu-objects-texture2d-getview.md)
- [Texture2D.height](./wasmgpu-objects-texture2d-height.md)
- [Texture2D.revision](./wasmgpu-objects-texture2d-revision.md)
- [Texture2D.uploaded](./wasmgpu-objects-texture2d-uploaded.md)
- [Texture2D.width](./wasmgpu-objects-texture2d-width.md)
