# Scene.addLight

## Summary
Scene.addLight appends a light instance to the scene lighting list when not already present. Non-ambient lights beyond `Scene.MAX_LIGHTS` trigger a warning and may be ignored by lighting extraction paths. Use this method for ambient, directional, and point lights.

## Syntax
```ts
Scene.addLight(light: Light): Scene
const result = scene.addLight(light);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `light` | `Light` | Yes | Ambient, directional, or point light instance to register with the scene. |

## Returns
`Scene` - The same scene instance after light registration.

## Type Details
### LightType

```ts
type LightType = "ambient" | "directional" | "point";
```

### Light

```ts
type Light = {
    readonly type: LightType;
    color: [number, number, number];
    intensity: number;
    enabled: boolean;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.addLight(wgpu.createLight.ambient({ intensity: 0.15 }));
scene.addLight(wgpu.createLight.directional({ direction: [0.2, -1, 0.3], intensity: 1.1 }));
```

## See Also
- [Scene.removeLight](./wasmgpu-world-scene-removelight.md)
- [Scene.clearLights](./wasmgpu-world-scene-clearlights.md)
- [Scene.lights](./wasmgpu-world-scene-lights.md)
- [Scene.enabledLights](./wasmgpu-world-scene-enabledlights.md)
