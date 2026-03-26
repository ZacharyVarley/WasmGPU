# WasmGPU.gltf.parseGLB

## Summary
WasmGPU.gltf.parseGLB handles glTF/GLB loading, parsing, accessor extraction, or import into WasmGPU scene objects.

## Syntax
```ts
WasmGPU.gltf.parseGLB(glb: ArrayBuffer): ParsedGLB
const result = wgpu.gltf.parseGLB(glb);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `glb` | `ArrayBuffer` | Yes | Binary GLB payload to parse into JSON and BIN chunks. |

## Returns
`ParsedGLB` - Parsed GLB payload containing JSON and optional BIN chunk data.

## Type Details
### ParsedGLB

```ts
type ParsedGLB = {
    json: GltfRoot;
    binChunk: ArrayBuffer | null;
};
```

#### ParsedGLB Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `json` | `GltfRoot` | Yes | Parsed glTF JSON root object. |
| `binChunk` | `ArrayBuffer \| null` | Yes | Typed numeric/binary data consumed by this operation. |

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

### GltfMesh

```ts
type GltfMesh = {
    primitives: GltfPrimitive[];
    weights?: number[];
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};
```

#### GltfMesh Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `primitives` | `GltfPrimitive[]` | Yes | Array input for `primitives` used by this API call. |
| `weights` | `number[]` | No | Array input for `weights` used by this API call. |
| `name` | `string` | No | String input controlling `name` for this operation. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

### GltfBuffer

```ts
type GltfBuffer = {
    uri?: string;
    byteLength: number;
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};
```

#### GltfBuffer Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `uri` | `string` | No | String input controlling `uri` for this operation. |
| `byteLength` | `number` | Yes | Numeric input controlling `byteLength` for this operation. |
| `name` | `string` | No | String input controlling `name` for this operation. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

### GltfBufferView

```ts
type GltfBufferView = {
    buffer: GltfID;
    byteOffset?: number;
    byteLength: number;
    byteStride?: number;
    target?: number;
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};
```

#### GltfBufferView Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `buffer` | `GltfID` | Yes | GPUBuffer handle used as an external data source. |
| `byteOffset` | `number` | No | Numeric input controlling `byteOffset` for this operation. |
| `byteLength` | `number` | Yes | Numeric input controlling `byteLength` for this operation. |
| `byteStride` | `number` | No | Numeric input controlling `byteStride` for this operation. |
| `target` | `number` | No | Numeric input controlling `target` for this operation. |
| `name` | `string` | No | String input controlling `name` for this operation. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

### GltfAccessor

```ts
type GltfAccessor = {
    bufferView?: GltfID;
    byteOffset?: number;
    componentType: GltfAccessorComponentType;
    normalized?: boolean;
    count: number;
    type: GltfAccessorType;
    max?: number[];
    min?: number[];
    sparse?: GltfAccessorSparse;
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};
```

#### GltfAccessor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `bufferView` | `GltfID` | No | Index of the glTF bufferView backing this field. |
| `byteOffset` | `number` | No | Numeric input controlling `byteOffset` for this operation. |
| `componentType` | `GltfAccessorComponentType` | Yes | glTF accessor component type enum describing scalar storage width/type. |
| `normalized` | `boolean` | No | Boolean flag that toggles `normalized` behavior. |
| `count` | `number` | Yes | Numeric input controlling `count` for this operation. |
| `type` | `GltfAccessorType` | Yes | Type discriminator used by the associated descriptor or glTF field. |
| `max` | `number[]` | No | Array input for `max` used by this API call. |
| `min` | `number[]` | No | Array input for `min` used by this API call. |
| `sparse` | `GltfAccessorSparse` | No | Sparse accessor payload defining index/value patch data. |
| `name` | `string` | No | String input controlling `name` for this operation. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glb = new ArrayBuffer(16);
const result = wgpu.gltf.parseGLB(glb);
console.log(result);
```

## See Also
- [WasmGPU.gltf.import](./wasmgpu-gltf-import.md)
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
- [WasmGPU.gltf.loadAndImport](./wasmgpu-gltf-loadandimport.md)
- [WasmGPU.gltf.readAccessor](./wasmgpu-gltf-readaccessor.md)
- [WasmGPU.gltf.readAccessorAsFloat32](./wasmgpu-gltf-readaccessorasfloat32.md)
- [WasmGPU.gltf.readAccessorAsUint16](./wasmgpu-gltf-readaccessorasuint16.md)
- [WasmGPU.gltf.readIndicesAsUint32](./wasmgpu-gltf-readindicesasuint32.md)
