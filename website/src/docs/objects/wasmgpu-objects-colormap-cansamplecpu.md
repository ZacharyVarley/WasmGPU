# Colormap.canSampleCPU

## Summary
Colormap.canSampleCPU reads the current `canSampleCPU` value from this Colormap instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Colormap.canSampleCPU: boolean
const value = colormap.canSampleCPU;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Boolean result indicating whether the queried condition is satisfied.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const colormap = wgpu.colormap.viridis();
const value = colormap.canSampleCPU;
console.log(value);
```

## See Also
- [Colormap.filter](./wasmgpu-objects-colormap-filter.md)
- [Colormap.getGPUResources](./wasmgpu-objects-colormap-getgpuresources.md)
- [Colormap.getRGBA8LinearLUT](./wasmgpu-objects-colormap-getrgba8linearlut.md)
- [Colormap.sampleCPU](./wasmgpu-objects-colormap-samplecpu.md)
- [Colormap.toUniformStops](./wasmgpu-objects-colormap-touniformstops.md)
- [Colormap.width](./wasmgpu-objects-colormap-width.md)
