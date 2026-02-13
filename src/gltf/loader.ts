import type { GltfBuffer, GltfImage, GltfRoot, GltfDocument } from "./types";
import { parseGLB } from "./glb";
import { decodeDataUri, dirnameUrl, isDataUri, resolveUri } from "./uri";

export type LoadGltfOptions = {
    baseUrl?: string;
    fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    loadImages?: boolean;
    onWarning?: (message: string) => void;
};

const warn = (opts: LoadGltfOptions | undefined, msg: string): void => opts?.onWarning?.(msg);

const getFetch = (opts?: LoadGltfOptions): ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) => {
    const f = opts?.fetch ?? (globalThis.fetch as unknown as typeof fetch | undefined);
    if (!f) throw new Error("loadGltf(): fetch() is not available. Pass LoadGltfOptions.fetch or provide an ArrayBuffer source.");
    return f;
};

const fetchArrayBuffer = async (url: string, opts?: LoadGltfOptions): Promise<ArrayBuffer> => {
    const f = getFetch(opts);
    const res = await f(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    return await res.arrayBuffer();
};

const fetchJson = async (url: string, opts?: LoadGltfOptions): Promise<GltfRoot> => {
    const f = getFetch(opts);
    const res = await f(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    return (await res.json()) as GltfRoot;
};

const resolveBuffers = async (json: GltfRoot, baseUrl: string, opts?: LoadGltfOptions, glbBinChunk?: ArrayBuffer | null): Promise<ArrayBuffer[]> => {
    const buffers: GltfBuffer[] = json.buffers ?? [];
    const out: ArrayBuffer[] = new Array(buffers.length);
    for (let i = 0; i < buffers.length; i++) {
        const b = buffers[i]!;
        if (!b.uri) {
            if (!glbBinChunk) throw new Error(`buffers[${i}] has no uri but no GLB BIN chunk was provided`);
            out[i] = glbBinChunk;
            continue;
        }
        if (isDataUri(b.uri)) {
            out[i] = decodeDataUri(b.uri).data;
            continue;
        }
        const url = resolveUri(baseUrl, b.uri);
        out[i] = await fetchArrayBuffer(url, opts);
    }
    return out;
};

const resolveImages = async (json: GltfRoot, buffers: ArrayBuffer[], baseUrl: string, opts?: LoadGltfOptions): Promise<ArrayBuffer[]> => {
    const images: GltfImage[] = json.images ?? [];
    const out: ArrayBuffer[] = new Array(images.length);
    for (let i = 0; i < images.length; i++) {
        const img = images[i]!;
        if (img.uri) {
            if (isDataUri(img.uri)) {
                out[i] = decodeDataUri(img.uri).data;
            } else {
                const url = resolveUri(baseUrl, img.uri);
                out[i] = await fetchArrayBuffer(url, opts);
            }
            continue;
        }
        if (img.bufferView !== undefined) {
            const bv = json.bufferViews?.[img.bufferView];
            if (!bv) throw new Error(`Invalid images[${i}].bufferView: ${img.bufferView}`);
            const buffer = buffers[bv.buffer];
            if (!buffer) throw new Error(`Missing buffer[${bv.buffer}] for images[${i}]`);
            const start = (bv.byteOffset ?? 0) | 0;
            const length = bv.byteLength | 0;
            const copy = new Uint8Array(length);
            copy.set(new Uint8Array(buffer, start, length));
            out[i] = copy.buffer;
            continue;
        }
        warn(opts, `images[${i}] has neither uri nor bufferView; skipping`);
        out[i] = new ArrayBuffer(0);
    }
    return out;
};

export const loadGltf = async (source: string | ArrayBuffer, opts?: LoadGltfOptions): Promise<GltfDocument> => {
    if (typeof source === "string") {
        const url = source;
        const baseUrl = opts?.baseUrl ?? dirnameUrl(url);
        if (url.toLowerCase().endsWith(".glb")) {
            const glb = await fetchArrayBuffer(url, opts);
            const { json, binChunk } = parseGLB(glb);
            const buffers = await resolveBuffers(json, baseUrl, opts, binChunk);
            const doc: GltfDocument = { json, buffers, baseUrl };
            if (opts?.loadImages) doc.images = await resolveImages(json, buffers, baseUrl, opts);
            return doc;
        }
        const json = await fetchJson(url, opts);
        const buffers = await resolveBuffers(json, baseUrl, opts, null);
        const doc: GltfDocument = { json, buffers, baseUrl };
        if (opts?.loadImages) doc.images = await resolveImages(json, buffers, baseUrl, opts);
        return doc;
    }
    const ab = source;
    const dv = new DataView(ab);
    const magic = dv.byteLength >= 4 ? dv.getUint32(0, true) : 0;
    const baseUrl = opts?.baseUrl ?? "";
    if (magic === 0x46546c67) {
        const { json, binChunk } = parseGLB(ab);
        const buffers = await resolveBuffers(json, baseUrl, opts, binChunk);
        const doc: GltfDocument = { json, buffers, baseUrl };
        if (opts?.loadImages) doc.images = await resolveImages(json, buffers, baseUrl, opts);
        return doc;
    }
    const jsonText = new TextDecoder("utf-8").decode(ab);
    const json = JSON.parse(jsonText) as GltfRoot;
    const buffers = await resolveBuffers(json, baseUrl, opts, null);
    const doc: GltfDocument = { json, buffers, baseUrl };
    if (opts?.loadImages) doc.images = await resolveImages(json, buffers, baseUrl, opts);
    return doc;
};
