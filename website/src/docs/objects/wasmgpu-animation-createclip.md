# WasmGPU.animation.createClip

## Summary
WasmGPU.animation.createClip creates animation runtime objects used for clip sampling, playback, and skinning.

## Syntax
```ts
WasmGPU.animation.createClip(descriptor: AnimationClipDescriptor): AnimationClip
const result = wgpu.animation.createClip(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `AnimationClipDescriptor` | Yes | Descriptor object that defines the initial configuration for this runtime object. |

## Returns
`AnimationClip` - AnimationClip runtime object created for animation workflows.

## Type Details
### AnimationClipDescriptor

```ts
type AnimationClipDescriptor = {
    name: string;
    samplerCount: number;
    channelCount: number;
    samplersPtr: WasmPtr;
    channelsPtr: WasmPtr;
    startTime: number;
    endTime: number;
    ownedF32Allocs?: ReadonlyArray<{ ptr: WasmPtr; len: number }>;
    ownedU32Allocs?: ReadonlyArray<{ ptr: WasmPtr; len: number }>;
};
```

#### AnimationClipDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | String input controlling `name` for this operation. |
| `samplerCount` | `number` | Yes | Numeric input controlling `samplerCount` for this operation. |
| `channelCount` | `number` | Yes | Numeric input controlling `channelCount` for this operation. |
| `samplersPtr` | `WasmPtr` | Yes | Wasm pointer to packed animation sampler table data. |
| `channelsPtr` | `WasmPtr` | Yes | Wasm pointer to packed animation channel table data. |
| `startTime` | `number` | Yes | Numeric input controlling `startTime` for this operation. |
| `endTime` | `number` | Yes | Numeric input controlling `endTime` for this operation. |
| `ownedF32Allocs` | `ReadonlyArray<{ ptr: WasmPtr; len: number }>` | No | Array input for `ownedF32Allocs` used by this API call. |
| `ownedU32Allocs` | `ReadonlyArray<{ ptr: WasmPtr; len: number }>` | No | Array input for `ownedU32Allocs` used by this API call. |

### WasmPtr

```ts
type WasmPtr = number;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const descriptor = { name: "walk", samplerCount: 0, channelCount: 0, samplersPtr: 0, channelsPtr: 0, startTime: 0, endTime: 1 };
const result = wgpu.animation.createClip(descriptor);
console.log(result);
```

## See Also
- [WasmGPU.animation.createPlayer](./wasmgpu-animation-createplayer.md)
- [WasmGPU.animation.createSkin](./wasmgpu-animation-createskin.md)
