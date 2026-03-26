# WasmGPU.gltf.loadAndImport

## Summary
WasmGPU.gltf.loadAndImport handles glTF/GLB loading, parsing, accessor extraction, or import into WasmGPU scene objects.

## Syntax
```ts
WasmGPU.gltf.loadAndImport(source: string | ArrayBuffer, options?: { load?: LoadGltfOptions; import?: ImportGltfOptions; }): Promise<GltfImportResult>
const result = await wgpu.gltf.loadAndImport(source, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `string \| ArrayBuffer` | Yes | glTF/GLB source as URL/path string or in-memory ArrayBuffer payload. |
| `options` | `{ load?: LoadGltfOptions; import?: ImportGltfOptions; }` | No | Optional configuration object that customizes behavior for this call. |

## Returns
`Promise<GltfImportResult>` - Promise that resolves to `GltfImportResult` when asynchronous work completes.

## Type Details
### LoadGltfOptions

```ts
type LoadGltfOptions = {
    baseUrl?: string;
    fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    loadImages?: boolean;
    onWarning?: (message: string) => void;
};
```

#### LoadGltfOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | No | Base URL used to resolve relative glTF asset URIs. |
| `fetch` | `(input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>` | No | Callback/function value used by this API call. |
| `loadImages` | `boolean` | No | When true, image payloads are also resolved during loading. |
| `onWarning` | `(message: string) => void` | No | Callback invoked for recoverable warnings during load/import. |

### ImportGltfOptions

```ts
type ImportGltfOptions = {
    sceneIndex?: number;
    targetScene?: Scene;
    addToScene?: boolean;
    computeMissingNormals?: boolean;
    importCameras?: boolean;
    importLights?: boolean;
    onWarning?: (message: string) => void;
};
```

#### ImportGltfOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `sceneIndex` | `number` | No | Scene index to import from the glTF document. |
| `targetScene` | `Scene` | No | Existing scene instance used as import destination. |
| `addToScene` | `boolean` | No | When true, imported objects are inserted into the target scene automatically. |
| `computeMissingNormals` | `boolean` | No | When true, normals are computed when missing from source geometry. |
| `importCameras` | `boolean` | No | When true, glTF cameras are imported. |
| `importLights` | `boolean` | No | When true, KHR_lights_punctual lights are imported. |
| `onWarning` | `(message: string) => void` | No | Callback invoked for recoverable warnings during load/import. |

### GltfImportResult

```ts
type GltfImportResult = {
    scene: Scene;
    meshes: Mesh[];
    nodeTransforms: Transform[];
    lights: Light[];
    cameras: Camera[];
    skins: ImportedSkin[];
    animations: ImportedAnimation[];
    clips: AnimationClip[];
    destroy(): void;
};
```

#### GltfImportResult Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `scene` | `Scene` | Yes | Default scene index or scene reference in glTF/root metadata. |
| `meshes` | `Mesh[]` | Yes | Array input for `meshes` used by this API call. |
| `nodeTransforms` | `Transform[]` | Yes | Array input for `nodeTransforms` used by this API call. |
| `lights` | `Light[]` | Yes | Array input for `lights` used by this API call. |
| `cameras` | `Camera[]` | Yes | Array input for `cameras` used by this API call. |
| `skins` | `ImportedSkin[]` | Yes | Array input for `skins` used by this API call. |
| `animations` | `ImportedAnimation[]` | Yes | Array input for `animations` used by this API call. |
| `clips` | `AnimationClip[]` | Yes | Array input for `clips` used by this API call. |
| `destroy` | `() => void` | Yes | Callback/function value used by this API call. |

### ImportedSkin

```ts
type ImportedSkin = {
    name?: string;
    joints: Transform[];
    inverseBindMatrices?: Float32Array;
    skeleton?: Transform;
    runtime: Skin;
};
```

#### ImportedSkin Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | No | String input controlling `name` for this operation. |
| `joints` | `Transform[]` | Yes | Joint transforms in skin order. |
| `inverseBindMatrices` | `Float32Array` | No | Optional packed inverse bind matrices (`jointCount * 16`) or `null`. |
| `skeleton` | `Transform` | No | Optional root transform/index of the imported skeleton hierarchy. |
| `runtime` | `Skin` | Yes | Runtime object instance created from imported source data. |

### ImportedAnimation

```ts
type ImportedAnimation = {
    name?: string;
    samplers: ImportedAnimationSampler[];
    channels: ImportedAnimationChannel[];
    clip: AnimationClip | null;
};
```

#### ImportedAnimation Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | No | String input controlling `name` for this operation. |
| `samplers` | `ImportedAnimationSampler[]` | Yes | Array input for `samplers` used by this API call. |
| `channels` | `ImportedAnimationChannel[]` | Yes | Array input for `channels` used by this API call. |
| `clip` | `AnimationClip \| null` | Yes | AnimationClip used by playback/update operations. |

### ImportedAnimationSampler

```ts
type ImportedAnimationSampler = {
    interpolation: "LINEAR" | "STEP" | "CUBICSPLINE";
    input: Float32Array;
    output: Float32Array;
};
```

#### ImportedAnimationSampler Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `interpolation` | `"LINEAR" \| "STEP" \| "CUBICSPLINE"` | Yes | Interpolation mode for animation sampler evaluation. |
| `input` | `Float32Array` | Yes | Typed numeric/binary data consumed by this operation. |
| `output` | `Float32Array` | Yes | Typed numeric/binary data consumed by this operation. |

### ImportedAnimationChannel

```ts
type ImportedAnimationChannel = {
    sampler: number;
    targetNode: Transform | null;
    path: "translation" | "rotation" | "scale" | "weights";
};
```

#### ImportedAnimationChannel Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `sampler` | `number` | Yes | Numeric input controlling `sampler` for this operation. |
| `targetNode` | `Transform \| null` | Yes | Resolved runtime target transform for an animation channel. |
| `path` | `"translation" \| "rotation" \| "scale" \| "weights"` | Yes | Animation channel target path (translation/rotation/scale/weights). |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const source = "./model.glb";
const options = { load: { loadImages: true }, import: { importLights: true, importCameras: true } };
const result = await wgpu.gltf.loadAndImport(source, options);
console.log(result);
```

## See Also
- [WasmGPU.gltf.import](./wasmgpu-gltf-import.md)
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
- [WasmGPU.gltf.parseGLB](./wasmgpu-gltf-parseglb.md)
- [WasmGPU.gltf.readAccessor](./wasmgpu-gltf-readaccessor.md)
- [WasmGPU.gltf.readAccessorAsFloat32](./wasmgpu-gltf-readaccessorasfloat32.md)
- [WasmGPU.gltf.readAccessorAsUint16](./wasmgpu-gltf-readaccessorasuint16.md)
- [WasmGPU.gltf.readIndicesAsUint32](./wasmgpu-gltf-readindicesasuint32.md)
