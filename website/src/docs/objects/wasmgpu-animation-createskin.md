# WasmGPU.animation.createSkin

## Summary
WasmGPU.animation.createSkin creates animation runtime objects used for clip sampling, playback, and skinning.

## Syntax
```ts
WasmGPU.animation.createSkin(name: string, joints: Transform[], inverseBindMatrices: Float32Array | null): Skin
const result = wgpu.animation.createSkin(name, joints, inverseBindMatrices);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Human-readable identifier used for labels, debugging, or lookup keys. |
| `joints` | `Transform[]` | Yes | Joint transforms in skin order. |
| `inverseBindMatrices` | `Float32Array \| null` | Yes | Optional packed inverse bind matrices (`jointCount * 16`) or `null`. |

## Returns
`Skin` - Skin runtime object created for animation workflows.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const joint0 = wgpu.createTransform();
const name = "skin";
const joints = [joint0];
const inverseBindMatrices = null;
const result = wgpu.animation.createSkin(name, joints, inverseBindMatrices);
console.log(result);
```

## See Also
- [WasmGPU.animation.createClip](./wasmgpu-animation-createclip.md)
- [WasmGPU.animation.createPlayer](./wasmgpu-animation-createplayer.md)
