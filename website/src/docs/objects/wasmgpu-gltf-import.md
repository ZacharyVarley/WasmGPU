# WasmGPU.gltf.import

## Summary
WasmGPU.gltf.import handles glTF/GLB loading, parsing, accessor extraction, or import into WasmGPU scene objects.

## Syntax
```ts
WasmGPU.gltf.import(doc: GltfDocument, options?: ImportGltfOptions): Promise<GltfImportResult>
const result = await wgpu.gltf.import(doc, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `doc` | `GltfDocument` | Yes | Parsed glTF document containing JSON, buffers, and optional image payloads. |
| `options` | `ImportGltfOptions` | No | Optional configuration object that customizes behavior for this call. |

## Returns
`Promise<GltfImportResult>` - Promise that resolves to `GltfImportResult` when asynchronous work completes.

## Type Details
### GltfDocument

```ts
type GltfDocument = {
    json: GltfRoot;
    buffers: ArrayBuffer[];
    images?: ArrayBuffer[];
    baseUrl: string;
};
```

#### GltfDocument Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `json` | `GltfRoot` | Yes | Parsed glTF JSON root object. |
| `buffers` | `ArrayBuffer[]` | Yes | Typed numeric/binary data consumed by this operation. |
| `images` | `ArrayBuffer[]` | No | Typed numeric/binary data consumed by this operation. |
| `baseUrl` | `string` | Yes | Base URL used to resolve relative glTF asset URIs. |

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

### GltfRoot

```ts
type GltfRoot = {
    asset: GltfAsset;
    scene?: GltfID;
    scenes?: GltfScene[];
    nodes?: GltfNode[];
    meshes?: GltfMesh[];
    buffers?: GltfBuffer[];
    bufferViews?: GltfBufferView[];
    accessors?: GltfAccessor[];
    materials?: GltfMaterial[];
    textures?: GltfTexture[];
    images?: GltfImage[];
    samplers?: GltfSampler[];
    skins?: GltfSkin[];
    animations?: GltfAnimation[];
    cameras?: GltfCamera[];
    extensionsUsed?: string[];
    extensionsRequired?: string[];
    extensions?: GltfExtensions;
    extras?: GltfExtras;
};
```

#### GltfRoot Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `asset` | `GltfAsset` | Yes | glTF asset metadata block. |
| `scene` | `GltfID` | No | Default scene index or scene reference in glTF/root metadata. |
| `scenes` | `GltfScene[]` | No | Array input for `scenes` used by this API call. |
| `nodes` | `GltfNode[]` | No | Array input for `nodes` used by this API call. |
| `meshes` | `GltfMesh[]` | No | Array input for `meshes` used by this API call. |
| `buffers` | `GltfBuffer[]` | No | Array input for `buffers` used by this API call. |
| `bufferViews` | `GltfBufferView[]` | No | Array input for `bufferViews` used by this API call. |
| `accessors` | `GltfAccessor[]` | No | Array input for `accessors` used by this API call. |
| `materials` | `GltfMaterial[]` | No | Array input for `materials` used by this API call. |
| `textures` | `GltfTexture[]` | No | Array input for `textures` used by this API call. |
| `images` | `GltfImage[]` | No | Array input for `images` used by this API call. |
| `samplers` | `GltfSampler[]` | No | Array input for `samplers` used by this API call. |

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

### GltfAsset

```ts
type GltfAsset = {
    version: string;
    generator?: string;
    copyright?: string;
    minVersion?: string;
    extras?: GltfExtras;
};
```

#### GltfAsset Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `version` | `string` | Yes | String input controlling `version` for this operation. |
| `generator` | `string` | No | String input controlling `generator` for this operation. |
| `copyright` | `string` | No | String input controlling `copyright` for this operation. |
| `minVersion` | `string` | No | String input controlling `minVersion` for this operation. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |

### GltfID

```ts
type GltfID = number;
```

### GltfScene

```ts
type GltfScene = {
    nodes?: GltfID[];
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};
```

#### GltfScene Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `nodes` | `GltfID[]` | No | Array input for `nodes` used by this API call. |
| `name` | `string` | No | String input controlling `name` for this operation. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

### GltfNode

```ts
type GltfNode = {
    camera?: GltfID;
    children?: GltfID[];
    skin?: GltfID;
    matrix?: number[];
    mesh?: GltfID;
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
    translation?: [number, number, number];
    weights?: number[];
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};
```

#### GltfNode Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `camera` | `GltfID` | No | Camera index/reference associated with this node or runtime object. |
| `children` | `GltfID[]` | No | Array input for `children` used by this API call. |
| `skin` | `GltfID` | No | Skin index/reference associated with this node or runtime object. |
| `matrix` | `number[]` | No | Array input for `matrix` used by this API call. |
| `mesh` | `GltfID` | No | Mesh index/reference associated with this node. |
| `rotation` | `[number, number, number, number]` | No | Node quaternion rotation. |
| `scale` | `[number, number, number]` | No | Node scale vector. |
| `translation` | `[number, number, number]` | No | Node translation vector. |
| `weights` | `number[]` | No | Array input for `weights` used by this API call. |
| `name` | `string` | No | String input controlling `name` for this operation. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const doc = await wgpu.gltf.load("./model.glb", { loadImages: true });
const options = { importCameras: true, importLights: true, computeMissingNormals: true, addToScene: true };
const result = await wgpu.gltf.import(doc, options);
console.log(result);
```

## See Also
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
- [WasmGPU.gltf.loadAndImport](./wasmgpu-gltf-loadandimport.md)
- [WasmGPU.gltf.parseGLB](./wasmgpu-gltf-parseglb.md)
- [WasmGPU.gltf.readAccessor](./wasmgpu-gltf-readaccessor.md)
- [WasmGPU.gltf.readAccessorAsFloat32](./wasmgpu-gltf-readaccessorasfloat32.md)
- [WasmGPU.gltf.readAccessorAsUint16](./wasmgpu-gltf-readaccessorasuint16.md)
- [WasmGPU.gltf.readIndicesAsUint32](./wasmgpu-gltf-readindicesasuint32.md)
