# WasmGPU.gltf.load

## Summary
WasmGPU.gltf.load handles glTF/GLB loading, parsing, accessor extraction, or import into WasmGPU scene objects.

## Syntax
```ts
WasmGPU.gltf.load(source: string | ArrayBuffer, options?: LoadGltfOptions): Promise<GltfDocument>
const result = await wgpu.gltf.load(source, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `string \| ArrayBuffer` | Yes | glTF/GLB source as URL/path string or in-memory ArrayBuffer payload. |
| `options` | `LoadGltfOptions` | No | Optional configuration object that customizes behavior for this call. |

## Returns
`Promise<GltfDocument>` - Promise that resolves to `GltfDocument` when asynchronous work completes.

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

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const source = "./model.glb";
const options = { baseUrl: "./assets/", loadImages: true, onWarning: (message) => console.warn(message) };
const result = await wgpu.gltf.load(source, options);
console.log(result);
```

## See Also
- [WasmGPU.gltf.import](./wasmgpu-gltf-import.md)
- [WasmGPU.gltf.loadAndImport](./wasmgpu-gltf-loadandimport.md)
- [WasmGPU.gltf.parseGLB](./wasmgpu-gltf-parseglb.md)
- [WasmGPU.gltf.readAccessor](./wasmgpu-gltf-readaccessor.md)
- [WasmGPU.gltf.readAccessorAsFloat32](./wasmgpu-gltf-readaccessorasfloat32.md)
- [WasmGPU.gltf.readAccessorAsUint16](./wasmgpu-gltf-readaccessorasuint16.md)
- [WasmGPU.gltf.readIndicesAsUint32](./wasmgpu-gltf-readindicesasuint32.md)
