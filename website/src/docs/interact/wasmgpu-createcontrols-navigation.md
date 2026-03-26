# WasmGPU.createControls.navigation

## Summary
WasmGPU.createControls.navigation creates a `NavigationControls` instance that can operate in orbit or trackball mode.
The controls attach pointer and wheel handlers to the provided canvas and mutate the camera transform directly.
Use this factory when you need one control object that can switch modes at runtime.

## Syntax
```ts
WasmGPU.createControls.navigation(camera: Camera, domElement: HTMLCanvasElement, options?: NavigationControlsDescriptor): NavigationControls
const controls = wgpu.createControls.navigation(camera, domElement, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `camera` | `Camera` | Yes | Camera controlled by user interaction and control updates. |
| `domElement` | `HTMLCanvasElement` | Yes | Canvas element that receives pointer and wheel events. |
| `options` | `NavigationControlsDescriptor` | No | Initial behavior, limits, axis convention, and interaction tuning values. |

## Returns
`NavigationControls` - Configured controls instance ready to call `update(dt)` each frame.

## Type Details
```ts
type NavigationControlsDescriptor = {
    mode?: "orbit" | "trackball"; // default: "orbit"
    axisConvention?: "y-up-rh" | "z-up-rh" | "x-up-rh" | { right?: Vec3; up: Vec3; forward: Vec3 };
    target?: Vec3;
    enabled?: boolean;
    enableRotate?: boolean;
    enablePan?: boolean;
    enableZoom?: boolean;
    rotateSpeed?: number;
    panSpeed?: number;
    zoomSpeed?: number;
    zoomOnCursor?: boolean;
    enableDamping?: boolean;
    dampingFactor?: number;
    minDistance?: number;
    maxDistance?: number;
    minZoom?: number;
    maxZoom?: number;
    minPolarAngle?: number;
    maxPolarAngle?: number;
    minAzimuthAngle?: number;
    maxAzimuthAngle?: number;
    mouseButtons?: { rotate?: number; pan?: number; zoom?: number }; // button ids: 0 left, 1 middle, 2 right
};

type Vec3 = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });

const controls = wgpu.createControls.navigation(camera, canvas, {
    mode: "orbit",
    target: [0, 0, 0],
    zoomOnCursor: true,
    enableDamping: true,
    dampingFactor: 0.12,
    minDistance: 0.5,
    maxDistance: 200
});

wgpu.run((dt) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});
```

## See Also
- [WasmGPU.createControls.orbit](./wasmgpu-createcontrols-orbit.md)
- [WasmGPU.createControls.trackball](./wasmgpu-createcontrols-trackball.md)
- [WasmGPU.createControls.navigation().setMode](./wasmgpu-interact-navigationcontrols-setmode.md)
- [WasmGPU.createControls.navigation().fitScene](./wasmgpu-interact-navigationcontrols-fitscene.md)
