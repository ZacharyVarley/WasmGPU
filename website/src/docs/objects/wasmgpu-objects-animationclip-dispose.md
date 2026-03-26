# AnimationClip.dispose

## Summary
AnimationClip.dispose releases GPU resources and clears owned runtime state for this AnimationClip. Call it when the object is no longer needed.

## Syntax
```ts
AnimationClip.dispose(): void
clip.dispose();
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

const clip = wgpu.animation.createClip({ name: "clip", samplerCount: 0, channelCount: 0, samplersPtr: 0, channelsPtr: 0, startTime: 0, endTime: 1 });
clip.dispose();
console.log("updated");
```

## See Also
- [AnimationClip.duration](./wasmgpu-objects-animationclip-duration.md)
- [AnimationClip.sample](./wasmgpu-objects-animationclip-sample.md)
