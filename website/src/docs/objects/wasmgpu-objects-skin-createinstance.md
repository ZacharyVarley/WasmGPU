# Skin.createInstance

## Summary
Skin.createInstance operates on a Skin runtime object to update state, query data, or manage lifecycle.

## Syntax
```ts
Skin.createInstance(meshTransform: Transform): SkinInstance
const result = skin.createInstance(meshTransform);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `meshTransform` | `Transform` | Yes | Transform associated with the skinned mesh instance. |

## Returns
`SkinInstance` - Skin instance bound to a mesh transform, including per-instance GPU binding state.

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
const meshTransform = {};
const result = skin.createInstance(meshTransform);
console.log(result);
```

## See Also
- [Skin.dispose](./wasmgpu-objects-skin-dispose.md)
