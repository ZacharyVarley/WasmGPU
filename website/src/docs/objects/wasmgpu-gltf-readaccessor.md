# WasmGPU.gltf.readAccessor

## Summary
WasmGPU.gltf.readAccessor handles glTF/GLB loading, parsing, accessor extraction, or import into WasmGPU scene objects.

## Syntax
```ts
WasmGPU.gltf.readAccessor(doc: GltfDocument, accessorIndex: number): AccessorView
const result = wgpu.gltf.readAccessor(doc, accessorIndex);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `doc` | `GltfDocument` | Yes | Parsed glTF document containing JSON, buffers, and optional image payloads. |
| `accessorIndex` | `number` | Yes | Zero-based accessor index in `doc.json.accessors`. |

## Returns
`AccessorView` - Accessor metadata plus typed-array data for the requested glTF accessor.

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

### AccessorView

```ts
type AccessorView = {
    accessor: GltfAccessor;
    componentType: GltfAccessorComponentType;
    type: GltfAccessorType;
    count: number;
    numComponents: number;
    normalized: boolean;
    array: GltfTypedArray;
};
```

#### AccessorView Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `accessor` | `GltfAccessor` | Yes | Accessor metadata object selected for this read operation. |
| `componentType` | `GltfAccessorComponentType` | Yes | glTF accessor component type enum describing scalar storage width/type. |
| `type` | `GltfAccessorType` | Yes | Type discriminator used by the associated descriptor or glTF field. |
| `count` | `number` | Yes | Numeric input controlling `count` for this operation. |
| `numComponents` | `number` | Yes | Numeric input controlling `numComponents` for this operation. |
| `normalized` | `boolean` | Yes | Boolean flag that toggles `normalized` behavior. |
| `array` | `GltfTypedArray` | Yes | Typed-array payload containing accessor data. |

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

### GltfAccessorComponentType

```ts
type GltfAccessorComponentType = 5120 | 5121 | 5122 | 5123 | 5124 | 5125 | 5126;
```

### GltfAccessorType

```ts
type GltfAccessorType = "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4";
```

### GltfTypedArray

```ts
type GltfTypedArray = | Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array;
```

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

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const doc = await wgpu.gltf.load("./model.glb", { loadImages: true });
const accessorIndex = 0;
const result = wgpu.gltf.readAccessor(doc, accessorIndex);
console.log(result);
```

## See Also
- [WasmGPU.gltf.import](./wasmgpu-gltf-import.md)
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
- [WasmGPU.gltf.loadAndImport](./wasmgpu-gltf-loadandimport.md)
- [WasmGPU.gltf.parseGLB](./wasmgpu-gltf-parseglb.md)
- [WasmGPU.gltf.readAccessorAsFloat32](./wasmgpu-gltf-readaccessorasfloat32.md)
- [WasmGPU.gltf.readAccessorAsUint16](./wasmgpu-gltf-readaccessorasuint16.md)
- [WasmGPU.gltf.readIndicesAsUint32](./wasmgpu-gltf-readindicesasuint32.md)
