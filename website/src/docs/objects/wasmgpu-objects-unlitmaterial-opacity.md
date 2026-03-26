# UnlitMaterial.opacity

## Summary
UnlitMaterial.opacity reads the current `opacity` value from this UnlitMaterial instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
UnlitMaterial.opacity: number
const value = material.opacity;
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

const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const value = material.opacity;
console.log(value);
```

## See Also
- [UnlitMaterial.alphaCutoff](./wasmgpu-objects-unlitmaterial-alphacutoff.md)
- [UnlitMaterial.baseColorTexture](./wasmgpu-objects-unlitmaterial-basecolortexture.md)
- [UnlitMaterial.color](./wasmgpu-objects-unlitmaterial-color.md)
- [UnlitMaterial.createBindGroupLayout](./wasmgpu-objects-unlitmaterial-createbindgrouplayout.md)
- [UnlitMaterial.getShaderCode](./wasmgpu-objects-unlitmaterial-getshadercode.md)
- [UnlitMaterial.getUniformBufferSize](./wasmgpu-objects-unlitmaterial-getuniformbuffersize.md)
- [UnlitMaterial.getUniformData](./wasmgpu-objects-unlitmaterial-getuniformdata.md)
