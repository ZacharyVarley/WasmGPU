import type { WasmPtr } from "./index";

export type WasmSliceKind = "heap" | "frame" | "arena";
export type WasmSliceDType = "f32" | "u32" | "i32" | "u8";

export type WasmSliceHandle = {
    kind: WasmSliceKind;
    dtype: WasmSliceDType;
    ptr: WasmPtr;
    length: number;
    epoch?: number;
};

export type WasmTypedArray = Float32Array | Uint32Array | Int32Array | Uint8Array;

export interface WasmTypedArrayConstructor<T extends WasmTypedArray> {
    readonly BYTES_PER_ELEMENT: number;
    new(buffer: ArrayBuffer, byteOffset: number, length: number): T;
}

export type WasmInteropHost = {
    memory: () => WebAssembly.Memory;
    allocF32: (len: number) => WasmPtr;
    freeF32: (ptr: WasmPtr, len: number) => void;
    allocU32: (len: number) => WasmPtr;
    freeU32: (ptr: WasmPtr, len: number) => void;
    allocBytes: (bytes: number) => WasmPtr;
    freeBytes: (ptr: WasmPtr, bytes: number) => void;
};

export type FrameArenaHost = {
    alloc: (bytes: number, align?: number) => WasmPtr;
    allocF32: (len: number) => WasmPtr;
    epoch: () => number;
};

type InteropHostState = {
    wasm: WasmInteropHost;
    frameArena: FrameArenaHost;
};

let HOST: InteropHostState | null = null;

export const setWasmInteropHost = (wasm: WasmInteropHost, frameArena: FrameArenaHost): void => {
    HOST = { wasm, frameArena };
};

const ensureHost = (): InteropHostState => {
    if (!HOST) throw new Error("wasm interop host not set. This is an internal error: WasmGPU/src/wasm/index.ts should call setWasmInteropHost().");
    return HOST;
};

type HeapFinalizerHeldValue = {
    dtype: WasmSliceDType;
    ptr: WasmPtr;
    length: number;
};

const HEAP_SLICE_FINALIZER: FinalizationRegistry<HeapFinalizerHeldValue> | null =
    (typeof FinalizationRegistry !== "undefined")
        ? new FinalizationRegistry((held) => {
            try {
                const { wasm } = ensureHost();
                const ptr = held.ptr >>> 0;
                const len = held.length >>> 0;
                switch (held.dtype) {
                    case "f32": wasm.freeF32(ptr, len); break;
                    case "u32": wasm.freeU32(ptr, len); break;
                    case "i32": wasm.freeU32(ptr, len); break;
                    case "u8": wasm.freeBytes(ptr, len); break;
                }
            } catch { /* ignore */ }
        }) : null;

export class WasmSlice<T extends WasmTypedArray> {
    readonly kind: WasmSliceKind;
    readonly dtype: WasmSliceDType;
    readonly ptr: WasmPtr;
    readonly length: number;
    readonly byteLength: number;
    private readonly ctor: WasmTypedArrayConstructor<T>;
    private readonly epoch: number;
    private readonly epochProvider: (() => number) | null;
    private freed: boolean = false;
    private _buf: ArrayBufferLike | null = null;
    private _view: T | null = null;

    constructor(kind: WasmSliceKind, dtype: WasmSliceDType, ptr: WasmPtr, length: number, ctor: WasmTypedArrayConstructor<T>, epoch: number, epochProvider: (() => number) | null) {
        this.kind = kind;
        this.dtype = dtype;
        this.ptr = ptr >>> 0;
        this.length = length >>> 0;
        this.ctor = ctor;
        this.epoch = epoch >>> 0;
        this.epochProvider = epochProvider;
        this.byteLength = (this.length * (ctor.BYTES_PER_ELEMENT >>> 0)) >>> 0;
        if (this.kind === "heap") HEAP_SLICE_FINALIZER?.register(this, { dtype: this.dtype, ptr: this.ptr, length: this.length }, this);
    }

    isAlive(): boolean {
        if (this.freed) return false;
        if (!this.epochProvider) return true;
        try {
            return (this.epoch >>> 0) === (this.epochProvider() >>> 0);
        } catch {
            return false;
        }
    }

    assertAlive(): void {
        if (this.isAlive()) return;

        if (this.freed) {
            throw new Error(`WasmSlice<${this.dtype}> is no longer valid (freed).`);
        }

        if (this.epochProvider) {
            let currentEpoch = 0;
            try {
                currentEpoch = this.epochProvider() >>> 0;
            } catch { /* ignore */ }
            throw new Error(`WasmSlice<${this.dtype}> is no longer valid (epoch changed: allocEpoch=${this.epoch} currentEpoch=${currentEpoch}).`);
        }

        throw new Error(`WasmSlice<${this.dtype}> is no longer valid.`);
    }

    buffer(): ArrayBufferLike {
        this.assertAlive();
        return ensureHost().wasm.memory().buffer as ArrayBufferLike;
    }

    view(): T {
        this.assertAlive();
        const buf = ensureHost().wasm.memory().buffer as ArrayBufferLike;
        if (this._buf !== buf || !this._view) {
            this._buf = buf;
            this._view = new this.ctor(buf as unknown as ArrayBuffer, this.ptr >>> 0, this.length >>> 0);
        }
        return this._view;
    }

    write(src: ArrayLike<number> | null | undefined, srcOffset: number = 0, zeroFill: boolean = true): void {
        const v = this.view();
        if (zeroFill) v.fill(0);
        if (!src) return;
        const dstLen = this.length >>> 0;
        const srcOff = srcOffset >>> 0;
        const srcLen = (src.length >>> 0);
        const remaining = (srcLen > srcOff) ? (srcLen - srcOff) : 0;
        const n = Math.min(dstLen, remaining);
        if (n === 0) return;
        const s = src as any;
        if (ArrayBuffer.isView(s) && typeof (s as any).subarray === "function") {
            v.set((s as any).subarray(srcOff, srcOff + n), 0);
            return;
        }
        for (let i = 0; i < n; i++) v[i] = (src as any)[srcOff + i] as number;
    }

    handle(): WasmSliceHandle {
        const h: WasmSliceHandle = {
            kind: this.kind,
            dtype: this.dtype,
            ptr: this.ptr >>> 0,
            length: this.length >>> 0,
        };
        if (this.epochProvider) h.epoch = this.epoch >>> 0;
        return h;
    }

    free(): void {
        if (this.kind !== "heap") throw new Error(`WasmSlice.free(): cannot free a ${this.kind} allocation. Use reset() for arena-like allocators (frameArena.reset() / WasmHeapArena.reset()).`);
        if (this.freed) return;
        this.freed = true;
        HEAP_SLICE_FINALIZER?.unregister(this);
        const { wasm } = ensureHost();
        const ptr = this.ptr >>> 0;
        const len = this.length >>> 0;
        switch (this.dtype) {
            case "f32": wasm.freeF32(ptr, len); break;
            case "u32": wasm.freeU32(ptr, len); break;
            case "i32": wasm.freeU32(ptr, len); break;
            case "u8": wasm.freeBytes(ptr, len); break;
        }
        this._buf = null;
        this._view = null;
    }
}

const alignUp = (n: number, align: number): number => {
    const a = align >>> 0;
    if (a === 0 || (a & (a - 1)) !== 0) throw new Error(`alignUp(${n}, ${align}): align must be a non-zero power of two`);
    return Math.ceil(n / a) * a;
};

export class WasmHeapArena {
    readonly basePtr: WasmPtr;
    readonly capBytes: number;
    private headBytes: number = 0;
    private _epoch: number = 1;
    private destroyed: boolean = false;

    constructor(capBytes: number, align: number = 16) {
        const cap = capBytes >>> 0;
        if (cap === 0) throw new Error("WasmHeapArena: capBytes must be > 0");
        const { wasm } = ensureHost();
        const base = wasm.allocBytes(cap);
        if (!base) throw new Error(`WasmHeapArena(${capBytes}): wasm.allocBytes failed`);
        const a = align >>> 0;
        if (a !== 0 && (base & (a - 1)) !== 0) throw new Error(`WasmHeapArena(${capBytes}): basePtr 0x${base.toString(16)} is not ${align}-byte aligned`);
        this.basePtr = base >>> 0;
        this.capBytes = cap >>> 0;
    }

    epoch(): number {
        this.assertAlive();
        return this._epoch >>> 0;
    }

    usedBytes(): number {
        this.assertAlive();
        return this.headBytes >>> 0;
    }

    reset(): void {
        this.assertAlive();
        this.headBytes = 0;
        this._epoch = (this._epoch + 1) >>> 0;
        if (this._epoch === 0) this._epoch = 1;
    }

    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        this.headBytes = 0;
        this._epoch = (this._epoch + 1) >>> 0;
        if (this._epoch === 0) this._epoch = 1;
    }

    alloc(bytes: number, alignBytes: number = 16): WasmPtr {
        this.assertAlive();
        const b = bytes >>> 0;
        const a = alignBytes >>> 0;
        const base = this.basePtr >>> 0;
        const head = this.headBytes >>> 0;
        const start = alignUp(base + head, a);
        const end = start + b;
        if (end - base > (this.capBytes >>> 0)) throw new Error(`WasmHeapArena.alloc(${bytes}, ${alignBytes}): out of memory (used=${head} cap=${this.capBytes})`);
        this.headBytes = (end - base) >>> 0;
        return start >>> 0;
    }

    allocF32(len: number): WasmSlice<Float32Array> {
        const l = len >>> 0;
        const ptr = this.alloc(l * 4, 16);
        const epoch = this.epoch();
        return new WasmSlice("arena", "f32", ptr, l, Float32Array, epoch, () => this.epoch());
    }

    allocU32(len: number): WasmSlice<Uint32Array> {
        const l = len >>> 0;
        const ptr = this.alloc(l * 4, 16);
        const epoch = this.epoch();
        return new WasmSlice("arena", "u32", ptr, l, Uint32Array, epoch, () => this.epoch());
    }

    allocI32(len: number): WasmSlice<Int32Array> {
        const l = len >>> 0;
        const ptr = this.alloc(l * 4, 16);
        const epoch = this.epoch();
        return new WasmSlice("arena", "i32", ptr, l, Int32Array, epoch, () => this.epoch());
    }

    allocU8(len: number, alignBytes: number = 16): WasmSlice<Uint8Array> {
        const l = len >>> 0;
        const ptr = this.alloc(l, alignBytes);
        const epoch = this.epoch();
        return new WasmSlice("arena", "u8", ptr, l, Uint8Array, epoch, () => this.epoch());
    }

    private assertAlive(): void {
        if (this.destroyed) throw new Error("WasmHeapArena has been destroyed.");
    }
}

let cachedWasmBytesBuf: ArrayBufferLike | null = null;
let cachedWasmBytes: Uint8Array<ArrayBuffer> | null = null;

const wasmBytesView = (): Uint8Array<ArrayBuffer> => {
    const b = ensureHost().wasm.memory().buffer as ArrayBufferLike;
    if (b !== cachedWasmBytesBuf || !cachedWasmBytes) {
        cachedWasmBytesBuf = b;
        cachedWasmBytes = new Uint8Array(b as unknown as ArrayBuffer);
    }
    return cachedWasmBytes;
};

export const wasmInterop = {
    buffer: (): ArrayBufferLike => ensureHost().wasm.memory().buffer as ArrayBufferLike,

    bytes: (): Uint8Array<ArrayBuffer> => wasmBytesView(),

    isSharedMemory: (): boolean => {
        const b = ensureHost().wasm.memory().buffer as ArrayBufferLike;
        return (typeof SharedArrayBuffer !== "undefined") && (b instanceof SharedArrayBuffer);
    },

    requireSharedMemory: (): SharedArrayBuffer => {
        const b = ensureHost().wasm.memory().buffer as ArrayBufferLike;
        if ((typeof SharedArrayBuffer !== "undefined") && (b instanceof SharedArrayBuffer)) return b;
        throw new Error("WebAssembly memory is not a SharedArrayBuffer. Build with WASMGPU_SHARED_MEMORY=1 and serve with cross-origin isolation to enable SharedArrayBuffer.");
    },

    viewOn: <T extends WasmTypedArray>(ctor: WasmTypedArrayConstructor<T>, buffer: ArrayBufferLike, ptr: WasmPtr, len: number): T => {
        return new ctor(buffer as unknown as ArrayBuffer, ptr >>> 0, len >>> 0);
    },

    view: <T extends WasmTypedArray>(ctor: WasmTypedArrayConstructor<T>, ptr: WasmPtr, len: number): T => {
        return new ctor(ensureHost().wasm.memory().buffer as unknown as ArrayBuffer, ptr >>> 0, len >>> 0);
    },

    createHeapArena: (capBytes: number, align: number = 16): WasmHeapArena => {
        return new WasmHeapArena(capBytes, align);
    },

    viewFromHandle: (buffer: ArrayBufferLike, handle: WasmSliceHandle): ArrayBufferView => {
        const ptr = handle.ptr >>> 0;
        const len = handle.length >>> 0;
        switch (handle.dtype) {
            case "f32": return new Float32Array(buffer, ptr, len);
            case "u32": return new Uint32Array(buffer, ptr, len);
            case "i32": return new Int32Array(buffer, ptr, len);
            case "u8": return new Uint8Array(buffer, ptr, len);
        }
    },

    heap: {
        allocF32: (len: number): WasmSlice<Float32Array> => {
            const { wasm } = ensureHost();
            const ptr = wasm.allocF32(len);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`wasmInterop.heap.allocF32(${len}) failed`);
            return new WasmSlice("heap", "f32", ptr, len, Float32Array, 0, null);
        },

        allocU32: (len: number): WasmSlice<Uint32Array> => {
            const { wasm } = ensureHost();
            const ptr = wasm.allocU32(len);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`wasmInterop.heap.allocU32(${len}) failed`);
            return new WasmSlice("heap", "u32", ptr, len, Uint32Array, 0, null);
        },

        allocI32: (len: number): WasmSlice<Int32Array> => {
            const { wasm } = ensureHost();
            const ptr = wasm.allocU32(len);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`wasmInterop.heap.allocI32(${len}) failed`);
            return new WasmSlice("heap", "i32", ptr, len, Int32Array, 0, null);
        },

        allocU8: (len: number, align: number = 16): WasmSlice<Uint8Array> => {
            const { wasm } = ensureHost();
            const ptr = wasm.allocBytes((len >>> 0));
            if (!ptr && (len >>> 0) !== 0) throw new Error(`wasmInterop.heap.allocU8(${len}) failed`);
            if (align !== 0) {
                if ((ptr & ((align >>> 0) - 1)) !== 0) {
                    throw new Error(`wasmInterop.heap.allocU8(${len}): returned ptr 0x${ptr.toString(16)} is not ${align}-byte aligned`);
                }
            }
            return new WasmSlice("heap", "u8", ptr, len, Uint8Array, 0, null);
        }
    },

    frame: {
        allocF32: (len: number): WasmSlice<Float32Array> => {
            const { frameArena } = ensureHost();
            const ptr = frameArena.allocF32(len);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`wasmInterop.frame.allocF32(${len}) failed`);
            return new WasmSlice("frame", "f32", ptr, len, Float32Array, frameArena.epoch(), () => frameArena.epoch());
        },

        allocU32: (len: number): WasmSlice<Uint32Array> => {
            const { frameArena } = ensureHost();
            const ptr = frameArena.alloc((len >>> 0) * 4, 16);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`wasmInterop.frame.allocU32(${len}) failed`);
            return new WasmSlice("frame", "u32", ptr, len, Uint32Array, frameArena.epoch(), () => frameArena.epoch());
        },

        allocI32: (len: number): WasmSlice<Int32Array> => {
            const { frameArena } = ensureHost();
            const ptr = frameArena.alloc((len >>> 0) * 4, 16);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`wasmInterop.frame.allocI32(${len}) failed`);
            return new WasmSlice("frame", "i32", ptr, len, Int32Array, frameArena.epoch(), () => frameArena.epoch());
        },

        allocU8: (len: number, align: number = 16): WasmSlice<Uint8Array> => {
            const { frameArena } = ensureHost();
            const ptr = frameArena.alloc(len >>> 0, align >>> 0);
            if (!ptr && (len >>> 0) !== 0) throw new Error(`wasmInterop.frame.allocU8(${len}) failed`);
            return new WasmSlice("frame", "u8", ptr, len, Uint8Array, frameArena.epoch(), () => frameArena.epoch());
        }
    }
};
