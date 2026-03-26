# WasmGPU.create

## Summary
WasmGPU.create initializes WebGPU + WebAssembly and returns a ready engine instance bound to a canvas.
Use this as the entry point for all rendering, compute, interaction, and interop workflows.
The call is asynchronous because device/context initialization and WASM startup happen before the engine is returned.

## Syntax
```ts
WasmGPU.create(canvas: HTMLCanvasElement, descriptor?: WasmGPUDescriptor): Promise<WasmGPU>
const wgpu = await WasmGPU.create(canvas, descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `canvas` | `HTMLCanvasElement` | Yes | Canvas that receives GPU presentation and input events for engine subsystems. |
| `descriptor` | `WasmGPUDescriptor` | No | Renderer initialization options such as antialiasing, power preference, and frustum-culling behavior. |

## Returns
`Promise<WasmGPU>` - Resolves to an initialized WasmGPU engine instance.

## Type Details
### WasmGPUDescriptor
```ts
type WasmGPUDescriptor = RendererDescriptor & {
    // Future options: physics, audio, etc.
};
```

### RendererDescriptor
```ts
type RendererDescriptor = {
    antialias?: boolean;
    powerPreference?: "high-performance" | "low-power";
    canvasFormat?: GPUTextureFormat;
    frustumCulling?: boolean;
    frustumCullingStats?: boolean;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const descriptor = { antialias: true, powerPreference: "high-performance" };
const wgpu = await WasmGPU.create(canvas, descriptor);
console.log(wgpu.gpu.format);
```

## See Also
- [WasmGPU.run](./wasmgpu-run.md)
- [WasmGPU.render](./wasmgpu-render.md)
- [WasmGPU.destroy](./wasmgpu-destroy.md)
- [WasmGPU.gpu](./wasmgpu-gpu.md)
- [WasmGPU.createPerformanceStats](./wasmgpu-createperformancestats.md)
- [WasmGPU.createTransform](./wasmgpu-createtransform.md)
