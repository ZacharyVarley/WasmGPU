# WasmGPU.createControls.trackball

## Summary
WasmGPU.createControls.trackball creates `TrackballControls`, a `NavigationControls` specialization for free-form trackball rotation.
Trackball mode rotates camera eye and up vectors together, which is useful for data that benefits from unconstrained orientation.
Use this when strict world-up orbit behavior is too limiting.

## Syntax
```ts
WasmGPU.createControls.trackball(camera: Camera, domElement: HTMLCanvasElement, options?: TrackballControlsDescriptor): TrackballControls
const controls = wgpu.createControls.trackball(camera, domElement, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `camera` | `Camera` | Yes | Camera instance controlled in trackball mode. |
| `domElement` | `HTMLCanvasElement` | Yes | Canvas that receives interaction events. |
| `options` | `TrackballControlsDescriptor` | No | Initial trackball configuration such as damping, zoom, pan, and limits. |

## Returns
`TrackballControls` - Trackball controller instance bound to the provided camera and canvas.

## Type Details
```ts
type TrackballControlsDescriptor = {
    mode?: "orbit" | "trackball"; // forced to trackball by this factory
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
    mouseButtons?: { rotate?: number; pan?: number; zoom?: number };
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene([0.01, 0.01, 0.02]);
const camera = wgpu.createCamera.perspective({ fov: 58, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.05, far: 800 });

const controls = wgpu.createControls.trackball(camera, canvas, {
    target: [0, 0, 0],
    enableDamping: true,
    dampingFactor: 0.14,
    rotateSpeed: 1.25,
    minDistance: 0.25,
    maxDistance: 400
});

wgpu.run((dt) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});
```

## See Also
- [WasmGPU.createControls.navigation](./wasmgpu-createcontrols-navigation.md)
- [WasmGPU.createControls.orbit](./wasmgpu-createcontrols-orbit.md)
- [WasmGPU.createControls.navigation().setMode](./wasmgpu-interact-navigationcontrols-setmode.md)
- [WasmGPU.createControls.navigation().fitToBounds](./wasmgpu-interact-navigationcontrols-fittobounds.md)
