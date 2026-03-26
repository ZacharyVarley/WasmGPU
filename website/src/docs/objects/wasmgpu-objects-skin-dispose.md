# Skin.dispose

## Summary
Skin.dispose releases GPU resources and clears owned runtime state for this Skin. Call it when the object is no longer needed.

## Syntax
```ts
Skin.dispose(): void
skin.dispose();
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

const joint0 = wgpu.createTransform();
const skin = wgpu.animation.createSkin("skin", [joint0], null);
skin.dispose();
console.log("updated");
```

## See Also
- [Skin.createInstance](./wasmgpu-objects-skin-createinstance.md)
