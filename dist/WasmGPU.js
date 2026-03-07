// src/wasm/interop.ts
var HOST = null;
var setWasmInteropHost = (wasm2, frameArena2) => {
  HOST = { wasm: wasm2, frameArena: frameArena2 };
};
var ensureHost = () => {
  if (!HOST) throw new Error("wasm interop host not set. This is an internal error: WasmGPU/src/wasm/index.ts should call setWasmInteropHost().");
  return HOST;
};
var HEAP_SLICE_FINALIZER = typeof FinalizationRegistry !== "undefined" ? new FinalizationRegistry((held) => {
  try {
    const { wasm: wasm2 } = ensureHost();
    const ptr = held.ptr >>> 0;
    const len = held.length >>> 0;
    switch (held.dtype) {
      case "f32":
        wasm2.freeF32(ptr, len);
        break;
      case "u32":
        wasm2.freeU32(ptr, len);
        break;
      case "i32":
        wasm2.freeU32(ptr, len);
        break;
      case "u8":
        wasm2.freeBytes(ptr, len);
        break;
    }
  } catch {
  }
}) : null;
var WasmSlice = class {
  kind;
  dtype;
  ptr;
  length;
  byteLength;
  ctor;
  epoch;
  epochProvider;
  freed = false;
  _buf = null;
  _view = null;
  constructor(kind, dtype, ptr, length, ctor, epoch, epochProvider) {
    this.kind = kind;
    this.dtype = dtype;
    this.ptr = ptr >>> 0;
    this.length = length >>> 0;
    this.ctor = ctor;
    this.epoch = epoch >>> 0;
    this.epochProvider = epochProvider;
    this.byteLength = this.length * (ctor.BYTES_PER_ELEMENT >>> 0) >>> 0;
    if (this.kind === "heap") HEAP_SLICE_FINALIZER?.register(this, { dtype: this.dtype, ptr: this.ptr, length: this.length }, this);
  }
  isAlive() {
    if (this.freed) return false;
    if (!this.epochProvider) return true;
    try {
      return this.epoch >>> 0 === this.epochProvider() >>> 0;
    } catch {
      return false;
    }
  }
  assertAlive() {
    if (this.isAlive()) return;
    if (this.freed) {
      throw new Error(`WasmSlice<${this.dtype}> is no longer valid (freed).`);
    }
    if (this.epochProvider) {
      let currentEpoch = 0;
      try {
        currentEpoch = this.epochProvider() >>> 0;
      } catch {
      }
      throw new Error(`WasmSlice<${this.dtype}> is no longer valid (epoch changed: allocEpoch=${this.epoch} currentEpoch=${currentEpoch}).`);
    }
    throw new Error(`WasmSlice<${this.dtype}> is no longer valid.`);
  }
  buffer() {
    this.assertAlive();
    return ensureHost().wasm.memory().buffer;
  }
  view() {
    this.assertAlive();
    const buf = ensureHost().wasm.memory().buffer;
    if (this._buf !== buf || !this._view) {
      this._buf = buf;
      this._view = new this.ctor(buf, this.ptr >>> 0, this.length >>> 0);
    }
    return this._view;
  }
  write(src, srcOffset = 0, zeroFill = true) {
    const v = this.view();
    if (zeroFill) v.fill(0);
    if (!src) return;
    const dstLen = this.length >>> 0;
    const srcOff = srcOffset >>> 0;
    const srcLen = src.length >>> 0;
    const remaining = srcLen > srcOff ? srcLen - srcOff : 0;
    const n = Math.min(dstLen, remaining);
    if (n === 0) return;
    const s = src;
    if (ArrayBuffer.isView(s) && typeof s.subarray === "function") {
      v.set(s.subarray(srcOff, srcOff + n), 0);
      return;
    }
    for (let i = 0; i < n; i++) v[i] = src[srcOff + i];
  }
  handle() {
    const h = {
      kind: this.kind,
      dtype: this.dtype,
      ptr: this.ptr >>> 0,
      length: this.length >>> 0
    };
    if (this.epochProvider) h.epoch = this.epoch >>> 0;
    return h;
  }
  free() {
    if (this.kind !== "heap") throw new Error(`WasmSlice.free(): cannot free a ${this.kind} allocation. Use reset() for arena-like allocators (frameArena.reset() / WasmHeapArena.reset()).`);
    if (this.freed) return;
    this.freed = true;
    HEAP_SLICE_FINALIZER?.unregister(this);
    const { wasm: wasm2 } = ensureHost();
    const ptr = this.ptr >>> 0;
    const len = this.length >>> 0;
    switch (this.dtype) {
      case "f32":
        wasm2.freeF32(ptr, len);
        break;
      case "u32":
        wasm2.freeU32(ptr, len);
        break;
      case "i32":
        wasm2.freeU32(ptr, len);
        break;
      case "u8":
        wasm2.freeBytes(ptr, len);
        break;
    }
    this._buf = null;
    this._view = null;
  }
};
var alignUp = (n, align) => {
  const a = align >>> 0;
  if (a === 0 || (a & a - 1) !== 0) throw new Error(`alignUp(${n}, ${align}): align must be a non-zero power of two`);
  return Math.ceil(n / a) * a;
};
var WasmHeapArena = class {
  basePtr;
  capBytes;
  headBytes = 0;
  _epoch = 1;
  destroyed = false;
  constructor(capBytes, align = 16) {
    const cap = capBytes >>> 0;
    if (cap === 0) throw new Error("WasmHeapArena: capBytes must be > 0");
    const { wasm: wasm2 } = ensureHost();
    const base = wasm2.allocBytes(cap);
    if (!base) throw new Error(`WasmHeapArena(${capBytes}): wasm.allocBytes failed`);
    const a = align >>> 0;
    if (a !== 0 && (base & a - 1) !== 0) throw new Error(`WasmHeapArena(${capBytes}): basePtr 0x${base.toString(16)} is not ${align}-byte aligned`);
    this.basePtr = base >>> 0;
    this.capBytes = cap >>> 0;
  }
  epoch() {
    this.assertAlive();
    return this._epoch >>> 0;
  }
  usedBytes() {
    this.assertAlive();
    return this.headBytes >>> 0;
  }
  reset() {
    this.assertAlive();
    this.headBytes = 0;
    this._epoch = this._epoch + 1 >>> 0;
    if (this._epoch === 0) this._epoch = 1;
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.headBytes = 0;
    this._epoch = this._epoch + 1 >>> 0;
    if (this._epoch === 0) this._epoch = 1;
  }
  alloc(bytes, alignBytes = 16) {
    this.assertAlive();
    const b = bytes >>> 0;
    const a = alignBytes >>> 0;
    const base = this.basePtr >>> 0;
    const head = this.headBytes >>> 0;
    const start = alignUp(base + head, a);
    const end = start + b;
    if (end - base > this.capBytes >>> 0) throw new Error(`WasmHeapArena.alloc(${bytes}, ${alignBytes}): out of memory (used=${head} cap=${this.capBytes})`);
    this.headBytes = end - base >>> 0;
    return start >>> 0;
  }
  allocF32(len) {
    const l = len >>> 0;
    const ptr = this.alloc(l * 4, 16);
    const epoch = this.epoch();
    return new WasmSlice("arena", "f32", ptr, l, Float32Array, epoch, () => this.epoch());
  }
  allocU32(len) {
    const l = len >>> 0;
    const ptr = this.alloc(l * 4, 16);
    const epoch = this.epoch();
    return new WasmSlice("arena", "u32", ptr, l, Uint32Array, epoch, () => this.epoch());
  }
  allocI32(len) {
    const l = len >>> 0;
    const ptr = this.alloc(l * 4, 16);
    const epoch = this.epoch();
    return new WasmSlice("arena", "i32", ptr, l, Int32Array, epoch, () => this.epoch());
  }
  allocU8(len, alignBytes = 16) {
    const l = len >>> 0;
    const ptr = this.alloc(l, alignBytes);
    const epoch = this.epoch();
    return new WasmSlice("arena", "u8", ptr, l, Uint8Array, epoch, () => this.epoch());
  }
  assertAlive() {
    if (this.destroyed) throw new Error("WasmHeapArena has been destroyed.");
  }
};
var cachedWasmBytesBuf = null;
var cachedWasmBytes = null;
var wasmBytesView = () => {
  const b = ensureHost().wasm.memory().buffer;
  if (b !== cachedWasmBytesBuf || !cachedWasmBytes) {
    cachedWasmBytesBuf = b;
    cachedWasmBytes = new Uint8Array(b);
  }
  return cachedWasmBytes;
};
var wasmInterop = {
  buffer: () => ensureHost().wasm.memory().buffer,
  bytes: () => wasmBytesView(),
  isSharedMemory: () => {
    const b = ensureHost().wasm.memory().buffer;
    return typeof SharedArrayBuffer !== "undefined" && b instanceof SharedArrayBuffer;
  },
  requireSharedMemory: () => {
    const b = ensureHost().wasm.memory().buffer;
    if (typeof SharedArrayBuffer !== "undefined" && b instanceof SharedArrayBuffer) return b;
    throw new Error("WebAssembly memory is not a SharedArrayBuffer. Build with WASMGPU_SHARED_MEMORY=1 and serve with cross-origin isolation to enable SharedArrayBuffer.");
  },
  viewOn: (ctor, buffer, ptr, len) => {
    return new ctor(buffer, ptr >>> 0, len >>> 0);
  },
  view: (ctor, ptr, len) => {
    return new ctor(ensureHost().wasm.memory().buffer, ptr >>> 0, len >>> 0);
  },
  createHeapArena: (capBytes, align = 16) => {
    return new WasmHeapArena(capBytes, align);
  },
  viewFromHandle: (buffer, handle) => {
    const ptr = handle.ptr >>> 0;
    const len = handle.length >>> 0;
    switch (handle.dtype) {
      case "f32":
        return new Float32Array(buffer, ptr, len);
      case "u32":
        return new Uint32Array(buffer, ptr, len);
      case "i32":
        return new Int32Array(buffer, ptr, len);
      case "u8":
        return new Uint8Array(buffer, ptr, len);
    }
  },
  heap: {
    allocF32: (len) => {
      const { wasm: wasm2 } = ensureHost();
      const ptr = wasm2.allocF32(len);
      if (!ptr && len >>> 0 !== 0) throw new Error(`wasmInterop.heap.allocF32(${len}) failed`);
      return new WasmSlice("heap", "f32", ptr, len, Float32Array, 0, null);
    },
    allocU32: (len) => {
      const { wasm: wasm2 } = ensureHost();
      const ptr = wasm2.allocU32(len);
      if (!ptr && len >>> 0 !== 0) throw new Error(`wasmInterop.heap.allocU32(${len}) failed`);
      return new WasmSlice("heap", "u32", ptr, len, Uint32Array, 0, null);
    },
    allocI32: (len) => {
      const { wasm: wasm2 } = ensureHost();
      const ptr = wasm2.allocU32(len);
      if (!ptr && len >>> 0 !== 0) throw new Error(`wasmInterop.heap.allocI32(${len}) failed`);
      return new WasmSlice("heap", "i32", ptr, len, Int32Array, 0, null);
    },
    allocU8: (len, align = 16) => {
      const { wasm: wasm2 } = ensureHost();
      const ptr = wasm2.allocBytes(len >>> 0);
      if (!ptr && len >>> 0 !== 0) throw new Error(`wasmInterop.heap.allocU8(${len}) failed`);
      if (align !== 0) {
        if ((ptr & (align >>> 0) - 1) !== 0) {
          throw new Error(`wasmInterop.heap.allocU8(${len}): returned ptr 0x${ptr.toString(16)} is not ${align}-byte aligned`);
        }
      }
      return new WasmSlice("heap", "u8", ptr, len, Uint8Array, 0, null);
    }
  },
  frame: {
    allocF32: (len) => {
      const { frameArena: frameArena2 } = ensureHost();
      const ptr = frameArena2.allocF32(len);
      if (!ptr && len >>> 0 !== 0) throw new Error(`wasmInterop.frame.allocF32(${len}) failed`);
      return new WasmSlice("frame", "f32", ptr, len, Float32Array, frameArena2.epoch(), () => frameArena2.epoch());
    },
    allocU32: (len) => {
      const { frameArena: frameArena2 } = ensureHost();
      const ptr = frameArena2.alloc((len >>> 0) * 4, 16);
      if (!ptr && len >>> 0 !== 0) throw new Error(`wasmInterop.frame.allocU32(${len}) failed`);
      return new WasmSlice("frame", "u32", ptr, len, Uint32Array, frameArena2.epoch(), () => frameArena2.epoch());
    },
    allocI32: (len) => {
      const { frameArena: frameArena2 } = ensureHost();
      const ptr = frameArena2.alloc((len >>> 0) * 4, 16);
      if (!ptr && len >>> 0 !== 0) throw new Error(`wasmInterop.frame.allocI32(${len}) failed`);
      return new WasmSlice("frame", "i32", ptr, len, Int32Array, frameArena2.epoch(), () => frameArena2.epoch());
    },
    allocU8: (len, align = 16) => {
      const { frameArena: frameArena2 } = ensureHost();
      const ptr = frameArena2.alloc(len >>> 0, align >>> 0);
      if (!ptr && len >>> 0 !== 0) throw new Error(`wasmInterop.frame.allocU8(${len}) failed`);
      return new WasmSlice("frame", "u8", ptr, len, Uint8Array, frameArena2.epoch(), () => frameArena2.epoch());
    }
  }
};

// src/wasm/index.ts
var modPromise = null;
var mod = null;
var frameArenaEpoch = 0;
var DEFAULT_FRAME_ARENA_BYTES = 8 * 1024 * 1024;
var IIFE_SCRIPT_URL = (() => {
  if (typeof document === "undefined") return null;
  const cs = document.currentScript;
  const src = cs?.src;
  return src && src.length > 0 ? src : null;
})();
var defaultBaseURL = () => {
  if (import.meta.url !== "__CURRENT_SCRIPT__") return new URL(".", import.meta.url).toString();
  const base = IIFE_SCRIPT_URL ?? location.href;
  return new URL(".", base).toString();
};
var initWebAssembly = async (baseURL) => {
  if (mod) return;
  const base = baseURL ?? defaultBaseURL();
  const wasmURL = new URL("wasm.js", base).toString();
  modPromise ??= import(wasmURL);
  mod = await modPromise;
  mod.wasmgpu_frame_arena_init(DEFAULT_FRAME_ARENA_BYTES);
  frameArenaEpoch = mod.wasmgpu_frame_arena_epoch() >>> 0;
};
var ensure = () => {
  if (!mod) throw new Error("WebAssembly driver not initialized. Call await initWebAssembly() first.");
  return mod;
};
var refreshFrameArenaEpoch = () => {
  frameArenaEpoch = ensure().wasmgpu_frame_arena_epoch() >>> 0;
  return frameArenaEpoch;
};
var bool = (x) => !!x;
var wasm = {
  memory: () => ensure().memory,
  seed: (seed) => {
    ensure().wasmgpu_seed(seed >>> 0);
  },
  allocF32: (len) => ensure().wasmgpu_alloc_f32(len >>> 0) >>> 0,
  freeF32: (ptr, len) => ensure().wasmgpu_free_f32(ptr >>> 0, len >>> 0),
  allocU32: (len) => ensure().wasmgpu_alloc_u32(len >>> 0) >>> 0,
  freeU32: (ptr, len) => ensure().wasmgpu_free_u32(ptr >>> 0, len >>> 0),
  allocBytes: (bytes) => ensure().wasmgpu_alloc(bytes >>> 0) >>> 0,
  freeBytes: (ptr, bytes) => ensure().wasmgpu_free(ptr >>> 0, bytes >>> 0),
  f32view: (ptr, len) => ensure().f32view(ptr >>> 0, len >>> 0),
  u32view: (ptr, len) => ensure().u32view(ptr >>> 0, len >>> 0),
  i32view: (ptr, len) => ensure().i32view(ptr >>> 0, len >>> 0),
  u8view: (ptr, len) => ensure().u8view(ptr >>> 0, len >>> 0),
  writeF32: (ptr, len, src) => {
    const v = ensure().f32view(ptr >>> 0, len >>> 0);
    const n = Math.min(len >>> 0, src ? src.length >>> 0 : 0);
    for (let i = 0; i < n; i++) v[i] = src[i];
    for (let i = n; i < len >>> 0; i++) v[i] = 0;
  },
  readF32Array: (ptr, len) => Array.from(ensure().f32view(ptr >>> 0, len >>> 0))
};
var frameArena = {
  init: (capBytes = DEFAULT_FRAME_ARENA_BYTES) => {
    const base = ensure().wasmgpu_frame_arena_init(capBytes >>> 0) >>> 0;
    if (!base) throw new Error(`wasmgpu_frame_arena_init(${capBytes}) failed`);
    refreshFrameArenaEpoch();
    return base;
  },
  reset: () => {
    ensure().wasmgpu_frame_arena_reset();
    refreshFrameArenaEpoch();
  },
  alloc: (bytes, align = 16) => {
    const ptr = ensure().wasmgpu_frame_alloc(bytes >>> 0, align >>> 0) >>> 0;
    if (!ptr) throw new Error(`wasmgpu_frame_alloc(${bytes}, ${align}) failed`);
    return ptr;
  },
  allocF32: (len) => {
    const ptr = ensure().wasmgpu_frame_alloc_f32(len >>> 0) >>> 0;
    if (!ptr) throw new Error(`wasmgpu_frame_alloc_f32(${len}) failed`);
    return ptr;
  },
  epoch: () => {
    if (!frameArenaEpoch) refreshFrameArenaEpoch();
    return frameArenaEpoch;
  },
  usedBytes: () => ensure().wasmgpu_frame_arena_used() >>> 0,
  capBytes: () => ensure().wasmgpu_frame_arena_cap() >>> 0
};
setWasmInteropHost(wasm, frameArena);
var animf = {
  sampleClipTRS: (posPtr, rotPtr, sclPtr, transformCount, samplersPtr, samplerCount, channelsPtr, channelCount, time) => {
    ensure().anim_sample_clip_trs(posPtr >>> 0, rotPtr >>> 0, sclPtr >>> 0, transformCount >>> 0, samplersPtr >>> 0, samplerCount >>> 0, channelsPtr >>> 0, channelCount >>> 0, time);
  },
  computeJointMatricesTo: (outPtr, jointIndicesPtr, jointCount, invBindPtr, worldBasePtr, meshWorldPtr) => {
    ensure().anim_compute_joint_matrices_to(outPtr >>> 0, jointIndicesPtr >>> 0, jointCount >>> 0, invBindPtr >>> 0, worldBasePtr >>> 0, meshWorldPtr >>> 0);
  }
};
var cullf = {
  spheresFrustum: (outIndicesPtr, centersPtr, radiiPtr, count, frustumPlanesPtr) => {
    return ensure().cull_spheres_frustum(outIndicesPtr >>> 0, centersPtr >>> 0, radiiPtr >>> 0, count >>> 0, frustumPlanesPtr >>> 0) >>> 0;
  }
};
var frustumf = {
  writePlanesFromViewProjection: (outPlanesPtr, viewProjMat4) => {
    const out = wasm.f32view(outPlanesPtr, 24);
    const m = viewProjMat4;
    const r0x = m[0], r0y = m[4], r0z = m[8], r0w = m[12];
    const r1x = m[1], r1y = m[5], r1z = m[9], r1w = m[13];
    const r2x = m[2], r2y = m[6], r2z = m[10], r2w = m[14];
    const r3x = m[3], r3y = m[7], r3z = m[11], r3w = m[15];
    out[0] = r3x + r0x;
    out[1] = r3y + r0y;
    out[2] = r3z + r0z;
    out[3] = r3w + r0w;
    out[4] = r3x - r0x;
    out[5] = r3y - r0y;
    out[6] = r3z - r0z;
    out[7] = r3w - r0w;
    out[8] = r3x + r1x;
    out[9] = r3y + r1y;
    out[10] = r3z + r1z;
    out[11] = r3w + r1w;
    out[12] = r3x - r1x;
    out[13] = r3y - r1y;
    out[14] = r3z - r1z;
    out[15] = r3w - r1w;
    out[16] = r2x;
    out[17] = r2y;
    out[18] = r2z;
    out[19] = r2w;
    out[20] = r3x - r2x;
    out[21] = r3y - r2y;
    out[22] = r3z - r2z;
    out[23] = r3w - r2w;
    for (let p = 0; p < 6; p++) {
      const i = p * 4;
      const nx = out[i + 0];
      const ny = out[i + 1];
      const nz = out[i + 2];
      const len = Math.hypot(nx, ny, nz);
      if (len > 0) {
        const inv = 1 / len;
        out[i + 0] = nx * inv;
        out[i + 1] = ny * inv;
        out[i + 2] = nz * inv;
        out[i + 3] = out[i + 3] * inv;
      }
    }
  }
};
var mat4f = {
  alloc: () => wasm.allocF32(16),
  view: (ptr) => wasm.f32view(ptr, 16),
  set: (ptr, src) => wasm.writeF32(ptr, 16, src),
  abs: (out, m) => {
    ensure().mat4_abs(out >>> 0, m >>> 0);
  },
  add: (out, a, b) => {
    ensure().mat4_add(out >>> 0, a >>> 0, b >>> 0);
  },
  copy: (out, m) => {
    ensure().mat4_copy(out >>> 0, m >>> 0);
  },
  decomposeTRS: (outTrs, m) => {
    ensure().mat4_decompose_trs(outTrs >>> 0, m >>> 0);
  },
  det: (m) => ensure().mat4_det(m >>> 0),
  identity: (out) => {
    ensure().mat4_identity(out >>> 0);
  },
  init: (out, m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15) => {
    ensure().mat4_init(out >>> 0, m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15);
  },
  invert: (out, m) => {
    ensure().mat4_invert(out >>> 0, m >>> 0);
  },
  isEqual: (a, b) => bool(ensure().mat4_isEqual(a >>> 0, b >>> 0)),
  isIdentity: (m) => bool(ensure().mat4_isIdentity(m >>> 0)),
  isInverse: (a, b) => bool(ensure().mat4_isInverse(a >>> 0, b >>> 0)),
  isZero: (m) => bool(ensure().mat4_isZero(m >>> 0)),
  lookAt: (out, eye3, center3, up3) => {
    ensure().mat4_lookAt(out >>> 0, eye3 >>> 0, center3 >>> 0, up3 >>> 0);
  },
  mul: (out, a, b) => {
    ensure().mat4_mul(out >>> 0, a >>> 0, b >>> 0);
  },
  mulVec4: (outVec4, m, v4) => {
    ensure().mat4_mul_vec4(outVec4 >>> 0, m >>> 0, v4 >>> 0);
  },
  neg: (out, m) => {
    ensure().mat4_neg(out >>> 0, m >>> 0);
  },
  norm: (m) => ensure().mat4_norm(m >>> 0),
  normalize: (out, m) => {
    ensure().mat4_normalize(out >>> 0, m >>> 0);
  },
  normsq: (m) => ensure().mat4_normsq(m >>> 0),
  perspective: (out, fovY, aspect, near, far) => {
    ensure().mat4_perspective(out >>> 0, fovY, aspect, near, far);
  },
  random: (out) => {
    ensure().mat4_random(out >>> 0);
  },
  randomRange: (out, min, max) => {
    ensure().mat4_random_range(out >>> 0, min, max);
  },
  rotateX: (out, m, angle) => {
    ensure().mat4_rotateX(out >>> 0, m >>> 0, angle);
  },
  rotateY: (out, m, angle) => {
    ensure().mat4_rotateY(out >>> 0, m >>> 0, angle);
  },
  rotateZ: (out, m, angle) => {
    ensure().mat4_rotateZ(out >>> 0, m >>> 0, angle);
  },
  round: (out, m) => {
    ensure().mat4_round(out >>> 0, m >>> 0);
  },
  scl: (out, m, scalar) => {
    ensure().mat4_scl(out >>> 0, m >>> 0, scalar);
  },
  sub: (out, a, b) => {
    ensure().mat4_sub(out >>> 0, a >>> 0, b >>> 0);
  },
  trace: (m) => ensure().mat4_trace(m >>> 0),
  translate: (out, m, v3) => {
    ensure().mat4_translate(out >>> 0, m >>> 0, v3 >>> 0);
  },
  transpose: (out, m) => {
    ensure().mat4_transpose(out >>> 0, m >>> 0);
  },
  print: (m) => {
    const a = wasm.f32view(m, 16);
    console.log(
      `[ ${a[0]} ${a[1]} ${a[2]} ${a[3]} ]
[ ${a[4]} ${a[5]} ${a[6]} ${a[7]} ]
[ ${a[8]} ${a[9]} ${a[10]} ${a[11]} ]
[ ${a[12]} ${a[13]} ${a[14]} ${a[15]} ]`
    );
  }
};
var meshf = {
  computeVertexNormals: (outNormalsPtr, positionsPtr, vertexCount, indicesPtr, indexCount) => {
    ensure().mesh_compute_vertex_normals(outNormalsPtr >>> 0, positionsPtr >>> 0, vertexCount >>> 0, indicesPtr >>> 0, indexCount >>> 0);
  }
};
var ndarrayf = {
  numel: (shapePtr, ndim) => {
    return ensure().ndarray_numel(shapePtr >>> 0, ndim >>> 0) >>> 0;
  },
  stridesRowMajorTo: (outStridesPtr, shapePtr, ndim, elemBytes) => {
    return !!ensure().ndarray_strides_row_major(outStridesPtr >>> 0, shapePtr >>> 0, ndim >>> 0, elemBytes >>> 0);
  },
  offsetBytes: (shapePtr, stridesPtr, indicesPtr, ndim, baseOffsetBytes) => {
    return ensure().ndarray_offset_bytes(shapePtr >>> 0, stridesPtr >>> 0, indicesPtr >>> 0, ndim >>> 0, baseOffsetBytes >>> 0) >>> 0;
  }
};
var quatf = {
  alloc: () => wasm.allocF32(4),
  view: (ptr) => wasm.f32view(ptr, 4),
  set: (ptr, src) => wasm.writeF32(ptr, 4, src),
  abs: (out, q) => {
    ensure().quat_abs(out >>> 0, q >>> 0);
  },
  add: (out, a, b) => {
    ensure().quat_add(out >>> 0, a >>> 0, b >>> 0);
  },
  copy: (out, q) => {
    ensure().quat_copy(out >>> 0, q >>> 0);
  },
  dist: (a, b) => ensure().quat_dist(a >>> 0, b >>> 0),
  distsq: (a, b) => ensure().quat_distsq(a >>> 0, b >>> 0),
  fromAxisAngle: (out, axis3, angle) => {
    ensure().quat_fromAxisAngle(out >>> 0, axis3 >>> 0, angle);
  },
  init: (out, x, y, z, w) => {
    ensure().quat_init(out >>> 0, x, y, z, w);
  },
  invert: (out, q) => {
    ensure().quat_invert(out >>> 0, q >>> 0);
  },
  isEqual: (a, b) => bool(ensure().quat_isEqual(a >>> 0, b >>> 0)),
  isNormalized: (q) => bool(ensure().quat_isNormalized(q >>> 0)),
  isZero: (q) => bool(ensure().quat_isZero(q >>> 0)),
  mul: (out, a, b) => {
    ensure().quat_mul(out >>> 0, a >>> 0, b >>> 0);
  },
  neg: (out, q) => {
    ensure().quat_neg(out >>> 0, q >>> 0);
  },
  norm: (q) => ensure().quat_norm(q >>> 0),
  normalize: (out, q) => {
    ensure().quat_normalize(out >>> 0, q >>> 0);
  },
  normscl: (out, q, scalar) => {
    ensure().quat_normscl(out >>> 0, q >>> 0, scalar);
  },
  normsq: (q) => ensure().quat_normsq(q >>> 0),
  random: (out) => {
    ensure().quat_random(out >>> 0);
  },
  randomRange: (out, min, max) => {
    ensure().quat_random_range(out >>> 0, min, max);
  },
  round: (out, q) => {
    ensure().quat_round(out >>> 0, q >>> 0);
  },
  scl: (out, q, scalar) => {
    ensure().quat_scl(out >>> 0, q >>> 0, scalar);
  },
  slerp: (out, a, b, t) => {
    ensure().quat_slerp(out >>> 0, a >>> 0, b >>> 0, t);
  },
  sub: (out, a, b) => {
    ensure().quat_sub(out >>> 0, a >>> 0, b >>> 0);
  },
  toRotation: (outVec3, q, v3) => {
    ensure().quat_toRotation(outVec3 >>> 0, q >>> 0, v3 >>> 0);
  },
  print: (q) => {
    const a = wasm.f32view(q, 4);
    console.log(`[ ${a[0]} ${a[1]} ${a[2]} ${a[3]} ]`);
  }
};
var transformf = {
  composeLocalMany: (outLocalPtr, posPtr, rotPtr, sclPtr, count) => {
    ensure().transform_compose_local_many(outLocalPtr >>> 0, posPtr >>> 0, rotPtr >>> 0, sclPtr >>> 0, count >>> 0);
  },
  updateWorldOrdered: (outWorldPtr, localPtr, parentPtr, orderPtr, count) => {
    ensure().transform_update_world_ordered(outWorldPtr >>> 0, localPtr >>> 0, parentPtr >>> 0, orderPtr >>> 0, count >>> 0);
  },
  packModelNormalMat4FromPtrs: (outPtr, matPtrsPtr, count) => {
    ensure().transform_pack_model_normal_mat4_from_ptrs(outPtr >>> 0, matPtrsPtr >>> 0, count >>> 0);
  }
};
var vec3f = {
  alloc: () => wasm.allocF32(4),
  view3: (ptr) => wasm.f32view(ptr, 3),
  view4: (ptr) => wasm.f32view(ptr, 4),
  set3: (ptr, src) => wasm.writeF32(ptr, 3, src),
  abs: (out, v) => {
    ensure().vec3_abs(out >>> 0, v >>> 0);
  },
  add: (out, a, b) => {
    ensure().vec3_add(out >>> 0, a >>> 0, b >>> 0);
  },
  ang: (out, v) => {
    ensure().vec3_ang(out >>> 0, v >>> 0);
  },
  angBetween: (a, b) => ensure().vec3_angBetween(a >>> 0, b >>> 0),
  copy: (out, v) => {
    ensure().vec3_copy(out >>> 0, v >>> 0);
  },
  cross: (out, a, b) => {
    ensure().vec3_cross(out >>> 0, a >>> 0, b >>> 0);
  },
  dist: (a, b) => ensure().vec3_dist(a >>> 0, b >>> 0),
  distsq: (a, b) => ensure().vec3_distsq(a >>> 0, b >>> 0),
  dot: (a, b) => ensure().vec3_dot(a >>> 0, b >>> 0),
  init: (out, x, y, z) => {
    ensure().vec3_init(out >>> 0, x, y, z);
  },
  interp: (out, v, a, b, c) => {
    ensure().vec3_interp(out >>> 0, v >>> 0, a, b, c);
  },
  isEqual: (a, b) => bool(ensure().vec3_isEqual(a >>> 0, b >>> 0)),
  isNormalized: (v) => bool(ensure().vec3_isNormalized(v >>> 0)),
  isOrthogonal: (a, b) => bool(ensure().vec3_isOrthogonal(a >>> 0, b >>> 0)),
  isParallel: (a, b) => bool(ensure().vec3_isParallel(a >>> 0, b >>> 0)),
  isZero: (v) => bool(ensure().vec3_isZero(v >>> 0)),
  neg: (out, v) => {
    ensure().vec3_neg(out >>> 0, v >>> 0);
  },
  norm: (v) => ensure().vec3_norm(v >>> 0),
  normalize: (out, v) => {
    ensure().vec3_normalize(out >>> 0, v >>> 0);
  },
  normscl: (out, v, scalar) => {
    ensure().vec3_normscl(out >>> 0, v >>> 0, scalar);
  },
  normsq: (v) => ensure().vec3_normsq(v >>> 0),
  oproj: (out, a, b) => {
    ensure().vec3_oproj(out >>> 0, a >>> 0, b >>> 0);
  },
  proj: (out, a, b) => {
    ensure().vec3_proj(out >>> 0, a >>> 0, b >>> 0);
  },
  random: (out) => {
    ensure().vec3_random(out >>> 0);
  },
  randomRange: (out, min, max) => {
    ensure().vec3_random_range(out >>> 0, min, max);
  },
  reflect: (out, a, b) => {
    ensure().vec3_reflect(out >>> 0, a >>> 0, b >>> 0);
  },
  refract: (out, a, b, refractiveIndex) => {
    ensure().vec3_refract(out >>> 0, a >>> 0, b >>> 0, refractiveIndex);
  },
  round: (out, v) => {
    ensure().vec3_round(out >>> 0, v >>> 0);
  },
  scl: (out, v, scalar) => {
    ensure().vec3_scl(out >>> 0, v >>> 0, scalar);
  },
  sub: (out, a, b) => {
    ensure().vec3_sub(out >>> 0, a >>> 0, b >>> 0);
  },
  print: (v) => {
    const a = wasm.f32view(v, 3);
    console.log(`[ ${a[0]} ${a[1]} ${a[2]} ]`);
  }
};
var mat4 = {
  abs: (matr) => ensure().mat4abs(matr),
  add: (matr1, matr2) => ensure().mat4add(matr1, matr2),
  copy: (matr) => ensure().mat4copy(matr),
  det: (matr) => ensure().mat4det(matr),
  identity: () => ensure().mat4identity(),
  init: (m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15) => ensure().mat4init(m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15),
  invert: (matr) => ensure().mat4invert(matr),
  isEqual: (matr1, matr2) => ensure().mat4isEqual(matr1, matr2),
  isIdentity: (matr) => ensure().mat4isIdentity(matr),
  isInverse: (matr1, matr2) => ensure().mat4isInverse(matr1, matr2),
  isZero: (matr) => ensure().mat4isZero(matr),
  lookAt: (eye, center, up) => ensure().mat4lookAt(eye, center, up),
  mul: (matr1, matr2ORvect) => ensure().mat4mul(matr1, matr2ORvect),
  neg: (matr) => ensure().mat4neg(matr),
  norm: (matr) => ensure().mat4norm(matr),
  normalize: (matr) => ensure().mat4normalize(matr),
  normsq: (matr) => ensure().mat4normsq(matr),
  perspective: (fovY, aspect, near, far) => ensure().mat4perspective(fovY, aspect, near, far),
  print: (matr) => ensure().mat4print(matr),
  random: (min, max) => ensure().mat4random(min, max),
  rotateX: (matr, angle) => ensure().mat4rotateX(matr, angle),
  rotateY: (matr, angle) => ensure().mat4rotateY(matr, angle),
  rotateZ: (matr, angle) => ensure().mat4rotateZ(matr, angle),
  round: (matr) => ensure().mat4round(matr),
  scl: (matr, scalar) => ensure().mat4scl(matr, scalar),
  sub: (matr1, matr2) => ensure().mat4sub(matr1, matr2),
  trace: (matr) => ensure().mat4trace(matr),
  translate: (matr, vect) => ensure().mat4translate(matr, vect),
  transpose: (matr) => ensure().mat4transpose(matr)
};
var quat = {
  abs: (q) => ensure().quatabs(q),
  add: (q1, q2) => ensure().quatadd(q1, q2),
  copy: (q) => ensure().quatcopy(q),
  dist: (q1, q2) => ensure().quatdist(q1, q2),
  distsq: (q1, q2) => ensure().quatdistsq(q1, q2),
  fromAxisAngle: (axis, angle) => ensure().quatfromAxisAngle(axis, angle),
  init: (a, b, c, d) => ensure().quatinit(a, b, c, d),
  invert: (q) => ensure().quatinvert(q),
  isEqual: (q1, q2) => ensure().quatisEqual(q1, q2),
  isNormalized: (q) => ensure().quatisNormalized(q),
  isZero: (q) => ensure().quatisZero(q),
  mul: (q1, q2) => ensure().quatmul(q1, q2),
  neg: (q) => ensure().quatneg(q),
  norm: (q) => ensure().quatnorm(q),
  normalize: (q) => ensure().quatnormalize(q),
  normscl: (q, scalar) => ensure().quatnormscl(q, scalar),
  normsq: (q) => ensure().quatnormsq(q),
  print: (q) => ensure().quatprint(q),
  random: (min, max) => ensure().quatrandom(min, max),
  round: (q) => ensure().quatround(q),
  scl: (q, scalar) => ensure().quatscl(q, scalar),
  slerp: (q1, q2, t) => ensure().quatslerp(q1, q2, t),
  sub: (q1, q2) => ensure().quatsub(q1, q2),
  toRotation: (q, v) => ensure().quattoRotation(q, v)
};
var vec3 = {
  abs: (v) => ensure().vec3abs(v),
  add: (v1, v2) => ensure().vec3add(v1, v2),
  ang: (v) => ensure().vec3ang(v),
  angBetween: (v1, v2) => ensure().vec3angBetween(v1, v2),
  copy: (v) => ensure().vec3copy(v),
  cross: (v1, v2) => ensure().vec3cross(v1, v2),
  dist: (v1, v2) => ensure().vec3dist(v1, v2),
  distsq: (v1, v2) => ensure().vec3distsq(v1, v2),
  dot: (v1, v2) => ensure().vec3dot(v1, v2),
  init: (x, y, z) => ensure().vec3init(x, y, z),
  interp: (v, a, b, c) => ensure().vec3interp(v, a, b, c),
  isEqual: (v1, v2) => ensure().vec3isEqual(v1, v2),
  isNormalized: (v) => ensure().vec3isNormalized(v),
  isOrthogonal: (v1, v2) => ensure().vec3isOrthogonal(v1, v2),
  isParallel: (v1, v2) => ensure().vec3isParallel(v1, v2),
  isZero: (v) => ensure().vec3isZero(v),
  neg: (v) => ensure().vec3neg(v),
  norm: (v) => ensure().vec3norm(v),
  normalize: (v) => ensure().vec3normalize(v),
  normscl: (v, scalar) => ensure().vec3normscl(v, scalar),
  normsq: (v) => ensure().vec3normsq(v),
  oproj: (v1, v2) => ensure().vec3oproj(v1, v2),
  print: (v) => ensure().vec3print(v),
  proj: (v1, v2) => ensure().vec3proj(v1, v2),
  random: (min, max) => ensure().vec3random(min, max),
  reflect: (v1, v2) => ensure().vec3reflect(v1, v2),
  refract: (v1, v2, refractiveIndex) => ensure().vec3refract(v1, v2, refractiveIndex),
  round: (v) => ensure().vec3round(v),
  scl: (v, scalar) => ensure().vec3scl(v, scalar),
  sub: (v1, v2) => ensure().vec3sub(v1, v2)
};

// src/core/transform.ts
var NO_PARENT = 4294967295;
var TransformStore = class _TransformStore {
  static _global = null;
  static global() {
    if (!_TransformStore._global) _TransformStore._global = new _TransformStore(16384);
    return _TransformStore._global;
  }
  cap;
  count = 0;
  posPtr = 0;
  rotPtr = 0;
  sclPtr = 0;
  localPtr = 0;
  worldPtr = 0;
  parentPtr = 0;
  orderPtr = 0;
  tmpAxisPtr = 0;
  tmpQuatPtr = 0;
  _buf = null;
  _f32 = null;
  _u32 = null;
  _dirty = true;
  _orderDirty = true;
  _dirtyAll = true;
  _dirtyList = [];
  _dirtyMark = new Uint8Array(0);
  _nodes = [];
  _freeList = [];
  _visited = new Uint8Array(0);
  _stack = [];
  constructor(initialCap) {
    this.cap = Math.max(1, initialCap | 0);
    this.allocateArrays(this.cap);
  }
  allocateArrays(cap) {
    this.posPtr = wasm.allocF32(cap * 3);
    this.rotPtr = wasm.allocF32(cap * 4);
    this.sclPtr = wasm.allocF32(cap * 3);
    this.localPtr = wasm.allocF32(cap * 16);
    this.worldPtr = wasm.allocF32(cap * 16);
    this.parentPtr = wasm.allocU32(cap);
    this.orderPtr = wasm.allocU32(cap);
    this.tmpAxisPtr = wasm.allocF32(4);
    this.tmpQuatPtr = wasm.allocF32(4);
    this.ensureViews();
    const u32 = this.u32();
    const parentBase = this.parentPtr >>> 2;
    for (let i = 0; i < cap; i++) u32[parentBase + i] = NO_PARENT;
  }
  ensureViews() {
    const buf = wasm.memory().buffer;
    if (this._buf !== buf) {
      this._buf = buf;
      this._f32 = new Float32Array(buf);
      this._u32 = new Uint32Array(buf);
    }
  }
  f32() {
    this.ensureViews();
    return this._f32;
  }
  u32() {
    this.ensureViews();
    return this._u32;
  }
  ensureDirtyMarkCapacity() {
    if (this._dirtyMark.length >= this.cap) return;
    const next = new Uint8Array(this.cap);
    for (let i = 0; i < this._dirtyList.length; i++) next[this._dirtyList[i]] = 1;
    this._dirtyMark = next;
  }
  clearDirtyList() {
    for (let i = 0; i < this._dirtyList.length; i++) this._dirtyMark[this._dirtyList[i]] = 0;
    this._dirtyList.length = 0;
  }
  markDirty() {
    this._dirty = true;
    this._dirtyAll = true;
    this.clearDirtyList();
  }
  markOrderDirty() {
    this._orderDirty = true;
    this._dirty = true;
    this._dirtyAll = true;
    this.clearDirtyList();
  }
  markIndexDirty(index) {
    if (index < 0 || index >= this.count) return;
    this._dirty = true;
    if (this._dirtyAll) return;
    this.ensureDirtyMarkCapacity();
    if (this._dirtyMark[index]) return;
    this._dirtyMark[index] = 1;
    this._dirtyList.push(index);
  }
  alloc(node) {
    let index;
    if (this._freeList.length > 0) {
      index = this._freeList.pop();
      if (index < 0) throw new Error("TransformStore.alloc: corrupted free list (negative index).");
      if (index >= this.count) this.count = index + 1;
      if (this._nodes[index] !== null && this._nodes[index] !== void 0) throw new Error(`TransformStore.alloc: free list returned an in-use slot ${index}.`);
    } else {
      if (this.count >= this.cap) this.growTo(this.cap * 2);
      index = this.count++;
    }
    this._nodes[index] = node;
    this.initDefaults(index);
    this._orderDirty = true;
    this._dirty = true;
    this._dirtyAll = true;
    return index;
  }
  initDefaults(index) {
    this.ensureViews();
    const f32 = this.f32();
    const u32 = this.u32();
    let p = (this.posPtr >>> 2) + index * 3;
    f32[p + 0] = 0;
    f32[p + 1] = 0;
    f32[p + 2] = 0;
    let r = (this.rotPtr >>> 2) + index * 4;
    f32[r + 0] = 0;
    f32[r + 1] = 0;
    f32[r + 2] = 0;
    f32[r + 3] = 1;
    let s = (this.sclPtr >>> 2) + index * 3;
    f32[s + 0] = 1;
    f32[s + 1] = 1;
    f32[s + 2] = 1;
    u32[(this.parentPtr >>> 2) + index] = NO_PARENT;
  }
  setParent(childIndex, parentIndex) {
    this.ensureViews();
    const u32 = this.u32();
    u32[(this.parentPtr >>> 2) + childIndex] = parentIndex === null ? NO_PARENT : parentIndex >>> 0;
    this._orderDirty = true;
    this._dirty = true;
    this._dirtyAll = true;
  }
  free(index) {
    if (index < 0 || index >= this.count) throw new Error(`TransformStore.free: index out of range: ${index} (count=${this.count})`);
    const node = this._nodes[index];
    if (!node) throw new Error(`TransformStore.free: double free or invalid slot: ${index}`);
    this._nodes[index] = null;
    this.ensureViews();
    const f32 = this.f32();
    const u32 = this.u32();
    let p = (this.posPtr >>> 2) + index * 3;
    f32[p + 0] = 0;
    f32[p + 1] = 0;
    f32[p + 2] = 0;
    let r = (this.rotPtr >>> 2) + index * 4;
    f32[r + 0] = 0;
    f32[r + 1] = 0;
    f32[r + 2] = 0;
    f32[r + 3] = 1;
    let s = (this.sclPtr >>> 2) + index * 3;
    f32[s + 0] = 1;
    f32[s + 1] = 1;
    f32[s + 2] = 1;
    u32[(this.parentPtr >>> 2) + index] = NO_PARENT;
    const localBase = (this.localPtr >>> 2) + index * 16;
    const worldBase = (this.worldPtr >>> 2) + index * 16;
    for (let i = 0; i < 16; i++) {
      f32[localBase + i] = 0;
      f32[worldBase + i] = 0;
    }
    f32[localBase + 0] = 1;
    f32[localBase + 5] = 1;
    f32[localBase + 10] = 1;
    f32[localBase + 15] = 1;
    f32[worldBase + 0] = 1;
    f32[worldBase + 5] = 1;
    f32[worldBase + 10] = 1;
    f32[worldBase + 15] = 1;
    this._freeList.push(index);
    this._orderDirty = true;
    this._dirty = true;
    this._dirtyAll = true;
    while (this.count > 0) {
      const last = this.count - 1;
      if (this._nodes[last]) break;
      this.count--;
    }
  }
  updateIfNeeded() {
    if (!this._dirty) return;
    this.update();
  }
  update() {
    const count = this.count | 0;
    if (count === 0) {
      this._dirty = false;
      this._dirtyAll = false;
      this._orderDirty = false;
      this.clearDirtyList();
      return;
    }
    this.ensureDirtyMarkCapacity();
    const dirtyCount = this._dirtyAll ? count : this._dirtyList.length | 0;
    const useFull = this._orderDirty || this._dirtyAll || dirtyCount > count >>> 2;
    if (useFull) {
      if (this._orderDirty) this.buildOrder();
      transformf.composeLocalMany(this.localPtr, this.posPtr, this.rotPtr, this.sclPtr, count);
      transformf.updateWorldOrdered(this.worldPtr, this.localPtr, this.parentPtr, this.orderPtr, count);
      this._dirty = false;
      this._dirtyAll = false;
      this._orderDirty = false;
      this.clearDirtyList();
      return;
    }
    if (this._dirtyList.length === 0) {
      this._dirty = false;
      return;
    }
    this.ensureViews();
    const f32 = this.f32();
    const u32 = this.u32();
    const posBase = this.posPtr >>> 2;
    const rotBase = this.rotPtr >>> 2;
    const sclBase = this.sclPtr >>> 2;
    const localBase = this.localPtr >>> 2;
    const worldBase = this.worldPtr >>> 2;
    const parentBase = this.parentPtr >>> 2;
    for (let di = 0; di < this._dirtyList.length; di++) {
      const idx = this._dirtyList[di] | 0;
      const pi = posBase + idx * 3;
      const ri = rotBase + idx * 4;
      const si = sclBase + idx * 3;
      const mi = localBase + idx * 16;
      const tx = f32[pi + 0];
      const ty = f32[pi + 1];
      const tz = f32[pi + 2];
      const x = f32[ri + 0];
      const y = f32[ri + 1];
      const z = f32[ri + 2];
      const w = f32[ri + 3];
      const sx = f32[si + 0];
      const sy = f32[si + 1];
      const sz = f32[si + 2];
      const xx = x * x;
      const yy = y * y;
      const zz = z * z;
      const xy = x * y;
      const xz = x * z;
      const yz = y * z;
      const wx = w * x;
      const wy = w * y;
      const wz = w * z;
      f32[mi + 0] = (1 - 2 * (yy + zz)) * sx;
      f32[mi + 1] = 2 * (xy + wz) * sx;
      f32[mi + 2] = 2 * (xz - wy) * sx;
      f32[mi + 3] = 0;
      f32[mi + 4] = 2 * (xy - wz) * sy;
      f32[mi + 5] = (1 - 2 * (xx + zz)) * sy;
      f32[mi + 6] = 2 * (yz + wx) * sy;
      f32[mi + 7] = 0;
      f32[mi + 8] = 2 * (xz + wy) * sz;
      f32[mi + 9] = 2 * (yz - wx) * sz;
      f32[mi + 10] = (1 - 2 * (xx + yy)) * sz;
      f32[mi + 11] = 0;
      f32[mi + 12] = tx;
      f32[mi + 13] = ty;
      f32[mi + 14] = tz;
      f32[mi + 15] = 1;
    }
    const roots = [];
    for (let di = 0; di < this._dirtyList.length; di++) {
      const idx = this._dirtyList[di] | 0;
      let p = u32[parentBase + idx] >>> 0;
      let isRoot = true;
      while (p !== NO_PARENT && (p | 0) < count) {
        if (this._dirtyMark[p | 0]) {
          isRoot = false;
          break;
        }
        p = u32[parentBase + (p | 0)] >>> 0;
      }
      if (isRoot) roots.push(idx);
    }
    const stack = this._stack;
    for (let r = 0; r < roots.length; r++) {
      stack.length = 0;
      stack.push(roots[r] | 0);
      while (stack.length) {
        const idx = stack.pop() | 0;
        const p = u32[parentBase + idx] >>> 0;
        const li = localBase + idx * 16;
        const wi = worldBase + idx * 16;
        if (p === NO_PARENT || (p | 0) >= count) {
          for (let k = 0; k < 16; k++) f32[wi + k] = f32[li + k];
        } else {
          const pi = worldBase + (p | 0) * 16;
          const a0 = f32[pi + 0], a1 = f32[pi + 1], a2 = f32[pi + 2], a3 = f32[pi + 3];
          const a4 = f32[pi + 4], a5 = f32[pi + 5], a6 = f32[pi + 6], a7 = f32[pi + 7];
          const a8 = f32[pi + 8], a9 = f32[pi + 9], a10 = f32[pi + 10], a11 = f32[pi + 11];
          const a12 = f32[pi + 12], a13 = f32[pi + 13], a14 = f32[pi + 14], a15 = f32[pi + 15];
          const b0 = f32[li + 0], b1 = f32[li + 1], b2 = f32[li + 2], b3 = f32[li + 3];
          const b4 = f32[li + 4], b5 = f32[li + 5], b6 = f32[li + 6], b7 = f32[li + 7];
          const b8 = f32[li + 8], b9 = f32[li + 9], b10 = f32[li + 10], b11 = f32[li + 11];
          const b12 = f32[li + 12], b13 = f32[li + 13], b14 = f32[li + 14], b15 = f32[li + 15];
          f32[wi + 0] = a0 * b0 + a4 * b1 + a8 * b2 + a12 * b3;
          f32[wi + 1] = a1 * b0 + a5 * b1 + a9 * b2 + a13 * b3;
          f32[wi + 2] = a2 * b0 + a6 * b1 + a10 * b2 + a14 * b3;
          f32[wi + 3] = a3 * b0 + a7 * b1 + a11 * b2 + a15 * b3;
          f32[wi + 4] = a0 * b4 + a4 * b5 + a8 * b6 + a12 * b7;
          f32[wi + 5] = a1 * b4 + a5 * b5 + a9 * b6 + a13 * b7;
          f32[wi + 6] = a2 * b4 + a6 * b5 + a10 * b6 + a14 * b7;
          f32[wi + 7] = a3 * b4 + a7 * b5 + a11 * b6 + a15 * b7;
          f32[wi + 8] = a0 * b8 + a4 * b9 + a8 * b10 + a12 * b11;
          f32[wi + 9] = a1 * b8 + a5 * b9 + a9 * b10 + a13 * b11;
          f32[wi + 10] = a2 * b8 + a6 * b9 + a10 * b10 + a14 * b11;
          f32[wi + 11] = a3 * b8 + a7 * b9 + a11 * b10 + a15 * b11;
          f32[wi + 12] = a0 * b12 + a4 * b13 + a8 * b14 + a12 * b15;
          f32[wi + 13] = a1 * b12 + a5 * b13 + a9 * b14 + a13 * b15;
          f32[wi + 14] = a2 * b12 + a6 * b13 + a10 * b14 + a14 * b15;
          f32[wi + 15] = a3 * b12 + a7 * b13 + a11 * b14 + a15 * b15;
        }
        const node = this._nodes[idx];
        const children = node?.children ?? [];
        for (let c = children.length - 1; c >= 0; c--) stack.push(children[c].index | 0);
      }
    }
    this._dirty = false;
    this.clearDirtyList();
  }
  buildOrder() {
    const count = this.count;
    if (this._visited.length < count) this._visited = new Uint8Array(count);
    this._visited.fill(0, 0, count);
    const u32 = this.u32();
    const parentBase = this.parentPtr >>> 2;
    const orderBase = this.orderPtr >>> 2;
    let out = 0;
    const stack = this._stack;
    stack.length = 0;
    for (let i = 0; i < count; i++) {
      if (this._visited[i]) continue;
      if (u32[parentBase + i] !== NO_PARENT) continue;
      stack.push(i);
      while (stack.length) {
        const idx = stack.pop();
        if (this._visited[idx]) continue;
        this._visited[idx] = 1;
        u32[orderBase + out++] = idx >>> 0;
        const node = this._nodes[idx];
        const children = node?.children ?? [];
        for (let c = children.length - 1; c >= 0; c--) stack.push(children[c].index);
      }
    }
    for (let i = 0; i < count; i++) {
      if (this._visited[i]) continue;
      this._visited[i] = 1;
      u32[orderBase + out++] = i >>> 0;
    }
    this._orderDirty = false;
  }
  growTo(minCap) {
    let newCap = this.cap;
    while (newCap < minCap) newCap *= 2;
    const oldCount = this.count;
    const oldPosPtr = this.posPtr;
    const oldRotPtr = this.rotPtr;
    const oldSclPtr = this.sclPtr;
    const oldLocalPtr = this.localPtr;
    const oldWorldPtr = this.worldPtr;
    const oldParentPtr = this.parentPtr;
    const oldOrderPtr = this.orderPtr;
    this.cap = newCap;
    this.allocateArrays(newCap);
    this.ensureViews();
    const f32 = this.f32();
    const u32 = this.u32();
    f32.set(f32.subarray(oldPosPtr >>> 2, (oldPosPtr >>> 2) + oldCount * 3), this.posPtr >>> 2);
    f32.set(f32.subarray(oldRotPtr >>> 2, (oldRotPtr >>> 2) + oldCount * 4), this.rotPtr >>> 2);
    f32.set(f32.subarray(oldSclPtr >>> 2, (oldSclPtr >>> 2) + oldCount * 3), this.sclPtr >>> 2);
    f32.set(f32.subarray(oldLocalPtr >>> 2, (oldLocalPtr >>> 2) + oldCount * 16), this.localPtr >>> 2);
    f32.set(f32.subarray(oldWorldPtr >>> 2, (oldWorldPtr >>> 2) + oldCount * 16), this.worldPtr >>> 2);
    u32.set(u32.subarray(oldParentPtr >>> 2, (oldParentPtr >>> 2) + oldCount), this.parentPtr >>> 2);
    u32.set(u32.subarray(oldOrderPtr >>> 2, (oldOrderPtr >>> 2) + oldCount), this.orderPtr >>> 2);
    this._orderDirty = true;
    this._dirty = true;
    this._dirtyAll = true;
  }
};
var Transform = class _Transform {
  index;
  _parent = null;
  _children = [];
  _position = [0, 0, 0];
  _rotation = [0, 0, 0, 1];
  _scale = [1, 1, 1];
  _localMatrix = [
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1
  ];
  _worldMatrix = [
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1
  ];
  _disposed = false;
  constructor() {
    const store = TransformStore.global();
    this.index = store.alloc(this);
  }
  static updateAll() {
    TransformStore.global().updateIfNeeded();
  }
  assertAlive() {
    if (this._disposed) throw new Error("Transform is disposed (use-after-dispose).");
  }
  get disposed() {
    return this._disposed;
  }
  get parent() {
    return this._parent;
  }
  get children() {
    return this._children;
  }
  get root() {
    let t = this;
    while (t._parent) t = t._parent;
    return t;
  }
  traverse(callback) {
    callback(this);
    for (const child of this._children) child.traverse(callback);
  }
  readVec3FromStore(ptrBaseF32, out) {
    const store = TransformStore.global();
    const f32 = store.f32();
    out[0] = f32[ptrBaseF32 + 0];
    out[1] = f32[ptrBaseF32 + 1];
    out[2] = f32[ptrBaseF32 + 2];
  }
  readQuatFromStore(ptrBaseF32, out) {
    const store = TransformStore.global();
    const f32 = store.f32();
    out[0] = f32[ptrBaseF32 + 0];
    out[1] = f32[ptrBaseF32 + 1];
    out[2] = f32[ptrBaseF32 + 2];
    out[3] = f32[ptrBaseF32 + 3];
  }
  readMat4FromStore(ptrBaseF32, out) {
    const store = TransformStore.global();
    const f32 = store.f32();
    for (let i = 0; i < 16; i++) out[i] = f32[ptrBaseF32 + i];
  }
  get positionPtr() {
    this.assertAlive();
    const T = TransformStore.global();
    return T.posPtr + this.index * 3 * 4 >>> 0;
  }
  get rotationPtr() {
    this.assertAlive();
    const T = TransformStore.global();
    return T.rotPtr + this.index * 4 * 4 >>> 0;
  }
  get scalePtr() {
    this.assertAlive();
    const T = TransformStore.global();
    return T.sclPtr + this.index * 3 * 4 >>> 0;
  }
  get localMatrixPtr() {
    this.assertAlive();
    const T = TransformStore.global();
    return T.localPtr + this.index * 16 * 4 >>> 0;
  }
  get worldMatrixPtr() {
    this.assertAlive();
    const T = TransformStore.global();
    return T.worldPtr + this.index * 16 * 4 >>> 0;
  }
  get position() {
    return this._position;
  }
  setPosition(x, y, z) {
    this.assertAlive();
    const T = TransformStore.global();
    const f32 = T.f32();
    const base = (T.posPtr >>> 2) + this.index * 3;
    f32[base + 0] = x;
    f32[base + 1] = y;
    f32[base + 2] = z;
    this._position[0] = x;
    this._position[1] = y;
    this._position[2] = z;
    T.markIndexDirty(this.index);
    return this;
  }
  translate(x, y, z) {
    this.assertAlive();
    return this.setPosition(this._position[0] + x, this._position[1] + y, this._position[2] + z);
  }
  get rotation() {
    return this._rotation;
  }
  setRotation(x, y, z, w) {
    this.assertAlive();
    const T = TransformStore.global();
    const rotPtr = this.rotationPtr;
    quatf.init(rotPtr, x, y, z, w);
    quatf.normalize(rotPtr, rotPtr);
    const base = (T.rotPtr >>> 2) + this.index * 4;
    this.readQuatFromStore(base, this._rotation);
    T.markIndexDirty(this.index);
    return this;
  }
  setRotationFromAxisAngle(axis, angle) {
    this.assertAlive();
    const T = TransformStore.global();
    const f32 = T.f32();
    const a = T.tmpAxisPtr >>> 2;
    f32[a + 0] = axis[0];
    f32[a + 1] = axis[1];
    f32[a + 2] = axis[2];
    vec3f.normalize(T.tmpAxisPtr, T.tmpAxisPtr);
    const rotPtr = this.rotationPtr;
    quatf.fromAxisAngle(rotPtr, T.tmpAxisPtr, angle);
    quatf.normalize(rotPtr, rotPtr);
    const base = (T.rotPtr >>> 2) + this.index * 4;
    this.readQuatFromStore(base, this._rotation);
    T.markIndexDirty(this.index);
    return this;
  }
  setRotationFromEuler(x, y, z) {
    this.assertAlive();
    const hx = x * 0.5;
    const hy = y * 0.5;
    const hz = z * 0.5;
    const sx = Math.sin(hx);
    const cx = Math.cos(hx);
    const sy = Math.sin(hy);
    const cy = Math.cos(hy);
    const sz = Math.sin(hz);
    const cz = Math.cos(hz);
    const qx = sx * cy * cz + cx * sy * sz;
    const qy = cx * sy * cz - sx * cy * sz;
    const qz = cx * cy * sz + sx * sy * cz;
    const qw = cx * cy * cz - sx * sy * sz;
    return this.setRotation(qx, qy, qz, qw);
  }
  rotateOnAxis(axis, angle) {
    this.assertAlive();
    const T = TransformStore.global();
    const f32 = T.f32();
    const a = T.tmpAxisPtr >>> 2;
    f32[a + 0] = axis[0];
    f32[a + 1] = axis[1];
    f32[a + 2] = axis[2];
    vec3f.normalize(T.tmpAxisPtr, T.tmpAxisPtr);
    quatf.fromAxisAngle(T.tmpQuatPtr, T.tmpAxisPtr, angle);
    const rotPtr = this.rotationPtr;
    quatf.mul(rotPtr, rotPtr, T.tmpQuatPtr);
    quatf.normalize(rotPtr, rotPtr);
    const base = (T.rotPtr >>> 2) + this.index * 4;
    this.readQuatFromStore(base, this._rotation);
    T.markIndexDirty(this.index);
    return this;
  }
  rotateX(angle) {
    this.assertAlive();
    const T = TransformStore.global();
    const f32 = T.f32();
    const a = T.tmpAxisPtr >>> 2;
    f32[a + 0] = 1;
    f32[a + 1] = 0;
    f32[a + 2] = 0;
    vec3f.normalize(T.tmpAxisPtr, T.tmpAxisPtr);
    quatf.fromAxisAngle(T.tmpQuatPtr, T.tmpAxisPtr, angle);
    const rotPtr = this.rotationPtr;
    quatf.mul(rotPtr, rotPtr, T.tmpQuatPtr);
    quatf.normalize(rotPtr, rotPtr);
    const base = (T.rotPtr >>> 2) + this.index * 4;
    this.readQuatFromStore(base, this._rotation);
    T.markIndexDirty(this.index);
    return this;
  }
  rotateY(angle) {
    this.assertAlive();
    const T = TransformStore.global();
    const f32 = T.f32();
    const a = T.tmpAxisPtr >>> 2;
    f32[a + 0] = 0;
    f32[a + 1] = 1;
    f32[a + 2] = 0;
    vec3f.normalize(T.tmpAxisPtr, T.tmpAxisPtr);
    quatf.fromAxisAngle(T.tmpQuatPtr, T.tmpAxisPtr, angle);
    const rotPtr = this.rotationPtr;
    quatf.mul(rotPtr, rotPtr, T.tmpQuatPtr);
    quatf.normalize(rotPtr, rotPtr);
    const base = (T.rotPtr >>> 2) + this.index * 4;
    this.readQuatFromStore(base, this._rotation);
    T.markIndexDirty(this.index);
    return this;
  }
  rotateZ(angle) {
    this.assertAlive();
    const T = TransformStore.global();
    const f32 = T.f32();
    const a = T.tmpAxisPtr >>> 2;
    f32[a + 0] = 0;
    f32[a + 1] = 0;
    f32[a + 2] = 1;
    vec3f.normalize(T.tmpAxisPtr, T.tmpAxisPtr);
    quatf.fromAxisAngle(T.tmpQuatPtr, T.tmpAxisPtr, angle);
    const rotPtr = this.rotationPtr;
    quatf.mul(rotPtr, rotPtr, T.tmpQuatPtr);
    quatf.normalize(rotPtr, rotPtr);
    const base = (T.rotPtr >>> 2) + this.index * 4;
    this.readQuatFromStore(base, this._rotation);
    T.markIndexDirty(this.index);
    return this;
  }
  get scale() {
    return this._scale;
  }
  setScale(x, y, z) {
    this.assertAlive();
    const T = TransformStore.global();
    const f32 = T.f32();
    const base = (T.sclPtr >>> 2) + this.index * 3;
    f32[base + 0] = x;
    f32[base + 1] = y;
    f32[base + 2] = z;
    this._scale[0] = x;
    this._scale[1] = y;
    this._scale[2] = z;
    T.markIndexDirty(this.index);
    return this;
  }
  setUniformScale(scalar) {
    this.assertAlive();
    return this.setScale(scalar, scalar, scalar);
  }
  get localMatrix() {
    this.assertAlive();
    const T = TransformStore.global();
    T.updateIfNeeded();
    const base = (T.localPtr >>> 2) + this.index * 16;
    this.readMat4FromStore(base, this._localMatrix);
    return this._localMatrix;
  }
  get worldMatrix() {
    this.assertAlive();
    const T = TransformStore.global();
    T.updateIfNeeded();
    const base = (T.worldPtr >>> 2) + this.index * 16;
    this.readMat4FromStore(base, this._worldMatrix);
    return this._worldMatrix;
  }
  get worldPosition() {
    this.assertAlive();
    const T = TransformStore.global();
    T.updateIfNeeded();
    const base = (T.worldPtr >>> 2) + this.index * 16;
    const f32 = T.f32();
    return [f32[base + 12], f32[base + 13], f32[base + 14]];
  }
  setParent(parent) {
    this.assertAlive();
    if (parent === this._parent) return this;
    if (parent === this) throw new Error("Transform cannot be parented to itself.");
    for (let p = parent; p; p = p._parent) if (p === this) throw new Error("Transform parenting would create a cycle.");
    this.removeFromParent();
    this._parent = parent;
    if (parent) {
      parent._children.push(this);
      TransformStore.global().setParent(this.index, parent.index);
    } else {
      TransformStore.global().setParent(this.index, null);
    }
    return this;
  }
  addChild(child) {
    this.assertAlive();
    child.setParent(this);
    return this;
  }
  removeChild(child) {
    this.assertAlive();
    if (child._parent !== this) return this;
    child.setParent(null);
    return this;
  }
  removeFromParent() {
    this.assertAlive();
    if (!this._parent) return this;
    const p = this._parent;
    const i = p._children.indexOf(this);
    if (i >= 0) p._children.splice(i, 1);
    this._parent = null;
    TransformStore.global().setParent(this.index, null);
    return this;
  }
  reset() {
    this.assertAlive();
    this._parent = null;
    this._children.length = 0;
    TransformStore.global().setParent(this.index, null);
    this.setPosition(0, 0, 0);
    this.setRotation(0, 0, 0, 1);
    this.setScale(1, 1, 1);
    return this;
  }
  copyFrom(other) {
    this.assertAlive();
    this.setPosition(other._position[0], other._position[1], other._position[2]);
    this.setRotation(other._rotation[0], other._rotation[1], other._rotation[2], other._rotation[3]);
    this.setScale(other._scale[0], other._scale[1], other._scale[2]);
    return this;
  }
  clone() {
    this.assertAlive();
    const T = new _Transform();
    T.copyFrom(this);
    return T;
  }
  dispose() {
    if (this._disposed) return;
    const children = this._children.slice();
    for (const child of children) child.setParent(null);
    this._children.length = 0;
    this.removeFromParent();
    TransformStore.global().free(this.index);
    this._disposed = true;
  }
};

// src/world/mesh.ts
var Mesh = class _Mesh {
  geometry;
  material;
  transform;
  _visible = true;
  _castShadow = true;
  _receiveShadow = true;
  name = "";
  userData = {};
  skin = null;
  constructor(geometry, material) {
    this.geometry = geometry;
    this.material = material;
    this.transform = new Transform();
  }
  get visible() {
    return this._visible;
  }
  set visible(value) {
    this._visible = value;
  }
  get castShadow() {
    return this._castShadow;
  }
  set castShadow(value) {
    this._castShadow = value;
  }
  get receiveShadow() {
    return this._receiveShadow;
  }
  set receiveShadow(value) {
    this._receiveShadow = value;
  }
  setParent(parent) {
    this.transform.setParent(parent?.transform ?? null);
    return this;
  }
  addChild(child) {
    this.transform.addChild(child.transform);
    return this;
  }
  removeChild(child) {
    this.transform.removeChild(child.transform);
    return this;
  }
  get worldMatrix() {
    return this.transform.worldMatrix;
  }
  destroy() {
    this.skin?.dispose();
    this.skin = null;
    this.transform.dispose();
    this.geometry.destroy();
    this.material.destroy();
  }
  clone() {
    const mesh = new _Mesh(this.geometry, this.material);
    mesh.transform.copyFrom(this.transform);
    mesh.name = this.name;
    mesh.visible = this.visible;
    mesh.castShadow = this.castShadow;
    mesh.receiveShadow = this.receiveShadow;
    return mesh;
  }
  cloneWithMaterial(material) {
    const mesh = new _Mesh(this.geometry, material);
    mesh.transform.copyFrom(this.transform);
    mesh.name = this.name;
    mesh.visible = this.visible;
    mesh.castShadow = this.castShadow;
    mesh.receiveShadow = this.receiveShadow;
    return mesh;
  }
};

// src/utils/index.ts
var assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
var alignTo = (n, alignment) => {
  return Math.ceil(n / alignment) * alignment;
};
var createBuffer = (device, data, usage) => {
  const buffer = device.createBuffer({ size: alignTo(data.byteLength, 4), usage, mappedAtCreation: true });
  new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  buffer.unmap();
  return buffer;
};
var createDepthTexture = (device, width, height, sampleCount = 1) => {
  return device.createTexture({
    size: { width, height, depthOrArrayLayers: 1 },
    format: "depth24plus",
    sampleCount,
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  });
};

// src/graphics/colormap.ts
var BUILTIN_RESOLUTION = 256;
var BUILTIN_RGBA8_BASE64 = {
  grayscale: "AAAA/wEBAf8CAgL/AwMD/wQEBP8FBQX/BgYG/wcHB/8ICAj/CQkJ/woKCv8LCwv/DAwM/w0NDf8ODg7/Dw8P/xAQEP8RERH/EhIS/xMTE/8UFBT/FRUV/xYWFv8XFxf/GBgY/xkZGf8aGhr/Gxsb/xwcHP8dHR3/Hh4e/x8fH/8gICD/ICAg/yIiIv8jIyP/JCQk/yQkJP8mJib/Jycn/ygoKP8oKCj/Kioq/ysrK/8sLCz/LCws/y4uLv8vLy//MDAw/zAwMP8yMjL/MzMz/zQ0NP80NDT/NjY2/zc3N/84ODj/ODg4/zo6Ov87Ozv/PDw8/zw8PP8+Pj7/Pz8//0BAQP9BQUH/QUFB/0NDQ/9ERET/RUVF/0ZGRv9HR0f/SEhI/0lJSf9JSUn/S0tL/0xMTP9NTU3/Tk5O/09PT/9QUFD/UVFR/1FRUf9TU1P/VFRU/1VVVf9WVlb/V1dX/1hYWP9ZWVn/WVlZ/1tbW/9cXFz/XV1d/15eXv9fX1//YGBg/2FhYf9hYWH/Y2Nj/2RkZP9lZWX/ZmZm/2dnZ/9oaGj/aWlp/2lpaf9ra2v/bGxs/21tbf9ubm7/b29v/3BwcP9xcXH/cXFx/3Nzc/90dHT/dXV1/3Z2dv93d3f/eHh4/3l5ef95eXn/e3t7/3x8fP99fX3/fn5+/39/f/+AgID/gYGB/4KCgv+Dg4P/g4OD/4WFhf+Ghob/h4eH/4iIiP+JiYn/ioqK/4uLi/+MjIz/jY2N/46Ojv+Pj4//kJCQ/5GRkf+SkpL/k5OT/5OTk/+VlZX/lpaW/5eXl/+YmJj/mZmZ/5qamv+bm5v/nJyc/52dnf+enp7/n5+f/6CgoP+hoaH/oqKi/6Ojo/+jo6P/paWl/6ampv+np6f/qKio/6mpqf+qqqr/q6ur/6ysrP+tra3/rq6u/6+vr/+wsLD/sbGx/7Kysv+zs7P/s7Oz/7W1tf+2trb/t7e3/7i4uP+5ubn/urq6/7u7u/+8vLz/vb29/76+vv+/v7//wMDA/8HBwf/CwsL/w8PD/8PDw//FxcX/xsbG/8fHx//IyMj/ycnJ/8rKyv/Ly8v/zMzM/83Nzf/Ozs7/z8/P/9DQ0P/R0dH/0tLS/9PT0//T09P/1dXV/9bW1v/X19f/2NjY/9nZ2f/a2tr/29vb/9zc3P/d3d3/3t7e/9/f3//g4OD/4eHh/+Li4v/j4+P/4+Pj/+Xl5f/m5ub/5+fn/+jo6P/p6en/6urq/+vr6//s7Oz/7e3t/+7u7v/v7+//8PDw//Hx8f/y8vL/8/Pz//Pz8//19fX/9vb2//f39//4+Pj/+fn5//r6+v/7+/v//Pz8//39/f/+/v7//////w==",
  turbo: "MBI7/zEVQv8yGEr/NBtR/zUeWP82IV//NyNl/zgmbP85KXL/Oix5/zsvf/88MoX/PDWL/z03kf8+Opb/Pz2c/0BAof9AQ6b/QUWr/0FIsP9CS7X/Q066/0NQvv9DU8L/RFbH/0RYy/9FW87/RV7S/0Vg1v9FY9n/Rmbd/0Zo4P9Ga+P/Rm3m/0Zw6P9Gc+v/RnXt/0Z48P9GevL/Rn30/0Z/9v9Ggvj/RYT5/0WH+/9Fifz/RIz9/0OO/f9Ckf7/QZP+/0CW/v8/mP7/Ppv+/zyd/f87oPz/OaL8/zil+/82qPn/NKr4/zOs9v8xr/X/L7Hz/y208f8rtu//Krnt/yi76/8mven/JcDm/yPC5P8hxOH/IMbf/x7J3P8dy9r/HM3X/xvP1P8a0dL/GdPP/xjVzP8Y18r/F9nH/xfaxP8X3ML/F96//xjgvf8Y4br/GeO4/xrktv8b5bT/Heex/x7or/8g6az/Iuup/yTspv8n7aP/Ke6g/yzvnf8v8Jr/MvGX/zXzlP849JH/O/SN/z/1iv9C9of/RveD/0r4gP9N+Xz/Ufl5/1X6dv9Z+3L/Xftv/2H8bP9l/Gj/af1l/239Yv9x/V//dP5c/3j+Wf98/lb/gP5T/4T+UP+H/k3/i/5L/47+SP+S/kb/lf5E/5j+Qv+b/UD/nv0+/6H8Pf+k/Dv/pvs6/6n7Of+s+jf/rvk3/7H4Nv+z+DX/tvc1/7n1NP+79DT/vvM0/8DyM//D8TP/xe8z/8juM//K7TP/zes0/8/qNP/R6DT/1Oc1/9blNf/Y4zX/2uI2/93gNv/f3jb/4dw3/+PaN//l2Dj/59c4/+jVOP/q0zn/7NE5/+3POf/vzTn/8Ms6//LIOv/zxjr/9MQ6//bCOv/3wDn/+L45//m8Of/5ujj/+rc3//u1N//7szb//LA1//yuNP/9qzP//aky//2mMf/9ozD//qEv//6eLv/+my3//pgs//2VK//9kin//Y8o//2MJ//8iSb//IYk//uDI//7gCL/+n0g//p6H//5dx7/+HQc//dxG//3bhr/9msY//VoF//0ZRb/82MV//JgFP/xXRP/71oR/+5YEP/tVQ//7FIO/+pQDf/pTQ3/6EsM/+ZJC//lRgr/40QK/+JCCf/gQAj/3j4I/908B//bOgf/2TgG/9c2Bv/WNAX/1DIF/9IwBf/QLwT/zi0E/8srA//JKQP/xygD/8UmAv/DJAL/wCMC/74hAv+7HwH/uR4B/7YcAf+0GwH/sRkB/64YAf+sFgH/qRUB/6YUAf+jEgH/oBEB/50QAf+aDgH/lw0B/5QMAf+RCwH/jgoB/4sJAf+HCAH/hAcB/4EGAv99BQL/egQC/w==",
  viridis: "RAFU/0QCVf9EA1f/RQVY/0UGWv9FCFv/Rglc/0YLXv9GDF//Rg5h/0cPYv9HEWP/RxJl/0cUZv9HFWf/RxZp/0cYav9IGWv/SBps/0gcbv9IHW//SB5w/0ggcf9IIXL/SCJz/0gjdP9HJXX/RyZ2/0cnd/9HKHj/Ryp5/0crev9HLHv/Ri18/0YvfP9GMH3/RjF+/0Uyf/9FNH//RTWA/0U2gf9EN4H/RDmC/0M6g/9DO4P/QzyE/0I9hP9CPoX/QkCF/0FBhv9BQob/QEOH/0BEh/8/RYf/P0eI/z5IiP8+SYn/PUqJ/z1Lif89TIn/PE2K/zxOiv87UIr/O1GK/zpSi/86U4v/OVSL/zlVi/84Vov/OFeM/zdYjP83WYz/NlqM/zZbjP81XIz/NV2M/zRejf80X43/M2CN/zNhjf8yYo3/MmON/zFkjf8xZY3/MWaN/zBnjf8waI3/L2mN/y9qjf8ua47/LmyO/y5tjv8tbo7/LW+O/yxwjv8scY7/LHKO/ytzjv8rdI7/KnWO/yp2jv8qd47/KXiO/yl5jv8oeo7/KHqO/yh7jv8nfI7/J32O/yd+jv8mf47/JoCO/yaBjv8lgo7/JYON/ySEjf8khY3/JIaN/yOHjf8jiI3/I4mN/yKJjf8iio3/IouN/yGMjf8hjYz/IY6M/yCPjP8gkIz/IJGM/x+SjP8fk4v/H5SL/x+Vi/8flov/HpeK/x6Yiv8emYr/HpmK/x6aif8em4n/HpyJ/x6diP8enoj/Hp+I/x6gh/8foYf/H6KG/x+jhv8gpIX/IKWF/yGmhf8hp4T/IqeE/yOog/8jqYL/JKqC/yWrgf8mrIH/J62A/yiuf/8pr3//KrB+/yuxff8ssX3/LrJ8/y+ze/8wtHr/MrV6/zO2ef81t3j/Nrh3/zi5dv85uXb/O7p1/z27dP8+vHP/QL1y/0K+cf9EvnD/Rb9v/0fAbv9JwW3/S8Js/03Ca/9Pw2n/UcRo/1PFZ/9Vxmb/V8Zl/1nHZP9byGL/Xslh/2DJYP9iyl//ZMtd/2fMXP9pzFv/a81Z/23OWP9wzlb/cs9V/3TQVP930FL/edFR/3zST/9+0k7/gdNM/4PTS/+G1En/iNVH/4vVRv+N1kT/kNZD/5LXQf+V1z//l9g+/5rYPP+d2Tr/n9k4/6LaN/+l2jX/p9sz/6rbMv+t3DD/r9wu/7LdLP+13Sv/t90p/7reJ/+93ib/v98k/8LfIv/F3yH/x+Af/8rgHv/N4B3/z+Ec/9LhG//U4Rr/1+IZ/9riGP/c4hj/3+MY/+HjGP/k4xj/5+QZ/+nkGf/s5Br/7uUb//HlHP/z5R7/9uYf//jmIf/65iL//eck/w==",
  magma: "AAAD/wAABP8AAAb/AQAH/wEBCf8BAQv/AgIN/wICD/8DAxH/BAMT/wQEFf8FBBf/BgUZ/wcFG/8IBh3/CQcf/woHIv8LCCT/DAkm/w0KKP8OCir/Dwss/xAML/8RDDH/Eg0z/xQNNf8VDjj/Fg46/xcPPP8YDz//GhBB/xsQRP8cEEb/HhBJ/x8RS/8gEU3/IhFQ/yMRUv8lEVX/JhFX/ygRWf8qEVz/KxFe/y0QYP8vEGL/MBBl/zIQZ/80EGj/NQ9q/zcPbP85D27/Ow9v/zwPcf8+D3L/QA9z/0IPdP9DD3X/RQ92/0cPd/9IEHj/ShB5/0sQef9NEXr/TxF7/1ASe/9SEnz/UxN8/1UTff9XFH3/WBV+/1oVfv9bFn7/XRd+/14Xf/9gGH//YRh//2MZf/9lGoD/ZhqA/2gbgP9pHID/axyA/2wdgP9uHoH/bx6B/3Efgf9zH4H/dCCB/3Yhgf93IYH/eSKB/3oigf98I4H/fiSB/38kgf+BJYH/giWB/4Qmgf+FJoH/hyeB/4kogf+KKIH/jCmA/40pgP+PKoD/kSqA/5IrgP+UK4D/lSyA/5csf/+ZLX//mi1//5wuf/+eLn7/ny9+/6Evfv+jMH7/pDB9/6Yxff+nMX3/qTJ8/6szfP+sM3v/rjR7/7A0e/+xNXr/szV6/7U2ef+2Nnn/uDd4/7k3eP+7OHf/vTl3/745dv/AOnX/wjp1/8M7dP/FPHT/xjxz/8g9cv/KPnL/yz5x/80/cP/OQHD/0EFv/9FCbv/TQm3/1ENt/9ZEbP/XRWv/2UZq/9pHaf/cSGn/3Ulo/95KZ//gS2b/4Uxm/+JNZf/kTmT/5VBj/+ZRYv/nUmL/6FRh/+pVYP/rVmD/7Fhf/+1ZX//uW17/7l1d/+9eXf/wYF3/8WFc//JjXP/zZVz/82db//RoW//1alv/9Wxb//ZuW//2cFv/93Fb//dzXP/4dVz/+Hdc//l5XP/5e13/+X1d//p/Xv/6gF7/+oJf//uEYP/7hmD/+4hh//uKYv/8jGP//I5j//yQZP/8kmX//JNm//2VZ//9l2j//Zlp//2bav/9nWv//Z9s//2hbv/9om///aRw//6mcf/+qHP//qp0//6sdf/+rnb//q94//6xef/+s3v//rV8//63ff/+uX///ruA//68gv/+voP//sCF//7Chv/+xIj//saJ//7Hi//+yY3//suO//3NkP/9z5L//dGT//3Slf/91Jf//daY//3Ymv/92pz//dyd//3dn//936H//eGj//zjpf/85ab//Oao//zoqv/86qz//Oyu//zusP/88LH//PGz//zztf/89bf/+/e5//v5u//7+r3/+/y//w==",
  plasma: "DAeG/xAHh/8TBon/FQaK/xgGi/8bBoz/HQaN/x8Fjv8hBY//IwWQ/yUFkf8nBZL/KQWT/ysFlP8tBJT/LwSV/zEElv8zBJf/NASY/zYEmP84BJn/OgSa/zsDmv89A5v/PwOc/0ADnP9CA53/RAOe/0UDnv9HAp//SQKf/0oCoP9MAqH/TgKh/08Cov9RAaL/UgGj/1QBo/9WAaP/VwGk/1kBpP9aAKX/XACl/14Apf9fAKb/YQCm/2IApv9kAKf/ZQCn/2cAp/9oAKf/agCn/2wAqP9tAKj/bwCo/3AAqP9yAKj/cwCo/3UAqP92Aaj/eAGo/3kBqP97Aqj/fAKn/34Dp/9/A6f/gQSn/4IEp/+EBab/hQam/4YHpv+IB6X/iQil/4sJpP+MCqT/jgyk/48No/+QDqP/kg+i/5MQof+VEaH/lhKg/5cToP+ZFJ//mhWe/5sXnv+dGJ3/nhmc/58am/+gG5v/ohya/6Mdmf+kHpj/pR+X/6chl/+oIpb/qSOV/6oklP+sJZP/rSaS/64nkf+vKJD/sCqP/7Erj/+yLI7/tC2N/7UujP+2L4v/tzCK/7gyif+5M4j/ujSH/7s1hv+8NoX/vTeE/744g/+/OYL/wDuB/8E8gP/CPYD/wz5//8Q/fv/FQH3/xkF8/8dCe//IRHr/yUV5/8pGeP/LR3f/zEh2/81Jdf/OSnX/z0t0/9BNc//RTnL/0U9x/9JQcP/TUW//1FJu/9VTbf/WVW3/11Zs/9dXa//YWGr/2Vlp/9paaP/bW2f/3F1m/9xeZv/dX2X/3mBk/99hY//fYmL/4GRh/+FlYP/iZmD/42df/+NoXv/kal3/5Wtc/+VsW//mbVr/525a/+hwWf/ocVj/6XJX/+pzVv/qdFX/63ZU/+x3VP/seFP/7XlS/+17Uf/ufFD/731P/+9+Tv/wgE3/8IFN//GCTP/yhEv/8oVK//OGSf/zh0j/9IlH//SKR//1i0b/9Y1F//aORP/2j0P/9pFC//eSQf/3k0H/+JVA//iWP//4mD7/+Zk9//maPP/6nDv/+p06//qfOv/6oDn/+6I4//ujN//7pDb//KY1//ynNf/8qTT//Koz//ysMv/8rTH//a8x//2wMP/9si///bMu//21Lf/9ti3//bgs//25K//9uyv//bwq//2+Kf/9wCn//cEo//3DKP/9xCf//cYm//zHJv/8ySb//Msl//zMJf/8ziX/+9Ak//vRJP/70yT/+tUk//rWJP/62CT/+dkk//nbJP/43ST/+N8k//fgJP/34iX/9uQl//blJf/15yb/9ekm//TqJv/z7Cb/8+4m//LwJv/y8Sb/8fMm//D1Jf/w9iP/7/gh/w==",
  inferno: "AAAD/wAABP8AAAb/AQAH/wEBCf8BAQv/AgEO/wICEP8DAhL/BAMU/wQDFv8FBBj/BgQb/wcFHf8IBh//CQYh/woHI/8LByb/DQgo/w4IKv8PCS3/EAkv/xIKMv8TCjT/FAs2/xYLOf8XCzv/GQs+/xoLQP8cDEP/HQxF/x8MR/8gDEr/IgtM/yQLTv8mC1D/JwtS/ykLVP8rClb/LQpY/y4KWv8wClz/Mgld/zQJX/81CWD/Nwlh/zkJYv87CWT/PAll/z4JZv9ACWb/QQln/0MKaP9FCmn/Rgpp/0gLav9KC2r/Swxr/00Ma/9PDWz/UA1s/1IObP9TDm3/VQ9t/1cPbf9YEG3/WhFt/1sRbv9dEm7/XxJu/2ATbv9iFG7/YxRu/2UVbv9mFW7/aBZu/2oXbv9rF27/bRhu/24Ybv9wGW7/chlt/3Mabf91G23/dhtt/3gcbf96HG3/ex1s/30dbP9+Hmz/gB9r/4Efa/+DIGv/hSBq/4Yhav+IIWr/iSJp/4siaf+NI2n/jiRo/5AkaP+RJWf/kyVn/5UmZv+WJmb/mCdl/5koZP+bKGT/nClj/54pY/+gKmL/oSth/6MrYf+kLGD/pixf/6ctX/+pLl7/qy5d/6wvXP+uMFv/rzFb/7ExWv+yMln/tDNY/7UzV/+3NFb/uDVW/7o2Vf+7N1T/vTdT/744Uv+/OVH/wTpQ/8I7T//EPE7/xT1N/8c+TP/IPkv/yT9K/8tASf/MQUj/zUJH/89ERv/QRUT/0UZD/9JHQv/USEH/1UlA/9ZKP//XSz7/2U09/9pOO//bTzr/3FA5/91SOP/eUzf/31Q2/+BWNP/iVzP/41gy/+RaMf/lWzD/5lwu/+ZeLf/nXyz/6GEr/+liKv/qZCj/62Un/+xnJv/taCX/7Woj/+5sIv/vbSH/8G8f//BwHv/xch3/8nQc//J1Gv/zdxn/83kY//R6Fv/1fBX/9X4U//aAEv/2gRH/94MQ//eFDv/4hw3/+IgM//iKC//5jAn/+Y4I//mQCP/6kQf/+pMG//qVBv/6lwb/+5kG//ubBv/7nQb/+54H//ugB//7ogj/+6QK//umC//7qA3/+6oO//usEP/7rhL/+7AU//uxFv/7sxj/+7Ua//u3HP/7uR7/+rsh//q9I//6vyX/+sEo//nDKv/5xSz/+ccv//jJMf/4yzT/+M03//fPOv/30Tz/9tM///bVQv/110X/9dlI//TbS//03E//895S//PgVv/z4ln/8uRd//LmYP/x6GT/8elo//HrbP/x7XD/8e50//Hwef/x8n3/8vOB//L0hf/z9on/9PeN//X4kf/2+pX/9/uZ//n8nf/6/aD//P6k/w=="
};
function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function srgbToLinearChannel(c) {
  if (c <= 0.04045) return c / 12.92;
  return Math.pow((c + 0.055) / 1.055, 2.4);
}
function decodeBase64ToU8(b64) {
  if (typeof globalThis.atob === "function") {
    const bin = globalThis.atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 255;
    return out;
  }
  const B = globalThis.Buffer;
  if (B && typeof B.from === "function") return Uint8Array.from(B.from(b64, "base64"));
  throw new Error("Colormap: No base64 decoder available (expected atob() or Buffer).");
}
function ensureBuiltinRGBA8Linear(name) {
  const anyMap = BUILTIN_RGBA8_BASE64;
  const cached = anyMap[name];
  if (cached instanceof Uint8Array) return cached;
  const decoded = decodeBase64ToU8(BUILTIN_RGBA8_BASE64[name]);
  anyMap[name] = decoded;
  return decoded;
}
function normalizeStops(stops) {
  assert(stops.length >= 2, "Colormap: expected at least 2 stops.");
  const out = [];
  let implicitIndex = 0;
  for (const s of stops) {
    if (Array.isArray(s)) {
      out.push({ t: stops.length <= 1 ? 0 : implicitIndex / (stops.length - 1), color: [s[0], s[1], s[2], s[3]] });
      implicitIndex++;
    } else out.push({ t: s.t, color: [s.color[0], s.color[1], s.color[2], s.color[3]] });
  }
  out.sort((a, b) => a.t - b.t);
  for (const s of out) s.t = clamp01(s.t);
  if (out[0].t > 0) out.unshift({ t: 0, color: out[0].color });
  const last = out.length - 1;
  if (out[last].t < 1) out.push({ t: 1, color: out[last].color });
  return out;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function sampleStopsLinear(stops, t) {
  const x = clamp01(t);
  if (x <= stops[0].t) return stops[0].color;
  const last = stops.length - 1;
  if (x >= stops[last].t) return stops[last].color;
  for (let i = 0; i < last; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (x >= a.t && x <= b.t) {
      const denom = b.t - a.t || 1e-6;
      const u = (x - a.t) / denom;
      return [
        lerp(a.color[0], b.color[0], u),
        lerp(a.color[1], b.color[1], u),
        lerp(a.color[2], b.color[2], u),
        lerp(a.color[3], b.color[3], u)
      ];
    }
  }
  return stops[last].color;
}
function toRGBA8Linear(colors, colorSpace) {
  const out = new Uint8Array(colors.length * 4);
  for (let i = 0; i < colors.length; i++) {
    let r = clamp01(colors[i][0]);
    let g = clamp01(colors[i][1]);
    let b = clamp01(colors[i][2]);
    const a = clamp01(colors[i][3]);
    if (colorSpace === "srgb") {
      r = srgbToLinearChannel(r);
      g = srgbToLinearChannel(g);
      b = srgbToLinearChannel(b);
    }
    out[i * 4 + 0] = Math.max(0, Math.min(255, Math.round(r * 255)));
    out[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
    out[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
    out[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
  }
  return out;
}
function createTexture1DFromRGBA8(device, queue, rgba8, width, label) {
  assert(width > 0, "Colormap: width must be > 0.");
  assert(rgba8.length >>> 0 === width * 4, "Colormap: rgba8 length must be width*4.");
  const texture = device.createTexture({
    label,
    size: { width, height: 1, depthOrArrayLayers: 1 },
    dimension: "1d",
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
  });
  const bytesPerRowUnaligned = width * 4;
  const bytesPerRow = alignTo(bytesPerRowUnaligned, 256);
  const data = bytesPerRow === bytesPerRowUnaligned ? rgba8 : (() => {
    const padded = new Uint8Array(bytesPerRow);
    padded.set(rgba8);
    return padded;
  })();
  queue.writeTexture(
    { texture },
    new Uint8Array(data),
    { bytesPerRow, rowsPerImage: 1 },
    { width, height: 1, depthOrArrayLayers: 1 }
  );
  return texture;
}
function createSampler(device, filter) {
  return device.createSampler({
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    addressModeW: "clamp-to-edge",
    magFilter: filter === "linear" ? "linear" : "nearest",
    minFilter: filter === "linear" ? "linear" : "nearest",
    mipmapFilter: "nearest"
  });
}
var _nextColormapId = 1;
var Colormap = class _Colormap {
  id = _nextColormapId++;
  _label;
  _filter;
  _width;
  _rgba8Linear;
  _external;
  _gpuByDevice = /* @__PURE__ */ new WeakMap();
  constructor(opts) {
    this._label = opts.label;
    this._width = opts.width;
    this._filter = opts.filter;
    this._rgba8Linear = opts.rgba8Linear ?? null;
    this._external = opts.external ?? null;
  }
  static builtin(name) {
    return BUILTIN_SINGLETONS[name];
  }
  static fromStops(stops, desc = {}) {
    const resolution = Math.max(2, Math.floor(desc.resolution ?? BUILTIN_RESOLUTION));
    const filter = desc.filter ?? "linear";
    const colorSpace = desc.colorSpace ?? "srgb";
    const normalized = normalizeStops(stops);
    const samples = new Array(resolution);
    for (let i = 0; i < resolution; i++) {
      const t = resolution === 1 ? 0 : i / (resolution - 1);
      samples[i] = sampleStopsLinear(normalized, t);
    }
    const rgba8Linear = toRGBA8Linear(samples, colorSpace);
    return new _Colormap({
      label: "Colormap.customStops",
      width: resolution,
      filter,
      rgba8Linear
    });
  }
  static fromPalette(colors, desc = {}) {
    assert(colors.length >= 1, "Colormap.fromPalette: expected at least 1 color.");
    const filter = desc.filter ?? "nearest";
    const colorSpace = desc.colorSpace ?? "srgb";
    const rgba8Linear = toRGBA8Linear(colors, colorSpace);
    return new _Colormap({
      label: "Colormap.palette",
      width: colors.length,
      filter,
      rgba8Linear
    });
  }
  static fromGPUTextureView(device, view, sampler, width, filter = "linear") {
    assert(width > 0, "Colormap.fromGPUTextureView: width must be > 0.");
    return new _Colormap({
      label: "Colormap.external",
      width,
      filter,
      external: { device, view, sampler, width, filter }
    });
  }
  get width() {
    return this._width;
  }
  get filter() {
    return this._filter;
  }
  getGPUResources(device, queue) {
    if (this._external) {
      assert(this._external.device === device, "Colormap: external texture was created with a different GPUDevice.");
      return {
        texture: null,
        view: this._external.view,
        sampler: this._external.sampler,
        width: this._external.width,
        filter: this._external.filter
      };
    }
    const cached = this._gpuByDevice.get(device);
    if (cached) return cached;
    const rgba8 = this._rgba8Linear ?? (() => {
      throw new Error("Colormap: no LUT data to upload.");
    })();
    const texture = createTexture1DFromRGBA8(device, queue, rgba8, this._width, this._label);
    const view = texture.createView({ dimension: "1d" });
    const sampler = createSampler(device, this._filter);
    const res = {
      texture,
      view,
      sampler,
      width: this._width,
      filter: this._filter
    };
    this._gpuByDevice.set(device, res);
    return res;
  }
  toUniformStops(maxStops = 8, colorSpace = "linear") {
    const n = Math.max(2, Math.min(8, Math.floor(maxStops)));
    const rgba8 = this._rgba8Linear;
    if (!rgba8) {
      return [
        [0, 0, 0, 1],
        [1, 1, 1, 1]
      ];
    }
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const x = Math.min(this._width - 1, Math.max(0, Math.round(t * (this._width - 1))));
      const r = rgba8[x * 4 + 0] / 255;
      const g = rgba8[x * 4 + 1] / 255;
      const b = rgba8[x * 4 + 2] / 255;
      const a = rgba8[x * 4 + 3] / 255;
      if (colorSpace === "linear") out[i] = [r, g, b, a];
      else {
        const toSrgb = (v) => {
          if (v <= 31308e-7) return 12.92 * v;
          return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        };
        out[i] = [toSrgb(r), toSrgb(g), toSrgb(b), a];
      }
    }
    return out;
  }
};
var BUILTIN_SINGLETONS = {
  grayscale: new Colormap({
    label: "Colormap.grayscale",
    width: BUILTIN_RESOLUTION,
    filter: "linear",
    rgba8Linear: ensureBuiltinRGBA8Linear("grayscale")
  }),
  turbo: new Colormap({
    label: "Colormap.turbo",
    width: BUILTIN_RESOLUTION,
    filter: "linear",
    rgba8Linear: ensureBuiltinRGBA8Linear("turbo")
  }),
  viridis: new Colormap({
    label: "Colormap.viridis",
    width: BUILTIN_RESOLUTION,
    filter: "linear",
    rgba8Linear: ensureBuiltinRGBA8Linear("viridis")
  }),
  magma: new Colormap({
    label: "Colormap.magma",
    width: BUILTIN_RESOLUTION,
    filter: "linear",
    rgba8Linear: ensureBuiltinRGBA8Linear("magma")
  }),
  plasma: new Colormap({
    label: "Colormap.plasma",
    width: BUILTIN_RESOLUTION,
    filter: "linear",
    rgba8Linear: ensureBuiltinRGBA8Linear("plasma")
  }),
  inferno: new Colormap({
    label: "Colormap.inferno",
    width: BUILTIN_RESOLUTION,
    filter: "linear",
    rgba8Linear: ensureBuiltinRGBA8Linear("inferno")
  })
};

// src/wgsl/graphics/unlit.wgsl
var unlit_default = "struct MaterialUniforms { color: vec4f, params: vec4f }; @group(1) @binding(0) var<uniform> material: MaterialUniforms; @group(1) @binding(1) var baseSampler: sampler; @group(1) @binding(2) var baseTex: texture_2d<f32>; struct VertexInput { @location(0) position: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }; struct VertexOutput { @builtin(position) position: vec4f, @location(0) normal: vec3f, @location(1) uv: vec2f }; struct CameraUniforms { viewProjection: mat4x4f, position: vec3f }; struct ModelUniforms { model: mat4x4f, normalMatrix: mat4x4f }; @group(0) @binding(0) var<uniform> camera: CameraUniforms; @group(0) @binding(1) var<uniform> model: ModelUniforms; fn linearToSrgb(c: vec3f) -> vec3f { return pow(c, vec3f(1.0 / 2.2)); } @vertex fn vs_main(in: VertexInput) -> VertexOutput { var out: VertexOutput; out.position = camera.viewProjection * model.model * vec4f(in.position, 1.0); out.normal = (model.normalMatrix * vec4f(in.normal, 0.0)).xyz; out.uv = in.uv; return out; } @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4f { let texColor = textureSample(baseTex, baseSampler, in.uv); var outColor = material.color * texColor; let alphaCutoff = material.params.x; if (alphaCutoff > 0.0 && outColor.a < alphaCutoff) { discard; } outColor.rgb = linearToSrgb(outColor.rgb); return outColor; }";

// src/wgsl/graphics/unlit-instanced.wgsl
var unlit_instanced_default = "struct MaterialUniforms { color: vec4f, params: vec4f }; @group(1) @binding(0) var<uniform> material: MaterialUniforms; @group(1) @binding(1) var baseSampler: sampler; @group(1) @binding(2) var baseTex: texture_2d<f32>; struct VertexInput { @location(0) position: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f, @location(3) m0: vec4f, @location(4) m1: vec4f, @location(5) m2: vec4f, @location(6) m3: vec4f, @location(7) n0: vec4f, @location(8) n1: vec4f, @location(9) n2: vec4f, @location(10) n3: vec4f }; struct VertexOutput { @builtin(position) position: vec4f, @location(0) normal: vec3f, @location(1) uv: vec2f }; struct CameraUniforms { viewProjection: mat4x4f, position: vec3f }; @group(0) @binding(0) var<uniform> camera: CameraUniforms; fn linearToSrgb(c: vec3f) -> vec3f { return pow(c, vec3f(1.0 / 2.2)); } @vertex fn vs_main(in: VertexInput) -> VertexOutput { var out: VertexOutput; let modelM = mat4x4f(in.m0, in.m1, in.m2, in.m3); let normalM = mat4x4f(in.n0, in.n1, in.n2, in.n3); out.position = camera.viewProjection * modelM * vec4f(in.position, 1.0); out.normal = (normalM * vec4f(in.normal, 0.0)).xyz; out.uv = in.uv; return out; } @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4f { let texColor = textureSample(baseTex, baseSampler, in.uv); var outColor = material.color * texColor; let alphaCutoff = material.params.x; if (alphaCutoff > 0.0 && outColor.a < alphaCutoff) { discard; } outColor.rgb = linearToSrgb(outColor.rgb); return outColor; }";

// src/wgsl/graphics/unlit-skinned.wgsl
var unlit_skinned_default = "struct MaterialUniforms { color: vec4<f32> }; @group(1) @binding(0) var<uniform> material: MaterialUniforms; @group(1) @binding(1) var baseColorSampler: sampler; @group(1) @binding(2) var baseColorTexture: texture_2d<f32>; struct VertexInput { @location(0) position: vec3<f32>, @location(1) normal: vec3<f32>, @location(2) uv: vec2<f32>, @location(3) joints: vec4<u32>, @location(4) weights: vec4<f32> }; struct VertexOutput { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }; struct CameraUniforms { viewProjection: mat4x4<f32>, position: vec4<f32> }; struct ModelUniforms { model: mat4x4<f32>, normalMatrix: mat4x4<f32> }; @group(0) @binding(0) var<uniform> camera: CameraUniforms; @group(0) @binding(1) var<uniform> model: ModelUniforms; struct SkinBuffer { joints: array<mat4x4<f32>>, }; @group(2) @binding(0) var<storage, read> skin: SkinBuffer; @vertex fn vs_main(in: VertexInput) -> VertexOutput { var out: VertexOutput; let j = in.joints; let w = in.weights; let m = skin.joints[j.x] * w.x + skin.joints[j.y] * w.y + skin.joints[j.z] * w.z + skin.joints[j.w] * w.w; let localPos = m * vec4<f32>(in.position, 1.0); out.position = camera.viewProjection * model.model * localPos; out.uv = in.uv; return out; } @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { let baseColorSample = textureSample(baseColorTexture, baseColorSampler, in.uv); return material.color * baseColorSample; }";

// src/wgsl/graphics/unlit-skinned8.wgsl
var unlit_skinned8_default = "struct MaterialUniforms { color: vec4<f32> }; @group(1) @binding(0) var<uniform> material: MaterialUniforms; @group(1) @binding(1) var baseColorSampler: sampler; @group(1) @binding(2) var baseColorTexture: texture_2d<f32>; struct VertexInput { @location(0) position: vec3<f32>, @location(1) normal: vec3<f32>, @location(2) uv: vec2<f32>, @location(3) joints0: vec4<u32>, @location(4) weights0: vec4<f32>, @location(5) joints1: vec4<u32>, @location(6) weights1: vec4<f32> }; struct VertexOutput { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }; struct CameraUniforms { viewProjection: mat4x4<f32>, position: vec4<f32> }; struct ModelUniforms { model: mat4x4<f32>, normalMatrix: mat4x4<f32> }; @group(0) @binding(0) var<uniform> camera: CameraUniforms; @group(0) @binding(1) var<uniform> model: ModelUniforms; struct SkinBuffer { joints: array<mat4x4<f32>>, }; @group(2) @binding(0) var<storage, read> skin: SkinBuffer; @vertex fn vs_main(in: VertexInput) -> VertexOutput { var out: VertexOutput; let j0 = in.joints0; let w0 = in.weights0; let j1 = in.joints1; let w1 = in.weights1; let m = skin.joints[j0.x] * w0.x + skin.joints[j0.y] * w0.y + skin.joints[j0.z] * w0.z + skin.joints[j0.w] * w0.w + skin.joints[j1.x] * w1.x + skin.joints[j1.y] * w1.y + skin.joints[j1.z] * w1.z + skin.joints[j1.w] * w1.w; let localPos = m * vec4<f32>(in.position, 1.0); out.position = camera.viewProjection * model.model * localPos; out.uv = in.uv; return out; } @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { let baseColorSample = textureSample(baseColorTexture, baseColorSampler, in.uv); return material.color * baseColorSample; }";

// src/wgsl/graphics/standard.wgsl
var standard_default = "struct MaterialUniforms { color: vec4f, emissive: vec4f, params: vec4f, params2: vec4f }; @group(1) @binding(0) var<uniform> material: MaterialUniforms; @group(1) @binding(1) var baseColorSampler: sampler; @group(1) @binding(2) var baseColorTex: texture_2d<f32>; @group(1) @binding(3) var metallicRoughnessSampler: sampler; @group(1) @binding(4) var metallicRoughnessTex: texture_2d<f32>; @group(1) @binding(5) var normalSampler: sampler; @group(1) @binding(6) var normalTex: texture_2d<f32>; @group(1) @binding(7) var occlusionSampler: sampler; @group(1) @binding(8) var occlusionTex: texture_2d<f32>; @group(1) @binding(9) var emissiveSampler: sampler; @group(1) @binding(10) var emissiveTex: texture_2d<f32>; struct VertexInput { @location(0) position: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }; struct VertexOutput { @builtin(position) position: vec4f, @location(0) worldPos: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }; struct CameraUniforms { viewProjection: mat4x4f, position: vec3f }; struct ModelUniforms { model: mat4x4f, normalMatrix: mat4x4f }; struct Light { position: vec4f, color: vec4f, params: vec4f }; struct LightingUniforms { ambient: vec4f, lightCount: u32, _pad0: u32, _pad1: u32, _pad2: u32, lights: array<Light, 8> }; @group(0) @binding(0) var<uniform> camera: CameraUniforms; @group(0) @binding(1) var<uniform> model: ModelUniforms; @group(0) @binding(2) var<uniform> lighting: LightingUniforms; const PI: f32 = 3.14159265359; @vertex fn vs_main(in: VertexInput) -> VertexOutput { var out: VertexOutput; let worldPos4 = model.model * vec4f(in.position, 1.0); out.position = camera.viewProjection * worldPos4; out.worldPos = worldPos4.xyz; out.normal = normalize((model.normalMatrix * vec4f(in.normal, 0.0)).xyz); out.uv = in.uv; return out; } fn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f { return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0); } fn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 { let a = roughness * roughness; let a2 = a * a; let NdotH = max(dot(N, H), 0.0); let NdotH2 = NdotH * NdotH; let denom = NdotH2 * (a2 - 1.0) + 1.0; return a2 / (PI * denom * denom); } fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 { let r = roughness + 1.0; let k = (r * r) / 8.0; return NdotV / (NdotV * (1.0 - k) + k); } fn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 { let NdotV = max(dot(N, V), 0.0); let NdotL = max(dot(N, L), 0.0); return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness); } fn applyNormalMap(N: vec3f, worldPos: vec3f, uv: vec2f, normalSample: vec3f, normalScale: f32) -> vec3f { let n = normalize(N); let dp1 = dpdx(worldPos); let dp2 = dpdy(worldPos); let duv1 = dpdx(uv); let duv2 = dpdy(uv); let det = duv1.x * duv2.y - duv1.y * duv2.x; if (abs(det) < 1e-6) { return n; } let r = 1.0 / det; var T = (dp1 * duv2.y - dp2 * duv1.y) * r; T = normalize(T - n * dot(n, T)); let B = normalize(cross(n, T)) * sign(det); let tbn = mat3x3f(T, B, n); var ns = normalSample * 2.0 - vec3f(1.0); ns = vec3f(ns.x * normalScale, ns.y * normalScale, ns.z); return normalize(tbn * ns); } @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4f { let baseSample = textureSample(baseColorTex, baseColorSampler, in.uv); let baseColor = material.color * baseSample; let alphaCutoff = material.params2.x; if (alphaCutoff > 0.0 && baseColor.a < alphaCutoff) { discard; } let mrSample = textureSample(metallicRoughnessTex, metallicRoughnessSampler, in.uv); let metallic = clamp(material.params.x * mrSample.b, 0.0, 1.0); let roughness = clamp(material.params.y * mrSample.g, 0.04, 1.0); let normalSample = textureSample(normalTex, normalSampler, in.uv).xyz; let N = applyNormalMap(in.normal, in.worldPos, in.uv, normalSample, material.params.z); let occlSample = textureSample(occlusionTex, occlusionSampler, in.uv).r; let ao = 1.0 + material.params.w * (occlSample - 1.0); let emissiveSample = textureSample(emissiveTex, emissiveSampler, in.uv).rgb; let emissive = emissiveSample * material.emissive.rgb * material.emissive.a; let albedo = baseColor.rgb; let V = normalize(camera.position - in.worldPos); let F0 = mix(vec3f(0.04), albedo, metallic); var Lo = lighting.ambient.rgb * albedo * ao; for (var i = 0u; i < lighting.lightCount; i++) { let light = lighting.lights[i]; var L: vec3f; var attenuation: f32 = 1.0; if (light.position.w == 0.0) { L = normalize(-light.position.xyz); } else { let lightDir = light.position.xyz - in.worldPos; let distance = length(lightDir); L = normalize(lightDir); attenuation = 1.0 / (distance * distance); } let H = normalize(V + L); let radiance = light.color.rgb * light.color.a * attenuation; let NDF = distributionGGX(N, H, roughness); let G = geometrySmith(N, V, L, roughness); let F = fresnelSchlick(max(dot(H, V), 0.0), F0); let numerator = NDF * G * F; let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001; let specular = numerator / denominator; let kS = F; let kD = (1.0 - kS) * (1.0 - metallic); let NdotL = max(dot(N, L), 0.0); Lo += (kD * albedo / PI + specular) * radiance * NdotL; } Lo += emissive; Lo = Lo / (Lo + vec3f(1.0)); Lo = pow(Lo, vec3f(1.0 / 2.2)); return vec4f(Lo, baseColor.a); }";

// src/wgsl/graphics/standard-instanced.wgsl
var standard_instanced_default = "struct MaterialUniforms { color: vec4f, emissive: vec4f, params: vec4f, params2: vec4f }; @group(1) @binding(0) var<uniform> material: MaterialUniforms; @group(1) @binding(1) var baseColorSampler: sampler; @group(1) @binding(2) var baseColorTex: texture_2d<f32>; @group(1) @binding(3) var metallicRoughnessSampler: sampler; @group(1) @binding(4) var metallicRoughnessTex: texture_2d<f32>; @group(1) @binding(5) var normalSampler: sampler; @group(1) @binding(6) var normalTex: texture_2d<f32>; @group(1) @binding(7) var occlusionSampler: sampler; @group(1) @binding(8) var occlusionTex: texture_2d<f32>; @group(1) @binding(9) var emissiveSampler: sampler; @group(1) @binding(10) var emissiveTex: texture_2d<f32>; struct VertexInput { @location(0) position: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f, @location(3) m0: vec4f, @location(4) m1: vec4f, @location(5) m2: vec4f, @location(6) m3: vec4f, @location(7) n0: vec4f, @location(8) n1: vec4f, @location(9) n2: vec4f, @location(10) n3: vec4f }; struct VertexOutput { @builtin(position) position: vec4f, @location(0) worldPos: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }; struct CameraUniforms { viewProjection: mat4x4f, position: vec3f }; struct Light { position: vec4f, color: vec4f, params: vec4f }; struct LightingUniforms { ambient: vec4f, lightCount: u32, _pad0: u32, _pad1: u32, _pad2: u32, lights: array<Light, 8> }; @group(0) @binding(0) var<uniform> camera: CameraUniforms; @group(0) @binding(2) var<uniform> lighting: LightingUniforms; const PI: f32 = 3.14159265359; @vertex fn vs_main(in: VertexInput) -> VertexOutput { var out: VertexOutput; let modelM = mat4x4f(in.m0, in.m1, in.m2, in.m3); let normalM = mat4x4f(in.n0, in.n1, in.n2, in.n3); let worldPos4 = modelM * vec4f(in.position, 1.0); out.position = camera.viewProjection * worldPos4; out.worldPos = worldPos4.xyz; out.normal = normalize((normalM * vec4f(in.normal, 0.0)).xyz); out.uv = in.uv; return out; } fn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f { return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0); } fn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 { let a = roughness * roughness; let a2 = a * a; let NdotH = max(dot(N, H), 0.0); let NdotH2 = NdotH * NdotH; let denom = NdotH2 * (a2 - 1.0) + 1.0; return a2 / (PI * denom * denom); } fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 { let r = roughness + 1.0; let k = (r * r) / 8.0; return NdotV / (NdotV * (1.0 - k) + k); } fn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 { let NdotV = max(dot(N, V), 0.0); let NdotL = max(dot(N, L), 0.0); return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness); } fn applyNormalMap(N: vec3f, worldPos: vec3f, uv: vec2f, normalSample: vec3f, normalScale: f32) -> vec3f { let n = normalize(N); let dp1 = dpdx(worldPos); let dp2 = dpdy(worldPos); let duv1 = dpdx(uv); let duv2 = dpdy(uv); let det = duv1.x * duv2.y - duv1.y * duv2.x; if (abs(det) < 1e-6) { return n; } let r = 1.0 / det; var T = (dp1 * duv2.y - dp2 * duv1.y) * r; T = normalize(T - n * dot(n, T)); let B = normalize(cross(n, T)) * sign(det); let tbn = mat3x3f(T, B, n); var ns = normalSample * 2.0 - vec3f(1.0); ns = vec3f(ns.x * normalScale, ns.y * normalScale, ns.z); return normalize(tbn * ns); } @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4f { let baseSample = textureSample(baseColorTex, baseColorSampler, in.uv); let baseColor = material.color * baseSample; let alphaCutoff = material.params2.x; if (alphaCutoff > 0.0 && baseColor.a < alphaCutoff) { discard; } let mrSample = textureSample(metallicRoughnessTex, metallicRoughnessSampler, in.uv); let metallic = clamp(material.params.x * mrSample.b, 0.0, 1.0); let roughness = clamp(material.params.y * mrSample.g, 0.04, 1.0); let normalSample = textureSample(normalTex, normalSampler, in.uv).xyz; let N = applyNormalMap(in.normal, in.worldPos, in.uv, normalSample, material.params.z); let occlSample = textureSample(occlusionTex, occlusionSampler, in.uv).r; let ao = 1.0 + material.params.w * (occlSample - 1.0); let emissiveSample = textureSample(emissiveTex, emissiveSampler, in.uv).rgb; let emissive = emissiveSample * material.emissive.rgb * material.emissive.a; let albedo = baseColor.rgb; let V = normalize(camera.position - in.worldPos); let F0 = mix(vec3f(0.04), albedo, metallic); var Lo = lighting.ambient.rgb * albedo * ao; for (var i = 0u; i < lighting.lightCount; i++) { let light = lighting.lights[i]; var L: vec3f; var attenuation: f32 = 1.0; if (light.position.w == 0.0) { L = normalize(-light.position.xyz); } else { let lightDir = light.position.xyz - in.worldPos; let distance = length(lightDir); L = normalize(lightDir); attenuation = 1.0 / (distance * distance); } let H = normalize(V + L); let radiance = light.color.rgb * light.color.a * attenuation; let NDF = distributionGGX(N, H, roughness); let G = geometrySmith(N, V, L, roughness); let F = fresnelSchlick(max(dot(H, V), 0.0), F0); let numerator = NDF * G * F; let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001; let specular = numerator / denominator; let kS = F; let kD = (1.0 - kS) * (1.0 - metallic); let NdotL = max(dot(N, L), 0.0); Lo += (kD * albedo / PI + specular) * radiance * NdotL; } Lo += emissive; Lo = Lo / (Lo + vec3f(1.0)); Lo = pow(Lo, vec3f(1.0 / 2.2)); return vec4f(Lo, baseColor.a); }";

// src/wgsl/graphics/standard-skinned.wgsl
var standard_skinned_default = "struct MaterialUniforms { color: vec4f, emissive: vec4f, params: vec4f, params2: vec4f }; @group(1) @binding(0) var<uniform> material: MaterialUniforms; @group(1) @binding(1) var baseColorSampler: sampler; @group(1) @binding(2) var baseColorTex: texture_2d<f32>; @group(1) @binding(3) var metallicRoughnessSampler: sampler; @group(1) @binding(4) var metallicRoughnessTex: texture_2d<f32>; @group(1) @binding(5) var normalSampler: sampler; @group(1) @binding(6) var normalTex: texture_2d<f32>; @group(1) @binding(7) var occlusionSampler: sampler; @group(1) @binding(8) var occlusionTex: texture_2d<f32>; @group(1) @binding(9) var emissiveSampler: sampler; @group(1) @binding(10) var emissiveTex: texture_2d<f32>; struct VertexInput { @location(0) position: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f, @location(3) joints: vec4u, @location(4) weights: vec4f }; struct VertexOutput { @builtin(position) position: vec4f, @location(0) worldPos: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }; struct CameraUniforms { viewProjection: mat4x4f, position: vec3f }; struct ModelUniforms { model: mat4x4f, normalMatrix: mat4x4f }; struct Light { position: vec4f, color: vec4f, params: vec4f }; struct LightingUniforms { ambient: vec4f, lightCount: u32, _pad0: u32, _pad1: u32, _pad2: u32, lights: array<Light, 8> }; @group(0) @binding(0) var<uniform> camera: CameraUniforms; @group(0) @binding(1) var<uniform> model: ModelUniforms; @group(0) @binding(2) var<uniform> lighting: LightingUniforms; struct SkinBuffer { joints: array<mat4x4f> }; @group(2) @binding(0) var<storage, read> skin: SkinBuffer; const PI: f32 = 3.14159265359; @vertex fn vs_main(in: VertexInput) -> VertexOutput { var out: VertexOutput; let j = in.joints; let w = in.weights; let skinMatrix = skin.joints[j.x] * w.x + skin.joints[j.y] * w.y + skin.joints[j.z] * w.z + skin.joints[j.w] * w.w; let localPos = skinMatrix * vec4f(in.position, 1.0); let localNormal = (skinMatrix * vec4f(in.normal, 0.0)).xyz; let worldPos4 = model.model * localPos; out.position = camera.viewProjection * worldPos4; out.worldPos = worldPos4.xyz; out.normal = normalize((model.normalMatrix * vec4f(localNormal, 0.0)).xyz); out.uv = in.uv; return out; } fn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f { return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0); } fn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 { let a = roughness * roughness; let a2 = a * a; let NdotH = max(dot(N, H), 0.0); let NdotH2 = NdotH * NdotH; let denom = NdotH2 * (a2 - 1.0) + 1.0; return a2 / (PI * denom * denom); } fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 { let r = roughness + 1.0; let k = (r * r) / 8.0; return NdotV / (NdotV * (1.0 - k) + k); } fn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 { let NdotV = max(dot(N, V), 0.0); let NdotL = max(dot(N, L), 0.0); return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness); } fn applyNormalMap(N: vec3f, worldPos: vec3f, uv: vec2f, normalSample: vec3f, normalScale: f32) -> vec3f { let n = normalize(N); let dp1 = dpdx(worldPos); let dp2 = dpdy(worldPos); let duv1 = dpdx(uv); let duv2 = dpdy(uv); let det = duv1.x * duv2.y - duv1.y * duv2.x; if (abs(det) < 1e-6) { return n; } let r = 1.0 / det; var T = (dp1 * duv2.y - dp2 * duv1.y) * r; T = normalize(T - n * dot(n, T)); let B = normalize(cross(n, T)) * sign(det); let tbn = mat3x3f(T, B, n); var ns = normalSample * 2.0 - vec3f(1.0); ns = vec3f(ns.x * normalScale, ns.y * normalScale, ns.z); return normalize(tbn * ns); } @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4f { let baseSample = textureSample(baseColorTex, baseColorSampler, in.uv); let baseColor = material.color * baseSample; let alphaCutoff = material.params2.x; if (alphaCutoff > 0.0 && baseColor.a < alphaCutoff) { discard; } let mrSample = textureSample(metallicRoughnessTex, metallicRoughnessSampler, in.uv); let metallic = clamp(material.params.x * mrSample.b, 0.0, 1.0); let roughness = clamp(material.params.y * mrSample.g, 0.04, 1.0); let normalSample = textureSample(normalTex, normalSampler, in.uv).xyz; let N = applyNormalMap(in.normal, in.worldPos, in.uv, normalSample, material.params.z); let occlSample = textureSample(occlusionTex, occlusionSampler, in.uv).r; let ao = 1.0 + material.params.w * (occlSample - 1.0); let emissiveSample = textureSample(emissiveTex, emissiveSampler, in.uv).rgb; let emissive = emissiveSample * material.emissive.rgb * material.emissive.a; let albedo = baseColor.rgb; let V = normalize(camera.position - in.worldPos); let F0 = mix(vec3f(0.04), albedo, metallic); var Lo = lighting.ambient.rgb * albedo * ao; for (var i = 0u; i < lighting.lightCount; i++) { let light = lighting.lights[i]; var L: vec3f; var attenuation: f32 = 1.0; if (light.position.w == 0.0) { L = normalize(-light.position.xyz); } else { let lightDir = light.position.xyz - in.worldPos; let distance = length(lightDir); L = normalize(lightDir); attenuation = 1.0 / (distance * distance); } let H = normalize(V + L); let radiance = light.color.rgb * light.color.a * attenuation; let NDF = distributionGGX(N, H, roughness); let G = geometrySmith(N, V, L, roughness); let F = fresnelSchlick(max(dot(H, V), 0.0), F0); let numerator = NDF * G * F; let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001; let specular = numerator / denominator; let kS = F; let kD = (1.0 - kS) * (1.0 - metallic); let NdotL = max(dot(N, L), 0.0); Lo += (kD * albedo / PI + specular) * radiance * NdotL; } Lo += emissive; Lo = Lo / (Lo + vec3f(1.0)); Lo = pow(Lo, vec3f(1.0 / 2.2)); return vec4f(Lo, baseColor.a); }";

// src/wgsl/graphics/standard-skinned8.wgsl
var standard_skinned8_default = "struct MaterialUniforms { color: vec4f, emissive: vec4f, params: vec4f, params2: vec4f }; @group(1) @binding(0) var<uniform> material: MaterialUniforms; @group(1) @binding(1) var baseColorSampler: sampler; @group(1) @binding(2) var baseColorTex: texture_2d<f32>; @group(1) @binding(3) var metallicRoughnessSampler: sampler; @group(1) @binding(4) var metallicRoughnessTex: texture_2d<f32>; @group(1) @binding(5) var normalSampler: sampler; @group(1) @binding(6) var normalTex: texture_2d<f32>; @group(1) @binding(7) var occlusionSampler: sampler; @group(1) @binding(8) var occlusionTex: texture_2d<f32>; @group(1) @binding(9) var emissiveSampler: sampler; @group(1) @binding(10) var emissiveTex: texture_2d<f32>; struct VertexInput { @location(0) position: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f, @location(3) joints0: vec4u, @location(4) weights0: vec4f, @location(5) joints1: vec4u, @location(6) weights1: vec4f }; struct VertexOutput { @builtin(position) position: vec4f, @location(0) worldPos: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }; struct CameraUniforms { viewProjection: mat4x4f, position: vec3f }; struct ModelUniforms { model: mat4x4f, normalMatrix: mat4x4f }; struct Light { position: vec4f, color: vec4f, params: vec4f }; struct LightingUniforms { ambient: vec4f, lightCount: u32, _pad0: u32, _pad1: u32, _pad2: u32, lights: array<Light, 8> }; @group(0) @binding(0) var<uniform> camera: CameraUniforms; @group(0) @binding(1) var<uniform> model: ModelUniforms; @group(0) @binding(2) var<uniform> lighting: LightingUniforms; struct SkinBuffer { joints: array<mat4x4f> }; @group(2) @binding(0) var<storage, read> skin: SkinBuffer; const PI: f32 = 3.14159265359; @vertex fn vs_main(in: VertexInput) -> VertexOutput { var out: VertexOutput; let j0 = in.joints0; let w0 = in.weights0; let j1 = in.joints1; let w1 = in.weights1; let skinMatrix = skin.joints[j0.x] * w0.x + skin.joints[j0.y] * w0.y + skin.joints[j0.z] * w0.z + skin.joints[j0.w] * w0.w + skin.joints[j1.x] * w1.x + skin.joints[j1.y] * w1.y + skin.joints[j1.z] * w1.z + skin.joints[j1.w] * w1.w; let localPos = skinMatrix * vec4f(in.position, 1.0); let localNormal = (skinMatrix * vec4f(in.normal, 0.0)).xyz; let worldPos4 = model.model * localPos; out.position = camera.viewProjection * worldPos4; out.worldPos = worldPos4.xyz; out.normal = normalize((model.normalMatrix * vec4f(localNormal, 0.0)).xyz); out.uv = in.uv; return out; } fn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f { return F0 + (vec3f(1.0) - F0) * pow(1.0 - cosTheta, 5.0); } fn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 { let a = roughness * roughness; let a2 = a * a; let NdotH = max(dot(N, H), 0.0); let NdotH2 = NdotH * NdotH; let denom = (NdotH2 * (a2 - 1.0) + 1.0); return a2 / (PI * denom * denom); } fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 { let r = roughness + 1.0; let k = (r * r) / 8.0; return NdotV / (NdotV * (1.0 - k) + k); } fn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 { let NdotV = max(dot(N, V), 0.0); let NdotL = max(dot(N, L), 0.0); let ggx2 = geometrySchlickGGX(NdotV, roughness); let ggx1 = geometrySchlickGGX(NdotL, roughness); return ggx1 * ggx2; } fn toneMap(color: vec3f) -> vec3f { return color / (color + vec3f(1.0)); } @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4f { let baseColor = material.color * textureSample(baseColorTex, baseColorSampler, in.uv); let mrSample = textureSample(metallicRoughnessTex, metallicRoughnessSampler, in.uv); let metallic = material.params.z * mrSample.b; let roughness = material.params.y * mrSample.g; let N = normalize(in.normal); let V = normalize(camera.position - in.worldPos); let F0 = mix(vec3f(0.04), baseColor.rgb, metallic); var Lo = vec3f(0.0); for (var i: u32 = 0u; i < lighting.lightCount; i = i + 1u) { let light = lighting.lights[i]; let L = normalize(light.position.xyz - in.worldPos); let H = normalize(V + L); let distance = length(light.position.xyz - in.worldPos); let attenuation = 1.0 / max(distance * distance, 0.0001); let radiance = light.color.rgb * attenuation * light.params.x; let NDF = distributionGGX(N, H, roughness); let G = geometrySmith(N, V, L, roughness); let F = fresnelSchlick(max(dot(H, V), 0.0), F0); let kS = F; let kD = (vec3f(1.0) - kS) * (1.0 - metallic); let numerator = NDF * G * F; let denom = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001; let specular = numerator / denom; let NdotL = max(dot(N, L), 0.0); Lo = Lo + (kD * baseColor.rgb / PI + specular) * radiance * NdotL; } let ambient = lighting.ambient.rgb * baseColor.rgb; let color = ambient + Lo + material.emissive.rgb * textureSample(emissiveTex, emissiveSampler, in.uv).rgb; let mapped = toneMap(color); return vec4f(mapped, baseColor.a); }";

// src/wgsl/graphics/data.wgsl
var data_default = "struct MaterialUniforms { dataLayout: vec4f, range0: vec4f, range1: vec4f, scaleParams: vec4f, colorParams: vec4f }; @group(1) @binding(0) var<uniform> material: MaterialUniforms; @group(1) @binding(1) var<storage, read> data: array<f32>; @group(1) @binding(2) var colormapSampler: sampler; @group(1) @binding(3) var colormapTex: texture_1d<f32>; struct VertexInput { @location(0) position: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }; struct VertexOutput { @builtin(position) position: vec4f, @location(0) worldPos: vec3f, @location(1) normal: vec3f, @location(2) dataValue: vec4f }; struct CameraUniforms { viewProjection: mat4x4f, position: vec3f }; struct ModelUniforms { model: mat4x4f, normalMatrix: mat4x4f }; struct Light { position: vec4f, color: vec4f, params: vec4f }; struct LightingUniforms { ambient: vec4f, lightCount: u32, _pad0: u32, _pad1: u32, _pad2: u32, lights: array<Light, 8> }; @group(0) @binding(0) var<uniform> camera: CameraUniforms; @group(0) @binding(1) var<uniform> model: ModelUniforms; @group(0) @binding(2) var<uniform> lighting: LightingUniforms; fn isNan(val: f32) -> bool { let u = bitcast<u32>(val); return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) != 0u; } fn isInf(val: f32) -> bool { let u = bitcast<u32>(val); return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) == 0u; } fn clamp01(x: f32) -> f32 { return clamp(x, 0.0, 1.0); } fn srgbFromLinear(c: vec3f) -> vec3f { let a = vec3f(0.055); return select(12.92 * c, (1.0 + a) * pow(c, vec3f(1.0 / 2.4)) - a, c > vec3f(0.0031308)); } fn logBase(x: f32, base: f32) -> f32 { let b = max(base, 1.000001); return log(x) / log(b); } fn applyScale(x: f32, scaleMode: u32, linthresh: f32, base: f32) -> f32 { if (scaleMode == 0u) { return x; } if (scaleMode == 1u) { return logBase(max(x, 1e-20), base); } let lt = max(linthresh, 1e-20); let s = select(-1.0, 1.0, x >= 0.0); let y = logBase(1.0 + abs(x) / lt, base); return s * y; } fn luminance(rgb: vec3f) -> f32 { return dot(rgb, vec3f(0.2126, 0.7152, 0.0722)); } @vertex fn vs_main(in: VertexInput, @builtin(vertex_index) vertexIndex: u32) -> VertexOutput { var out: VertexOutput; let worldPos4 = model.model * vec4f(in.position, 1.0); out.position = camera.viewProjection * worldPos4; out.worldPos = worldPos4.xyz; out.normal = normalize((model.normalMatrix * vec4f(in.normal, 0.0)).xyz); let componentCount = max(1u, min(4u, u32(material.dataLayout.x + 0.5))); let stride = max(1u, u32(material.dataLayout.w + 0.5)); let dataOffset = u32(material.scaleParams.w + 0.5); let base = vertexIndex * stride + dataOffset; var x: f32 = data[base + 0u]; var y: f32 = 0.0; var z: f32 = 0.0; var w: f32 = 0.0; if (componentCount > 1u) { y = data[base + 1u]; } if (componentCount > 2u) { z = data[base + 2u]; } if (componentCount > 3u) { w = data[base + 3u]; } out.dataValue = vec4f(x, y, z, w); return out; } @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4f { let componentCount = max(1u, min(4u, u32(material.dataLayout.x + 0.5))); let componentIndex = min(3u, u32(material.dataLayout.y + 0.5)); let valueMode = u32(material.dataLayout.z + 0.5); var v: f32 = 0.0; if (valueMode == 1u) { if (componentCount == 1u) { v = abs(in.dataValue.x); } else if (componentCount == 2u) { v = length(in.dataValue.xy); } else if (componentCount == 3u) { v = length(in.dataValue.xyz); } else { v = length(in.dataValue); } } else { v = select( select( select( in.dataValue.x, in.dataValue.y, componentIndex == 1u ), in.dataValue.z, componentIndex == 2u ), in.dataValue.w, componentIndex == 3u ); } if (isNan(v) || isInf(v)) { discard; } let clipMin = material.range0.z; let clipMax = material.range0.w; if (clipMax > clipMin) { v = clamp(v, clipMin, clipMax); } var domainMin = material.range0.x; var domainMax = material.range0.y; if (domainMax <= domainMin && clipMax > clipMin) { domainMin = clipMin; domainMax = clipMax; } let scaleMode = u32(material.scaleParams.x + 0.5); let linthresh = material.scaleParams.y; let base = material.scaleParams.z; let a = applyScale(domainMin, scaleMode, linthresh, base); let b = applyScale(domainMax, scaleMode, linthresh, base); let x = applyScale(v, scaleMode, linthresh, base); let denom = max(1e-20, b - a); var t = clamp01((x - a) / denom); let gamma = max(material.range1.z, 1e-6); t = pow(t, gamma); if (material.range1.w > 0.5) { t = 1.0 - t; } let t0 = clamp01(material.range1.x); let t1 = clamp01(material.range1.y); let tc = clamp01(t0 + t * (t1 - t0)); var cmap = textureSample(colormapTex, colormapSampler, tc); let shading = clamp01(material.colorParams.y); if (shading > 0.0) { let N = normalize(in.normal); var lightFactor: f32 = luminance(lighting.ambient.rgb); for (var i = 0u; i < lighting.lightCount; i++) { let light = lighting.lights[i]; var L: vec3f; var attenuation: f32 = 1.0; if (light.position.w == 0.0) { L = normalize(-light.position.xyz); } else { let lightDir = light.position.xyz - in.worldPos; let dist = length(lightDir); L = normalize(lightDir); attenuation = 1.0 / max(1e-6, dist * dist); } let ndotl = max(dot(N, L), 0.0); let lum = luminance(light.color.rgb) * light.color.a; lightFactor += lum * attenuation * ndotl; } let shadedRgb = cmap.rgb * lightFactor; cmap = vec4f(mix(cmap.rgb, shadedRgb, shading), cmap.a); } let opacity = clamp01(material.colorParams.x); let finalA = cmap.a * opacity; let finalRgb = clamp(cmap.rgb, vec3f(0.0), vec3f(1.0)); cmap = vec4f(finalRgb, finalA); return vec4f(srgbFromLinear(cmap.rgb), cmap.a); }";

// src/wgsl/graphics/custom-default-vertex.wgsl
var custom_default_vertex_default = "struct VertexInput { @location(0) position: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }; struct VertexOutput { @builtin(position) position: vec4f, @location(0) worldPos: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }; struct CameraUniforms { viewProjection: mat4x4f, position: vec3f }; struct ModelUniforms { model: mat4x4f, normalMatrix: mat4x4f }; @group(0) @binding(0) var<uniform> camera: CameraUniforms; @group(0) @binding(1) var<uniform> model: ModelUniforms; @vertex fn vs_main(in: VertexInput) -> VertexOutput { var out: VertexOutput; let worldPos = model.model * vec4f(in.position, 1.0); out.position = camera.viewProjection * worldPos; out.worldPos = worldPos.xyz; out.normal = normalize((model.normalMatrix * vec4f(in.normal, 0.0)).xyz); out.uv = in.uv; return out; }";

// src/graphics/material.ts
var BlendMode = /* @__PURE__ */ ((BlendMode2) => {
  BlendMode2["Opaque"] = "opaque";
  BlendMode2["Transparent"] = "transparent";
  BlendMode2["Additive"] = "additive";
  return BlendMode2;
})(BlendMode || {});
var CullMode = /* @__PURE__ */ ((CullMode2) => {
  CullMode2["None"] = "none";
  CullMode2["Back"] = "back";
  CullMode2["Front"] = "front";
  return CullMode2;
})(CullMode || {});
var Material = class {
  blendMode;
  cullMode;
  depthWrite;
  depthTest;
  pipeline = null;
  bindGroup = null;
  bindGroupKey = null;
  uniformBuffer = null;
  _uniformDataCache = null;
  _dirty = true;
  constructor(descriptor = {}) {
    this.blendMode = descriptor.blendMode ?? "opaque" /* Opaque */;
    this.cullMode = descriptor.cullMode ?? "back" /* Back */;
    this.depthWrite = descriptor.depthWrite ?? true;
    this.depthTest = descriptor.depthTest ?? true;
  }
  get dirty() {
    return this._dirty;
  }
  markClean() {
    this._dirty = false;
  }
  getUniformDataCache(floatCount) {
    if (!this._uniformDataCache || this._uniformDataCache.length !== floatCount) this._uniformDataCache = new Float32Array(floatCount);
    return this._uniformDataCache;
  }
  destroy() {
    this.uniformBuffer?.destroy();
    this.uniformBuffer = null;
    this.bindGroup = null;
    this.bindGroupKey = null;
    this.pipeline = null;
  }
};
var UnlitMaterial = class _UnlitMaterial extends Material {
  _color;
  _opacity;
  _baseColorTexture;
  _alphaCutoff;
  static _cachedBindGroupLayout = null;
  static _cachedLayoutDevice = null;
  constructor(descriptor = {}) {
    super({
      ...descriptor,
      blendMode: descriptor.blendMode ?? ((descriptor.opacity ?? 1) < 1 ? "transparent" /* Transparent */ : "opaque" /* Opaque */)
    });
    this._color = descriptor.color ?? [1, 1, 1];
    this._opacity = descriptor.opacity ?? 1;
    this._baseColorTexture = descriptor.baseColorTexture ?? null;
    this._alphaCutoff = descriptor.alphaCutoff ?? 0;
  }
  get color() {
    return this._color;
  }
  set color(value) {
    this._color = value;
    this._dirty = true;
  }
  get opacity() {
    return this._opacity;
  }
  set opacity(value) {
    this._opacity = value;
    this._dirty = true;
  }
  get baseColorTexture() {
    return this._baseColorTexture;
  }
  set baseColorTexture(value) {
    this._baseColorTexture = value;
    this._dirty = true;
  }
  get alphaCutoff() {
    return this._alphaCutoff;
  }
  set alphaCutoff(value) {
    this._alphaCutoff = value;
    this._dirty = true;
  }
  getUniformBufferSize() {
    return 32;
  }
  getUniformData() {
    const f = this.getUniformDataCache(8);
    f[0] = this._color[0];
    f[1] = this._color[1];
    f[2] = this._color[2];
    f[3] = this._opacity;
    f[4] = this._alphaCutoff;
    f[5] = 0;
    f[6] = 0;
    f[7] = 0;
    return f;
  }
  createBindGroupLayout(device) {
    if (_UnlitMaterial._cachedBindGroupLayout && _UnlitMaterial._cachedLayoutDevice === device) return _UnlitMaterial._cachedBindGroupLayout;
    const layout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
      ]
    });
    _UnlitMaterial._cachedBindGroupLayout = layout;
    _UnlitMaterial._cachedLayoutDevice = device;
    return layout;
  }
  getShaderCode(opts = {}) {
    if (opts.instanced) return unlit_instanced_default;
    if (opts.skinned8) return unlit_skinned8_default;
    if (opts.skinned) return unlit_skinned_default;
    return unlit_default;
  }
};
var StandardMaterial = class _StandardMaterial extends Material {
  _color;
  _opacity;
  _metallic;
  _roughness;
  _emissive;
  _emissiveIntensity;
  _baseColorTexture;
  _metallicRoughnessTexture;
  _normalTexture;
  _occlusionTexture;
  _emissiveTexture;
  _normalScale;
  _occlusionStrength;
  _alphaCutoff;
  static _cachedBindGroupLayout = null;
  static _cachedLayoutDevice = null;
  constructor(descriptor = {}) {
    super({
      ...descriptor,
      blendMode: descriptor.blendMode ?? ((descriptor.opacity ?? 1) < 1 ? "transparent" /* Transparent */ : "opaque" /* Opaque */)
    });
    this._color = descriptor.color ?? [1, 1, 1];
    this._opacity = descriptor.opacity ?? 1;
    this._metallic = descriptor.metallic ?? 0;
    this._roughness = descriptor.roughness ?? 1;
    this._emissive = descriptor.emissive ?? [0, 0, 0];
    this._emissiveIntensity = descriptor.emissiveIntensity ?? 0;
    this._baseColorTexture = descriptor.baseColorTexture ?? null;
    this._metallicRoughnessTexture = descriptor.metallicRoughnessTexture ?? null;
    this._normalTexture = descriptor.normalTexture ?? null;
    this._occlusionTexture = descriptor.occlusionTexture ?? null;
    this._emissiveTexture = descriptor.emissiveTexture ?? null;
    this._normalScale = descriptor.normalScale ?? 1;
    this._occlusionStrength = descriptor.occlusionStrength ?? 1;
    this._alphaCutoff = descriptor.alphaCutoff ?? 0;
  }
  get color() {
    return this._color;
  }
  set color(value) {
    this._color = value;
    this._dirty = true;
  }
  get opacity() {
    return this._opacity;
  }
  set opacity(value) {
    this._opacity = value;
    this._dirty = true;
  }
  get metallic() {
    return this._metallic;
  }
  set metallic(value) {
    this._metallic = Math.max(0, Math.min(1, value));
    this._dirty = true;
  }
  get roughness() {
    return this._roughness;
  }
  set roughness(value) {
    this._roughness = Math.max(0, Math.min(1, value));
    this._dirty = true;
  }
  get emissive() {
    return this._emissive;
  }
  set emissive(value) {
    this._emissive = value;
    this._dirty = true;
  }
  get emissiveIntensity() {
    return this._emissiveIntensity;
  }
  set emissiveIntensity(value) {
    this._emissiveIntensity = value;
    this._dirty = true;
  }
  get baseColorTexture() {
    return this._baseColorTexture;
  }
  set baseColorTexture(value) {
    this._baseColorTexture = value;
  }
  get metallicRoughnessTexture() {
    return this._metallicRoughnessTexture;
  }
  set metallicRoughnessTexture(value) {
    this._metallicRoughnessTexture = value;
  }
  get normalTexture() {
    return this._normalTexture;
  }
  set normalTexture(value) {
    this._normalTexture = value;
  }
  get occlusionTexture() {
    return this._occlusionTexture;
  }
  set occlusionTexture(value) {
    this._occlusionTexture = value;
  }
  get emissiveTexture() {
    return this._emissiveTexture;
  }
  set emissiveTexture(value) {
    this._emissiveTexture = value;
  }
  get normalScale() {
    return this._normalScale;
  }
  set normalScale(value) {
    this._normalScale = value;
    this._dirty = true;
  }
  get occlusionStrength() {
    return this._occlusionStrength;
  }
  set occlusionStrength(value) {
    this._occlusionStrength = value;
    this._dirty = true;
  }
  get alphaCutoff() {
    return this._alphaCutoff;
  }
  set alphaCutoff(value) {
    this._alphaCutoff = value;
    this._dirty = true;
  }
  getUniformBufferSize() {
    return 64;
  }
  getUniformData() {
    const f = this.getUniformDataCache(16);
    f[0] = this._color[0];
    f[1] = this._color[1];
    f[2] = this._color[2];
    f[3] = this._opacity;
    f[4] = this._emissive[0];
    f[5] = this._emissive[1];
    f[6] = this._emissive[2];
    f[7] = this._emissiveIntensity;
    f[8] = this._metallic;
    f[9] = this._roughness;
    f[10] = this._normalScale;
    f[11] = this._occlusionStrength;
    f[12] = this._alphaCutoff;
    f[13] = 0;
    f[14] = 0;
    f[15] = 0;
    return f;
  }
  createBindGroupLayout(device) {
    if (_StandardMaterial._cachedBindGroupLayout && _StandardMaterial._cachedLayoutDevice === device) return _StandardMaterial._cachedBindGroupLayout;
    const layout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 5, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 6, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 7, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 8, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 9, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 10, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
      ]
    });
    _StandardMaterial._cachedBindGroupLayout = layout;
    _StandardMaterial._cachedLayoutDevice = device;
    return layout;
  }
  getShaderCode(opts = {}) {
    if (opts.instanced) return standard_instanced_default;
    if (opts.skinned8) return standard_skinned8_default;
    if (opts.skinned) return standard_skinned_default;
    return standard_default;
  }
};
var DataMaterial = class _DataMaterial extends Material {
  _CPUData = null;
  _keepCPUData = false;
  _dataDirty = false;
  _ownsDataBuffer = false;
  dataBuffer = null;
  _componentCount = 1;
  _componentIndex = 0;
  _valueMode = "component" /* Component */;
  _stride = 1;
  _offset = 0;
  _domainMin = 0;
  _domainMax = 1;
  _clipMin = 0;
  _clipMax = 0;
  _scaleMode = "linear" /* Linear */;
  _symlogLinThresh = 1;
  _logBase = 10;
  _tMin = 0;
  _tMax = 1;
  _invert = false;
  _gamma = 1;
  _opacity = 1;
  _shading = 0;
  _colormap = "viridis";
  static _cachedBindGroupLayout = null;
  static _cachedLayoutDevice = null;
  constructor(desc = {}) {
    super({
      ...desc,
      blendMode: desc.blendMode ?? ((desc.opacity ?? 1) < 1 ? "transparent" /* Transparent */ : "opaque" /* Opaque */)
    });
    if (desc.keepCPUData !== void 0) this._keepCPUData = !!desc.keepCPUData;
    if (desc.componentCount !== void 0) this._componentCount = desc.componentCount;
    if (desc.componentIndex !== void 0) this._componentIndex = desc.componentIndex;
    if (desc.valueMode !== void 0) this._valueMode = desc.valueMode;
    if (desc.stride !== void 0) this._stride = desc.stride;
    if (desc.offset !== void 0) this._offset = desc.offset;
    if (desc.stride === void 0 && desc.componentCount !== void 0) this._stride = this._componentCount;
    if (this._stride < this._componentCount) this._stride = this._componentCount;
    if (desc.domainMin !== void 0) this._domainMin = desc.domainMin;
    if (desc.domainMax !== void 0) this._domainMax = desc.domainMax;
    if (desc.clipMin !== void 0) this._clipMin = desc.clipMin;
    if (desc.clipMax !== void 0) this._clipMax = desc.clipMax;
    if (desc.scaleMode !== void 0) this._scaleMode = desc.scaleMode;
    if (desc.symlogLinThresh !== void 0) this._symlogLinThresh = desc.symlogLinThresh;
    if (desc.logBase !== void 0) this._logBase = desc.logBase;
    if (desc.tMin !== void 0) this._tMin = desc.tMin;
    if (desc.tMax !== void 0) this._tMax = desc.tMax;
    if (desc.invert !== void 0) this._invert = !!desc.invert;
    if (desc.gamma !== void 0) this._gamma = desc.gamma;
    if (desc.opacity !== void 0) this._opacity = desc.opacity;
    if (desc.shading !== void 0) this._shading = desc.shading;
    if (desc.colormap !== void 0) this._colormap = desc.colormap;
    if (desc.data) this.setData(desc.data, {
      keepCPUData: this._keepCPUData,
      componentCount: this._componentCount,
      stride: this._stride,
      offset: this._offset
    });
    if (desc.dataBuffer !== void 0 && desc.dataBuffer !== null) {
      const b = desc.dataBuffer.buffer ? desc.dataBuffer.buffer : desc.dataBuffer;
      this.setDataBuffer(b, {
        componentCount: this._componentCount,
        stride: this._stride,
        offset: this._offset
      });
    }
  }
  get componentCount() {
    return this._componentCount;
  }
  set componentCount(v) {
    if (v === this._componentCount) return;
    this._componentCount = v;
    this._dirty = true;
  }
  get componentIndex() {
    return this._componentIndex;
  }
  set componentIndex(v) {
    if (v === this._componentIndex) return;
    this._componentIndex = v;
    this._dirty = true;
  }
  get valueMode() {
    return this._valueMode;
  }
  set valueMode(v) {
    if (v === this._valueMode) return;
    this._valueMode = v;
    this._dirty = true;
  }
  get stride() {
    return this._stride;
  }
  set stride(v) {
    if (v === this._stride) return;
    this._stride = v;
    this._dirty = true;
  }
  get offset() {
    return this._offset;
  }
  set offset(v) {
    if (v === this._offset) return;
    this._offset = v;
    this._dirty = true;
  }
  get domainMin() {
    return this._domainMin;
  }
  set domainMin(v) {
    if (v === this._domainMin) return;
    this._domainMin = v;
    this._dirty = true;
  }
  get domainMax() {
    return this._domainMax;
  }
  set domainMax(v) {
    if (v === this._domainMax) return;
    this._domainMax = v;
    this._dirty = true;
  }
  setDomain(min, max) {
    this._domainMin = min;
    this._domainMax = max;
    this._dirty = true;
  }
  get clipMin() {
    return this._clipMin;
  }
  set clipMin(v) {
    if (v === this._clipMin) return;
    this._clipMin = v;
    this._dirty = true;
  }
  get clipMax() {
    return this._clipMax;
  }
  set clipMax(v) {
    if (v === this._clipMax) return;
    this._clipMax = v;
    this._dirty = true;
  }
  setClip(min, max) {
    this._clipMin = min;
    this._clipMax = max;
    this._dirty = true;
  }
  get scaleMode() {
    return this._scaleMode;
  }
  set scaleMode(v) {
    if (v === this._scaleMode) return;
    this._scaleMode = v;
    this._dirty = true;
  }
  get symlogLinThresh() {
    return this._symlogLinThresh;
  }
  set symlogLinThresh(v) {
    if (v === this._symlogLinThresh) return;
    this._symlogLinThresh = v;
    this._dirty = true;
  }
  get logBase() {
    return this._logBase;
  }
  set logBase(v) {
    if (v === this._logBase) return;
    this._logBase = v;
    this._dirty = true;
  }
  get tMin() {
    return this._tMin;
  }
  set tMin(v) {
    if (v === this._tMin) return;
    this._tMin = v;
    this._dirty = true;
  }
  get tMax() {
    return this._tMax;
  }
  set tMax(v) {
    if (v === this._tMax) return;
    this._tMax = v;
    this._dirty = true;
  }
  get invert() {
    return this._invert;
  }
  set invert(v) {
    if (v === this._invert) return;
    this._invert = v;
    this._dirty = true;
  }
  get gamma() {
    return this._gamma;
  }
  set gamma(v) {
    if (v === this._gamma) return;
    this._gamma = v;
    this._dirty = true;
  }
  get opacity() {
    return this._opacity;
  }
  set opacity(v) {
    if (v === this._opacity) return;
    this._opacity = v;
    this._dirty = true;
  }
  get shading() {
    return this._shading;
  }
  set shading(v) {
    if (v === this._shading) return;
    this._shading = v;
    this._dirty = true;
  }
  get colormap() {
    return this._colormap;
  }
  set colormap(v) {
    this._colormap = v;
    this.bindGroupKey = null;
  }
  getColormapKey() {
    const c = this._colormap;
    return c instanceof Colormap ? `cm:${c.id}` : `cm:${c}`;
  }
  getColormapForBinding() {
    const c = this._colormap;
    if (c instanceof Colormap) return c;
    return Colormap.builtin(c);
  }
  setData(data, opts = {}) {
    assert(data.length > 0, "DataMaterial: data must be non-empty.");
    this._CPUData = data;
    this._dataDirty = true;
    this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
    if (opts.componentCount !== void 0) this._componentCount = opts.componentCount;
    if (opts.stride === void 0 && opts.componentCount !== void 0) this._stride = this._componentCount;
    if (opts.stride !== void 0) this._stride = opts.stride;
    if (opts.offset !== void 0) this._offset = opts.offset;
    if (this._stride < this._componentCount) this._stride = this._componentCount;
    this._dirty = true;
    this.bindGroupKey = null;
  }
  setDataBuffer(buffer, opts = {}) {
    this._CPUData = null;
    this.dataBuffer = buffer;
    this._ownsDataBuffer = false;
    this._dataDirty = false;
    if (opts.componentCount !== void 0) this._componentCount = opts.componentCount;
    if (opts.stride === void 0 && opts.componentCount !== void 0) this._stride = this._componentCount;
    if (opts.stride !== void 0) this._stride = opts.stride;
    if (opts.offset !== void 0) this._offset = opts.offset;
    if (this._stride < this._componentCount) this._stride = this._componentCount;
    this._dirty = true;
    this.bindGroupKey = null;
  }
  dropCPUData() {
    this._CPUData = null;
  }
  computeDomainFromCPUData() {
    const data = this._CPUData;
    if (!data || data.length === 0) return;
    const cc = Math.max(1, Math.min(4, this._componentCount | 0));
    const stride = Math.max(cc, this._stride | 0);
    const offset = Math.max(0, this._offset | 0);
    const start = offset;
    if (start >= data.length) return;
    let minV = Number.POSITIVE_INFINITY;
    let maxV = Number.NEGATIVE_INFINITY;
    for (let i = start; i < data.length; i += stride) {
      let v = 0;
      if (this._valueMode === "magnitude" /* Magnitude */) {
        const x = data[i + 0] ?? 0;
        const y = cc > 1 ? data[i + 1] ?? 0 : 0;
        const z = cc > 2 ? data[i + 2] ?? 0 : 0;
        const w = cc > 3 ? data[i + 3] ?? 0 : 0;
        v = Math.hypot(x, y, z, w);
      } else {
        const cidx = Math.max(0, Math.min(3, this._componentIndex | 0));
        v = data[i + cidx] ?? 0;
      }
      if (!Number.isFinite(v)) continue;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    if (minV === Number.POSITIVE_INFINITY || maxV === Number.NEGATIVE_INFINITY) return;
    this._domainMin = minV;
    this._domainMax = maxV;
    this._dirty = true;
  }
  computeClipFromCPUData(lowPercentile, highPercentile) {
    const data = this._CPUData;
    if (!data || data.length === 0) return;
    const lp = Math.max(0, Math.min(100, lowPercentile));
    const hp = Math.max(0, Math.min(100, highPercentile));
    if (hp <= lp) return;
    const cc = Math.max(1, Math.min(4, this._componentCount | 0));
    const stride = Math.max(cc, this._stride | 0);
    const offset = Math.max(0, this._offset | 0);
    const start = offset;
    if (start >= data.length) return;
    const values = [];
    for (let i = start; i < data.length; i += stride) {
      let v = 0;
      if (this._valueMode === "magnitude" /* Magnitude */) {
        const x = data[i + 0] ?? 0;
        const y = cc > 1 ? data[i + 1] ?? 0 : 0;
        const z = cc > 2 ? data[i + 2] ?? 0 : 0;
        const w = cc > 3 ? data[i + 3] ?? 0 : 0;
        v = Math.hypot(x, y, z, w);
      } else {
        const cidx = Math.max(0, Math.min(3, this._componentIndex | 0));
        v = data[i + cidx] ?? 0;
      }
      if (!Number.isFinite(v)) continue;
      values.push(v);
    }
    if (values.length === 0) return;
    values.sort((a, b) => a - b);
    const idx = (p) => {
      const t = p / 100 * (values.length - 1);
      const i0 = Math.floor(t);
      const i1 = Math.min(values.length - 1, i0 + 1);
      const f = t - i0;
      return values[i0] * (1 - f) + values[i1] * f;
    };
    this._clipMin = idx(lp);
    this._clipMax = idx(hp);
    this._dirty = true;
  }
  upload(device, queue) {
    if (!this._dataDirty) return;
    if (this.dataBuffer && !this._CPUData) {
      this._dataDirty = false;
      return;
    }
    const data = this._CPUData;
    if (!data) {
      this._dataDirty = false;
      return;
    }
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    if (!this.dataBuffer || !this._ownsDataBuffer) {
      this.dataBuffer = createBuffer(device, data, usage);
      this._ownsDataBuffer = true;
    } else {
      try {
        queue.writeBuffer(this.dataBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
      } catch {
        this.dataBuffer.destroy();
        this.dataBuffer = createBuffer(device, data, usage);
      }
    }
    if (!this._keepCPUData) this._CPUData = null;
    this._dataDirty = false;
    this.bindGroupKey = null;
  }
  getUniformBufferSize() {
    return 80;
  }
  getUniformData() {
    const f = this.getUniformDataCache(20);
    f[0] = Math.max(1, Math.min(4, Math.floor(this._componentCount)));
    f[1] = Math.max(0, Math.min(3, Math.floor(this._componentIndex)));
    f[2] = this._valueMode === "magnitude" /* Magnitude */ ? 1 : 0;
    f[3] = Math.max(Math.max(1, Math.min(4, Math.floor(this._componentCount))), Math.floor(this._stride));
    f[4] = this._domainMin;
    f[5] = this._domainMax;
    f[6] = this._clipMin;
    f[7] = this._clipMax;
    f[8] = Math.max(0, Math.min(1, this._tMin));
    f[9] = Math.max(0, Math.min(1, this._tMax));
    f[10] = Math.max(1e-6, this._gamma);
    f[11] = this._invert ? 1 : 0;
    f[12] = this._scaleMode === "log" /* Log */ ? 1 : this._scaleMode === "symlog" /* Symlog */ ? 2 : 0;
    f[13] = Math.max(1e-6, this._symlogLinThresh);
    f[14] = Math.max(1.000001, this._logBase);
    f[15] = Math.max(0, Math.floor(this._offset));
    f[16] = Math.max(0, Math.min(1, this._opacity));
    f[17] = Math.max(0, Math.min(1, this._shading));
    f[18] = 0;
    f[19] = 0;
    return f;
  }
  createBindGroupLayout(device) {
    if (_DataMaterial._cachedBindGroupLayout && _DataMaterial._cachedLayoutDevice === device) return _DataMaterial._cachedBindGroupLayout;
    const layout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float", viewDimension: "1d" } }
      ]
    });
    _DataMaterial._cachedBindGroupLayout = layout;
    _DataMaterial._cachedLayoutDevice = device;
    return layout;
  }
  getShaderCode(_opts = {}) {
    return data_default;
  }
  destroy() {
    super.destroy();
    if (this._ownsDataBuffer) this.dataBuffer?.destroy();
    this.dataBuffer = null;
    this._CPUData = null;
    this._dataDirty = false;
  }
};
var CustomMaterial = class extends Material {
  _vertexShader;
  _fragmentShader;
  _uniforms;
  _uniformLayout = null;
  _cachedBindGroupLayout = null;
  _cachedLayoutDevice = null;
  constructor(descriptor) {
    super(descriptor);
    this._vertexShader = descriptor.vertexShader ?? this.defaultVertexShader();
    this._fragmentShader = descriptor.fragmentShader;
    this._uniforms = descriptor.uniforms ?? {};
  }
  setUniform(name, value) {
    if (this._uniforms[name]) {
      this._uniforms[name].value = value;
      this._dirty = true;
    }
  }
  getUniform(name) {
    return this._uniforms[name]?.value;
  }
  getUniformSize(type) {
    switch (type) {
      case "f32":
        return 4;
      case "vec2f":
        return 8;
      case "vec3f":
        return 12;
      case "vec4f":
        return 16;
      case "mat4x4f":
        return 64;
    }
  }
  getUniformAlignment(type) {
    switch (type) {
      case "f32":
        return 4;
      case "vec2f":
        return 8;
      case "vec3f":
        return 16;
      case "vec4f":
        return 16;
      case "mat4x4f":
        return 16;
    }
  }
  getUniformLayout() {
    if (this._uniformLayout) return this._uniformLayout;
    let offset = 0;
    const offsets = {};
    for (const [name, def] of Object.entries(this._uniforms)) {
      const align = this.getUniformAlignment(def.type);
      const size = this.getUniformSize(def.type);
      offset = this.alignTo(offset, align);
      offsets[name] = offset;
      offset += size;
    }
    const sizeBytes = Math.ceil(offset / 16) * 16 || 16;
    this._uniformLayout = { size: sizeBytes, offsets };
    return this._uniformLayout;
  }
  alignTo(n, alignment) {
    return n + alignment - 1 & ~(alignment - 1);
  }
  getUniformBufferSize() {
    return this.getUniformLayout().size;
  }
  getUniformData() {
    const layout = this.getUniformLayout();
    const data = this.getUniformDataCache(layout.size / 4);
    data.fill(0);
    for (const [name, def] of Object.entries(this._uniforms)) {
      const floatOffset = layout.offsets[name] >>> 2;
      if (typeof def.value === "number") data[floatOffset] = def.value;
      else data.set(def.value, floatOffset);
    }
    return data;
  }
  createBindGroupLayout(device) {
    if (this._cachedBindGroupLayout && this._cachedLayoutDevice === device) return this._cachedBindGroupLayout;
    const layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" }
        }
      ]
    });
    this._cachedBindGroupLayout = layout;
    this._cachedLayoutDevice = device;
    return layout;
  }
  defaultVertexShader() {
    return custom_default_vertex_default;
  }
  getShaderCode(opts = {}) {
    let uniformStruct = "struct CustomUniforms {\n";
    for (const [name, def] of Object.entries(this._uniforms)) uniformStruct += `    ${name}: ${def.type},
`;
    uniformStruct += "};\n\n@group(1) @binding(0) var<uniform> custom: CustomUniforms;\n\n";
    return this._vertexShader + "\n" + uniformStruct + this._fragmentShader;
  }
};

// src/world/pointcloud.ts
var UNIFORM_FLOAT_COUNT = 44;
var UNIFORM_BYTE_SIZE = UNIFORM_FLOAT_COUNT * 4;
function clamp012(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function clampMin(x, min) {
  return x < min ? min : x;
}
function normalizeStops2(stops) {
  if (!stops || stops.length === 0) {
    return [
      [0, 0, 0, 1],
      [1, 1, 1, 1]
    ];
  }
  const out = [];
  const n = Math.min(8, stops.length);
  for (let i = 0; i < n; i++) {
    const c = stops[i];
    out.push([c[0], c[1], c[2], c[3]]);
  }
  return out;
}
function colormapId(name) {
  switch (name) {
    case "grayscale":
      return 0;
    case "turbo":
      return 1;
    case "viridis":
      return 2;
    case "magma":
      return 3;
    case "plasma":
      return 4;
    case "inferno":
      return 5;
    case "custom":
      return 6;
  }
}
var PointCloud = class {
  transform = new Transform();
  name = null;
  visible = true;
  boundsCenter = [0, 0, 0];
  boundsRadius = 0;
  blendMode = "additive" /* Additive */;
  depthWrite = false;
  depthTest = true;
  _basePointSize = 2;
  _minPointSize = 1;
  _maxPointSize = 16;
  _sizeAttenuation = 1;
  _scalarMin = 0;
  _scalarMax = 1;
  _opacity = 1;
  _gamma = 1;
  _invert = false;
  _colormap = "viridis";
  _colormapStops = [[0.267, 487e-5, 0.32942, 1], [0.99325, 0.90616, 0.14394, 1]];
  _softness = 0.15;
  _CPUData = null;
  _keepCPUData = false;
  pointsBuffer = null;
  uniformBuffer = null;
  bindGroup = null;
  bindGroupKey = null;
  _pointCount = 0;
  _uniformDirty = true;
  _pointsDirty = true;
  constructor(desc = {}) {
    if (desc.name !== void 0) this.name = desc.name;
    if (desc.visible !== void 0) this.visible = !!desc.visible;
    if (desc.boundsCenter) this.boundsCenter = [desc.boundsCenter[0], desc.boundsCenter[1], desc.boundsCenter[2]];
    if (desc.boundsRadius !== void 0) this.boundsRadius = desc.boundsRadius;
    if (desc.blendMode !== void 0) this.blendMode = desc.blendMode;
    if (desc.depthWrite !== void 0) this.depthWrite = !!desc.depthWrite;
    if (desc.depthTest !== void 0) this.depthTest = !!desc.depthTest;
    if (desc.basePointSize !== void 0) this._basePointSize = desc.basePointSize;
    if (desc.minPointSize !== void 0) this._minPointSize = desc.minPointSize;
    if (desc.maxPointSize !== void 0) this._maxPointSize = desc.maxPointSize;
    if (desc.sizeAttenuation !== void 0) this._sizeAttenuation = desc.sizeAttenuation;
    if (desc.scalarMin !== void 0) this._scalarMin = desc.scalarMin;
    if (desc.scalarMax !== void 0) this._scalarMax = desc.scalarMax;
    if (desc.opacity !== void 0) this._opacity = desc.opacity;
    if (desc.gamma !== void 0) this._gamma = desc.gamma;
    if (desc.invert !== void 0) this._invert = !!desc.invert;
    if (desc.colormap !== void 0) this._colormap = desc.colormap;
    if (desc.colormapStops !== void 0) this._colormapStops = normalizeStops2(desc.colormapStops);
    if (desc.softness !== void 0) this._softness = desc.softness;
    if (desc.keepCPUData !== void 0) this._keepCPUData = !!desc.keepCPUData;
    if (desc.data) {
      this.setData(desc.data, { keepCPUData: this._keepCPUData });
    } else if (desc.pointsBuffer) {
      const buf = desc.pointsBuffer.buffer ? desc.pointsBuffer.buffer : desc.pointsBuffer;
      const count = desc.pointCount ?? 0;
      assert(count > 0, "PointCloud: pointCount is required when using pointsBuffer.");
      this.setPointsBuffer(buf, count);
    } else if (desc.pointCount !== void 0) {
      this._pointCount = desc.pointCount;
      this._pointsDirty = false;
    }
  }
  get pointCount() {
    return this._pointCount;
  }
  get basePointSize() {
    return this._basePointSize;
  }
  set basePointSize(v) {
    if (v === this._basePointSize) return;
    this._basePointSize = v;
    this._uniformDirty = true;
  }
  get minPointSize() {
    return this._minPointSize;
  }
  set minPointSize(v) {
    if (v === this._minPointSize) return;
    this._minPointSize = v;
    this._uniformDirty = true;
  }
  get maxPointSize() {
    return this._maxPointSize;
  }
  set maxPointSize(v) {
    if (v === this._maxPointSize) return;
    this._maxPointSize = v;
    this._uniformDirty = true;
  }
  get sizeAttenuation() {
    return this._sizeAttenuation;
  }
  set sizeAttenuation(v) {
    if (v === this._sizeAttenuation) return;
    this._sizeAttenuation = v;
    this._uniformDirty = true;
  }
  get scalarMin() {
    return this._scalarMin;
  }
  set scalarMin(v) {
    if (v === this._scalarMin) return;
    this._scalarMin = v;
    this._uniformDirty = true;
  }
  get scalarMax() {
    return this._scalarMax;
  }
  set scalarMax(v) {
    if (v === this._scalarMax) return;
    this._scalarMax = v;
    this._uniformDirty = true;
  }
  get opacity() {
    return this._opacity;
  }
  set opacity(v) {
    if (v === this._opacity) return;
    this._opacity = v;
    this._uniformDirty = true;
  }
  get gamma() {
    return this._gamma;
  }
  set gamma(v) {
    if (v === this._gamma) return;
    this._gamma = v;
    this._uniformDirty = true;
  }
  get invert() {
    return this._invert;
  }
  set invert(v) {
    if (v === this._invert) return;
    this._invert = v;
    this._uniformDirty = true;
  }
  get colormap() {
    return this._colormap;
  }
  set colormap(v) {
    this._colormap = v;
    this._uniformDirty = true;
    this.bindGroupKey = null;
  }
  get colormapStops() {
    return this._colormapStops;
  }
  set colormapStops(stops) {
    this._colormapStops = normalizeStops2(stops);
    this._uniformDirty = true;
  }
  getColormapKey() {
    const c = this._colormap;
    return c instanceof Colormap ? `cm:${c.id}` : `cm:${c}`;
  }
  getColormapForBinding() {
    const c = this._colormap;
    if (c instanceof Colormap) return c;
    if (c === "custom") return Colormap.builtin("grayscale");
    return Colormap.builtin(c);
  }
  get softness() {
    return this._softness;
  }
  set softness(v) {
    if (v === this._softness) return;
    this._softness = v;
    this._uniformDirty = true;
  }
  setData(data, opts = {}) {
    assert(data.length % 4 === 0, "PointCloud: data length must be a multiple of 4 (x,y,z,scalar per point).");
    this._CPUData = data;
    this._pointCount = data.length / 4;
    this._pointsDirty = true;
    this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
  }
  setPointsBuffer(buffer, pointCount) {
    assert(pointCount > 0, "PointCloud: pointCount must be > 0.");
    this._CPUData = null;
    this._pointCount = pointCount;
    this.pointsBuffer = buffer;
    this._pointsDirty = false;
    this.bindGroupKey = null;
  }
  dropCPUData() {
    this._CPUData = null;
  }
  computeBoundsFromCPUData() {
    const data = this._CPUData;
    if (!data || data.length < 4) return;
    let minX = data[0], maxX = data[0];
    let minY = data[1], maxY = data[1];
    let minZ = data[2], maxZ = data[2];
    for (let i = 0; i < data.length; i += 4) {
      const x = data[i + 0];
      const y = data[i + 1];
      const z = data[i + 2];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    const cx = 0.5 * (minX + maxX);
    const cy = 0.5 * (minY + maxY);
    const cz = 0.5 * (minZ + maxZ);
    let r2 = 0;
    for (let i = 0; i < data.length; i += 4) {
      const dx = data[i + 0] - cx;
      const dy = data[i + 1] - cy;
      const dz = data[i + 2] - cz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > r2) r2 = d2;
    }
    this.boundsCenter = [cx, cy, cz];
    this.boundsRadius = Math.sqrt(r2);
  }
  computeScalarRangeFromCPUData() {
    const data = this._CPUData;
    if (!data || data.length < 4) return;
    let minS = data[3];
    let maxS = data[3];
    for (let i = 0; i < data.length; i += 4) {
      const s = data[i + 3];
      if (s < minS) minS = s;
      if (s > maxS) maxS = s;
    }
    this._scalarMin = minS;
    this._scalarMax = maxS;
    this._uniformDirty = true;
  }
  upload(device, queue) {
    if (!this._pointsDirty) return;
    if (this.pointsBuffer && !this._CPUData) {
      this._pointsDirty = false;
      return;
    }
    const data = this._CPUData;
    if (!data) {
      this._pointsDirty = false;
      return;
    }
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    if (!this.pointsBuffer) {
      this.pointsBuffer = createBuffer(device, data, usage);
    } else {
      try {
        queue.writeBuffer(this.pointsBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
      } catch {
        this.pointsBuffer.destroy();
        this.pointsBuffer = createBuffer(device, data, usage);
      }
    }
    if (!this._keepCPUData) this._CPUData = null;
    this._pointsDirty = false;
    this.bindGroupKey = null;
  }
  getUniformBufferSize() {
    return UNIFORM_BYTE_SIZE;
  }
  getUniformData() {
    const out = new Float32Array(UNIFORM_FLOAT_COUNT);
    const base = Math.max(0, this._basePointSize);
    const minSize = Math.max(0, this._minPointSize);
    const maxSize = Math.max(minSize, this._maxPointSize);
    const atten = Math.max(0, this._sizeAttenuation);
    out[0] = base;
    out[1] = minSize;
    out[2] = maxSize;
    out[3] = atten;
    out[4] = this._scalarMin;
    out[5] = this._scalarMax;
    out[6] = clamp012(this._opacity);
    out[7] = clampMin(this._gamma, 1e-6);
    out[8] = this._invert ? 1 : 0;
    out[9] = this._colormap instanceof Colormap ? 0 : colormapId(this._colormap);
    out[10] = typeof this._colormap === "string" && this._colormap === "custom" ? Math.min(8, Math.max(2, this._colormapStops.length)) : 0;
    out[11] = clamp012(this._softness);
    const stops = this._colormapStops;
    const nStops = Math.min(8, Math.max(2, stops.length));
    for (let i = 0; i < 8; i++) {
      const src = stops[Math.min(i, nStops - 1)];
      const o = 12 + i * 4;
      out[o + 0] = src[0];
      out[o + 1] = src[1];
      out[o + 2] = src[2];
      out[o + 3] = src[3];
    }
    return out;
  }
  get dirtyUniforms() {
    return this._uniformDirty;
  }
  markUniformsClean() {
    this._uniformDirty = false;
  }
  destroy() {
    this.pointsBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.pointsBuffer = null;
    this.uniformBuffer = null;
    this.bindGroup = null;
    this.bindGroupKey = null;
    this._CPUData = null;
    this._pointCount = 0;
  }
};

// src/world/scene.ts
var Scene = class _Scene {
  _meshes = [];
  _pointClouds = [];
  _glyphFields = [];
  _lights = [];
  _background;
  static MAX_LIGHTS = 8;
  constructor(descriptor = {}) {
    this._background = descriptor.background ?? [0, 0, 0];
  }
  get background() {
    return this._background;
  }
  set background(value) {
    this._background = value;
  }
  get meshes() {
    return this._meshes;
  }
  get pointClouds() {
    return this._pointClouds;
  }
  get glyphFields() {
    return this._glyphFields;
  }
  add(obj) {
    if (obj instanceof Mesh) {
      if (!this._meshes.includes(obj)) this._meshes.push(obj);
    } else if (obj instanceof PointCloud) {
      if (!this._pointClouds.includes(obj)) this._pointClouds.push(obj);
    } else {
      if (!this._glyphFields.includes(obj)) this._glyphFields.push(obj);
    }
    return this;
  }
  remove(obj) {
    if (obj instanceof Mesh) {
      const idx = this._meshes.indexOf(obj);
      if (idx !== -1) this._meshes.splice(idx, 1);
    } else if (obj instanceof PointCloud) {
      const idx = this._pointClouds.indexOf(obj);
      if (idx !== -1) this._pointClouds.splice(idx, 1);
    } else {
      const idx = this._glyphFields.indexOf(obj);
      if (idx !== -1) this._glyphFields.splice(idx, 1);
    }
    return this;
  }
  clear() {
    this._meshes = [];
    this._pointClouds = [];
    this._glyphFields = [];
    return this;
  }
  clearPointClouds() {
    this._pointClouds = [];
    return this;
  }
  clearGlyphFields() {
    this._glyphFields = [];
    return this;
  }
  get lights() {
    return this._lights;
  }
  addLight(light) {
    if (!this._lights.includes(light)) {
      if (this._lights.length >= _Scene.MAX_LIGHTS && light.type !== "ambient") console.warn(`Scene: Maximum of ${_Scene.MAX_LIGHTS} non-ambient lights supported.`);
      this._lights.push(light);
    }
    return this;
  }
  removeLight(light) {
    const idx = this._lights.indexOf(light);
    if (idx !== -1) this._lights.splice(idx, 1);
    return this;
  }
  clearLights() {
    this._lights = [];
    return this;
  }
  findByName(name) {
    return this._meshes.find((m) => m.name === name);
  }
  findAllByName(name) {
    return this._meshes.filter((m) => m.name === name);
  }
  findPointCloudByName(name) {
    return this._pointClouds.find((p) => p.name === name);
  }
  findAllPointCloudsByName(name) {
    return this._pointClouds.filter((p) => p.name === name);
  }
  findGlyphFieldByName(name) {
    return this._glyphFields.find((g) => g.name === name);
  }
  findAllGlyphFieldsByName(name) {
    return this._glyphFields.filter((g) => g.name === name);
  }
  get visibleMeshes() {
    return this._meshes.filter((m) => m.visible);
  }
  get visiblePointClouds() {
    return this._pointClouds.filter((p) => p.visible);
  }
  get visibleGlyphFields() {
    return this._glyphFields.filter((g) => g.visible);
  }
  get enabledLights() {
    return this._lights.filter((l) => l.enabled);
  }
  getAmbientColor() {
    const ambient = this._lights.find((l) => l.type === "ambient" && l.enabled);
    if (ambient) {
      return [
        ambient.color[0] * ambient.intensity,
        ambient.color[1] * ambient.intensity,
        ambient.color[2] * ambient.intensity
      ];
    }
    return [0, 0, 0];
  }
  getLightingData() {
    const ambient = this.getAmbientColor();
    const lights = this.enabledLights.filter((l) => l.type !== "ambient").slice(0, _Scene.MAX_LIGHTS);
    return { ambient, lights };
  }
  traverse(callback) {
    for (const mesh of this._meshes) callback(mesh);
  }
  traverseVisible(callback) {
    for (const mesh of this._meshes) if (mesh.visible) callback(mesh);
  }
  traversePointClouds(callback) {
    for (const pc of this._pointClouds) callback(pc);
  }
  traverseVisiblePointClouds(callback) {
    for (const pc of this._pointClouds) if (pc.visible) callback(pc);
  }
  traverseGlyphFields(callback) {
    for (const g of this._glyphFields) callback(g);
  }
  traverseVisibleGlyphFields(callback) {
    for (const g of this._glyphFields) if (g.visible) callback(g);
  }
  destroy() {
    for (const mesh of this._meshes) mesh.destroy();
    for (const pc of this._pointClouds) pc.destroy();
    for (const g of this._glyphFields) g.destroy();
    this._meshes = [];
    this._pointClouds = [];
    this._glyphFields = [];
    this._lights = [];
  }
};

// src/world/light.ts
var Light = class {
  type;
  _color = [1, 1, 1];
  _intensity = 1;
  _enabled = true;
  constructor(type) {
    this.type = type;
  }
  get color() {
    return this._color;
  }
  set color(value) {
    this._color = value;
  }
  get intensity() {
    return this._intensity;
  }
  set intensity(value) {
    this._intensity = value;
  }
  get enabled() {
    return this._enabled;
  }
  set enabled(value) {
    this._enabled = value;
  }
};
var AmbientLight = class extends Light {
  constructor(descriptor = {}) {
    super("ambient");
    this._color = descriptor.color ?? [1, 1, 1];
    this._intensity = descriptor.intensity ?? 0.1;
  }
};
var DirectionalLight = class extends Light {
  _direction;
  constructor(descriptor = {}) {
    super("directional");
    this._direction = descriptor.direction ?? [0, -1, 0];
    this._color = descriptor.color ?? [1, 1, 1];
    this._intensity = descriptor.intensity ?? 1;
  }
  get direction() {
    return this._direction;
  }
  set direction(value) {
    const len = Math.sqrt(value[0] ** 2 + value[1] ** 2 + value[2] ** 2);
    if (len > 0) {
      this._direction = [value[0] / len, value[1] / len, value[2] / len];
    }
  }
};
var PointLight = class extends Light {
  _position;
  _range;
  constructor(descriptor = {}) {
    super("point");
    this._position = descriptor.position ?? [0, 0, 0];
    this._color = descriptor.color ?? [1, 1, 1];
    this._intensity = descriptor.intensity ?? 1;
    this._range = descriptor.range ?? 10;
  }
  get position() {
    return this._position;
  }
  set position(value) {
    this._position = value;
  }
  get range() {
    return this._range;
  }
  set range(value) {
    this._range = value;
  }
};

// src/wgsl/core/smaa.wgsl
var smaa_default = "struct Params { rtMetrics: vec4f, threshold: f32, _pad0: f32, _pad1: f32, _pad2: f32 }; @group(0) @binding(0) var<uniform> params: Params; @group(0) @binding(1) var sampLinear: sampler; @group(0) @binding(2) var sampPoint: sampler; @group(0) @binding(3) var sceneTex: texture_2d<f32>; @group(0) @binding(4) var edgesTex: texture_2d<f32>; @group(0) @binding(5) var blendTex: texture_2d<f32>; struct VsOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f }; @vertex fn vs_fullscreen(@builtin(vertex_index) vi: u32) -> VsOut { var positions = array<vec2f, 3>( vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0) ); var uvs = array<vec2f, 3>( vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0) ); var out: VsOut; out.pos = vec4f(positions[vi], 0.0, 1.0); out.uv = uvs[vi]; return out; } fn luma(rgb: vec3f) -> f32 { return dot(rgb, vec3f(0.2126, 0.7152, 0.0722)); } @fragment fn fs_smaa_edges(in: VsOut) -> @location(0) vec4f { let t = params.rtMetrics.xy; let c = textureSampleLevel(sceneTex, sampPoint, in.uv, 0.0).rgb; let l = luma(c); let lLeft = luma(textureSampleLevel(sceneTex, sampPoint, in.uv + vec2f(-t.x, 0.0), 0.0).rgb); let lTop = luma(textureSampleLevel(sceneTex, sampPoint, in.uv + vec2f(0.0, -t.y), 0.0).rgb); let dLeft = abs(l - lLeft); let dTop = abs(l - lTop); let eV = select(0.0, 1.0, dLeft >= params.threshold); let eH = select(0.0, 1.0, dTop >= params.threshold); return vec4f(eV, eH, 0.0, 0.0); } fn edgeV(uv: vec2f) -> bool { return textureSampleLevel(edgesTex, sampPoint, uv, 0.0).r > 0.5; } fn edgeH(uv: vec2f) -> bool { return textureSampleLevel(edgesTex, sampPoint, uv, 0.0).g > 0.5; } @fragment fn fs_smaa_weights(in: VsOut) -> @location(0) vec4f { let t = params.rtMetrics.xy; let e = textureSampleLevel(edgesTex, sampPoint, in.uv, 0.0); var wLeft: f32 = 0.0; var wTop: f32 = 0.0; if (e.r > 0.5) { var up: i32 = 0; var down: i32 = 0; for (var s: i32 = 1; s <= 8; s = s + 1) { if (!edgeV(in.uv + vec2f(0.0, -t.y * f32(s)))) { break; } up = up + 1; } for (var s: i32 = 1; s <= 8; s = s + 1) { if (!edgeV(in.uv + vec2f(0.0, t.y * f32(s)))) { break; } down = down + 1; } let len = f32(up + down + 1); wLeft = clamp(len / 17.0, 0.0, 1.0) * 0.5; } if (e.g > 0.5) { var left: i32 = 0; var right: i32 = 0; for (var s: i32 = 1; s <= 8; s = s + 1) { if (!edgeH(in.uv + vec2f(-t.x * f32(s), 0.0))) { break; } left = left + 1; } for (var s: i32 = 1; s <= 8; s = s + 1) { if (!edgeH(in.uv + vec2f(t.x * f32(s), 0.0))) { break; } right = right + 1; } let len = f32(left + right + 1); wTop = clamp(len / 17.0, 0.0, 1.0) * 0.5; } return vec4f(wLeft, wTop, 0.0, 0.0); } @fragment fn fs_smaa_neighborhood(in: VsOut) -> @location(0) vec4f { let t = params.rtMetrics.xy; let c = textureSampleLevel(sceneTex, sampLinear, in.uv, 0.0); let w = textureSampleLevel(blendTex, sampPoint, in.uv, 0.0); let wL = w.r; let wT = w.g; let wR = textureSampleLevel(blendTex, sampPoint, in.uv + vec2f(t.x, 0.0), 0.0).r; let wB = textureSampleLevel(blendTex, sampPoint, in.uv + vec2f(0.0, t.y), 0.0).g; var bestW: f32 = 0.0; var dir: i32 = -1; if (wL > bestW) { bestW = wL; dir = 0; } if (wR > bestW) { bestW = wR; dir = 1; } if (wT > bestW) { bestW = wT; dir = 2; } if (wB > bestW) { bestW = wB; dir = 3; } if (bestW <= 0.0) { return c; } var n: vec4f = c; if (dir == 0) { n = textureSampleLevel(sceneTex, sampLinear, in.uv + vec2f(-t.x, 0.0), 0.0); } else if (dir == 1) { n = textureSampleLevel(sceneTex, sampLinear, in.uv + vec2f(t.x, 0.0), 0.0); } else if (dir == 2) { n = textureSampleLevel(sceneTex, sampLinear, in.uv + vec2f(0.0, -t.y), 0.0); } else { n = textureSampleLevel(sceneTex, sampLinear, in.uv + vec2f(0.0, t.y), 0.0); } return mix(c, n, bestW); }";

// src/wgsl/world/pointcloud.wgsl
var pointcloud_default = "struct PointData { position: vec3<f32>, scalar: f32 }; @group(1) @binding(0) var<storage, read> points: array<PointData>; struct PointCloudUniforms { sizeParams: vec4<f32>, scalarParams: vec4<f32>, options: vec4<f32>, colors: array<vec4<f32>, 8> }; @group(1) @binding(1) var<uniform> pc: PointCloudUniforms; @group(1) @binding(2) var colormapSampler: sampler; @group(1) @binding(3) var colormapTex: texture_1d<f32>; struct VertexOutput { @builtin(position) position: vec4<f32>, @location(0) t: f32, @location(1) pointCoord: vec2<f32> }; struct CameraUniforms { viewProj: mat4x4<f32>, position: vec3<f32>, _pad0: f32 }; struct ModelUniforms { model: mat4x4<f32>, normal: mat4x4<f32> }; @group(0) @binding(0) var<uniform> camera: CameraUniforms; @group(0) @binding(1) var<uniform> model: ModelUniforms; fn srgbFromLinear(linear: vec3<f32>) -> vec3<f32> { let a = 0.055; let lo = 12.92 * linear; let hi = (1.0 + a) * pow(linear, vec3<f32>(1.0 / 2.4)) - vec3<f32>(a); let useHi = linear > vec3<f32>(0.0031308); return select(lo, hi, useHi); } fn saturate(x: f32) -> f32 { return clamp(x, 0.0, 1.0); } fn sampleCustomStops(t: f32) -> vec4<f32> { let count = u32(pc.options.z + 0.5); if (count <= 1u) { return pc.colors[0u]; } let n = min(count, 8u); let x = saturate(t) * f32(n - 1u); let i = u32(floor(x)); let f = x - f32(i); if (i >= n - 1u) { return pc.colors[n - 1u]; } return pc.colors[i] + f * (pc.colors[i + 1u] - pc.colors[i]); } fn colormap(tIn: f32) -> vec4<f32> { let t = saturate(tIn); let stopCount = u32(pc.options.z + 0.5); if (stopCount >= 2u) { return sampleCustomStops(t); } return textureSample(colormapTex, colormapSampler, t); } @vertex fn vs_main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput { let p = points[instanceIndex]; let worldPos = model.model * vec4<f32>(p.position, 1.0); let clip = camera.viewProj * worldPos; let dist = distance(camera.position, worldPos.xyz); let baseSize = pc.sizeParams.x; let minSize = pc.sizeParams.y; let maxSize = pc.sizeParams.z; let atten = pc.sizeParams.w; var sizePx = baseSize; if (atten > 0.0) { sizePx = baseSize * (atten / max(dist, 1e-6)); } sizePx = clamp(sizePx, minSize, maxSize); var uv = vec2<f32>(0.0); if (vertexIndex == 0u) { uv = vec2<f32>(0.0, 0.0); } else if (vertexIndex == 1u) { uv = vec2<f32>(1.0, 0.0); } else if (vertexIndex == 2u) { uv = vec2<f32>(0.0, 1.0); } else if (vertexIndex == 3u) { uv = vec2<f32>(1.0, 0.0); } else if (vertexIndex == 4u) { uv = vec2<f32>(1.0, 1.0); } else if (vertexIndex == 5u) { uv = vec2<f32>(0.0, 1.0); } let row0 = vec3<f32>(camera.viewProj[0][0], camera.viewProj[1][0], camera.viewProj[2][0]); let row1 = vec3<f32>(camera.viewProj[0][1], camera.viewProj[1][1], camera.viewProj[2][1]); let aspect = length(row1) / max(length(row0), 1e-6); let ndcSize = (sizePx * 2.0) / max(camera._pad0, 1.0); let offsetX = (uv.x - 0.5) * ndcSize / aspect * clip.w; let offsetY = -(uv.y - 0.5) * ndcSize * clip.w; var out: VertexOutput; out.position = clip + vec4<f32>(offsetX, offsetY, 0.0, 0.0); out.pointCoord = uv; let denom = max(pc.scalarParams.y - pc.scalarParams.x, 1e-6); var t = (p.scalar - pc.scalarParams.x) / denom; if (pc.options.x > 0.5) { t = 1.0 - t; } out.t = pow(saturate(t), pc.scalarParams.w); return out; } @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { let uv = in.pointCoord * 2.0 - vec2<f32>(1.0, 1.0); let r2 = dot(uv, uv); if (r2 > 1.0) { discard; } let softness = pc.options.w; var alpha = 1.0; if (softness > 0.0) { let r = sqrt(r2); alpha = 1.0 - smoothstep(1.0 - softness, 1.0, r); } var c = colormap(in.t); c.a = c.a * pc.scalarParams.z * alpha; c = vec4<f32>(srgbFromLinear(c.rgb), c.a); return c; }";

// src/wgsl/world/glyphfield.wgsl
var glyphfield_default = "@group(1) @binding(0) var<storage, read> positions: array<vec4<f32>>; @group(1) @binding(1) var<storage, read> rotations: array<vec4<f32>>; @group(1) @binding(2) var<storage, read> scales: array<vec4<f32>>; @group(1) @binding(3) var<storage, read> attributes: array<vec4<f32>>; struct GlyphUniforms { scalarParams: vec4<f32>, options: vec4<f32>, lightingParams: vec4<f32>, colors: array<vec4<f32>, 8> }; @group(1) @binding(4) var<uniform> glyph: GlyphUniforms; @group(1) @binding(5) var colormapSampler: sampler; @group(1) @binding(6) var colormapTex: texture_1d<f32>; struct VertexInput { @location(0) position: vec3<f32>, @location(1) normal: vec3<f32> }; struct VertexOutput { @builtin(position) position: vec4<f32>, @location(0) worldPos: vec3<f32>, @location(1) normal: vec3<f32>, @location(2) @interpolate(flat) attrib: vec4<f32> }; struct CameraUniforms { viewProj: mat4x4<f32>, position: vec3<f32>, _pad0: f32 }; struct ModelUniforms { model: mat4x4<f32>, normal: mat4x4<f32> }; struct Light { position: vec4<f32>, color: vec4<f32>, params: vec4<f32> }; struct LightingUniforms { ambient: vec4<f32>, lightCount: u32, _pad0: u32, _pad1: u32, _pad2: u32, lights: array<Light, 8> }; @group(0) @binding(0) var<uniform> camera: CameraUniforms; @group(0) @binding(1) var<uniform> model: ModelUniforms; @group(0) @binding(2) var<uniform> lighting: LightingUniforms; fn srgbFromLinear(linear: vec3<f32>) -> vec3<f32> { let a = 0.055; let lo = 12.92 * linear; let hi = (1.0 + a) * pow(linear, vec3<f32>(1.0 / 2.4)) - vec3<f32>(a); let useHi = linear > vec3<f32>(0.0031308); return select(lo, hi, useHi); } fn saturate(x: f32) -> f32 { return clamp(x, 0.0, 1.0); } fn rotateByQuat(v: vec3<f32>, q: vec4<f32>) -> vec3<f32> { let u = q.xyz; let s = q.w; let t = 2.0 * cross(u, v); return v + s * t + cross(u, t); } fn sampleCustomStops(t: f32) -> vec4<f32> { let count = u32(glyph.options.z + 0.5); if (count <= 1u) { return glyph.colors[0u]; } let n = min(count, 8u); let x = saturate(t) * f32(n - 1u); let i = u32(floor(x)); let f = x - f32(i); if (i >= n - 1u) { return glyph.colors[n - 1u]; } return glyph.colors[i] + f * (glyph.colors[i + 1u] - glyph.colors[i]); } fn colormap(tIn: f32) -> vec4<f32> { let t = saturate(tIn); let stopCount = u32(glyph.options.z + 0.5); if (stopCount >= 2u) { return sampleCustomStops(t); } return textureSample(colormapTex, colormapSampler, t); } fn applyLighting(worldPos: vec3<f32>, N: vec3<f32>, baseColor: vec3<f32>) -> vec3<f32> { var Lo = lighting.ambient.rgb * baseColor; let lightCount = min(lighting.lightCount, 8u); for (var i = 0u; i < lightCount; i++) { let light = lighting.lights[i]; var L: vec3<f32>; var attenuation: f32 = 1.0; if (light.position.w == 0.0) { L = normalize(-light.position.xyz); } else { let lightDir = light.position.xyz - worldPos; let distance = length(lightDir); L = select(vec3<f32>(0.0, 1.0, 0.0), lightDir / distance, distance > 1e-6); attenuation = 1.0 / max(distance * distance, 1e-6); let range = light.params.x; if (range > 0.0) { let f = saturate(1.0 - distance / range); attenuation *= f * f; } } let NdotL = max(dot(N, L), 0.0); let radiance = light.color.rgb * light.color.a * attenuation; Lo += baseColor * radiance * NdotL; } return Lo; } @vertex fn vs_main(in: VertexInput, @builtin(instance_index) instanceIndex: u32) -> VertexOutput { let p4 = positions[instanceIndex]; let q = rotations[instanceIndex]; let s4 = scales[instanceIndex]; let a4 = attributes[instanceIndex]; let scl = s4.xyz; let localPos = rotateByQuat(in.position * scl, q) + p4.xyz; let worldPos4 = model.model * vec4<f32>(localPos, 1.0); let worldPos = worldPos4.xyz; let invScale = 1.0 / max(abs(scl), vec3<f32>(1e-6)); let localN = in.normal * invScale; let instN = rotateByQuat(localN, q); let worldN = normalize((model.normal * vec4<f32>(instN, 0.0)).xyz); var out: VertexOutput; out.position = camera.viewProj * vec4<f32>(worldPos, 1.0); out.worldPos = worldPos; out.normal = worldN; out.attrib = a4; return out; } @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { let scalarMin = glyph.scalarParams.x; let scalarMax = glyph.scalarParams.y; let opacity = saturate(glyph.scalarParams.z); let gamma = max(glyph.scalarParams.w, 1e-6); let invert = glyph.options.x > 0.5; let colorMode = u32(round(glyph.options.w)); let lit = glyph.lightingParams.x > 0.5; var baseColor: vec3<f32>; var alpha: f32 = 1.0; if (colorMode == 0u) { baseColor = in.attrib.rgb; alpha = in.attrib.a; } else if (colorMode == 1u) { let denom = max(scalarMax - scalarMin, 1e-6); var t = saturate((in.attrib.x - scalarMin) / denom); if (invert) { t = 1.0 - t; } t = pow(t, gamma); let cmap = colormap(t); baseColor = cmap.rgb; alpha = cmap.a; } else { baseColor = glyph.lightingParams.yzw; alpha = glyph.options.y; } baseColor = max(baseColor, vec3<f32>(0.0)); alpha = saturate(alpha) * opacity; var shaded = baseColor; if (lit) { shaded = applyLighting(in.worldPos, normalize(in.normal), baseColor); } return vec4<f32>(srgbFromLinear(shaded), alpha); }";

// src/core/renderer.ts
var Renderer = class _Renderer {
  canvas;
  context;
  device;
  queue;
  format;
  depthTexture;
  depthView;
  width = 0;
  height = 0;
  smaaEnabled = false;
  smaaSceneColorTexture = null;
  smaaSceneColorView = null;
  smaaEdgesTexture = null;
  smaaEdgesView = null;
  smaaBlendTexture = null;
  smaaBlendView = null;
  smaaParamsBuffer = null;
  smaaSamplerPoint = null;
  smaaSamplerLinear = null;
  smaaShaderModule = null;
  smaaEdgePipeline = null;
  smaaWeightPipeline = null;
  smaaNeighborhoodPipeline = null;
  smaaEdgeBindGroupLayout = null;
  smaaWeightBindGroupLayout = null;
  smaaNeighborhoodBindGroupLayout = null;
  smaaEdgeBindGroup = null;
  smaaWeightBindGroup = null;
  smaaNeighborhoodBindGroup = null;
  globalBindGroupLayout;
  globalBindGroups = [];
  skinBindGroupLayout;
  cameraUniformBuffer;
  modelUniformBuffers = [];
  modelBufferIndex = 0;
  MODEL_BUFFER_POOL_SIZE = 64;
  lightingUniformBuffer;
  instanceBuffer = null;
  instanceBufferCapacityBytes = 0;
  instanceBufferOffset = 0;
  INSTANCE_STRIDE_BYTES = 128;
  pipelineCache = /* @__PURE__ */ new Map();
  shaderCache = /* @__PURE__ */ new Map();
  drawItemPool = [];
  drawItemPoolUsed = 0;
  opaqueDrawList = [];
  transparentDrawList = [];
  pointCloudBindGroupLayout = null;
  pointCloudDrawItemPool = [];
  pointCloudDrawItemPoolUsed = 0;
  opaquePointCloudDrawList = [];
  transparentPointCloudDrawList = [];
  glyphFieldBindGroupLayout = null;
  glyphFieldDummyAttributesBuffer = null;
  glyphFieldDrawItemPool = [];
  glyphFieldDrawItemPoolUsed = 0;
  opaqueGlyphFieldDrawList = [];
  transparentGlyphFieldDrawList = [];
  cullGlyphFieldScratch = [];
  transparentMergedDrawList = [];
  cullPointCloudScratch = [];
  objectIds = /* @__PURE__ */ new WeakMap();
  nextObjectId = 1;
  cameraUniformStagingPtr;
  lightingUniformStagingPtr;
  modelUniformStagingPtr;
  cameraUniformStagingView;
  lightingUniformStagingView;
  lightingCountView;
  modelUniformStagingView;
  _wasmBuffer = null;
  frustumCullingEnabled = true;
  frustumCullingStatsEnabled = false;
  cullingStats = { tested: 0, visible: 0 };
  cullCentersPtr = 0;
  cullRadiiPtr = 0;
  cullCapacity = 0;
  cullMeshScratch = [];
  fallbackSampler;
  fallbackWhiteTexture;
  fallbackWhiteViewLinear;
  fallbackWhiteViewSrgb;
  fallbackNormalTexture;
  fallbackNormalViewLinear;
  fallbackMRTex;
  fallbackMRViewLinear;
  fallbackOcclusionTex;
  fallbackOcclusionViewLinear;
  gpuTimingSupported = false;
  gpuTimingEnabled = false;
  gpuQuerySet = null;
  gpuResolveBuffer = null;
  gpuResultBuffer = null;
  gpuResultPending = false;
  _gpuTimeNs = null;
  dataMaterialDummyDataBuffer = null;
  constructor(canvas) {
    this.canvas = canvas;
  }
  static async create(canvas, descriptor = {}) {
    const renderer = new _Renderer(canvas);
    await renderer.init(descriptor);
    return renderer;
  }
  async init(descriptor) {
    if (!navigator.gpu) throw new Error("WebGPU is not supported in this browser.");
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: descriptor.powerPreference ?? "high-performance" });
    if (!adapter) throw new Error("Failed to get GPU adapter.");
    const requiredFeatures = [];
    if (adapter.features.has("timestamp-query")) requiredFeatures.push("timestamp-query");
    const deviceDesc = {};
    if (requiredFeatures.length > 0) deviceDesc.requiredFeatures = requiredFeatures;
    this.device = await adapter.requestDevice(deviceDesc);
    this.gpuTimingSupported = this.device.features.has("timestamp-query");
    this.queue = this.device.queue;
    this.context = this.canvas.getContext("webgpu");
    if (!this.context) throw new Error("Failed to get WebGPU canvas context.");
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.smaaEnabled = descriptor.antialias ?? false;
    if (this.smaaEnabled) this.createSmaaResources();
    this.createGlobalBindGroupLayout();
    this.createSkinBindGroupLayout();
    this.createUniformBuffers();
    this.createFallbackTextures();
    this.resize();
    this.frustumCullingEnabled = descriptor.frustumCulling ?? true;
    this.frustumCullingStatsEnabled = descriptor.frustumCullingStats ?? false;
  }
  get gpu() {
    return {
      device: this.device,
      queue: this.queue,
      format: this.format
    };
  }
  get gpuTimeNs() {
    return this._gpuTimeNs;
  }
  get isGpuTimingSupported() {
    return this.gpuTimingSupported;
  }
  enableGpuTiming(enabled) {
    const want = !!enabled;
    if (want && this.gpuTimingSupported && !this.gpuQuerySet) this.createGpuTimingResources();
    this.gpuTimingEnabled = want && this.gpuTimingSupported;
  }
  createGpuTimingResources() {
    if (!this.gpuTimingSupported) return;
    if (this.gpuQuerySet) return;
    try {
      this.gpuQuerySet = this.device.createQuerySet({ type: "timestamp", count: 2 });
      this.gpuResolveBuffer = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
      });
      this.gpuResultBuffer = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      });
    } catch (e) {
      this.gpuQuerySet = null;
      this.gpuResolveBuffer?.destroy();
      this.gpuResolveBuffer = null;
      this.gpuResultBuffer?.destroy();
      this.gpuResultBuffer = null;
      this.gpuTimingSupported = false;
      this.gpuTimingEnabled = false;
      console.warn("Renderer: failed to initialize GPU timing resources:", e);
    }
  }
  tryReadGpuTiming() {
    if (!this.gpuResultPending) return;
    const buf = this.gpuResultBuffer;
    if (!buf) return;
    if (buf.mapState !== "unmapped") return;
    this.gpuResultPending = false;
    buf.mapAsync(GPUMapMode.READ).then(() => {
      try {
        const mapped = buf.getMappedRange();
        const times = new BigUint64Array(mapped);
        const begin = times[0];
        const end = times[1];
        const delta = end - begin;
        const ns = delta > 0n ? Number(delta) : 0;
        this._gpuTimeNs = Number.isFinite(ns) ? ns : 0;
      } catch {
      } finally {
        try {
          buf.unmap();
        } catch {
        }
      }
    }).catch(() => {
      try {
        buf.unmap();
      } catch {
      }
    });
  }
  resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque"
    });
    if (this.depthTexture) this.depthTexture.destroy();
    this.depthTexture = createDepthTexture(this.device, this.width, this.height);
    this.depthView = this.depthTexture.createView();
    if (this.smaaEnabled) this.resizeSmaaTargets();
  }
  get aspectRatio() {
    return this.width / this.height;
  }
  refreshWasmStagingViews() {
    const buf = wasm.memory().buffer;
    const needRefresh = buf !== this._wasmBuffer || !this.cameraUniformStagingView || this.cameraUniformStagingView.byteOffset !== this.cameraUniformStagingPtr || !this.lightingUniformStagingView || this.lightingUniformStagingView.byteOffset !== this.lightingUniformStagingPtr || !this.modelUniformStagingView || this.modelUniformStagingView.byteOffset !== this.modelUniformStagingPtr;
    if (!needRefresh) return;
    this._wasmBuffer = buf;
    this.cameraUniformStagingView = wasm.f32view(this.cameraUniformStagingPtr, 20);
    this.lightingUniformStagingView = wasm.f32view(this.lightingUniformStagingPtr, 104);
    this.lightingCountView = wasm.u32view(this.lightingUniformStagingPtr + 16, 1);
    this.modelUniformStagingView = wasm.f32view(this.modelUniformStagingPtr, 32);
  }
  getObjectId(obj) {
    let id = this.objectIds.get(obj);
    if (id !== void 0) return id;
    id = this.nextObjectId++;
    this.objectIds.set(obj, id);
    return id;
  }
  acquireDrawItem() {
    const i = this.drawItemPoolUsed++;
    let item = this.drawItemPool[i];
    if (!item) {
      item = {
        mesh: null,
        geometry: null,
        material: null,
        pipeline: null,
        pipelineId: 0,
        materialId: 0,
        geometryId: 0,
        skinned: false,
        skinned8: false,
        sortKey: 0
      };
      this.drawItemPool[i] = item;
    }
    return item;
  }
  acquirePointCloudDrawItem() {
    const i = this.pointCloudDrawItemPoolUsed++;
    let item = this.pointCloudDrawItemPool[i];
    if (!item) {
      item = {
        cloud: null,
        pipeline: null,
        pipelineId: 0,
        cloudId: 0,
        sortKey: 0
      };
      this.pointCloudDrawItemPool[i] = item;
    }
    return item;
  }
  acquireGlyphFieldDrawItem() {
    const idx = this.glyphFieldDrawItemPoolUsed++;
    if (idx >= this.glyphFieldDrawItemPool.length) this.glyphFieldDrawItemPool.push({});
    return this.glyphFieldDrawItemPool[idx];
  }
  ensureCullingCapacity(count) {
    if (count <= this.cullCapacity) return;
    let cap = Math.max(1, this.cullCapacity);
    while (cap < count) cap *= 2;
    this.cullCentersPtr = wasm.allocF32(cap * 3);
    this.cullRadiiPtr = wasm.allocF32(cap);
    this.cullCapacity = cap;
  }
  render(scene, camera) {
    this.resize();
    this.modelBufferIndex = 0;
    this.instanceBufferOffset = 0;
    this.cameraUniformStagingPtr = frameArena.allocF32(20);
    this.lightingUniformStagingPtr = frameArena.allocF32(104);
    this.modelUniformStagingPtr = frameArena.allocF32(32);
    if ("aspect" in camera) camera.aspect = this.aspectRatio;
    const swapTexture = this.context.getCurrentTexture();
    const swapView = swapTexture.createView();
    Transform.updateAll();
    this.writeCameraUniforms(camera);
    this.writeLightingUniforms(scene);
    const encoder = this.device.createCommandEncoder();
    const timestampWrites = this.gpuTimingEnabled && this.gpuQuerySet ? { querySet: this.gpuQuerySet, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } : void 0;
    if (this.smaaEnabled) {
      if (!this.smaaSceneColorView || !this.smaaEdgesView || !this.smaaBlendView) this.resizeSmaaTargets();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: this.smaaSceneColorView,
            clearValue: { r: scene.background[0], g: scene.background[1], b: scene.background[2], a: 1 },
            loadOp: "clear",
            storeOp: "store"
          }
        ],
        depthStencilAttachment: {
          view: this.depthView,
          depthClearValue: 1,
          depthLoadOp: "clear",
          depthStoreOp: "store"
        },
        ...timestampWrites ? { timestampWrites } : {}
      });
      this.buildDrawLists(scene, camera);
      this.buildPointCloudDrawLists(scene, camera);
      this.buildGlyphFieldDrawLists(scene, camera);
      this.executeDrawList(pass, this.opaqueDrawList);
      this.executeGlyphFieldDrawList(pass, this.opaqueGlyphFieldDrawList);
      this.executePointCloudDrawList(pass, this.opaquePointCloudDrawList);
      this.executeTransparentMergedDrawList(pass);
      pass.end();
      if (timestampWrites && this.gpuResolveBuffer && this.gpuResultBuffer) {
        encoder.resolveQuerySet(this.gpuQuerySet, 0, 2, this.gpuResolveBuffer, 0);
        if (this.gpuResultBuffer.mapState === "unmapped") {
          encoder.copyBufferToBuffer(this.gpuResolveBuffer, 0, this.gpuResultBuffer, 0, 16);
          this.gpuResultPending = true;
        }
      }
      this.executeSmaa(encoder, swapView);
    } else {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: swapView,
            clearValue: { r: scene.background[0], g: scene.background[1], b: scene.background[2], a: 1 },
            loadOp: "clear",
            storeOp: "store"
          }
        ],
        depthStencilAttachment: {
          view: this.depthView,
          depthClearValue: 1,
          depthLoadOp: "clear",
          depthStoreOp: "store"
        },
        ...timestampWrites ? { timestampWrites } : {}
      });
      this.buildDrawLists(scene, camera);
      this.buildPointCloudDrawLists(scene, camera);
      this.buildGlyphFieldDrawLists(scene, camera);
      this.executeDrawList(pass, this.opaqueDrawList);
      this.executeGlyphFieldDrawList(pass, this.opaqueGlyphFieldDrawList);
      this.executePointCloudDrawList(pass, this.opaquePointCloudDrawList);
      this.executeTransparentMergedDrawList(pass);
      pass.end();
      if (timestampWrites && this.gpuResolveBuffer && this.gpuResultBuffer) {
        encoder.resolveQuerySet(this.gpuQuerySet, 0, 2, this.gpuResolveBuffer, 0);
        if (this.gpuResultBuffer.mapState === "unmapped") {
          encoder.copyBufferToBuffer(this.gpuResolveBuffer, 0, this.gpuResultBuffer, 0, 16);
          this.gpuResultPending = true;
        }
      }
    }
    this.queue.submit([encoder.finish()]);
    this.tryReadGpuTiming();
  }
  destroy() {
    this.depthTexture?.destroy();
    this.smaaSceneColorTexture?.destroy();
    this.smaaEdgesTexture?.destroy();
    this.smaaBlendTexture?.destroy();
    this.smaaSceneColorTexture = null;
    this.smaaSceneColorView = null;
    this.smaaEdgesTexture = null;
    this.smaaEdgesView = null;
    this.smaaBlendTexture = null;
    this.smaaBlendView = null;
    this.smaaParamsBuffer?.destroy();
    this.smaaParamsBuffer = null;
    this.smaaEdgeBindGroup = null;
    this.smaaWeightBindGroup = null;
    this.smaaNeighborhoodBindGroup = null;
    this.smaaEdgePipeline = null;
    this.smaaWeightPipeline = null;
    this.smaaNeighborhoodPipeline = null;
    this.smaaShaderModule = null;
    this.smaaEdgeBindGroupLayout = null;
    this.smaaWeightBindGroupLayout = null;
    this.smaaNeighborhoodBindGroupLayout = null;
    this.smaaSamplerPoint = null;
    this.smaaSamplerLinear = null;
    this.fallbackWhiteTexture?.destroy();
    this.fallbackNormalTexture?.destroy();
    this.fallbackMRTex?.destroy();
    this.fallbackOcclusionTex?.destroy();
    this.cameraUniformBuffer?.destroy();
    for (const buffer of this.modelUniformBuffers) buffer.destroy();
    this.modelUniformBuffers = [];
    this.lightingUniformBuffer?.destroy();
    this.instanceBuffer?.destroy();
    this.instanceBuffer = null;
    this.instanceBufferCapacityBytes = 0;
    this.globalBindGroups = [];
    this.pipelineCache.clear();
    this.shaderCache.clear();
    this.pointCloudBindGroupLayout = null;
    this.glyphFieldBindGroupLayout = null;
    this.glyphFieldDummyAttributesBuffer?.destroy();
    this.glyphFieldDummyAttributesBuffer = null;
    this.gpuQuerySet?.destroy();
    this.gpuQuerySet = null;
    this.gpuResolveBuffer?.destroy();
    this.gpuResolveBuffer = null;
    this.gpuResultBuffer?.destroy();
    this.gpuResultBuffer = null;
    this.gpuResultPending = false;
    this._gpuTimeNs = null;
    this.dataMaterialDummyDataBuffer?.destroy();
    this.dataMaterialDummyDataBuffer = null;
  }
  createGlobalBindGroupLayout() {
    this.globalBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform", minBindingSize: 80 }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform", minBindingSize: 128 }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform", minBindingSize: 416 }
        }
      ]
    });
  }
  createSkinBindGroupLayout() {
    this.skinBindGroupLayout = this.device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" }
      }]
    });
  }
  createUniformBuffers() {
    this.cameraUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    for (let i = 0; i < this.MODEL_BUFFER_POOL_SIZE; i++) {
      this.modelUniformBuffers.push(this.device.createBuffer({
        size: 128,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      }));
    }
    this.lightingUniformBuffer = this.device.createBuffer({
      size: 416,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.globalBindGroups = new Array(this.MODEL_BUFFER_POOL_SIZE);
    for (let i = 0; i < this.MODEL_BUFFER_POOL_SIZE; i++) {
      this.globalBindGroups[i] = this.device.createBindGroup({
        layout: this.globalBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
          { binding: 1, resource: { buffer: this.modelUniformBuffers[i] } },
          { binding: 2, resource: { buffer: this.lightingUniformBuffer } }
        ]
      });
    }
    this.cameraUniformStagingPtr = 0;
    this.lightingUniformStagingPtr = 0;
    this.modelUniformStagingPtr = 0;
    this._wasmBuffer = null;
  }
  ensureModelBufferPool(requiredCount) {
    const current = this.modelUniformBuffers.length;
    if (requiredCount <= current) return;
    let newSize = Math.max(1, current);
    while (newSize < requiredCount) newSize *= 2;
    this.modelUniformBuffers.length = newSize;
    this.globalBindGroups.length = newSize;
    for (let i = current; i < newSize; i++) {
      const buf = this.device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      this.modelUniformBuffers[i] = buf;
      this.globalBindGroups[i] = this.device.createBindGroup({
        layout: this.globalBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
          { binding: 1, resource: { buffer: buf } },
          { binding: 2, resource: { buffer: this.lightingUniformBuffer } }
        ]
      });
    }
  }
  createFallbackTextures() {
    this.fallbackSampler = this.device.createSampler({
      addressModeU: "repeat",
      addressModeV: "repeat",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear"
    });
    const create1x1 = (rgba, wantSrgbView) => {
      const tex = this.device.createTexture({
        size: { width: 1, height: 1 },
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        viewFormats: ["rgba8unorm-srgb"]
      });
      const data = new Uint8Array(256);
      data[0] = rgba[0];
      data[1] = rgba[1];
      data[2] = rgba[2];
      data[3] = rgba[3];
      this.queue.writeTexture(
        { texture: tex },
        data,
        { bytesPerRow: 256, rowsPerImage: 1 },
        { width: 1, height: 1 }
      );
      const linear = tex.createView({ format: "rgba8unorm" });
      const srgb = wantSrgbView ? tex.createView({ format: "rgba8unorm-srgb" }) : linear;
      return { tex, linear, srgb };
    };
    const white = create1x1([255, 255, 255, 255], true);
    this.fallbackWhiteTexture = white.tex;
    this.fallbackWhiteViewLinear = white.linear;
    this.fallbackWhiteViewSrgb = white.srgb;
    const normal = create1x1([128, 128, 255, 255], false);
    this.fallbackNormalTexture = normal.tex;
    this.fallbackNormalViewLinear = normal.linear;
    const mr = create1x1([0, 255, 255, 255], false);
    this.fallbackMRTex = mr.tex;
    this.fallbackMRViewLinear = mr.linear;
    const occ = create1x1([255, 0, 0, 255], false);
    this.fallbackOcclusionTex = occ.tex;
    this.fallbackOcclusionViewLinear = occ.linear;
  }
  createSmaaResources() {
    if (this.smaaParamsBuffer) return;
    this.smaaParamsBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.smaaSamplerPoint = this.device.createSampler({
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "nearest",
      minFilter: "nearest"
    });
    this.smaaSamplerLinear = this.device.createSampler({
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "linear",
      minFilter: "linear"
    });
    const shaderCode = smaa_default;
    this.smaaShaderModule = this.device.createShaderModule({ code: shaderCode });
    this.smaaEdgeBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
      ]
    });
    this.smaaWeightBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
      ]
    });
    this.smaaNeighborhoodBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
      ]
    });
    const edgeLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.smaaEdgeBindGroupLayout] });
    const weightLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.smaaWeightBindGroupLayout] });
    const neighLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.smaaNeighborhoodBindGroupLayout] });
    this.smaaEdgePipeline = this.device.createRenderPipeline({
      layout: edgeLayout,
      vertex: { module: this.smaaShaderModule, entryPoint: "vs_fullscreen" },
      fragment: {
        module: this.smaaShaderModule,
        entryPoint: "fs_smaa_edges",
        targets: [{ format: "rgba8unorm" }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" }
    });
    this.smaaWeightPipeline = this.device.createRenderPipeline({
      layout: weightLayout,
      vertex: { module: this.smaaShaderModule, entryPoint: "vs_fullscreen" },
      fragment: {
        module: this.smaaShaderModule,
        entryPoint: "fs_smaa_weights",
        targets: [{ format: "rgba8unorm" }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" }
    });
    this.smaaNeighborhoodPipeline = this.device.createRenderPipeline({
      layout: neighLayout,
      vertex: { module: this.smaaShaderModule, entryPoint: "vs_fullscreen" },
      fragment: {
        module: this.smaaShaderModule,
        entryPoint: "fs_smaa_neighborhood",
        targets: [{ format: this.format }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" }
    });
  }
  resizeSmaaTargets() {
    if (!this.smaaEnabled) return;
    if (!this.smaaParamsBuffer) this.createSmaaResources();
    this.smaaSceneColorTexture?.destroy();
    this.smaaEdgesTexture?.destroy();
    this.smaaBlendTexture?.destroy();
    const w = this.width | 0;
    const h = this.height | 0;
    if (w <= 0 || h <= 0) return;
    this.smaaSceneColorTexture = this.device.createTexture({
      size: { width: w, height: h, depthOrArrayLayers: 1 },
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });
    this.smaaSceneColorView = this.smaaSceneColorTexture.createView();
    const intermediateFormat = "rgba8unorm";
    this.smaaEdgesTexture = this.device.createTexture({
      size: { width: w, height: h, depthOrArrayLayers: 1 },
      format: intermediateFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });
    this.smaaEdgesView = this.smaaEdgesTexture.createView();
    this.smaaBlendTexture = this.device.createTexture({
      size: { width: w, height: h, depthOrArrayLayers: 1 },
      format: intermediateFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });
    this.smaaBlendView = this.smaaBlendTexture.createView();
    const params = new Float32Array(8);
    params[0] = 1 / w;
    params[1] = 1 / h;
    params[2] = w;
    params[3] = h;
    params[4] = 0.1;
    this.queue.writeBuffer(this.smaaParamsBuffer, 0, params);
    this.smaaEdgeBindGroup = this.device.createBindGroup({
      layout: this.smaaEdgeBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.smaaParamsBuffer } },
        { binding: 2, resource: this.smaaSamplerPoint },
        { binding: 3, resource: this.smaaSceneColorView }
      ]
    });
    this.smaaWeightBindGroup = this.device.createBindGroup({
      layout: this.smaaWeightBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.smaaParamsBuffer } },
        { binding: 2, resource: this.smaaSamplerPoint },
        { binding: 4, resource: this.smaaEdgesView }
      ]
    });
    this.smaaNeighborhoodBindGroup = this.device.createBindGroup({
      layout: this.smaaNeighborhoodBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.smaaParamsBuffer } },
        { binding: 1, resource: this.smaaSamplerLinear },
        { binding: 2, resource: this.smaaSamplerPoint },
        { binding: 3, resource: this.smaaSceneColorView },
        { binding: 5, resource: this.smaaBlendView }
      ]
    });
  }
  executeSmaa(encoder, outputView) {
    if (!this.smaaEdgePipeline || !this.smaaWeightPipeline || !this.smaaNeighborhoodPipeline) return;
    if (!this.smaaEdgeBindGroup || !this.smaaWeightBindGroup || !this.smaaNeighborhoodBindGroup) return;
    if (!this.smaaEdgesView || !this.smaaBlendView) return;
    const edgePass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.smaaEdgesView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store"
        }
      ]
    });
    edgePass.setPipeline(this.smaaEdgePipeline);
    edgePass.setBindGroup(0, this.smaaEdgeBindGroup);
    edgePass.draw(3);
    edgePass.end();
    const weightPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.smaaBlendView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store"
        }
      ]
    });
    weightPass.setPipeline(this.smaaWeightPipeline);
    weightPass.setBindGroup(0, this.smaaWeightBindGroup);
    weightPass.draw(3);
    weightPass.end();
    const neighborhoodPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: outputView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store"
        }
      ]
    });
    neighborhoodPass.setPipeline(this.smaaNeighborhoodPipeline);
    neighborhoodPass.setBindGroup(0, this.smaaNeighborhoodBindGroup);
    neighborhoodPass.draw(3);
    neighborhoodPass.end();
  }
  writeCameraUniforms(camera) {
    this.refreshWasmStagingViews();
    const proj = camera.getProjectionMatrix();
    this.modelUniformStagingView.set(proj, 0);
    const viewPtr = this.modelUniformStagingPtr + 16 * 4;
    mat4f.invert(viewPtr, camera.transform.worldMatrixPtr);
    mat4f.mul(this.cameraUniformStagingPtr, this.modelUniformStagingPtr, viewPtr);
    const store = TransformStore.global();
    const storeF32 = store.f32();
    const base = (store.worldPtr >>> 2) + camera.transform.index * 16;
    this.cameraUniformStagingView[16] = storeF32[base + 12];
    this.cameraUniformStagingView[17] = storeF32[base + 13];
    this.cameraUniformStagingView[18] = storeF32[base + 14];
    this.cameraUniformStagingView[19] = this.height;
    this.queue.writeBuffer(this.cameraUniformBuffer, 0, this.cameraUniformStagingView);
  }
  writeLightingUniforms(scene) {
    const { ambient, lights } = scene.getLightingData();
    this.refreshWasmStagingViews();
    const data = this.lightingUniformStagingView;
    data[0] = ambient[0];
    data[1] = ambient[1];
    data[2] = ambient[2];
    data[3] = 1;
    this.lightingCountView[0] = lights.length;
    let offset = 8;
    for (let i = 0; i < lights.length && i < Scene.MAX_LIGHTS; i++) {
      const light = lights[i];
      if (light instanceof DirectionalLight) {
        data[offset + 0] = light.direction[0];
        data[offset + 1] = light.direction[1];
        data[offset + 2] = light.direction[2];
        data[offset + 3] = 0;
      } else if (light instanceof PointLight) {
        data[offset + 0] = light.position[0];
        data[offset + 1] = light.position[1];
        data[offset + 2] = light.position[2];
        data[offset + 3] = 1;
      }
      data[offset + 4] = light.color[0];
      data[offset + 5] = light.color[1];
      data[offset + 6] = light.color[2];
      data[offset + 7] = light.intensity;
      if (light instanceof PointLight) {
        data[offset + 8] = light.range;
      }
      offset += 12;
    }
    this.queue.writeBuffer(this.lightingUniformBuffer, 0, data);
  }
  buildDrawLists(scene, camera) {
    this.drawItemPoolUsed = 0;
    this.opaqueDrawList.length = 0;
    this.transparentDrawList.length = 0;
    const candidates = this.cullMeshScratch;
    candidates.length = 0;
    for (const mesh of scene.meshes) {
      if (!mesh.visible) continue;
      candidates.push(mesh);
    }
    const count = candidates.length;
    if (count === 0) {
      if (this.frustumCullingStatsEnabled) {
        this.cullingStats.tested = 0;
        this.cullingStats.visible = 0;
      }
      return;
    }
    let visibleIndicesBase = 0;
    let visibleCount = count;
    const store = TransformStore.global();
    const storeF32 = store.f32();
    const storeU32 = store.u32();
    const camWb = camera.transform.worldMatrixPtr >>> 2;
    const camX = storeF32[camWb + 12];
    const camY = storeF32[camWb + 13];
    const camZ = storeF32[camWb + 14];
    if (this.frustumCullingEnabled) {
      this.ensureCullingCapacity(count);
      const centersBase = this.cullCentersPtr >>> 2;
      const radiiBase = this.cullRadiiPtr >>> 2;
      for (let i = 0; i < count; i++) {
        const mesh = candidates[i];
        const geom = mesh.geometry;
        const lc = geom.boundsCenter;
        const lr = geom.boundsRadius;
        const wb = mesh.transform.worldMatrixPtr >>> 2;
        const w0 = storeF32[wb + 0];
        const w1 = storeF32[wb + 1];
        const w2 = storeF32[wb + 2];
        const w4 = storeF32[wb + 4];
        const w5 = storeF32[wb + 5];
        const w6 = storeF32[wb + 6];
        const w8 = storeF32[wb + 8];
        const w9 = storeF32[wb + 9];
        const w10 = storeF32[wb + 10];
        const w12 = storeF32[wb + 12];
        const w13 = storeF32[wb + 13];
        const w14 = storeF32[wb + 14];
        const cx = w0 * lc[0] + w4 * lc[1] + w8 * lc[2] + w12;
        const cy = w1 * lc[0] + w5 * lc[1] + w9 * lc[2] + w13;
        const cz = w2 * lc[0] + w6 * lc[1] + w10 * lc[2] + w14;
        const base = centersBase + i * 3;
        storeF32[base + 0] = cx;
        storeF32[base + 1] = cy;
        storeF32[base + 2] = cz;
        const sx = Math.hypot(w0, w1, w2);
        const sy = Math.hypot(w4, w5, w6);
        const sz = Math.hypot(w8, w9, w10);
        const smax = Math.max(sx, sy, sz);
        storeF32[radiiBase + i] = lr * smax;
      }
      const frustumPtr = frameArena.allocF32(24);
      const frb = frustumPtr >>> 2;
      const m = this.cameraUniformStagingView;
      storeF32[frb + 0] = m[3] + m[0];
      storeF32[frb + 1] = m[7] + m[4];
      storeF32[frb + 2] = m[11] + m[8];
      storeF32[frb + 3] = m[15] + m[12];
      storeF32[frb + 4] = m[3] - m[0];
      storeF32[frb + 5] = m[7] - m[4];
      storeF32[frb + 6] = m[11] - m[8];
      storeF32[frb + 7] = m[15] - m[12];
      storeF32[frb + 8] = m[3] + m[1];
      storeF32[frb + 9] = m[7] + m[5];
      storeF32[frb + 10] = m[11] + m[9];
      storeF32[frb + 11] = m[15] + m[13];
      storeF32[frb + 12] = m[3] - m[1];
      storeF32[frb + 13] = m[7] - m[5];
      storeF32[frb + 14] = m[11] - m[9];
      storeF32[frb + 15] = m[15] - m[13];
      storeF32[frb + 16] = m[2];
      storeF32[frb + 17] = m[6];
      storeF32[frb + 18] = m[10];
      storeF32[frb + 19] = m[14];
      storeF32[frb + 20] = m[3] - m[2];
      storeF32[frb + 21] = m[7] - m[6];
      storeF32[frb + 22] = m[11] - m[10];
      storeF32[frb + 23] = m[15] - m[14];
      for (let p = 0; p < 6; p++) {
        const off = frb + p * 4;
        const nx = storeF32[off + 0];
        const ny = storeF32[off + 1];
        const nz = storeF32[off + 2];
        const len = Math.hypot(nx, ny, nz);
        if (len > 0) {
          const inv = 1 / len;
          storeF32[off + 0] = nx * inv;
          storeF32[off + 1] = ny * inv;
          storeF32[off + 2] = nz * inv;
          storeF32[off + 3] = storeF32[off + 3] * inv;
        }
      }
      const outPtr = frameArena.alloc(count * 4, 4);
      visibleCount = cullf.spheresFrustum(outPtr, this.cullCentersPtr, this.cullRadiiPtr, count, frustumPtr);
      visibleIndicesBase = outPtr >>> 2;
    }
    if (this.frustumCullingStatsEnabled) {
      this.cullingStats.tested = count;
      this.cullingStats.visible = visibleCount;
    }
    if (!this.frustumCullingEnabled) {
      for (let i = 0; i < count; i++) {
        const mesh = candidates[i];
        const geometry = mesh.geometry;
        const material = mesh.material;
        const skinned = mesh.skin !== null && geometry.joints !== null && geometry.weights !== null && this.materialSupportsSkinning(material);
        const skinned8 = skinned && geometry.joints1 !== null && geometry.weights1 !== null;
        const pipeline = this.getOrCreatePipeline(material, false, skinned, skinned8);
        const item = this.acquireDrawItem();
        item.mesh = mesh;
        item.geometry = geometry;
        item.material = material;
        item.pipeline = pipeline;
        item.pipelineId = this.getObjectId(pipeline);
        item.materialId = this.getObjectId(material);
        item.geometryId = this.getObjectId(geometry);
        item.skinned = skinned;
        item.skinned8 = skinned8;
        item.sortKey = 0;
        if (material.blendMode === "opaque" /* Opaque */) {
          this.opaqueDrawList.push(item);
        } else {
          const wb = mesh.transform.worldMatrixPtr >>> 2;
          const dx = storeF32[wb + 12] - camX;
          const dy = storeF32[wb + 13] - camY;
          const dz = storeF32[wb + 14] - camZ;
          item.sortKey = dx * dx + dy * dy + dz * dz;
          this.transparentDrawList.push(item);
        }
      }
    } else {
      const visBase = visibleIndicesBase;
      for (let k = 0; k < visibleCount; k++) {
        const i = storeU32[visBase + k];
        const mesh = candidates[i];
        const geometry = mesh.geometry;
        const material = mesh.material;
        const skinned = mesh.skin !== null && geometry.joints !== null && geometry.weights !== null && this.materialSupportsSkinning(material);
        const skinned8 = skinned && geometry.joints1 !== null && geometry.weights1 !== null;
        const pipeline = this.getOrCreatePipeline(material, false, skinned, skinned8);
        const item = this.acquireDrawItem();
        item.mesh = mesh;
        item.geometry = geometry;
        item.material = material;
        item.pipeline = pipeline;
        item.pipelineId = this.getObjectId(pipeline);
        item.materialId = this.getObjectId(material);
        item.geometryId = this.getObjectId(geometry);
        item.skinned = skinned;
        item.skinned8 = skinned8;
        item.sortKey = 0;
        if (material.blendMode === "opaque" /* Opaque */) {
          this.opaqueDrawList.push(item);
        } else {
          const wb = mesh.transform.worldMatrixPtr >>> 2;
          const dx = storeF32[wb + 12] - camX;
          const dy = storeF32[wb + 13] - camY;
          const dz = storeF32[wb + 14] - camZ;
          item.sortKey = dx * dx + dy * dy + dz * dz;
          this.transparentDrawList.push(item);
        }
      }
    }
    this.opaqueDrawList.sort((a, b) => a.pipelineId - b.pipelineId || a.materialId - b.materialId || a.geometryId - b.geometryId);
    this.transparentDrawList.sort((a, b) => b.sortKey - a.sortKey || a.pipelineId - b.pipelineId || a.materialId - b.materialId || a.geometryId - b.geometryId);
  }
  buildPointCloudDrawLists(scene, camera) {
    this.pointCloudDrawItemPoolUsed = 0;
    this.opaquePointCloudDrawList.length = 0;
    this.transparentPointCloudDrawList.length = 0;
    this.transparentMergedDrawList.length = 0;
    this.cullPointCloudScratch.length = 0;
    for (const pc of scene.pointClouds) {
      if (!pc.visible) continue;
      if (pc.pointCount <= 0) continue;
      this.cullPointCloudScratch.push(pc);
    }
    if (this.cullPointCloudScratch.length === 0) return;
    const ts = TransformStore.global();
    const storeF32 = ts.f32();
    const storeU32 = ts.u32();
    const m = this.cameraUniformStagingView;
    const camX = m[16];
    const camY = m[17];
    const camZ = m[18];
    const visible = [];
    if (this.frustumCullingEnabled) {
      const bounded = [];
      const unbounded = [];
      for (const pc of this.cullPointCloudScratch) {
        if (pc.boundsRadius > 0) bounded.push(pc);
        else unbounded.push(pc);
      }
      if (bounded.length > 0) {
        this.ensureCullingCapacity(bounded.length);
        const cullCentersBase = this.cullCentersPtr >>> 2;
        const cullRadiiBase = this.cullRadiiPtr >>> 2;
        for (let i = 0; i < bounded.length; i++) {
          const pc = bounded[i];
          const worldBase = pc.transform.worldMatrixPtr >>> 2;
          const cx = pc.boundsCenter[0];
          const cy = pc.boundsCenter[1];
          const cz = pc.boundsCenter[2];
          const cwx = storeF32[worldBase + 0] * cx + storeF32[worldBase + 4] * cy + storeF32[worldBase + 8] * cz + storeF32[worldBase + 12];
          const cwy = storeF32[worldBase + 1] * cx + storeF32[worldBase + 5] * cy + storeF32[worldBase + 9] * cz + storeF32[worldBase + 13];
          const cwz = storeF32[worldBase + 2] * cx + storeF32[worldBase + 6] * cy + storeF32[worldBase + 10] * cz + storeF32[worldBase + 14];
          const sx = Math.hypot(storeF32[worldBase + 0], storeF32[worldBase + 1], storeF32[worldBase + 2]);
          const sy = Math.hypot(storeF32[worldBase + 4], storeF32[worldBase + 5], storeF32[worldBase + 6]);
          const sz = Math.hypot(storeF32[worldBase + 8], storeF32[worldBase + 9], storeF32[worldBase + 10]);
          const smax = Math.max(sx, sy, sz);
          storeF32[cullCentersBase + i * 3 + 0] = cwx;
          storeF32[cullCentersBase + i * 3 + 1] = cwy;
          storeF32[cullCentersBase + i * 3 + 2] = cwz;
          storeF32[cullRadiiBase + i] = pc.boundsRadius * smax;
        }
        const frustumPtr = frameArena.allocF32(24);
        const frb = frustumPtr >>> 2;
        storeF32[frb + 0] = m[3] + m[0];
        storeF32[frb + 1] = m[7] + m[4];
        storeF32[frb + 2] = m[11] + m[8];
        storeF32[frb + 3] = m[15] + m[12];
        storeF32[frb + 4] = m[3] - m[0];
        storeF32[frb + 5] = m[7] - m[4];
        storeF32[frb + 6] = m[11] - m[8];
        storeF32[frb + 7] = m[15] - m[12];
        storeF32[frb + 8] = m[3] + m[1];
        storeF32[frb + 9] = m[7] + m[5];
        storeF32[frb + 10] = m[11] + m[9];
        storeF32[frb + 11] = m[15] + m[13];
        storeF32[frb + 12] = m[3] - m[1];
        storeF32[frb + 13] = m[7] - m[5];
        storeF32[frb + 14] = m[11] - m[9];
        storeF32[frb + 15] = m[15] - m[13];
        storeF32[frb + 16] = m[2];
        storeF32[frb + 17] = m[6];
        storeF32[frb + 18] = m[10];
        storeF32[frb + 19] = m[14];
        storeF32[frb + 20] = m[3] - m[2];
        storeF32[frb + 21] = m[7] - m[6];
        storeF32[frb + 22] = m[11] - m[10];
        storeF32[frb + 23] = m[15] - m[14];
        for (let p = 0; p < 6; p++) {
          const off = frb + p * 4;
          const len = Math.hypot(storeF32[off + 0], storeF32[off + 1], storeF32[off + 2]);
          if (len > 0) {
            const inv = 1 / len;
            storeF32[off + 0] *= inv;
            storeF32[off + 1] *= inv;
            storeF32[off + 2] *= inv;
            storeF32[off + 3] *= inv;
          }
        }
        const outPtr = frameArena.alloc(bounded.length * 4, 4);
        const numVisible = cullf.spheresFrustum(outPtr, this.cullCentersPtr, this.cullRadiiPtr, bounded.length, frustumPtr);
        const outBase = outPtr >>> 2;
        for (let i = 0; i < numVisible; i++) visible.push(bounded[storeU32[outBase + i]]);
      }
      for (const pc of unbounded) visible.push(pc);
    } else for (const pc of this.cullPointCloudScratch) visible.push(pc);
    for (const pc of visible) {
      const pipeline = this.getOrCreatePointCloudPipeline(pc);
      const pipelineId = this.getObjectId(pipeline);
      const cloudId = this.getObjectId(pc);
      const item = this.acquirePointCloudDrawItem();
      item.cloud = pc;
      item.pipeline = pipeline;
      item.pipelineId = pipelineId;
      item.cloudId = cloudId;
      if (pc.blendMode === "opaque" /* Opaque */) {
        item.sortKey = 0;
        this.opaquePointCloudDrawList.push(item);
      } else {
        const worldBase = pc.transform.worldMatrixPtr >>> 2;
        const cx = pc.boundsCenter[0];
        const cy = pc.boundsCenter[1];
        const cz = pc.boundsCenter[2];
        const cwx = storeF32[worldBase + 0] * cx + storeF32[worldBase + 4] * cy + storeF32[worldBase + 8] * cz + storeF32[worldBase + 12];
        const cwy = storeF32[worldBase + 1] * cx + storeF32[worldBase + 5] * cy + storeF32[worldBase + 9] * cz + storeF32[worldBase + 13];
        const cwz = storeF32[worldBase + 2] * cx + storeF32[worldBase + 6] * cy + storeF32[worldBase + 10] * cz + storeF32[worldBase + 14];
        const dx = cwx - camX;
        const dy = cwy - camY;
        const dz = cwz - camZ;
        item.sortKey = dx * dx + dy * dy + dz * dz;
        this.transparentPointCloudDrawList.push(item);
      }
    }
    this.opaquePointCloudDrawList.sort((a, b) => a.pipelineId - b.pipelineId || a.cloudId - b.cloudId);
    this.transparentPointCloudDrawList.sort((a, b) => b.sortKey - a.sortKey || a.pipelineId - b.pipelineId || a.cloudId - b.cloudId);
  }
  buildGlyphFieldDrawLists(scene, camera) {
    this.glyphFieldDrawItemPoolUsed = 0;
    this.opaqueGlyphFieldDrawList.length = 0;
    this.transparentGlyphFieldDrawList.length = 0;
    this.cullGlyphFieldScratch.length = 0;
    for (const gf of scene.glyphFields) {
      if (!gf.visible) continue;
      if (gf.instanceCount <= 0) continue;
      this.cullGlyphFieldScratch.push(gf);
    }
    if (this.cullGlyphFieldScratch.length === 0) return;
    const store = TransformStore.global();
    const f32 = store.f32();
    const camX = camera.position[0];
    const camY = camera.position[1];
    const camZ = camera.position[2];
    const visible = [];
    if (this.frustumCullingEnabled) {
      const bounded = [];
      const unbounded = [];
      for (const gf of this.cullGlyphFieldScratch) {
        if (gf.boundsRadius > 0) bounded.push(gf);
        else unbounded.push(gf);
      }
      if (bounded.length > 0) {
        this.ensureCullingCapacity(bounded.length);
        const centers = store.f32().subarray(this.cullCentersPtr >>> 2, (this.cullCentersPtr >>> 2) + bounded.length * 3);
        const radii = store.f32().subarray(this.cullRadiiPtr >>> 2, (this.cullRadiiPtr >>> 2) + bounded.length);
        for (let i = 0; i < bounded.length; i++) {
          const field = bounded[i];
          const ptr = field.transform.worldMatrixPtr >>> 2;
          const cx = field.boundsCenter[0];
          const cy = field.boundsCenter[1];
          const cz = field.boundsCenter[2];
          const tx = f32[ptr + 12];
          const ty = f32[ptr + 13];
          const tz = f32[ptr + 14];
          const wx = f32[ptr + 0] * cx + f32[ptr + 4] * cy + f32[ptr + 8] * cz + tx;
          const wy = f32[ptr + 1] * cx + f32[ptr + 5] * cy + f32[ptr + 9] * cz + ty;
          const wz = f32[ptr + 2] * cx + f32[ptr + 6] * cy + f32[ptr + 10] * cz + tz;
          centers[i * 3 + 0] = wx;
          centers[i * 3 + 1] = wy;
          centers[i * 3 + 2] = wz;
          const sx = Math.hypot(f32[ptr + 0], f32[ptr + 1], f32[ptr + 2]);
          const sy = Math.hypot(f32[ptr + 4], f32[ptr + 5], f32[ptr + 6]);
          const sz = Math.hypot(f32[ptr + 8], f32[ptr + 9], f32[ptr + 10]);
          const maxS = Math.max(sx, sy, sz);
          radii[i] = field.boundsRadius * maxS;
        }
        const m = this.cameraUniformStagingView;
        const p = frameArena.allocF32(6 * 4);
        const pv = store.f32().subarray(p >>> 2, (p >>> 2) + 24);
        pv.set([
          m[3] + m[0],
          m[7] + m[4],
          m[11] + m[8],
          m[15] + m[12],
          m[3] - m[0],
          m[7] - m[4],
          m[11] - m[8],
          m[15] - m[12],
          m[3] + m[1],
          m[7] + m[5],
          m[11] + m[9],
          m[15] + m[13],
          m[3] - m[1],
          m[7] - m[5],
          m[11] - m[9],
          m[15] - m[13],
          m[3] + m[2],
          m[7] + m[6],
          m[11] + m[10],
          m[15] + m[14],
          m[3] - m[2],
          m[7] - m[6],
          m[11] - m[10],
          m[15] - m[14]
        ]);
        const planesPtr = p;
        const centersPtr = this.cullCentersPtr;
        const radiiPtr = this.cullRadiiPtr;
        const outPtr = frameArena.alloc(bounded.length * 4, 4);
        const numVisible = cullf.spheresFrustum(outPtr, centersPtr, radiiPtr, bounded.length, planesPtr);
        const u32 = store.u32();
        const outBase = outPtr >>> 2;
        for (let i = 0; i < numVisible; i++) visible.push(bounded[u32[outBase + i]]);
        if (this.frustumCullingStatsEnabled) {
          this.cullingStats.tested += bounded.length;
          this.cullingStats.visible += visible.length;
        }
      }
      for (const gf of unbounded) visible.push(gf);
    } else for (const gf of this.cullGlyphFieldScratch) visible.push(gf);
    for (const gf of visible) {
      const geometry = gf.geometry;
      const pipeline = this.getOrCreateGlyphFieldPipeline(gf);
      const item = this.acquireGlyphFieldDrawItem();
      item.field = gf;
      item.geometry = geometry;
      item.pipeline = pipeline;
      item.pipelineId = this.getObjectId(pipeline);
      item.geometryId = this.getObjectId(geometry);
      item.fieldId = this.getObjectId(gf);
      if (gf.blendMode === "opaque" /* Opaque */) {
        item.sortKey = 0;
        this.opaqueGlyphFieldDrawList.push(item);
      } else {
        const base = gf.transform.worldMatrixPtr >>> 2;
        const dx = f32[base + 12] - camX;
        const dy = f32[base + 13] - camY;
        const dz = f32[base + 14] - camZ;
        item.sortKey = dx * dx + dy * dy + dz * dz;
        this.transparentGlyphFieldDrawList.push(item);
      }
    }
    if (this.opaqueGlyphFieldDrawList.length > 0) {
      this.opaqueGlyphFieldDrawList.sort((a, b) => {
        const d0 = a.pipelineId - b.pipelineId;
        if (d0 !== 0) return d0;
        const d1 = a.geometryId - b.geometryId;
        if (d1 !== 0) return d1;
        return a.fieldId - b.fieldId;
      });
    }
    if (this.transparentGlyphFieldDrawList.length > 0) {
      this.transparentGlyphFieldDrawList.sort((a, b) => {
        const d0 = b.sortKey - a.sortKey;
        if (d0 !== 0) return d0;
        const d1 = a.pipelineId - b.pipelineId;
        if (d1 !== 0) return d1;
        const d2 = a.geometryId - b.geometryId;
        if (d2 !== 0) return d2;
        return a.fieldId - b.fieldId;
      });
    }
  }
  executeDrawList(pass, items) {
    let lastPipeline = null;
    let lastMaterial = null;
    let lastGeometry = null;
    for (let i = 0; i < items.length; ) {
      const first = items[i];
      const pipeline = first.pipeline;
      const material = first.material;
      const geometry = first.geometry;
      let j = i + 1;
      while (j < items.length) {
        const it = items[j];
        if (it.pipeline !== pipeline) break;
        if (it.material !== material) break;
        if (it.geometry !== geometry) break;
        j++;
      }
      const runCount = j - i;
      if (geometry !== lastGeometry) geometry.upload(this.device);
      if (material !== lastMaterial) this.ensureMaterialBindGroup(material);
      if (pipeline !== lastPipeline) {
        pass.setPipeline(pipeline);
        lastPipeline = pipeline;
      }
      if (material !== lastMaterial) {
        pass.setBindGroup(1, material.bindGroup);
        lastMaterial = material;
      }
      if (geometry !== lastGeometry) {
        pass.setVertexBuffer(0, geometry.positionBuffer);
        pass.setVertexBuffer(1, geometry.normalBuffer);
        pass.setVertexBuffer(2, geometry.uvBuffer);
        if (first.skinned) {
          pass.setVertexBuffer(3, geometry.jointsBuffer);
          pass.setVertexBuffer(4, geometry.weightsBuffer);
          if (first.skinned8) {
            pass.setVertexBuffer(5, geometry.joints1Buffer);
            pass.setVertexBuffer(6, geometry.weights1Buffer);
          }
        }
        if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer, "uint32");
        lastGeometry = geometry;
      }
      const canInstance = runCount > 1 && !first.skinned && this.materialSupportsInstancing(material) && items === this.opaqueDrawList;
      if (canInstance) {
        const instancedPipeline = this.getOrCreatePipeline(material, true);
        if (instancedPipeline !== lastPipeline) {
          pass.setPipeline(instancedPipeline);
          lastPipeline = instancedPipeline;
        }
        this.drawInstancedRun(pass, geometry, material, items, i, runCount);
      } else {
        for (let k = i; k < j; k++) {
          if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
          const modelSlot = this.modelBufferIndex++;
          const modelBuffer = this.modelUniformBuffers[modelSlot];
          const globalBindGroup = this.globalBindGroups[modelSlot];
          const bytes = wasmInterop.bytes();
          const mesh = items[k].mesh;
          const skin = first.skinned ? mesh.skin : null;
          if (skin) {
            skin.ensureGpuResources(this.device, this.skinBindGroupLayout);
            const jointCount = skin.jointCount | 0;
            const jointMatPtr = frameArena.allocF32(jointCount * 16);
            animf.computeJointMatricesTo(jointMatPtr, skin.skin.jointIndicesPtr, jointCount, skin.skin.invBindPtr, TransformStore.global().worldPtr, skin.bindMatrixPtr);
            this.queue.writeBuffer(skin.boneBuffer, 0, bytes, jointMatPtr, jointCount * 64);
            pass.setBindGroup(2, skin.bindGroup);
          }
          const modelPtr = mesh.transform.worldMatrixPtr;
          const invPtr = this.modelUniformStagingPtr;
          const normalPtr = this.modelUniformStagingPtr + 16 * 4;
          mat4f.invert(invPtr, modelPtr);
          mat4f.transpose(normalPtr, invPtr);
          this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
          this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
          pass.setBindGroup(0, globalBindGroup);
          if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount);
          else pass.draw(geometry.vertexCount);
        }
      }
      i = j;
    }
  }
  executePointCloudDrawList(pass, items) {
    if (items.length === 0) return;
    const bytes = wasmInterop.bytes();
    const mat42 = mat4f;
    let lastPipeline = null;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cloud = item.cloud;
      if (!cloud.visible) continue;
      if (cloud.pointCount <= 0) continue;
      this.ensurePointCloudBindGroup(cloud);
      if (!cloud.bindGroup) continue;
      if (item.pipeline !== lastPipeline) {
        pass.setPipeline(item.pipeline);
        lastPipeline = item.pipeline;
      }
      if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
      const modelSlot = this.modelBufferIndex++;
      const modelBuffer = this.modelUniformBuffers[modelSlot];
      const globalBindGroup = this.globalBindGroups[modelSlot];
      const modelPtr = cloud.transform.worldMatrixPtr;
      const invPtr = this.modelUniformStagingPtr;
      const normalPtr = this.modelUniformStagingPtr + 16 * 4;
      mat42.invert(invPtr, modelPtr);
      mat42.transpose(normalPtr, invPtr);
      this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
      this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
      pass.setBindGroup(0, globalBindGroup);
      pass.setBindGroup(1, cloud.bindGroup);
      pass.draw(6, cloud.pointCount);
    }
  }
  executeGlyphFieldDrawList(pass, list) {
    if (list.length === 0) return;
    const bytes = wasmInterop.bytes();
    let lastPipeline = null;
    let lastGeometry = null;
    let lastField = null;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const field = item.field;
      const geometry = item.geometry;
      if (!field.visible) continue;
      if (field.instanceCount <= 0) continue;
      this.ensureGlyphFieldBindGroup(field);
      if (!field.bindGroup) continue;
      if (item.pipeline !== lastPipeline) {
        pass.setPipeline(item.pipeline);
        lastPipeline = item.pipeline;
        lastGeometry = null;
        lastField = null;
      }
      if (geometry !== lastGeometry) {
        geometry.upload(this.device);
        pass.setVertexBuffer(0, geometry.positionBuffer);
        pass.setVertexBuffer(1, geometry.normalBuffer);
        if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer, "uint32");
        lastGeometry = geometry;
      }
      if (field !== lastField) {
        pass.setBindGroup(1, field.bindGroup);
        lastField = field;
      }
      if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
      const modelSlot = this.modelBufferIndex++;
      const modelBuffer = this.modelUniformBuffers[modelSlot];
      const globalBindGroup = this.globalBindGroups[modelSlot];
      const modelPtr = field.transform.worldMatrixPtr;
      const invPtr = this.modelUniformStagingPtr;
      const normalPtr = this.modelUniformStagingPtr + 16 * 4;
      mat4f.invert(invPtr, modelPtr);
      mat4f.transpose(normalPtr, invPtr);
      this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
      this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
      pass.setBindGroup(0, globalBindGroup);
      if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, field.instanceCount);
      else pass.draw(geometry.vertexCount, field.instanceCount);
    }
  }
  executeTransparentMergedDrawList(pass) {
    this.transparentMergedDrawList.length = 0;
    for (const item of this.transparentDrawList) this.transparentMergedDrawList.push(item);
    for (const item of this.transparentGlyphFieldDrawList) this.transparentMergedDrawList.push(item);
    for (const item of this.transparentPointCloudDrawList) this.transparentMergedDrawList.push(item);
    if (this.transparentMergedDrawList.length === 0) return;
    const typeOrder = (x) => {
      if ("mesh" in x) return 0;
      if ("field" in x) return 1;
      return 2;
    };
    this.transparentMergedDrawList.sort((a, b) => {
      const d0 = b.sortKey - a.sortKey;
      if (d0 !== 0) return d0;
      const d1 = a.pipelineId - b.pipelineId;
      if (d1 !== 0) return d1;
      const aIsMesh = "mesh" in a;
      const bIsMesh = "mesh" in b;
      if (aIsMesh && bIsMesh) {
        const am = a;
        const bm = b;
        return am.materialId - bm.materialId || am.geometryId - bm.geometryId || (am.skinned ? 1 : 0) - (bm.skinned ? 1 : 0) || (am.skinned8 ? 1 : 0) - (bm.skinned8 ? 1 : 0);
      }
      const aIsCloud = "cloud" in a;
      const bIsCloud = "cloud" in b;
      if (aIsCloud && bIsCloud) {
        const ap = a;
        const bp = b;
        return ap.cloudId - bp.cloudId;
      }
      const aIsGlyph = "field" in a;
      const bIsGlyph = "field" in b;
      if (aIsGlyph && bIsGlyph) {
        const ag = a;
        const bg = b;
        return ag.geometryId - bg.geometryId || ag.fieldId - bg.fieldId;
      }
      return typeOrder(a) - typeOrder(b);
    });
    const bytes = wasmInterop.bytes();
    let lastPipeline = null;
    let lastMaterial = null;
    let lastGeometry = null;
    let lastSkinned = false;
    let lastSkinned8 = false;
    let lastCloud = null;
    let lastGlyph = null;
    for (let i = 0; i < this.transparentMergedDrawList.length; i++) {
      const item = this.transparentMergedDrawList[i];
      if ("mesh" in item) {
        const drawItem2 = item;
        const mesh = drawItem2.mesh;
        const geometry = drawItem2.geometry;
        const material = drawItem2.material;
        if (drawItem2.pipeline !== lastPipeline) {
          pass.setPipeline(drawItem2.pipeline);
          lastPipeline = drawItem2.pipeline;
          lastMaterial = null;
          lastGeometry = null;
          lastSkinned = false;
          lastSkinned8 = false;
          lastCloud = null;
          lastGlyph = null;
        }
        if (geometry !== lastGeometry) geometry.upload(this.device);
        if (material !== lastMaterial) this.ensureMaterialBindGroup(material);
        if (material !== lastMaterial) {
          pass.setBindGroup(1, material.bindGroup);
          lastMaterial = material;
        }
        if (geometry !== lastGeometry || drawItem2.skinned !== lastSkinned || drawItem2.skinned8 !== lastSkinned8) {
          pass.setVertexBuffer(0, geometry.positionBuffer);
          pass.setVertexBuffer(1, geometry.normalBuffer);
          pass.setVertexBuffer(2, geometry.uvBuffer);
          if (drawItem2.skinned) {
            pass.setVertexBuffer(3, geometry.jointsBuffer);
            pass.setVertexBuffer(4, geometry.weightsBuffer);
            if (drawItem2.skinned8) {
              pass.setVertexBuffer(5, geometry.joints1Buffer);
              pass.setVertexBuffer(6, geometry.weights1Buffer);
            }
          }
          if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer, "uint32");
          lastGeometry = geometry;
          lastSkinned = drawItem2.skinned;
          lastSkinned8 = drawItem2.skinned8;
        }
        if (drawItem2.skinned) {
          const skin = mesh.skin;
          if (skin) {
            skin.ensureGpuResources(this.device, this.skinBindGroupLayout);
            const jointCount = skin.jointCount | 0;
            const jointMatPtr = frameArena.allocF32(jointCount * 16);
            animf.computeJointMatricesTo(
              jointMatPtr,
              skin.skin.jointIndicesPtr,
              jointCount,
              skin.skin.invBindPtr,
              TransformStore.global().worldPtr,
              skin.bindMatrixPtr
            );
            this.queue.writeBuffer(skin.boneBuffer, 0, bytes, jointMatPtr, jointCount * 64);
            pass.setBindGroup(2, skin.bindGroup);
          }
        }
        if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
        const modelSlot2 = this.modelBufferIndex++;
        const modelBuffer2 = this.modelUniformBuffers[modelSlot2];
        const globalBindGroup2 = this.globalBindGroups[modelSlot2];
        const modelPtr2 = mesh.transform.worldMatrixPtr;
        const invPtr2 = this.modelUniformStagingPtr;
        const normalPtr2 = this.modelUniformStagingPtr + 16 * 4;
        mat4f.invert(invPtr2, modelPtr2);
        mat4f.transpose(normalPtr2, invPtr2);
        this.queue.writeBuffer(modelBuffer2, 0, bytes, modelPtr2, 16 * 4);
        this.queue.writeBuffer(modelBuffer2, 16 * 4, bytes, normalPtr2, 16 * 4);
        pass.setBindGroup(0, globalBindGroup2);
        if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount);
        else pass.draw(geometry.vertexCount);
        continue;
      }
      if ("field" in item) {
        const drawItem2 = item;
        const field = drawItem2.field;
        const geometry = drawItem2.geometry;
        if (!field.visible) continue;
        if (field.instanceCount <= 0) continue;
        this.ensureGlyphFieldBindGroup(field);
        if (!field.bindGroup) continue;
        if (drawItem2.pipeline !== lastPipeline) {
          pass.setPipeline(drawItem2.pipeline);
          lastPipeline = drawItem2.pipeline;
          lastMaterial = null;
          lastGeometry = null;
          lastSkinned = false;
          lastSkinned8 = false;
          lastCloud = null;
          lastGlyph = null;
        }
        if (geometry !== lastGeometry) {
          geometry.upload(this.device);
          pass.setVertexBuffer(0, geometry.positionBuffer);
          pass.setVertexBuffer(1, geometry.normalBuffer);
          if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer, "uint32");
          lastGeometry = geometry;
        }
        if (field !== lastGlyph) {
          pass.setBindGroup(1, field.bindGroup);
          lastGlyph = field;
          lastCloud = null;
          lastMaterial = null;
        }
        if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
        const modelSlot2 = this.modelBufferIndex++;
        const modelBuffer2 = this.modelUniformBuffers[modelSlot2];
        const globalBindGroup2 = this.globalBindGroups[modelSlot2];
        const modelPtr2 = field.transform.worldMatrixPtr;
        const invPtr2 = this.modelUniformStagingPtr;
        const normalPtr2 = this.modelUniformStagingPtr + 16 * 4;
        mat4f.invert(invPtr2, modelPtr2);
        mat4f.transpose(normalPtr2, invPtr2);
        this.queue.writeBuffer(modelBuffer2, 0, bytes, modelPtr2, 16 * 4);
        this.queue.writeBuffer(modelBuffer2, 16 * 4, bytes, normalPtr2, 16 * 4);
        pass.setBindGroup(0, globalBindGroup2);
        if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, field.instanceCount);
        else pass.draw(geometry.vertexCount, field.instanceCount);
        continue;
      }
      const drawItem = item;
      const cloud = drawItem.cloud;
      if (!cloud.visible) continue;
      if (cloud.pointCount <= 0) continue;
      this.ensurePointCloudBindGroup(cloud);
      if (!cloud.bindGroup) continue;
      if (drawItem.pipeline !== lastPipeline) {
        pass.setPipeline(drawItem.pipeline);
        lastPipeline = drawItem.pipeline;
        lastMaterial = null;
        lastGeometry = null;
        lastSkinned = false;
        lastSkinned8 = false;
        lastCloud = null;
        lastGlyph = null;
      }
      if (cloud !== lastCloud) {
        pass.setBindGroup(1, cloud.bindGroup);
        lastCloud = cloud;
        lastGlyph = null;
        lastMaterial = null;
      }
      if (this.modelBufferIndex >= this.modelUniformBuffers.length) this.ensureModelBufferPool(this.modelBufferIndex + 1);
      const modelSlot = this.modelBufferIndex++;
      const modelBuffer = this.modelUniformBuffers[modelSlot];
      const globalBindGroup = this.globalBindGroups[modelSlot];
      const modelPtr = cloud.transform.worldMatrixPtr;
      const invPtr = this.modelUniformStagingPtr;
      const normalPtr = this.modelUniformStagingPtr + 16 * 4;
      mat4f.invert(invPtr, modelPtr);
      mat4f.transpose(normalPtr, invPtr);
      this.queue.writeBuffer(modelBuffer, 0, bytes, modelPtr, 16 * 4);
      this.queue.writeBuffer(modelBuffer, 16 * 4, bytes, normalPtr, 16 * 4);
      pass.setBindGroup(0, globalBindGroup);
      pass.draw(6, cloud.pointCount);
    }
  }
  drawInstancedRun(pass, geometry, material, items, start, count) {
    const ptrsPtr = frameArena.alloc(count * 4, 4);
    const u32 = TransformStore.global().u32();
    const ptrsBase = ptrsPtr >>> 2;
    for (let i = 0; i < count; i++) u32[ptrsBase + i] = items[start + i].mesh.transform.worldMatrixPtr >>> 0;
    const outPtr = frameArena.allocF32(count * 32);
    transformf.packModelNormalMat4FromPtrs(outPtr, ptrsPtr, count);
    const outBytes = count * this.INSTANCE_STRIDE_BYTES;
    const dstOffset = this.instanceBufferOffset;
    const dstEnd = dstOffset + outBytes;
    this.ensureInstanceBuffer(dstEnd);
    const bytes = wasmInterop.bytes();
    this.queue.writeBuffer(this.instanceBuffer, dstOffset, bytes, outPtr, outBytes);
    pass.setBindGroup(0, this.globalBindGroups[0]);
    pass.setVertexBuffer(3, this.instanceBuffer, dstOffset, outBytes);
    if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, count);
    else pass.draw(geometry.vertexCount, count);
    this.instanceBufferOffset = dstEnd;
  }
  getOrCreatePipeline(material, instanced = false, skinned = false, skinned8 = false) {
    if (instanced && skinned) throw new Error("Renderer: instanced + skinned pipelines are not supported (attribute layout conflict).");
    if (skinned8 && !skinned) skinned = true;
    const key = this.getPipelineCacheKey(material, instanced, skinned, skinned8);
    let pipeline = this.pipelineCache.get(key);
    if (pipeline) return pipeline;
    const shaderCode = material.getShaderCode({ instanced, skinned, skinned8 });
    let shaderModule = this.shaderCache.get(shaderCode);
    if (!shaderModule) {
      shaderModule = this.device.createShaderModule({ code: shaderCode });
      this.shaderCache.set(shaderCode, shaderModule);
    }
    const materialBindGroupLayout = material.createBindGroupLayout(this.device);
    const bindGroupLayouts = [this.globalBindGroupLayout, materialBindGroupLayout];
    if (skinned) bindGroupLayouts.push(this.skinBindGroupLayout);
    const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts });
    let buffers;
    if (instanced) {
      buffers = [
        { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
        { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
        { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
        {
          arrayStride: this.INSTANCE_STRIDE_BYTES,
          stepMode: "instance",
          attributes: [
            { shaderLocation: 3, offset: 0, format: "float32x4" },
            { shaderLocation: 4, offset: 16, format: "float32x4" },
            { shaderLocation: 5, offset: 32, format: "float32x4" },
            { shaderLocation: 6, offset: 48, format: "float32x4" },
            { shaderLocation: 7, offset: 64, format: "float32x4" },
            { shaderLocation: 8, offset: 80, format: "float32x4" },
            { shaderLocation: 9, offset: 96, format: "float32x4" },
            { shaderLocation: 10, offset: 112, format: "float32x4" }
          ]
        }
      ];
    } else if (skinned8) {
      buffers = [
        { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
        { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
        { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
        { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: "uint16x4" }] },
        { arrayStride: 16, attributes: [{ shaderLocation: 4, offset: 0, format: "float32x4" }] },
        { arrayStride: 8, attributes: [{ shaderLocation: 5, offset: 0, format: "uint16x4" }] },
        { arrayStride: 16, attributes: [{ shaderLocation: 6, offset: 0, format: "float32x4" }] }
      ];
    } else if (skinned) {
      buffers = [
        { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
        { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
        { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
        { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: "uint16x4" }] },
        { arrayStride: 16, attributes: [{ shaderLocation: 4, offset: 0, format: "float32x4" }] }
      ];
    } else {
      buffers = [
        { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
        { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
        { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] }
      ];
    }
    pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [
          {
            format: this.format,
            blend: this.getBlendState(material.blendMode)
          }
        ]
      },
      primitive: {
        topology: "triangle-list",
        cullMode: this.getCullMode(material.cullMode),
        frontFace: "ccw"
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: material.depthWrite,
        depthCompare: material.depthTest ? "less" : "always"
      }
    });
    this.pipelineCache.set(key, pipeline);
    return pipeline;
  }
  getPipelineCacheKey(material, instanced, skinned, skinned8) {
    const ctorId = this.getObjectId(material.constructor);
    const isBuiltin = material.constructor === UnlitMaterial || material.constructor === StandardMaterial || material.constructor === DataMaterial;
    const matKey = isBuiltin ? `${ctorId}` : `${ctorId}_${this.getObjectId(material)}`;
    return `${matKey}_${material.blendMode}_${material.cullMode}_${material.depthWrite}_${material.depthTest}_${instanced ? "inst" : "mesh"}_${skinned8 ? "skin8" : skinned ? "skin4" : "noskin"}`;
  }
  getBlendState(mode) {
    switch (mode) {
      case "opaque" /* Opaque */:
        return void 0;
      case "transparent" /* Transparent */:
        return {
          color: {
            srcFactor: "src-alpha",
            dstFactor: "one-minus-src-alpha",
            operation: "add"
          },
          alpha: {
            srcFactor: "one",
            dstFactor: "one-minus-src-alpha",
            operation: "add"
          }
        };
      case "additive" /* Additive */:
        return {
          color: {
            srcFactor: "src-alpha",
            dstFactor: "one",
            operation: "add"
          },
          alpha: {
            srcFactor: "one",
            dstFactor: "one",
            operation: "add"
          }
        };
    }
  }
  getCullMode(mode) {
    switch (mode) {
      case "none" /* None */:
        return "none";
      case "back" /* Back */:
        return "back";
      case "front" /* Front */:
        return "front";
    }
  }
  getMaterialBindGroupKey(material) {
    if (material instanceof UnlitMaterial) {
      const bc = material.baseColorTexture;
      return `unlit:${bc?.id ?? 0}:${bc?.revision ?? 0}`;
    }
    if (material instanceof StandardMaterial) {
      const bc = material.baseColorTexture;
      const mr = material.metallicRoughnessTexture;
      const n = material.normalTexture;
      const o = material.occlusionTexture;
      const e = material.emissiveTexture;
      return `standard:${bc?.id ?? 0}:${bc?.revision ?? 0}:${mr?.id ?? 0}:${mr?.revision ?? 0}:${n?.id ?? 0}:${n?.revision ?? 0}:${o?.id ?? 0}:${o?.revision ?? 0}:${e?.id ?? 0}:${e?.revision ?? 0}`;
    }
    if (material instanceof DataMaterial) {
      const bufId = material.dataBuffer ? this.getObjectId(material.dataBuffer) : 0;
      return `data:${bufId}:${material.getColormapKey()}`;
    }
    return "custom";
  }
  ensureMaterialBindGroup(material) {
    if (!material.uniformBuffer) {
      material.uniformBuffer = this.device.createBuffer({
        size: material.getUniformBufferSize(),
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
    }
    if (material.dirty) {
      const data = material.getUniformData();
      this.queue.writeBuffer(material.uniformBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
      material.markClean();
    }
    if (material instanceof DataMaterial) {
      material.upload(this.device, this.queue);
    }
    const key = this.getMaterialBindGroupKey(material);
    if (material.bindGroup && material.bindGroupKey === key) return;
    const layout = material.createBindGroupLayout(this.device);
    if (material instanceof UnlitMaterial) {
      const tex = material.baseColorTexture;
      const sampler = tex ? tex.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler;
      const view = tex ? tex.getView(this.device, this.queue, "srgb", this.fallbackWhiteViewSrgb) : this.fallbackWhiteViewSrgb;
      material.bindGroup = this.device.createBindGroup({
        layout,
        entries: [
          { binding: 0, resource: { buffer: material.uniformBuffer } },
          { binding: 1, resource: sampler },
          { binding: 2, resource: view }
        ]
      });
      material.bindGroupKey = key;
      return;
    }
    if (material instanceof StandardMaterial) {
      const bc = material.baseColorTexture;
      const mr = material.metallicRoughnessTexture;
      const n = material.normalTexture;
      const o = material.occlusionTexture;
      const e = material.emissiveTexture;
      material.bindGroup = this.device.createBindGroup({
        layout,
        entries: [
          { binding: 0, resource: { buffer: material.uniformBuffer } },
          { binding: 1, resource: bc ? bc.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler },
          { binding: 2, resource: bc ? bc.getView(this.device, this.queue, "srgb", this.fallbackWhiteViewSrgb) : this.fallbackWhiteViewSrgb },
          { binding: 3, resource: mr ? mr.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler },
          { binding: 4, resource: mr ? mr.getView(this.device, this.queue, "linear", this.fallbackMRViewLinear) : this.fallbackMRViewLinear },
          { binding: 5, resource: n ? n.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler },
          { binding: 6, resource: n ? n.getView(this.device, this.queue, "linear", this.fallbackNormalViewLinear) : this.fallbackNormalViewLinear },
          { binding: 7, resource: o ? o.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler },
          { binding: 8, resource: o ? o.getView(this.device, this.queue, "linear", this.fallbackOcclusionViewLinear) : this.fallbackOcclusionViewLinear },
          { binding: 9, resource: e ? e.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler },
          { binding: 10, resource: e ? e.getView(this.device, this.queue, "srgb", this.fallbackWhiteViewSrgb) : this.fallbackWhiteViewSrgb }
        ]
      });
      material.bindGroupKey = key;
      return;
    }
    if (material instanceof DataMaterial) {
      if (!this.dataMaterialDummyDataBuffer) {
        this.dataMaterialDummyDataBuffer = this.device.createBuffer({
          size: 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.queue.writeBuffer(this.dataMaterialDummyDataBuffer, 0, new Uint8Array(4));
      }
      const dataBuffer = material.dataBuffer ?? this.dataMaterialDummyDataBuffer;
      const cmap = material.getColormapForBinding().getGPUResources(this.device, this.queue);
      material.bindGroup = this.device.createBindGroup({
        layout,
        entries: [
          { binding: 0, resource: { buffer: material.uniformBuffer } },
          { binding: 1, resource: { buffer: dataBuffer } },
          { binding: 2, resource: cmap.sampler },
          { binding: 3, resource: cmap.view }
        ]
      });
      material.bindGroupKey = key;
      return;
    }
    material.bindGroup = this.device.createBindGroup({
      layout,
      entries: [{ binding: 0, resource: { buffer: material.uniformBuffer } }]
    });
    material.bindGroupKey = key;
  }
  materialSupportsInstancing(material) {
    return material instanceof UnlitMaterial || material instanceof StandardMaterial;
  }
  materialSupportsSkinning(material) {
    return material instanceof UnlitMaterial || material instanceof StandardMaterial;
  }
  ensureInstanceBuffer(byteLength) {
    if (this.instanceBuffer && this.instanceBufferCapacityBytes >= byteLength) return;
    this.instanceBuffer?.destroy();
    let cap = this.instanceBufferCapacityBytes || this.INSTANCE_STRIDE_BYTES * 256;
    while (cap < byteLength) cap *= 2;
    this.instanceBufferCapacityBytes = cap;
    this.instanceBuffer = this.device.createBuffer({
      size: cap,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
  }
  getPointCloudBindGroupLayout() {
    if (this.pointCloudBindGroupLayout) return this.pointCloudBindGroupLayout;
    this.pointCloudBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform", minBindingSize: 176 }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" }
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float", viewDimension: "1d" }
        }
      ]
    });
    return this.pointCloudBindGroupLayout;
  }
  getPointCloudPipelineCacheKey(cloud) {
    return ["pointcloud", `blend=${cloud.blendMode}`, `depthTest=${cloud.depthTest ? 1 : 0}`, `depthWrite=${cloud.depthWrite ? 1 : 0}`, `fmt=${this.format}`].join("|");
  }
  getOrCreatePointCloudPipeline(cloud) {
    const key = this.getPointCloudPipelineCacheKey(cloud);
    const cached = this.pipelineCache.get(key);
    if (cached) return cached;
    let shaderModule = this.shaderCache.get(pointcloud_default);
    if (!shaderModule) {
      shaderModule = this.device.createShaderModule({ code: pointcloud_default });
      this.shaderCache.set(pointcloud_default, shaderModule);
    }
    const bindGroupLayout = this.getPointCloudBindGroupLayout();
    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.globalBindGroupLayout, bindGroupLayout]
    });
    const blend = this.getBlendState(cloud.blendMode);
    const pipeline = this.device.createRenderPipeline({
      label: key,
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: []
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [
          {
            format: this.format,
            blend
          }
        ]
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "none"
      },
      depthStencil: cloud.depthTest ? {
        format: "depth24plus",
        depthWriteEnabled: cloud.depthWrite,
        depthCompare: "less"
      } : void 0
    });
    this.pipelineCache.set(key, pipeline);
    return pipeline;
  }
  getPointCloudBindGroupKey(cloud) {
    const points = cloud.pointsBuffer;
    const uniforms = cloud.uniformBuffer;
    return `pointcloud:${points ? this.getObjectId(points) : 0}:${uniforms ? this.getObjectId(uniforms) : 0}:${cloud.getColormapKey()}`;
  }
  ensurePointCloudBindGroup(cloud) {
    cloud.upload(this.device, this.queue);
    if (!cloud.pointsBuffer) return;
    if (cloud.pointCount <= 0) return;
    if (!cloud.uniformBuffer) {
      cloud.uniformBuffer = this.device.createBuffer({
        size: cloud.getUniformBufferSize(),
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
      cloud.bindGroupKey = null;
    }
    if (cloud.dirtyUniforms) {
      const data = cloud.getUniformData();
      this.queue.writeBuffer(cloud.uniformBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
      cloud.markUniformsClean();
    }
    const key = this.getPointCloudBindGroupKey(cloud);
    if (cloud.bindGroup && cloud.bindGroupKey === key) return;
    const layout = this.getPointCloudBindGroupLayout();
    const cmapGPU = cloud.getColormapForBinding().getGPUResources(this.device, this.queue);
    cloud.bindGroup = this.device.createBindGroup({
      layout,
      entries: [
        { binding: 0, resource: { buffer: cloud.pointsBuffer } },
        { binding: 1, resource: { buffer: cloud.uniformBuffer } },
        { binding: 2, resource: cmapGPU.sampler },
        { binding: 3, resource: cmapGPU.view }
      ]
    });
    cloud.bindGroupKey = key;
  }
  getGlyphFieldBindGroupLayout() {
    if (this.glyphFieldBindGroupLayout) return this.glyphFieldBindGroupLayout;
    this.glyphFieldBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" }
        },
        {
          binding: 3,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" }
        },
        {
          binding: 4,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform", minBindingSize: 176 }
        },
        {
          binding: 5,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" }
        },
        {
          binding: 6,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float", viewDimension: "1d" }
        }
      ]
    });
    return this.glyphFieldBindGroupLayout;
  }
  getOrCreateGlyphFieldPipeline(field) {
    const key = `glyphfield:${this.format}:${field.blendMode}:${field.depthWrite ? 1 : 0}:${field.depthTest ? 1 : 0}:${field.cullMode}`;
    const cached = this.pipelineCache.get(key);
    if (cached) return cached;
    const shaderCode = glyphfield_default;
    let shaderModule = this.shaderCache.get(shaderCode);
    if (!shaderModule) {
      shaderModule = this.device.createShaderModule({ code: shaderCode });
      this.shaderCache.set(shaderCode, shaderModule);
    }
    const layout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.globalBindGroupLayout, this.getGlyphFieldBindGroupLayout()]
    });
    const pipeline = this.device.createRenderPipeline({
      layout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }]
          },
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }]
          }
        ]
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [{ format: this.format, blend: this.getBlendState(field.blendMode) }]
      },
      primitive: {
        topology: "triangle-list",
        cullMode: this.getCullMode(field.cullMode)
      },
      depthStencil: field.depthTest || field.depthWrite ? {
        format: "depth24plus",
        depthWriteEnabled: field.depthWrite,
        depthCompare: field.depthTest ? "less" : "always"
      } : void 0
    });
    this.pipelineCache.set(key, pipeline);
    return pipeline;
  }
  getGlyphFieldBindGroupKey(field) {
    const p = field.positionsBuffer;
    const r = field.rotationsBuffer;
    const s = field.scalesBuffer;
    const a = field.attributesBuffer;
    const u = field.uniformBuffer;
    return `glyphfield:${p ? this.getObjectId(p) : 0}:${r ? this.getObjectId(r) : 0}:${s ? this.getObjectId(s) : 0}:${a ? this.getObjectId(a) : 0}:${u ? this.getObjectId(u) : 0}:${field.getColormapKey()}`;
  }
  ensureGlyphFieldBindGroup(field) {
    field.upload(this.device, this.queue);
    if (!field.positionsBuffer) return;
    if (!field.rotationsBuffer) return;
    if (!field.scalesBuffer) return;
    if (field.instanceCount <= 0) return;
    if (!field.uniformBuffer) {
      field.uniformBuffer = this.device.createBuffer({
        size: field.getUniformBufferSize(),
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
      field.bindGroupKey = null;
    }
    if (field.dirtyUniforms) {
      const data = field.getUniformData();
      this.queue.writeBuffer(field.uniformBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
      field.markUniformsClean();
    }
    if (!field.attributesBuffer) {
      if (!this.glyphFieldDummyAttributesBuffer) {
        this.glyphFieldDummyAttributesBuffer = this.device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
      }
      field.attributesBuffer = this.glyphFieldDummyAttributesBuffer;
      field.bindGroupKey = null;
    }
    const key = this.getGlyphFieldBindGroupKey(field);
    if (field.bindGroup && field.bindGroupKey === key) return;
    const layout = this.getGlyphFieldBindGroupLayout();
    const cmapGPU = field.getColormapForBinding().getGPUResources(this.device, this.queue);
    field.bindGroup = this.device.createBindGroup({
      layout,
      entries: [
        { binding: 0, resource: { buffer: field.positionsBuffer } },
        { binding: 1, resource: { buffer: field.rotationsBuffer } },
        { binding: 2, resource: { buffer: field.scalesBuffer } },
        { binding: 3, resource: { buffer: field.attributesBuffer } },
        { binding: 4, resource: { buffer: field.uniformBuffer } },
        { binding: 5, resource: cmapGPU.sampler },
        { binding: 6, resource: cmapGPU.view }
      ]
    });
    field.bindGroupKey = key;
  }
};

// src/core/stats.ts
var RollingAverage = class {
  constructor(capacity) {
    this.capacity = capacity;
    this.values = new Float64Array(Math.max(1, capacity | 0));
  }
  values;
  cursor = 0;
  count = 0;
  total = 0;
  addSample(v) {
    if (!Number.isFinite(v) || v < 0) return;
    const i = this.cursor;
    this.total -= this.values[i];
    this.values[i] = v;
    this.total += v;
    this.cursor = (i + 1) % this.values.length;
    if (this.count < this.values.length) this.count++;
  }
  get() {
    return this.count > 0 ? this.total / this.count : 0;
  }
};
var clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
var formatNumber = (x, decimals) => {
  if (!Number.isFinite(x)) return "n/a";
  const d = Math.max(0, decimals | 0);
  return x.toFixed(d);
};
var formatBytes = (bytes, decimals) => {
  if (!Number.isFinite(bytes)) return "n/a";
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${formatNumber(bytes, 0)} B`;
  if (abs < 1024 * 1024) return `${formatNumber(bytes / 1024, decimals)} KiB`;
  return `${formatNumber(bytes / (1024 * 1024), decimals)} MiB`;
};
var PerformanceStats = class {
  element;
  textEl;
  graphCanvas;
  graphCtx;
  sources;
  fpsAvg;
  frameMsAvg;
  cpuMsAvg;
  gpuMsAvg;
  history;
  historyCursor = 0;
  targetFps;
  updateIntervalMs;
  decimals;
  lastTextUpdateMs = 0;
  lastDtSeconds = 0;
  show;
  label;
  constructor(sources = {}, desc = {}) {
    if (typeof document === "undefined") throw new Error("PerformanceStats requires a DOM environment (document is undefined).");
    this.sources = sources;
    this.targetFps = Math.max(1, desc.targetFps ?? 60);
    this.updateIntervalMs = Math.max(0, desc.updateIntervalMs ?? 250);
    this.decimals = Math.max(0, desc.decimals ?? 1);
    const historyLength = Math.max(4, desc.historyLength ?? 60) | 0;
    this.history = new Float32Array(historyLength);
    const avgWindow = Math.max(1, Math.min(240, historyLength));
    this.fpsAvg = new RollingAverage(avgWindow);
    this.frameMsAvg = new RollingAverage(avgWindow);
    this.cpuMsAvg = new RollingAverage(avgWindow);
    this.gpuMsAvg = new RollingAverage(avgWindow);
    this.show = {
      showFps: desc.showFps ?? true,
      showFrameTime: desc.showFrameTime ?? true,
      showCpuTime: desc.showCpuTime ?? true,
      showGpuTime: desc.showGpuTime ?? true,
      showMemory: desc.showMemory ?? true,
      showCulling: desc.showCulling ?? false,
      graph: desc.graph ?? true
    };
    this.label = desc.label ?? null;
    const canvas = desc.canvas ?? null;
    const parent = desc.parent ?? canvas?.parentElement ?? document.body;
    const position = desc.position ?? "top-left";
    const paddingPx = Math.max(0, desc.paddingPx ?? 8);
    const zIndex = (desc.zIndex ?? 9999) | 0;
    const pointerEvents = desc.pointerEvents ?? "none";
    const el = document.createElement("div");
    this.element = el;
    el.style.position = parent === document.body || parent === document.documentElement ? "fixed" : "absolute";
    el.style.zIndex = String(zIndex);
    el.style.pointerEvents = pointerEvents;
    el.style.padding = `${paddingPx}px`;
    el.style.background = "rgba(0, 0, 0, 0.75)";
    el.style.color = "#ffffff";
    el.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    el.style.fontSize = "12px";
    el.style.lineHeight = "1.2";
    el.style.whiteSpace = "pre";
    el.style.userSelect = "none";
    if (el.style.position === "absolute") {
      const cs = getComputedStyle(parent);
      if (cs.position === "static") parent.style.position = "relative";
    }
    if (position.includes("top")) el.style.top = "0";
    if (position.includes("bottom")) el.style.bottom = "0";
    if (position.includes("left")) el.style.left = "0";
    if (position.includes("right")) el.style.right = "0";
    const textEl = document.createElement("pre");
    this.textEl = textEl;
    textEl.style.margin = "0";
    textEl.style.padding = "0";
    textEl.style.whiteSpace = "pre";
    el.appendChild(textEl);
    if (this.show.graph) {
      const gw = Math.max(32, desc.graphWidthPx ?? 120) | 0;
      const gh = Math.max(16, desc.graphHeightPx ?? 40) | 0;
      const gc = document.createElement("canvas");
      gc.style.display = "block";
      gc.style.marginTop = "6px";
      gc.style.width = `${gw}px`;
      gc.style.height = `${gh}px`;
      const dpr = Math.max(1, globalThis.devicePixelRatio || 1);
      gc.width = Math.max(1, Math.floor(gw * dpr));
      gc.height = Math.max(1, Math.floor(gh * dpr));
      const ctx = gc.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      this.graphCanvas = gc;
      this.graphCtx = ctx;
      el.appendChild(gc);
    } else {
      this.graphCanvas = null;
      this.graphCtx = null;
    }
    parent.appendChild(el);
    this.refreshText();
  }
  update(dtSeconds, cpuFrameMs = 0) {
    this.lastDtSeconds = dtSeconds;
    const frameMs = dtSeconds * 1e3;
    const fps = dtSeconds > 0 ? 1 / dtSeconds : 0;
    this.fpsAvg.addSample(fps);
    this.frameMsAvg.addSample(frameMs);
    this.cpuMsAvg.addSample(cpuFrameMs);
    const gpuNs = this.sources.getGpuTimeNs?.() ?? null;
    if (gpuNs !== null && Number.isFinite(gpuNs)) this.gpuMsAvg.addSample(gpuNs / 1e6);
    this.history[this.historyCursor] = fps;
    this.historyCursor = (this.historyCursor + 1) % this.history.length;
    this.drawGraph();
    const nowMs = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    if (this.updateIntervalMs === 0 || nowMs - this.lastTextUpdateMs >= this.updateIntervalMs) {
      this.lastTextUpdateMs = nowMs;
      this.refreshText();
    }
  }
  destroy() {
    this.element.remove();
  }
  drawGraph() {
    if (!this.graphCanvas || !this.graphCtx) return;
    const ctx = this.graphCtx;
    const w = parseFloat(this.graphCanvas.style.width) || 120;
    const h = parseFloat(this.graphCanvas.style.height) || 40;
    ctx.clearRect(0, 0, w, h);
    const n = this.history.length;
    const barW = w / n;
    const scale = h / this.targetFps;
    for (let i = 0; i < n; i++) {
      const idx = (this.historyCursor + i) % n;
      const fps = this.history[idx];
      const barH = clamp(fps * scale, 0, h);
      const x = i * barW;
      const y = h - barH;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(x, y, Math.max(1, barW - 0.5), barH);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }
  refreshText() {
    const d = this.decimals;
    const lines = [];
    if (this.label) lines.push(this.label);
    const fpsAvg = this.fpsAvg.get();
    const frameMsAvg = this.frameMsAvg.get();
    const hz = frameMsAvg > 0 ? 1e3 / frameMsAvg : 0;
    const cpuMsAvg = this.cpuMsAvg.get();
    if (this.show.showFps) lines.push(`FPS: ${formatNumber(fpsAvg, 1)}`);
    if (this.show.showFrameTime) lines.push(`Frame: ${formatNumber(frameMsAvg, d)} ms (\u2248${formatNumber(hz, 0)} Hz)`);
    if (this.show.showCpuTime) {
      const denom = Math.max(1e-4, this.lastDtSeconds) * 1e3;
      const load = clamp(cpuMsAvg / denom * 100, 0, 1e3);
      lines.push(`CPU: ${formatNumber(cpuMsAvg, d)} ms (${formatNumber(load, 0)}%)`);
    }
    if (this.show.showGpuTime) {
      const gpuNs = this.sources.getGpuTimeNs?.() ?? null;
      if (gpuNs === null || !Number.isFinite(gpuNs)) {
        lines.push("GPU: n/a");
      } else {
        const gpuAvg = this.gpuMsAvg.get();
        const denom = Math.max(1e-4, this.lastDtSeconds) * 1e3;
        const load = clamp(gpuAvg / denom * 100, 0, 1e3);
        lines.push(`GPU: ${formatNumber(gpuAvg, d)} ms (${formatNumber(load, 0)}%)`);
      }
    }
    if (this.show.showMemory) {
      try {
        const used = frameArena.usedBytes();
        const cap = frameArena.capBytes();
        lines.push(`Frame arena: ${formatBytes(used, d)} / ${formatBytes(cap, d)}`);
      } catch {
      }
      try {
        const memBytes = wasm.memory().buffer.byteLength;
        lines.push(`WASM memory: ${formatBytes(memBytes, d)}`);
      } catch {
      }
      const pm = typeof performance !== "undefined" ? performance.memory : null;
      if (pm && typeof pm.usedJSHeapSize === "number") {
        const used = pm.usedJSHeapSize;
        const total = typeof pm.totalJSHeapSize === "number" ? pm.totalJSHeapSize : NaN;
        if (Number.isFinite(total)) lines.push(`JS heap: ${formatBytes(used, d)} / ${formatBytes(total, d)}`);
        else lines.push(`JS heap: ${formatBytes(used, d)}`);
      }
    }
    if (this.show.showCulling) {
      const stats = this.sources.getCullingStats?.() ?? null;
      if (stats) lines.push(`Culling: visible ${stats.visible} / tested ${stats.tested}`);
    }
    this.textEl.textContent = lines.join("\n");
  }
};

// src/compute/buffer.ts
var isArrayBufferView = (x) => {
  return ArrayBuffer.isView(x);
};
var resolveSourceRange = (data, srcOffsetBytes = 0, sizeBytes) => {
  if (isArrayBufferView(data)) {
    const baseOffset = data.byteOffset + srcOffsetBytes;
    const maxSize2 = data.byteLength - srcOffsetBytes;
    const size2 = sizeBytes === void 0 ? maxSize2 : Math.min(maxSize2, sizeBytes);
    return { buffer: data.buffer, offset: baseOffset, size: size2 };
  }
  const maxSize = data.byteLength - srcOffsetBytes;
  const size = sizeBytes === void 0 ? maxSize : Math.min(maxSize, sizeBytes);
  return { buffer: data, offset: srcOffsetBytes, size };
};
var queueWriteBufferAligned = (queue, dst, dstOffsetBytes, data, srcOffsetBytes = 0, sizeBytes) => {
  assert(Number.isInteger(dstOffsetBytes) && dstOffsetBytes >= 0, `dstOffsetBytes must be an integer >= 0 (got ${dstOffsetBytes})`);
  const src = resolveSourceRange(data, srcOffsetBytes, sizeBytes);
  assert((dstOffsetBytes & 3) === 0, `dstOffsetBytes must be 4-byte aligned (got ${dstOffsetBytes})`);
  assert((src.offset & 3) === 0, `srcOffsetBytes must be 4-byte aligned (got ${src.offset})`);
  const alignedSize = alignTo(src.size, 4);
  if (alignedSize === src.size) {
    queue.writeBuffer(dst, dstOffsetBytes, src.buffer, src.offset, src.size);
    return;
  }
  const tmp = new Uint8Array(alignedSize);
  tmp.set(new Uint8Array(src.buffer, src.offset, src.size));
  queue.writeBuffer(dst, dstOffsetBytes, tmp, 0, alignedSize);
};
var GpuBuffer = class {
  device;
  queue;
  buffer;
  byteLength;
  usage;
  constructor(device, queue, buffer, byteLength, usage) {
    this.device = device;
    this.queue = queue;
    this.buffer = buffer;
    this.byteLength = byteLength;
    this.usage = usage;
  }
  destroy() {
    this.buffer.destroy();
  }
  write(data, dstOffsetBytes = 0, srcOffsetBytes = 0, sizeBytes) {
    queueWriteBufferAligned(this.queue, this.buffer, dstOffsetBytes, data, srcOffsetBytes, sizeBytes);
  }
  writeFromArrayBuffer(src, srcOffsetBytes, sizeBytes, dstOffsetBytes = 0) {
    this.write(src, dstOffsetBytes, srcOffsetBytes, sizeBytes);
  }
  writeFromWasmMemory(mem, srcPtrBytes, sizeBytes, dstOffsetBytes = 0) {
    const view = new Uint8Array(mem.buffer, srcPtrBytes >>> 0, sizeBytes >>> 0);
    this.write(view, dstOffsetBytes, 0, sizeBytes);
  }
};
var StorageBuffer = class extends GpuBuffer {
  label;
  constructor(device, queue, desc) {
    const byteLength = desc.data ? resolveSourceRange(desc.data).size : desc.byteLength ?? 0;
    assert(Number.isInteger(byteLength) && byteLength >= 0, `StorageBuffer.byteLength must be an integer >= 0 (got ${byteLength})`);
    const size = alignTo(byteLength, 4);
    let usage = GPUBufferUsage.STORAGE;
    if (desc.copyDst !== false) usage |= GPUBufferUsage.COPY_DST;
    if (desc.copySrc) usage |= GPUBufferUsage.COPY_SRC;
    if (desc.usage) usage |= desc.usage;
    const buffer = device.createBuffer({
      label: desc.label,
      size: Math.max(4, size),
      usage,
      mappedAtCreation: !!desc.data
    });
    if (desc.data) {
      const src = resolveSourceRange(desc.data);
      const dstBytes = new Uint8Array(buffer.getMappedRange());
      dstBytes.fill(0);
      dstBytes.set(new Uint8Array(src.buffer, src.offset, src.size), 0);
      buffer.unmap();
    }
    super(device, queue, buffer, byteLength, usage);
    this.label = desc.label ?? null;
  }
  get canReadback() {
    return (this.usage & GPUBufferUsage.COPY_SRC) !== 0;
  }
  async read(srcOffsetBytes = 0, sizeBytes) {
    assert(this.canReadback, "StorageBuffer.read() requires the buffer to be created with copySrc: true");
    assert(Number.isInteger(srcOffsetBytes) && srcOffsetBytes >= 0, `srcOffsetBytes must be an integer >= 0 (got ${srcOffsetBytes})`);
    const size = sizeBytes ?? this.byteLength - srcOffsetBytes;
    assert(Number.isInteger(size) && size >= 0, `sizeBytes must be an integer >= 0 (got ${size})`);
    assert(srcOffsetBytes + size <= this.byteLength, `read range out of bounds (offset ${srcOffsetBytes}, size ${size}, byteLength ${this.byteLength})`);
    const alignedSize = alignTo(size, 4);
    const srcOffsetAligned = alignTo(srcOffsetBytes, 4);
    assert(srcOffsetAligned === srcOffsetBytes, `srcOffsetBytes must be 4-byte aligned for readback (got ${srcOffsetBytes})`);
    const staging = this.device.createBuffer({
      size: Math.max(4, alignedSize),
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(this.buffer, srcOffsetBytes, staging, 0, alignedSize);
    this.queue.submit([encoder.finish()]);
    await staging.mapAsync(GPUMapMode.READ, 0, alignedSize);
    const mapped = staging.getMappedRange(0, alignedSize);
    const out = mapped.slice(0, size);
    staging.unmap();
    staging.destroy();
    return out;
  }
  async readAs(ctor, srcOffsetBytes = 0, sizeBytes) {
    const bytes = await this.read(srcOffsetBytes, sizeBytes);
    const bpe = ctor.BYTES_PER_ELEMENT;
    assert(bytes.byteLength % bpe === 0, `readAs: byteLength (${bytes.byteLength}) is not divisible by BYTES_PER_ELEMENT (${bpe})`);
    const len = bytes.byteLength / bpe;
    return new ctor(bytes, 0, len);
  }
};
var UniformBuffer = class extends GpuBuffer {
  label;
  constructor(device, queue, desc) {
    const byteLength = desc.data ? resolveSourceRange(desc.data).size : desc.byteLength ?? 0;
    assert(Number.isInteger(byteLength) && byteLength >= 0, `UniformBuffer.byteLength must be an integer >= 0 (got ${byteLength})`);
    const size = alignTo(byteLength, 4);
    let usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
    if (desc.usage) usage |= desc.usage;
    const buffer = device.createBuffer({
      label: desc.label,
      size: Math.max(4, size),
      usage,
      mappedAtCreation: !!desc.data
    });
    if (desc.data) {
      const src = resolveSourceRange(desc.data);
      const dstBytes = new Uint8Array(buffer.getMappedRange());
      dstBytes.fill(0);
      dstBytes.set(new Uint8Array(src.buffer, src.offset, src.size), 0);
      buffer.unmap();
    }
    super(device, queue, buffer, byteLength, usage);
    this.label = desc.label ?? null;
  }
};

// src/compute/pipeline.ts
var storageBufferLayout = (opts) => {
  return {
    binding: opts.binding,
    visibility: opts.visibility ?? GPUShaderStage.COMPUTE,
    buffer: {
      type: opts.readOnly ? "read-only-storage" : "storage",
      hasDynamicOffset: opts.hasDynamicOffset ?? false,
      minBindingSize: opts.minBindingSize
    }
  };
};
var isGpuBuffer = (r) => {
  return r.mapState !== void 0;
};
var resolveBuffer = (res) => {
  if (isGpuBuffer(res)) return res;
  return res.buffer;
};
var resolveBufferBinding = (resource) => {
  if (isGpuBuffer(resource)) return { buffer: resource };
  if (resource.buffer !== void 0 && resource.device !== void 0) {
    const buf2 = resolveBuffer(resource);
    return { buffer: buf2 };
  }
  const bb = resource;
  const buf = resolveBuffer(bb.buffer);
  return {
    buffer: buf,
    offset: bb.offset,
    size: bb.size
  };
};
var resourcesToEntries = (resources) => {
  const entries = [];
  if (Array.isArray(resources)) {
    for (const e of resources) {
      entries.push({
        binding: e.binding,
        resource: resolveBufferBinding(e.resource)
      });
    }
    return entries;
  }
  const keys = Object.keys(resources).map((k) => Number(k)).filter((n) => Number.isFinite(n));
  keys.sort((a, b) => a - b);
  for (const binding of keys) {
    const resource = resources[binding];
    if (!resource) continue;
    entries.push({ binding, resource: resolveBufferBinding(resource) });
  }
  return entries;
};
var ComputePipeline = class {
  device;
  shaderCode;
  entryPoint;
  constants;
  pipeline;
  bindGroupLayouts;
  label;
  constructor(device, desc) {
    this.device = device;
    this.shaderCode = desc.code;
    this.entryPoint = desc.entryPoint ?? "main";
    this.constants = desc.constants;
    this.label = desc.label ?? null;
    const module = device.createShaderModule({ code: desc.code });
    if (desc.bindGroups && desc.bindGroups.length > 0) {
      const layouts = desc.bindGroups.map((g) => device.createBindGroupLayout({ label: g.label, entries: g.entries }));
      const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: layouts });
      this.pipeline = device.createComputePipeline({
        label: desc.label,
        layout: pipelineLayout,
        compute: {
          module,
          entryPoint: this.entryPoint,
          constants: this.constants
        }
      });
      this.bindGroupLayouts = layouts;
    } else {
      this.pipeline = device.createComputePipeline({
        label: desc.label,
        layout: "auto",
        compute: {
          module,
          entryPoint: this.entryPoint,
          constants: this.constants
        }
      });
      this.bindGroupLayouts = [];
    }
  }
  getBindGroupLayout(groupIndex) {
    if (this.bindGroupLayouts.length > 0) {
      const layout = this.bindGroupLayouts[groupIndex];
      assert(!!layout, `Bind group layout ${groupIndex} not found (pipeline has ${this.bindGroupLayouts.length} explicit groups)`);
      return layout;
    }
    return this.pipeline.getBindGroupLayout(groupIndex);
  }
  createBindGroup(groupIndex, resources, label) {
    const layout = this.getBindGroupLayout(groupIndex);
    const entries = resourcesToEntries(resources);
    return this.device.createBindGroup({
      label,
      layout,
      entries
    });
  }
};

// src/compute/workgroups.ts
var isPositiveInt = (n) => Number.isInteger(n) && n > 0;
var isNonNegativeInt = (n) => Number.isInteger(n) && n >= 0;
var ceilDiv = (n, d) => {
  assert(Number.isFinite(n) && Number.isFinite(d), "ceilDiv expects finite numbers");
  assert(d !== 0, "ceilDiv divisor must be non-zero");
  return Math.floor((n + d - 1) / d);
};
var makeWorkgroupSize = (x, y = 1, z = 1) => {
  assert(isPositiveInt(x), `workgroupSize.x must be a positive integer (got ${x})`);
  assert(isPositiveInt(y), `workgroupSize.y must be a positive integer (got ${y})`);
  assert(isPositiveInt(z), `workgroupSize.z must be a positive integer (got ${z})`);
  return [x, y, z];
};
var makeWorkgroupCounts = (x, y = 1, z = 1) => {
  assert(isNonNegativeInt(x), `workgroups.x must be an integer >= 0 (got ${x})`);
  assert(isNonNegativeInt(y), `workgroups.y must be an integer >= 0 (got ${y})`);
  assert(isNonNegativeInt(z), `workgroups.z must be an integer >= 0 (got ${z})`);
  return [x, y, z];
};
var workgroups1D = (invocations, workgroupSizeX) => {
  assert(Number.isFinite(invocations), `invocations must be finite (got ${invocations})`);
  assert(invocations >= 0, `invocations must be >= 0 (got ${invocations})`);
  assert(isPositiveInt(workgroupSizeX), `workgroupSizeX must be a positive integer (got ${workgroupSizeX})`);
  if (invocations === 0) return [0, 1, 1];
  const x = ceilDiv(invocations, workgroupSizeX);
  return [x, 1, 1];
};
var workgroups2D = (width, height, workgroupSizeX, workgroupSizeY) => {
  assert(Number.isFinite(width) && Number.isFinite(height), "width/height must be finite");
  assert(width >= 0 && height >= 0, `width/height must be >= 0 (got ${width}x${height})`);
  assert(isPositiveInt(workgroupSizeX), `workgroupSizeX must be a positive integer (got ${workgroupSizeX})`);
  assert(isPositiveInt(workgroupSizeY), `workgroupSizeY must be a positive integer (got ${workgroupSizeY})`);
  if (width === 0 || height === 0) return [0, 1, 1];
  const x = ceilDiv(width, workgroupSizeX);
  const y = ceilDiv(height, workgroupSizeY);
  return [x, y, 1];
};
var workgroups3D = (width, height, depth, workgroupSizeX, workgroupSizeY, workgroupSizeZ) => {
  assert(Number.isFinite(width) && Number.isFinite(height) && Number.isFinite(depth), "width/height/depth must be finite");
  assert(width >= 0 && height >= 0 && depth >= 0, `width/height/depth must be >= 0 (got ${width}x${height}x${depth})`);
  assert(isPositiveInt(workgroupSizeX), `workgroupSizeX must be a positive integer (got ${workgroupSizeX})`);
  assert(isPositiveInt(workgroupSizeY), `workgroupSizeY must be a positive integer (got ${workgroupSizeY})`);
  assert(isPositiveInt(workgroupSizeZ), `workgroupSizeZ must be a positive integer (got ${workgroupSizeZ})`);
  if (width === 0 || height === 0 || depth === 0) return [0, 1, 1];
  const x = ceilDiv(width, workgroupSizeX);
  const y = ceilDiv(height, workgroupSizeY);
  const z = ceilDiv(depth, workgroupSizeZ);
  return [x, y, z];
};

// src/compute/dispatch.ts
var isNonNegativeInt2 = (n) => Number.isInteger(n) && n >= 0;
var normalizeWorkgroups = (w) => {
  if (Array.isArray(w)) {
    const x2 = w[0] ?? 0;
    const y2 = w[1] ?? 1;
    const z2 = w[2] ?? 1;
    assert(isNonNegativeInt2(x2), `workgroups.x must be an integer >= 0 (got ${x2})`);
    assert(isNonNegativeInt2(y2), `workgroups.y must be an integer >= 0 (got ${y2})`);
    assert(isNonNegativeInt2(z2), `workgroups.z must be an integer >= 0 (got ${z2})`);
    return { x: x2, y: y2, z: z2 };
  }
  const x = w.x;
  const y = w.y ?? 1;
  const z = w.z ?? 1;
  assert(isNonNegativeInt2(x), `workgroups.x must be an integer >= 0 (got ${x})`);
  assert(isNonNegativeInt2(y), `workgroups.y must be an integer >= 0 (got ${y})`);
  assert(isNonNegativeInt2(z), `workgroups.z must be an integer >= 0 (got ${z})`);
  return { x, y, z };
};
var validateWorkgroupsForDevice = (device, workgroups) => {
  const { x, y, z } = normalizeWorkgroups(workgroups);
  const max = device.limits.maxComputeWorkgroupsPerDimension;
  assert(x <= max && y <= max && z <= max, `dispatchWorkgroups exceeds device.limits.maxComputeWorkgroupsPerDimension (${max})`);
};
var resolvePipeline = (p) => {
  return p instanceof ComputePipeline ? p.pipeline : p;
};
var encodeDispatch = (encoder, cmd) => {
  const pass = encoder.beginComputePass({ label: cmd.label });
  const pipeline = resolvePipeline(cmd.pipeline);
  pass.setPipeline(pipeline);
  if (cmd.bindGroups) {
    for (let i = 0; i < cmd.bindGroups.length; i++) {
      const bg = cmd.bindGroups[i];
      if (bg) pass.setBindGroup(i, bg);
    }
  }
  const { x, y, z } = normalizeWorkgroups(cmd.workgroups);
  if (x > 0 && y > 0 && z > 0) pass.dispatchWorkgroups(x, y, z);
  pass.end();
};
var encodeDispatchBatch = (encoder, commands, label) => {
  const pass = encoder.beginComputePass({ label });
  let lastPipeline = null;
  for (const cmd of commands) {
    const pipeline = resolvePipeline(cmd.pipeline);
    if (pipeline !== lastPipeline) {
      pass.setPipeline(pipeline);
      lastPipeline = pipeline;
    }
    if (cmd.bindGroups) {
      for (let i = 0; i < cmd.bindGroups.length; i++) {
        const bg = cmd.bindGroups[i];
        if (bg) pass.setBindGroup(i, bg);
      }
    }
    const { x, y, z } = normalizeWorkgroups(cmd.workgroups);
    if (x === 0 || y === 0 || z === 0) continue;
    if (cmd.label) pass.pushDebugGroup(cmd.label);
    pass.dispatchWorkgroups(x, y, z);
    if (cmd.label) pass.popDebugGroup();
  }
  pass.end();
};

// src/compute/scratch.ts
var ScratchBufferPool = class {
  device;
  usage;
  labelPrefix;
  buffersBySize = /* @__PURE__ */ new Map();
  cursorBySize = /* @__PURE__ */ new Map();
  constructor(device, opts) {
    this.device = device;
    this.usage = opts.usage;
    this.labelPrefix = opts.labelPrefix ?? "scratch";
  }
  acquire(byteLength, label) {
    assert(Number.isInteger(byteLength) && byteLength >= 0, `ScratchBufferPool.acquire: byteLength must be an integer >= 0 (got ${byteLength})`);
    const size = Math.max(4, alignTo(byteLength, 4));
    let list = this.buffersBySize.get(size);
    if (!list) {
      list = [];
      this.buffersBySize.set(size, list);
    }
    const cursor = this.cursorBySize.get(size) ?? 0;
    let buf;
    if (cursor < list.length) {
      buf = list[cursor];
    } else {
      const baseLabel = label ? `${this.labelPrefix}:${label}` : `${this.labelPrefix}:${size}`;
      const indexedLabel = cursor === 0 ? baseLabel : `${baseLabel}:${cursor}`;
      buf = this.device.createBuffer({
        label: indexedLabel,
        size,
        usage: this.usage
      });
      list.push(buf);
    }
    this.cursorBySize.set(size, cursor + 1);
    return buf;
  }
  reset() {
    for (const size of this.cursorBySize.keys()) this.cursorBySize.set(size, 0);
  }
  destroy() {
    for (const list of this.buffersBySize.values()) for (const buf of list) buf.destroy();
    this.buffersBySize.clear();
    this.cursorBySize.clear();
  }
};

// src/wgsl/compute/reduce-max-f32.wgsl
var reduce_max_f32_default = "const WORKGROUP_SIZE: u32 = 256u; const ELEMENTS_PER_WORKGROUP: u32 = 512u; @group(0) @binding(0) var<storage, read> input: array<f32>; @group(0) @binding(1) var<storage, read_write> output: array<f32>; var<workgroup> share: array<f32, 256>; @compute @workgroup_size(256) fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) { let tid = lid.x; let n = arrayLength(&input); let base = wid.x * ELEMENTS_PER_WORKGROUP; let i0 = base + tid; let i1 = i0 + WORKGROUP_SIZE; var acc = -0x1.fffffep+127f; if (i0 < n) { acc = input[i0]; } if (i1 < n) { acc = max(acc, input[i1]); } share[tid] = acc; workgroupBarrier(); var stride = WORKGROUP_SIZE / 2u; loop { if (stride == 0u) { break; } if (tid < stride) { share[tid] = max(share[tid], share[tid + stride]); } workgroupBarrier(); stride = stride / 2u; } if (tid == 0u) { output[wid.x] = share[0]; } }";

// src/wgsl/compute/reduce-max-u32.wgsl
var reduce_max_u32_default = "const WORKGROUP_SIZE: u32 = 256u; const ELEMENTS_PER_WORKGROUP: u32 = 512u; @group(0) @binding(0) var<storage, read> input: array<u32>; @group(0) @binding(1) var<storage, read_write> output: array<u32>; var<workgroup> share: array<u32, 256>; @compute @workgroup_size(256) fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) { let tid = lid.x; let n = arrayLength(&input); let base = wid.x * ELEMENTS_PER_WORKGROUP; let i0 = base + tid; let i1 = i0 + WORKGROUP_SIZE; var acc = 0u; if (i0 < n) { acc = input[i0]; } if (i1 < n) { acc = max(acc, input[i1]); } share[tid] = acc; workgroupBarrier(); var stride = WORKGROUP_SIZE / 2u; loop { if (stride == 0u) { break; } if (tid < stride) { share[tid] = max(share[tid], share[tid + stride]); } workgroupBarrier(); stride = stride / 2u; } if (tid == 0u) { output[wid.x] = share[0]; } }";

// src/wgsl/compute/reduce-min-f32.wgsl
var reduce_min_f32_default = "const WORKGROUP_SIZE: u32 = 256u; const ELEMENTS_PER_WORKGROUP: u32 = 512u; @group(0) @binding(0) var<storage, read> input: array<f32>; @group(0) @binding(1) var<storage, read_write> output: array<f32>; var<workgroup> share: array<f32, 256>; @compute @workgroup_size(256) fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) { let tid = lid.x; let n = arrayLength(&input); let base = wid.x * ELEMENTS_PER_WORKGROUP; let i0 = base + tid; let i1 = i0 + WORKGROUP_SIZE; var acc = 0x1.fffffep+127f; if (i0 < n) { acc = input[i0]; } if (i1 < n) { acc = min(acc, input[i1]); } share[tid] = acc; workgroupBarrier(); var stride = WORKGROUP_SIZE / 2u; loop { if (stride == 0u) { break; } if (tid < stride) { share[tid] = min(share[tid], share[tid + stride]); } workgroupBarrier(); stride = stride / 2u; } if (tid == 0u) { output[wid.x] = share[0]; } }";

// src/wgsl/compute/reduce-min-u32.wgsl
var reduce_min_u32_default = "const WORKGROUP_SIZE: u32 = 256u; const ELEMENTS_PER_WORKGROUP: u32 = 512u; @group(0) @binding(0) var<storage, read> input: array<u32>; @group(0) @binding(1) var<storage, read_write> output: array<u32>; var<workgroup> share: array<u32, 256>; @compute @workgroup_size(256) fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) { let tid = lid.x; let n = arrayLength(&input); let base = wid.x * ELEMENTS_PER_WORKGROUP; let i0 = base + tid; let i1 = i0 + WORKGROUP_SIZE; var acc = 0xFFFFFFFFu; if (i0 < n) { acc = input[i0]; } if (i1 < n) { acc = min(acc, input[i1]); } share[tid] = acc; workgroupBarrier(); var stride = WORKGROUP_SIZE / 2u; loop { if (stride == 0u) { break; } if (tid < stride) { share[tid] = min(share[tid], share[tid + stride]); } workgroupBarrier(); stride = stride / 2u; } if (tid == 0u) { output[wid.x] = share[0]; } }";

// src/wgsl/compute/reduce-sum-f32.wgsl
var reduce_sum_f32_default = "const WORKGROUP_SIZE: u32 = 256u; const ELEMENTS_PER_WORKGROUP: u32 = 512u; @group(0) @binding(0) var<storage, read> input: array<f32>; @group(0) @binding(1) var<storage, read_write> output: array<f32>; var<workgroup> share: array<f32, 256>; @compute @workgroup_size(256) fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) { let tid = lid.x; let n = arrayLength(&input); let base = wid.x * ELEMENTS_PER_WORKGROUP; let i0 = base + tid; let i1 = i0 + WORKGROUP_SIZE; var acc = 0.0; if (i0 < n) { acc = input[i0]; } if (i1 < n) { acc = acc + input[i1]; } share[tid] = acc; workgroupBarrier(); var stride = WORKGROUP_SIZE / 2u; loop { if (stride == 0u) { break; } if (tid < stride) { share[tid] = share[tid] + share[tid + stride]; } workgroupBarrier(); stride = stride / 2u; } if (tid == 0u) { output[wid.x] = share[0]; } }";

// src/wgsl/compute/reduce-sum-u32.wgsl
var reduce_sum_u32_default = "const WORKGROUP_SIZE: u32 = 256u; const ELEMENTS_PER_WORKGROUP: u32 = 512u; @group(0) @binding(0) var<storage, read> input: array<u32>; @group(0) @binding(1) var<storage, read_write> output: array<u32>; var<workgroup> share: array<u32, 256>; @compute @workgroup_size(256) fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) { let tid = lid.x; let n = arrayLength(&input); let base = wid.x * ELEMENTS_PER_WORKGROUP; let i0 = base + tid; let i1 = i0 + WORKGROUP_SIZE; var acc = 0u; if (i0 < n) { acc = input[i0]; } if (i1 < n) { acc = acc + input[i1]; } share[tid] = acc; workgroupBarrier(); var stride = WORKGROUP_SIZE / 2u; loop { if (stride == 0u) { break; } if (tid < stride) { share[tid] = share[tid] + share[tid + stride]; } workgroupBarrier(); stride = stride / 2u; } if (tid == 0u) { output[wid.x] = share[0]; } }";

// src/wgsl/compute/argreduce-argmax-initial.wgsl
var argreduce_argmax_initial_default = "const WORKGROUP_SIZE: u32 = 256u; const ELEMENTS_PER_WORKGROUP: u32 = 512u; struct Pair { value: f32, index: u32 }; @group(0) @binding(0) var<storage, read> input: array<f32>; @group(0) @binding(1) var<storage, read_write> output: array<Pair>; var<workgroup> share: array<Pair, 256>; fn isNan(val: f32) -> bool { let u = bitcast<u32>(val); return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) != 0u; } fn invalidPair() -> Pair { return Pair(-0x1.fffffep+127f, 0xFFFFFFFFu); } fn better(a: Pair, b: Pair) -> Pair { let aNan = isNan(a.value); let bNan = isNan(b.value); if (aNan && bNan) { if (a.index <= b.index) { return a; } return b; } if (aNan) { return b; } if (bNan) { return a; } if (a.value > b.value) { return a; } if (b.value > a.value) { return b; } if (a.index <= b.index) { return a; } return b; } @compute @workgroup_size(256) fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) { let tid = lid.x; let n = arrayLength(&input); let base = wid.x * ELEMENTS_PER_WORKGROUP; let i0 = base + tid; let i1 = i0 + WORKGROUP_SIZE; var a = invalidPair(); var b = invalidPair(); if (i0 < n) { a = Pair(input[i0], i0); } if (i1 < n) { b = Pair(input[i1], i1); } share[tid] = better(a, b); workgroupBarrier(); var stride = WORKGROUP_SIZE / 2u; loop { if (stride == 0u) { break; } if (tid < stride) { share[tid] = better(share[tid], share[tid + stride]); } workgroupBarrier(); stride = stride / 2u; } if (tid == 0u) { output[wid.x] = share[0]; } }";

// src/wgsl/compute/argreduce-argmax-pairs.wgsl
var argreduce_argmax_pairs_default = "const WORKGROUP_SIZE: u32 = 256u; const ELEMENTS_PER_WORKGROUP: u32 = 512u; struct Pair { value: f32, index: u32 }; @group(0) @binding(0) var<storage, read> input: array<Pair>; @group(0) @binding(1) var<storage, read_write> output: array<Pair>; var<workgroup> share: array<Pair, 256>; fn isNan(val: f32) -> bool { let u = bitcast<u32>(val); return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) != 0u; } fn invalidPair() -> Pair { return Pair(-0x1.fffffep+127f, 0xFFFFFFFFu); } fn better(a: Pair, b: Pair) -> Pair { let aNan = isNan(a.value); let bNan = isNan(b.value); if (aNan && bNan) { if (a.index <= b.index) { return a; } return b; } if (aNan) { return b; } if (bNan) { return a; } if (a.value > b.value) { return a; } if (b.value > a.value) { return b; } if (a.index <= b.index) { return a; } return b; } @compute @workgroup_size(256) fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) { let tid = lid.x; let n = arrayLength(&input); let base = wid.x * ELEMENTS_PER_WORKGROUP; let i0 = base + tid; let i1 = i0 + WORKGROUP_SIZE; var a = invalidPair(); var b = invalidPair(); if (i0 < n) { a = input[i0]; } if (i1 < n) { b = input[i1]; } share[tid] = better(a, b); workgroupBarrier(); var stride = WORKGROUP_SIZE / 2u; loop { if (stride == 0u) { break; } if (tid < stride) { share[tid] = better(share[tid], share[tid + stride]); } workgroupBarrier(); stride = stride / 2u; } if (tid == 0u) { output[wid.x] = share[0]; } }";

// src/wgsl/compute/argreduce-argmin-initial.wgsl
var argreduce_argmin_initial_default = "const WORKGROUP_SIZE: u32 = 256u; const ELEMENTS_PER_WORKGROUP: u32 = 512u; struct Pair { value: f32, index: u32 }; @group(0) @binding(0) var<storage, read> input: array<f32>; @group(0) @binding(1) var<storage, read_write> output: array<Pair>; var<workgroup> share: array<Pair, 256>; fn isNan(val: f32) -> bool { let u = bitcast<u32>(val); return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) != 0u; } fn invalidPair() -> Pair { return Pair(0x1.fffffep+127f, 0xFFFFFFFFu); } fn better(a: Pair, b: Pair) -> Pair { let aNan = isNan(a.value); let bNan = isNan(b.value); if (aNan && bNan) { if (a.index <= b.index) { return a; } return b; } if (aNan) { return b; } if (bNan) { return a; } if (a.value < b.value) { return a; } if (b.value < a.value) { return b; } if (a.index <= b.index) { return a; } return b; } @compute @workgroup_size(256) fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) { let tid = lid.x; let n = arrayLength(&input); let base = wid.x * ELEMENTS_PER_WORKGROUP; let i0 = base + tid; let i1 = i0 + WORKGROUP_SIZE; var a = invalidPair(); var b = invalidPair(); if (i0 < n) { a = Pair(input[i0], i0); } if (i1 < n) { b = Pair(input[i1], i1); } share[tid] = better(a, b); workgroupBarrier(); var stride = WORKGROUP_SIZE / 2u; loop { if (stride == 0u) { break; } if (tid < stride) { share[tid] = better(share[tid], share[tid + stride]); } workgroupBarrier(); stride = stride / 2u; } if (tid == 0u) { output[wid.x] = share[0]; } }";

// src/wgsl/compute/argreduce-argmin-pairs.wgsl
var argreduce_argmin_pairs_default = "const WORKGROUP_SIZE: u32 = 256u; const ELEMENTS_PER_WORKGROUP: u32 = 512u; struct Pair { value: f32, index: u32 }; @group(0) @binding(0) var<storage, read> input: array<Pair>; @group(0) @binding(1) var<storage, read_write> output: array<Pair>; var<workgroup> share: array<Pair, 256>; fn isNan(val: f32) -> bool { let u = bitcast<u32>(val); return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) != 0u; } fn invalidPair() -> Pair { return Pair(0x1.fffffep+127f, 0xFFFFFFFFu); } fn better(a: Pair, b: Pair) -> Pair { let aNan = isNan(a.value); let bNan = isNan(b.value); if (aNan && bNan) { if (a.index <= b.index) { return a; } return b; } if (aNan) { return b; } if (bNan) { return a; } if (a.value < b.value) { return a; } if (b.value < a.value) { return b; } if (a.index <= b.index) { return a; } return b; } @compute @workgroup_size(256) fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) { let tid = lid.x; let n = arrayLength(&input); let base = wid.x * ELEMENTS_PER_WORKGROUP; let i0 = base + tid; let i1 = i0 + WORKGROUP_SIZE; var a = invalidPair(); var b = invalidPair(); if (i0 < n) { a = input[i0]; } if (i1 < n) { b = input[i1]; } share[tid] = better(a, b); workgroupBarrier(); var stride = WORKGROUP_SIZE / 2u; loop { if (stride == 0u) { break; } if (tid < stride) { share[tid] = better(share[tid], share[tid + stride]); } workgroupBarrier(); stride = stride / 2u; } if (tid == 0u) { output[wid.x] = share[0]; } }";

// src/wgsl/compute/scan-block-exclusive-u32.wgsl
var scan_block_exclusive_u32_default = "const WORKGROUP_SIZE: u32 = 256u; const ELEMENTS_PER_WORKGROUP: u32 = 512u; @group(0) @binding(0) var<storage, read> input: array<u32>; @group(0) @binding(1) var<storage, read_write> output: array<u32>; @group(0) @binding(2) var<storage, read_write> blockSums: array<u32>; var<workgroup> temp: array<u32, 512>; @compute @workgroup_size(256) fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) { let tid = lid.x; let n = arrayLength(&input); let base = wid.x * ELEMENTS_PER_WORKGROUP; let ai = base + tid; let bi = ai + WORKGROUP_SIZE; temp[tid] = select(0u, input[ai], ai < n); temp[tid + WORKGROUP_SIZE] = select(0u, input[bi], bi < n); var offset = 1u; var d = WORKGROUP_SIZE; loop { workgroupBarrier(); if (d == 0u) { break; } if (tid < d) { let i1 = offset * ((tid * 2u) + 1u) - 1u; let i2 = offset * ((tid * 2u) + 2u) - 1u; temp[i2] = temp[i2] + temp[i1]; } offset = offset * 2u; d = d / 2u; } if (tid == 0u) { blockSums[wid.x] = temp[ELEMENTS_PER_WORKGROUP - 1u]; temp[ELEMENTS_PER_WORKGROUP - 1u] = 0u; } d = 1u; loop { offset = offset / 2u; workgroupBarrier(); if (d > WORKGROUP_SIZE) { break; } if (tid < d) { let i1 = offset * ((tid * 2u) + 1u) - 1u; let i2 = offset * ((tid * 2u) + 2u) - 1u; let t = temp[i1]; temp[i1] = temp[i2]; temp[i2] = temp[i2] + t; } d = d * 2u; } workgroupBarrier(); if (ai < n) { output[ai] = temp[tid]; } if (bi < n) { output[bi] = temp[tid + WORKGROUP_SIZE]; } }";

// src/wgsl/compute/scan-add-block-offsets-u32.wgsl
var scan_add_block_offsets_u32_default = "const ELEMENTS_PER_WORKGROUP: u32 = 512u; @group(0) @binding(0) var<storage, read_write> data: array<u32>; @group(0) @binding(1) var<storage, read> blockOffsets: array<u32>; @compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { let i = gid.x; let n = arrayLength(&data); if (i >= n) { return; } let block = i / ELEMENTS_PER_WORKGROUP; let off = blockOffsets[block]; data[i] = data[i] + off; }";

// src/wgsl/compute/histogram-clear-atomic-u32.wgsl
var histogram_clear_atomic_u32_default = "@group(0) @binding(0) var<storage, read_write> bins: array<atomic<u32>>; @compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { let i = gid.x; if (i < arrayLength(&bins)) { atomicStore(&bins[i], 0u); } }";

// src/wgsl/compute/histogram-u32.wgsl
var histogram_u32_default = "@group(0) @binding(0) var<storage, read> keys: array<u32>; @group(0) @binding(1) var<storage, read_write> bins: array<atomic<u32>>; @compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { let i = gid.x; let n = arrayLength(&keys); if (i >= n) { return; } let k = keys[i]; let b = arrayLength(&bins); if (k < b) { _ = atomicAdd(&bins[k], 1u); } }";

// src/wgsl/compute/compact-f32.wgsl
var compact_f32_default = "@group(0) @binding(0) var<storage, read> input: array<f32>; @group(0) @binding(1) var<storage, read> flags: array<u32>; @group(0) @binding(2) var<storage, read> prefix: array<u32>; @group(0) @binding(3) var<storage, read_write> output: array<f32>; @compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { let i = gid.x; let n = arrayLength(&flags); if (i >= n) { return; } if (flags[i] != 0u) { let dst = prefix[i]; output[dst] = input[i]; } }";

// src/wgsl/compute/compact-u32.wgsl
var compact_u32_default = "@group(0) @binding(0) var<storage, read> input: array<u32>; @group(0) @binding(1) var<storage, read> flags: array<u32>; @group(0) @binding(2) var<storage, read> prefix: array<u32>; @group(0) @binding(3) var<storage, read_write> output: array<u32>; @compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { let i = gid.x; let n = arrayLength(&flags); if (i >= n) { return; } if (flags[i] != 0u) { let dst = prefix[i]; output[dst] = input[i]; } }";

// src/wgsl/compute/sort-radix-flags-u32.wgsl
var sort_radix_flags_u32_default = "override BIT: u32 = 0u; @group(0) @binding(0) var<storage, read> keys: array<u32>; @group(0) @binding(1) var<storage, read_write> flags: array<u32>; @compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { let i = gid.x; let n = arrayLength(&keys); if (i >= n) { return; } let k = keys[i]; let isZero = ((k >> BIT) & 1u) == 0u; flags[i] = select(0u, 1u, isZero); }";

// src/wgsl/compute/sort-radix-scatter-u32.wgsl
var sort_radix_scatter_u32_default = "override BIT: u32 = 0u; @group(0) @binding(0) var<storage, read> keysIn: array<u32>; @group(0) @binding(1) var<storage, read> prefix: array<u32>; @group(0) @binding(2) var<storage, read> zerosCount: array<u32>; @group(0) @binding(3) var<storage, read_write> keysOut: array<u32>; @compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { let i = gid.x; let n = arrayLength(&keysIn); if (i >= n) { return; } let k = keysIn[i]; let isZero = ((k >> BIT) & 1u) == 0u; let zeroPos = prefix[i]; let z = zerosCount[0]; let onePos = z + (i - zeroPos); let dst = select(onePos, zeroPos, isZero); keysOut[dst] = k; }";

// src/wgsl/compute/copy-f32.wgsl
var copy_f32_default = "@group(0) @binding(0) var<storage, read> src: array<f32>; @group(0) @binding(1) var<storage, read_write> dst: array<f32>; @compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { let i = gid.x; let n = arrayLength(&dst); if (i < n) { dst[i] = src[i]; } }";

// src/wgsl/compute/copy-u32.wgsl
var copy_u32_default = "@group(0) @binding(0) var<storage, read> src: array<u32>; @group(0) @binding(1) var<storage, read_write> dst: array<u32>; @compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { let i = gid.x; let n = arrayLength(&dst); if (i < n) { dst[i] = src[i]; } }";

// src/compute/kernels.ts
var isGpuBuffer2 = (r) => {
  return r.mapState !== void 0;
};
var resolveGpuBuffer = (r) => {
  if (isGpuBuffer2(r)) return r;
  return r.buffer;
};
var bytesPerElement = (type) => {
  return 4;
};
var identityU32 = (op) => {
  if (op === "sum") return 0;
  if (op === "min") return 4294967295;
  return 0;
};
var identityF32Bits = (op) => {
  if (op === "sum") return 0;
  if (op === "min") return 2139095040;
  return 4286578688;
};
var identityArgPairBits = (op) => {
  if (op === "argmin") return { valueBits: 2139095040, index: 4294967295 };
  return { valueBits: 4286578688, index: 4294967295 };
};
var assertByteLengthMultipleOf = (byteLength, unit, label) => {
  assert(byteLength % unit === 0, `${label}: byteLength (${byteLength}) must be divisible by ${unit}`);
};
var ComputeKernels = class {
  device;
  queue;
  scratch;
  pipelines;
  constructor(device, queue) {
    this.device = device;
    this.queue = queue;
    this.scratch = new ScratchBufferPool(device, {
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      labelPrefix: "kernels:scratch"
    });
    this.pipelines = /* @__PURE__ */ new Map();
  }
  destroy() {
    this.scratch.destroy();
    this.pipelines.clear();
  }
  getPipeline(key, create) {
    let p = this.pipelines.get(key);
    if (!p) {
      p = create();
      this.pipelines.set(key, p);
    }
    return p;
  }
  bindSized(res, sizeBytes) {
    assert(Number.isInteger(sizeBytes) && sizeBytes >= 0, `bindSized: sizeBytes must be an integer >= 0 (got ${sizeBytes})`);
    const aligned = alignTo(sizeBytes, 4);
    return { buffer: res, size: Math.max(4, aligned) };
  }
  resolveCount(buf, elemBytes, count) {
    assertByteLengthMultipleOf(buf.byteLength, elemBytes, "resolveCount");
    const total = buf.byteLength / elemBytes;
    if (count === void 0) return total;
    assert(Number.isInteger(count) && count >= 0, `count must be an integer >= 0 (got ${count})`);
    assert(count <= total, `count (${count}) exceeds buffer element capacity (${total})`);
    return count;
  }
  execute(commands, opts) {
    if (commands.length === 0) return;
    const encoder = opts?.encoder ?? this.device.createCommandEncoder();
    if (opts?.validateLimits) for (const cmd of commands) validateWorkgroupsForDevice(this.device, cmd.workgroups);
    encodeDispatchBatch(encoder, commands, opts?.label);
    if (!opts?.encoder) {
      this.queue.submit([encoder.finish()]);
      this.scratch.reset();
    }
  }
  writeScalarU32(dst, value) {
    const buf = resolveGpuBuffer(dst);
    const tmp = new Uint32Array([value >>> 0]);
    this.queue.writeBuffer(buf, 0, tmp);
  }
  writeScalarF32(dst, value) {
    const buf = resolveGpuBuffer(dst);
    const tmp = new Float32Array([value]);
    this.queue.writeBuffer(buf, 0, tmp);
  }
  writeScalarF32Bits(dst, bits) {
    const buf = resolveGpuBuffer(dst);
    const tmp = new Uint32Array([bits >>> 0]);
    this.queue.writeBuffer(buf, 0, tmp);
  }
  writeArgPairBits(dst, valueBits, index) {
    const buf = resolveGpuBuffer(dst);
    const tmp = new Uint32Array([valueBits >>> 0, index >>> 0]);
    this.queue.writeBuffer(buf, 0, tmp);
  }
  getReducePipeline(type, op) {
    const key = `kernels:reduce:${type}:${op}`;
    return this.getPipeline(key, () => {
      return new ComputePipeline(this.device, {
        label: key,
        code: type === "f32" ? op === "sum" ? reduce_sum_f32_default : op === "max" ? reduce_max_f32_default : reduce_min_f32_default : op === "sum" ? reduce_sum_u32_default : op === "max" ? reduce_max_u32_default : reduce_min_u32_default,
        entryPoint: "main",
        bindGroups: [
          {
            label: `${key}:bg0`,
            entries: [
              storageBufferLayout({ binding: 0, readOnly: true }),
              storageBufferLayout({ binding: 1, readOnly: false })
            ]
          }
        ]
      });
    });
  }
  getArgReduceInitialPipeline(op) {
    const key = `kernels:argreduce:init:${op}`;
    return this.getPipeline(key, () => {
      return new ComputePipeline(this.device, {
        label: key,
        code: op === "argmax" ? argreduce_argmax_initial_default : argreduce_argmin_initial_default,
        entryPoint: "main",
        bindGroups: [
          {
            label: `${key}:bg0`,
            entries: [
              storageBufferLayout({ binding: 0, readOnly: true }),
              storageBufferLayout({ binding: 1, readOnly: false })
            ]
          }
        ]
      });
    });
  }
  getArgReducePairsPipeline(op) {
    const key = `kernels:argreduce:pairs:${op}`;
    return this.getPipeline(key, () => {
      const code = op === "argmax" ? argreduce_argmax_pairs_default : argreduce_argmin_pairs_default;
      return new ComputePipeline(this.device, {
        label: key,
        code,
        entryPoint: "main",
        bindGroups: [
          {
            label: `${key}:bg0`,
            entries: [
              storageBufferLayout({ binding: 0, readOnly: true }),
              storageBufferLayout({ binding: 1, readOnly: false })
            ]
          }
        ]
      });
    });
  }
  encodeReduceScalar(commands, type, op, input, inputCount, out, labelPrefix) {
    assert(Number.isInteger(inputCount) && inputCount > 0, "encodeReduceScalar expects inputCount > 0");
    const elemBytes = bytesPerElement(type);
    let inRes = input;
    let n = inputCount;
    let pass = 0;
    while (true) {
      const outCount = ceilDiv(n, 512);
      const isFinal = outCount <= 1;
      const outRes = isFinal ? out : this.scratch.acquire(outCount * elemBytes, `${labelPrefix}:reduce:${pass}`);
      const pipeline = this.getReducePipeline(type, op);
      const bg = pipeline.createBindGroup(0, {
        0: this.bindSized(inRes, n * elemBytes),
        1: this.bindSized(outRes, outCount * elemBytes)
      }, `${labelPrefix}:reduce:${pass}:bg`);
      commands.push({
        pipeline,
        bindGroups: [bg],
        workgroups: makeWorkgroupCounts(outCount, 1, 1),
        label: `${labelPrefix}:reduce:${pass}`
      });
      if (isFinal) break;
      inRes = outRes;
      n = outCount;
      pass++;
    }
  }
  encodeArgReduceF32Scalar(commands, op, input, inputCount, out, labelPrefix) {
    assert(Number.isInteger(inputCount) && inputCount > 0, "encodeArgReduceF32Scalar expects inputCount > 0");
    let inRes = input;
    let n = inputCount;
    let inStrideBytes = 4;
    let pass = 0;
    while (true) {
      const outCount = ceilDiv(n, 512);
      const isFinal = outCount <= 1;
      const outRes = isFinal ? out : this.scratch.acquire(outCount * 8, `${labelPrefix}:argreduce:${pass}`);
      const pipeline = pass === 0 ? this.getArgReduceInitialPipeline(op) : this.getArgReducePairsPipeline(op);
      const bg = pipeline.createBindGroup(0, {
        0: this.bindSized(inRes, n * inStrideBytes),
        1: this.bindSized(outRes, outCount * 8)
      }, `${labelPrefix}:argreduce:${pass}:bg`);
      commands.push({
        pipeline,
        bindGroups: [bg],
        workgroups: makeWorkgroupCounts(outCount, 1, 1),
        label: `${labelPrefix}:argreduce:${pass}`
      });
      if (isFinal) break;
      inRes = outRes;
      n = outCount;
      inStrideBytes = 8;
      pass++;
    }
  }
  getScanBlockExclusiveU32Pipeline() {
    const key = "kernels:scan:blockExclusiveU32";
    return this.getPipeline(key, () => {
      return new ComputePipeline(this.device, {
        label: key,
        code: scan_block_exclusive_u32_default,
        entryPoint: "main",
        bindGroups: [
          {
            label: `${key}:bg0`,
            entries: [
              storageBufferLayout({ binding: 0, readOnly: true }),
              storageBufferLayout({ binding: 1, readOnly: false }),
              storageBufferLayout({ binding: 2, readOnly: false })
            ]
          }
        ]
      });
    });
  }
  getScanAddBlockOffsetsU32Pipeline() {
    const key = "kernels:scan:addBlockOffsetsU32";
    return this.getPipeline(key, () => {
      return new ComputePipeline(this.device, {
        label: key,
        code: scan_add_block_offsets_u32_default,
        entryPoint: "main",
        bindGroups: [
          {
            label: `${key}:bg0`,
            entries: [
              storageBufferLayout({ binding: 0, readOnly: false }),
              storageBufferLayout({ binding: 1, readOnly: true })
            ]
          }
        ]
      });
    });
  }
  encodeScanExclusiveU32Into(commands, input, count, out, labelPrefix) {
    assert(Number.isInteger(count) && count >= 0, `encodeScanExclusiveU32Into: count must be an integer >= 0 (got ${count})`);
    if (count === 0) return;
    const numBlocks = ceilDiv(count, 512);
    const blockSums = this.scratch.acquire(numBlocks * 4, `${labelPrefix}:blockSums`);
    {
      const pipeline = this.getScanBlockExclusiveU32Pipeline();
      const bg = pipeline.createBindGroup(0, {
        0: this.bindSized(input, count * 4),
        1: this.bindSized(out, count * 4),
        2: this.bindSized(blockSums, numBlocks * 4)
      }, `${labelPrefix}:scanBlocks:bg`);
      commands.push({
        pipeline,
        bindGroups: [bg],
        workgroups: makeWorkgroupCounts(numBlocks, 1, 1),
        label: `${labelPrefix}:scanBlocks`
      });
    }
    if (numBlocks <= 1) return;
    const blockOffsets = this.scratch.acquire(numBlocks * 4, `${labelPrefix}:blockOffsets`);
    this.encodeScanExclusiveU32Into(commands, blockSums, numBlocks, blockOffsets, `${labelPrefix}:scanBlockSums`);
    {
      const pipeline = this.getScanAddBlockOffsetsU32Pipeline();
      const bg = pipeline.createBindGroup(0, {
        0: this.bindSized(out, count * 4),
        1: this.bindSized(blockOffsets, numBlocks * 4)
      }, `${labelPrefix}:addOffsets:bg`);
      commands.push({
        pipeline,
        bindGroups: [bg],
        workgroups: workgroups1D(count, 256),
        label: `${labelPrefix}:addOffsets`
      });
    }
  }
  getHistogramClearPipeline() {
    const key = "kernels:histogram:clearAtomicU32";
    return this.getPipeline(key, () => {
      return new ComputePipeline(this.device, {
        label: key,
        code: histogram_clear_atomic_u32_default,
        entryPoint: "main",
        bindGroups: [
          {
            label: `${key}:bg0`,
            entries: [
              storageBufferLayout({ binding: 0, readOnly: false })
            ]
          }
        ]
      });
    });
  }
  getHistogramPipeline() {
    const key = "kernels:histogram:u32";
    return this.getPipeline(key, () => {
      return new ComputePipeline(this.device, {
        label: key,
        code: histogram_u32_default,
        entryPoint: "main",
        bindGroups: [
          {
            label: `${key}:bg0`,
            entries: [
              storageBufferLayout({ binding: 0, readOnly: true }),
              storageBufferLayout({ binding: 1, readOnly: false })
            ]
          }
        ]
      });
    });
  }
  getCompactPipeline(type) {
    const key = `kernels:compact:${type}`;
    return this.getPipeline(key, () => {
      return new ComputePipeline(this.device, {
        label: key,
        code: type === "u32" ? compact_u32_default : compact_f32_default,
        entryPoint: "main",
        bindGroups: [
          {
            label: `${key}:bg0`,
            entries: [
              storageBufferLayout({ binding: 0, readOnly: true }),
              storageBufferLayout({ binding: 1, readOnly: true }),
              storageBufferLayout({ binding: 2, readOnly: true }),
              storageBufferLayout({ binding: 3, readOnly: false })
            ]
          }
        ]
      });
    });
  }
  getRadixFlagsPipeline(bit) {
    const b = bit | 0;
    const key = `kernels:radix:flags:bit${b}`;
    return this.getPipeline(key, () => {
      return new ComputePipeline(this.device, {
        label: key,
        code: sort_radix_flags_u32_default,
        entryPoint: "main",
        constants: { BIT: b },
        bindGroups: [
          {
            label: `${key}:bg0`,
            entries: [
              storageBufferLayout({ binding: 0, readOnly: true }),
              storageBufferLayout({ binding: 1, readOnly: false })
            ]
          }
        ]
      });
    });
  }
  getRadixScatterPipeline(bit) {
    const b = bit | 0;
    const key = `kernels:radix:scatter:bit${b}`;
    return this.getPipeline(key, () => {
      return new ComputePipeline(this.device, {
        label: key,
        code: sort_radix_scatter_u32_default,
        entryPoint: "main",
        constants: { BIT: b },
        bindGroups: [
          {
            label: `${key}:bg0`,
            entries: [
              storageBufferLayout({ binding: 0, readOnly: true }),
              storageBufferLayout({ binding: 1, readOnly: true }),
              storageBufferLayout({ binding: 2, readOnly: true }),
              storageBufferLayout({ binding: 3, readOnly: false })
            ]
          }
        ]
      });
    });
  }
  getCopyF32Pipeline() {
    const key = "kernels:copy:f32";
    return this.getPipeline(key, () => {
      return new ComputePipeline(this.device, {
        label: key,
        code: copy_f32_default,
        entryPoint: "main",
        bindGroups: [
          {
            label: `${key}:bg0`,
            entries: [
              storageBufferLayout({ binding: 0, readOnly: true }),
              storageBufferLayout({ binding: 1, readOnly: false })
            ]
          }
        ]
      });
    });
  }
  getCopyU32Pipeline() {
    const key = "kernels:copy:u32";
    return this.getPipeline(key, () => {
      return new ComputePipeline(this.device, {
        label: key,
        code: copy_u32_default,
        entryPoint: "main",
        bindGroups: [
          {
            label: `${key}:bg0`,
            entries: [
              storageBufferLayout({ binding: 0, readOnly: true }),
              storageBufferLayout({ binding: 1, readOnly: false })
            ]
          }
        ]
      });
    });
  }
  encodeCopyF32(commands, src, count, dst, labelPrefix) {
    assert(Number.isInteger(count) && count >= 0, `encodeCopyF32: count must be an integer >= 0 (got ${count})`);
    if (count === 0) return;
    const pipeline = this.getCopyF32Pipeline();
    const bg = pipeline.createBindGroup(0, {
      0: this.bindSized(src, count * 4),
      1: this.bindSized(dst, count * 4)
    }, `${labelPrefix}:copy:bg`);
    commands.push({
      pipeline,
      bindGroups: [bg],
      workgroups: workgroups1D(count, 256),
      label: `${labelPrefix}:copy`
    });
  }
  encodeCopyU32(commands, src, count, dst, labelPrefix) {
    assert(Number.isInteger(count) && count >= 0, `encodeCopyU32: count must be an integer >= 0 (got ${count})`);
    if (count === 0) return;
    const pipeline = this.getCopyU32Pipeline();
    const bg = pipeline.createBindGroup(0, {
      0: this.bindSized(src, count * 4),
      1: this.bindSized(dst, count * 4)
    }, `${labelPrefix}:copy:bg`);
    commands.push({
      pipeline,
      bindGroups: [bg],
      workgroups: workgroups1D(count, 256),
      label: `${labelPrefix}:copy`
    });
  }
  copyU32(src, opts = {}) {
    let count = opts.count;
    if (count === void 0) {
      if (src instanceof StorageBuffer) count = this.resolveCount(src, 4, void 0);
      else assert(false, "copyU32: opts.count is required when src is not a StorageBuffer");
    }
    assert(Number.isInteger(count) && count >= 0, `copyU32: count must be an integer >= 0 (got ${count})`);
    const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
      label: "copyU32:out",
      byteLength: count * 4,
      copySrc: true
    });
    assert(out.byteLength >= count * 4, "copyU32: out buffer is too small for requested count");
    const commands = [];
    this.encodeCopyU32(commands, src, count, out, "copyU32");
    this.execute(commands, opts);
    return out;
  }
  reduceU32(input, op, opts = {}) {
    const count = this.resolveCount(input, 4, opts.count);
    const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
      label: `reduceU32:${op}`,
      byteLength: 4,
      copySrc: true
    });
    assert(out.byteLength >= 4, "reduceU32: out buffer must be at least 4 bytes");
    if (count === 0) {
      this.writeScalarU32(out, identityU32(op));
      return out;
    }
    const commands = [];
    this.encodeReduceScalar(commands, "u32", op, input, count, out, `reduceU32:${op}`);
    this.execute(commands, opts);
    return out;
  }
  sumU32(input, opts = {}) {
    return this.reduceU32(input, "sum", opts);
  }
  minU32(input, opts = {}) {
    return this.reduceU32(input, "min", opts);
  }
  maxU32(input, opts = {}) {
    return this.reduceU32(input, "max", opts);
  }
  copyF32(src, opts = {}) {
    let count = opts.count;
    if (count === void 0) {
      if (src instanceof StorageBuffer) count = this.resolveCount(src, 4, void 0);
      else assert(false, "copyF32: opts.count is required when src is not a StorageBuffer");
    }
    assert(Number.isInteger(count) && count >= 0, `copyF32: count must be an integer >= 0 (got ${count})`);
    const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
      label: "copyF32:out",
      byteLength: count * 4,
      copySrc: true
    });
    assert(out.byteLength >= count * 4, "copyF32: out buffer is too small for requested count");
    const commands = [];
    this.encodeCopyF32(commands, src, count, out, "copyF32");
    this.execute(commands, opts);
    return out;
  }
  reduceF32(input, op, opts = {}) {
    const count = this.resolveCount(input, 4, opts.count);
    const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
      label: `reduceF32:${op}`,
      byteLength: 4,
      copySrc: true
    });
    assert(out.byteLength >= 4, "reduceF32: out buffer must be at least 4 bytes");
    if (count === 0) {
      this.writeScalarF32Bits(out, identityF32Bits(op));
      return out;
    }
    const commands = [];
    this.encodeReduceScalar(commands, "f32", op, input, count, out, `reduceF32:${op}`);
    this.execute(commands, opts);
    return out;
  }
  sumF32(input, opts = {}) {
    return this.reduceF32(input, "sum", opts);
  }
  minF32(input, opts = {}) {
    return this.reduceF32(input, "min", opts);
  }
  maxF32(input, opts = {}) {
    return this.reduceF32(input, "max", opts);
  }
  argminF32(input, opts = {}) {
    return this.argReduceF32(input, "argmin", opts);
  }
  argmaxF32(input, opts = {}) {
    return this.argReduceF32(input, "argmax", opts);
  }
  argReduceF32(input, op, opts = {}) {
    const count = this.resolveCount(input, 4, opts.count);
    const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
      label: `argReduceF32:${op}`,
      byteLength: 8,
      copySrc: true
    });
    assert(out.byteLength >= 8, "argReduceF32: out buffer must be at least 8 bytes");
    if (count === 0) {
      const id = identityArgPairBits(op);
      this.writeArgPairBits(out, id.valueBits, id.index);
      return out;
    }
    const commands = [];
    this.encodeArgReduceF32Scalar(commands, op, input, count, out, `argReduceF32:${op}`);
    this.execute(commands, opts);
    return out;
  }
  scanExclusiveU32(input, opts = {}) {
    const count = this.resolveCount(input, 4, opts.count);
    const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
      label: "scanExclusiveU32",
      byteLength: count * 4,
      copySrc: true
    });
    assert(out.byteLength >= count * 4, "scanExclusiveU32: out buffer is too small for requested count");
    if (count === 0) return out;
    const commands = [];
    this.encodeScanExclusiveU32Into(commands, input, count, out, "scanExclusiveU32");
    this.execute(commands, opts);
    return out;
  }
  histogramU32(keys, binCount, opts = {}) {
    assert(Number.isInteger(binCount) && binCount >= 0, `binCount must be an integer >= 0 (got ${binCount})`);
    const count = this.resolveCount(keys, 4, opts.count);
    const bins = opts.bins ?? new StorageBuffer(this.device, this.queue, {
      label: "histogramU32:bins",
      byteLength: binCount * 4,
      copySrc: true
    });
    assert(bins.byteLength >= binCount * 4, "histogramU32: bins buffer is too small for binCount");
    const commands = [];
    if (binCount > 0 && (opts.clear ?? true)) {
      const pipelineClear = this.getHistogramClearPipeline();
      const bgClear = pipelineClear.createBindGroup(0, {
        0: this.bindSized(bins, binCount * 4)
      }, "histogramU32:clear:bg");
      commands.push({
        pipeline: pipelineClear,
        bindGroups: [bgClear],
        workgroups: workgroups1D(binCount, 256),
        label: "histogramU32:clear"
      });
    }
    if (count > 0 && binCount > 0) {
      const pipelineHist = this.getHistogramPipeline();
      const bgHist = pipelineHist.createBindGroup(0, {
        0: this.bindSized(keys, count * 4),
        1: this.bindSized(bins, binCount * 4)
      }, "histogramU32:hist:bg");
      commands.push({
        pipeline: pipelineHist,
        bindGroups: [bgHist],
        workgroups: workgroups1D(count, 256),
        label: "histogramU32:accum"
      });
    }
    this.execute(commands, opts);
    return bins;
  }
  compactU32(input, flags, opts = {}) {
    return this.compactTyped(input, flags, "u32", opts);
  }
  compactF32(input, flags, opts = {}) {
    return this.compactTyped(input, flags, "f32", opts);
  }
  compactTyped(input, flags, type, opts) {
    const count = this.resolveCount(flags, 4, opts.count);
    const inputCount = this.resolveCount(input, 4, opts.count);
    assert(inputCount === count, "compact: input and flags counts must match");
    const out = opts.out ?? new StorageBuffer(this.device, this.queue, {
      label: `compact:${type}:out`,
      byteLength: count * 4,
      copySrc: true
    });
    assert(out.byteLength >= count * 4, "compact: out buffer is too small for requested count");
    const countOut = new StorageBuffer(this.device, this.queue, {
      label: `compact:${type}:count`,
      byteLength: 4,
      copySrc: true
    });
    if (count === 0) {
      this.writeScalarU32(countOut, 0);
      return { output: out, count: countOut };
    }
    const prefix = this.scratch.acquire(count * 4, `compact:${type}:prefix`);
    const commands = [];
    this.encodeScanExclusiveU32Into(commands, flags, count, prefix, `compact:${type}:scan`);
    this.encodeReduceScalar(commands, "u32", "sum", flags, count, countOut, `compact:${type}:count`);
    {
      const pipeline = this.getCompactPipeline(type);
      const bg = pipeline.createBindGroup(0, {
        0: this.bindSized(input, count * 4),
        1: this.bindSized(flags, count * 4),
        2: this.bindSized(prefix, count * 4),
        3: this.bindSized(out, count * 4)
      }, `compact:${type}:compact:bg`);
      commands.push({
        pipeline,
        bindGroups: [bg],
        workgroups: workgroups1D(count, 256),
        label: `compact:${type}:scatter`
      });
    }
    this.execute(commands, opts);
    return { output: out, count: countOut };
  }
  radixSortKeysU32(keys, opts = {}) {
    const count = this.resolveCount(keys, 4, opts.count);
    const inPlace = opts.inPlace ?? false;
    const out = inPlace ? keys : opts.out ?? new StorageBuffer(this.device, this.queue, {
      label: "radixSortKeysU32:out",
      byteLength: count * 4,
      copySrc: true
    });
    if (!inPlace) assert(out.byteLength >= count * 4, "radixSortKeysU32: out buffer is too small for requested count");
    if (count <= 1) {
      if (!inPlace && count === 1) {
        const commands2 = [];
        this.encodeCopyU32(commands2, keys, 1, out, "radixSortKeysU32");
        this.execute(commands2, opts);
      }
      return out;
    }
    const flags = this.scratch.acquire(count * 4, "radix:flags");
    const prefix = this.scratch.acquire(count * 4, "radix:prefix");
    const zerosCount = this.scratch.acquire(4, "radix:zerosCount");
    const scratchKeys = this.scratch.acquire(count * 4, "radix:keysScratch");
    const bufA = scratchKeys;
    const bufB = out;
    let inBuf = keys;
    let outBuf = bufA;
    const commands = [];
    for (let bit = 0; bit < 32; bit++) {
      {
        const pipeline = this.getRadixFlagsPipeline(bit);
        const bg = pipeline.createBindGroup(0, {
          0: this.bindSized(inBuf, count * 4),
          1: this.bindSized(flags, count * 4)
        }, `radix:bit${bit}:flags:bg`);
        commands.push({
          pipeline,
          bindGroups: [bg],
          workgroups: workgroups1D(count, 256),
          label: `radix:bit${bit}:flags`
        });
      }
      this.encodeScanExclusiveU32Into(commands, flags, count, prefix, `radix:bit${bit}:scan`);
      this.encodeReduceScalar(commands, "u32", "sum", flags, count, zerosCount, `radix:bit${bit}:zerosCount`);
      {
        const pipeline = this.getRadixScatterPipeline(bit);
        const bg = pipeline.createBindGroup(0, {
          0: this.bindSized(inBuf, count * 4),
          1: this.bindSized(prefix, count * 4),
          2: this.bindSized(zerosCount, 4),
          3: this.bindSized(outBuf, count * 4)
        }, `radix:bit${bit}:scatter:bg`);
        commands.push({
          pipeline,
          bindGroups: [bg],
          workgroups: workgroups1D(count, 256),
          label: `radix:bit${bit}:scatter`
        });
      }
      inBuf = outBuf;
      outBuf = outBuf === bufA ? bufB : bufA;
    }
    if (inPlace) {
      if (inBuf !== keys) {
        this.encodeCopyU32(commands, inBuf, count, keys, "radixSortKeysU32:finalize");
      }
    } else {
      if (inBuf !== out) {
        this.encodeCopyU32(commands, inBuf, count, out, "radixSortKeysU32:finalize");
      }
    }
    this.execute(commands, opts);
    return out;
  }
};

// src/wgsl/compute/blitRGBA8.wgsl
var blitRGBA8_default = "struct Params { p0 : vec4f, p1 : vec4f } @group(0) @binding(0) var<uniform> params: Params; @group(0) @binding(1) var<storage, read> pixels: array<u32>; fn unpackRGBA8(x: u32) -> vec4f { let r = f32(x & 255u) / 255.0; let g = f32((x >> 8u) & 255u) / 255.0; let b = f32((x >> 16u) & 255u) / 255.0; let a = f32((x >> 24u) & 255u) / 255.0; return vec4f(r, g, b, a); } struct VSOut { @builtin(position) position: vec4f } @vertex fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut { var pos = array<vec2f, 3>( vec2f(-1.0, -1.0), vec2f( 3.0, -1.0), vec2f(-1.0, 3.0) ); var out: VSOut; out.position = vec4f(pos[vid], 0.0, 1.0); return out; } @fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f { let displayW = max(1.0, params.p0.x); let displayH = max(1.0, params.p0.y); let outW = max(1.0, params.p0.z); let outH = max(1.0, params.p0.w); let flipY = params.p1.x > 0.5; let xOut = clamp(i32(floor(pos.x * outW / displayW)), 0, i32(outW) - 1); var yOut = clamp(i32(floor(pos.y * outH / displayH)), 0, i32(outH) - 1); if (flipY) { yOut = i32(outH) - 1 - yOut; } let idx = u32(yOut) * u32(outW) + u32(xOut); return unpackRGBA8(pixels[idx]); }";

// src/compute/blit.ts
var isNonNegativeInt3 = (n) => Number.isInteger(n) && n >= 0;
var getDefaultCanvasFormat = () => {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const gpu = nav && nav.gpu ? nav.gpu : null;
  if (gpu && typeof gpu.getPreferredCanvasFormat === "function") return gpu.getPreferredCanvasFormat();
  throw new Error("blitRGBA8BufferToCanvas: opts.format must be provided when navigator.gpu is unavailable.");
};
var resolveSrcBuffer = (src) => {
  return src instanceof StorageBuffer ? src.buffer : src;
};
var RGBA8BufferCanvasBlitter = class {
  device;
  queue;
  paramsStride;
  paramsCapacity;
  paramsBuffer;
  paramsF32;
  paramsIndex = 0;
  pipelineByFormat = /* @__PURE__ */ new Map();
  canvasState = /* @__PURE__ */ new WeakMap();
  constructor(device, queue, opts = {}) {
    this.device = device;
    this.queue = queue;
    const alignment = Math.max(256, device.limits.minUniformBufferOffsetAlignment);
    this.paramsStride = alignTo(32, alignment);
    this.paramsCapacity = Math.max(1, opts.uniformCapacity ?? 256);
    this.paramsBuffer = device.createBuffer({
      label: "WasmGPU:compute:blitRGBA8:params",
      size: this.paramsStride * this.paramsCapacity,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.paramsF32 = new Float32Array(8);
  }
  destroy() {
    this.paramsBuffer.destroy();
    this.pipelineByFormat.clear();
  }
  encode(encoder, canvas, src, outWidth, outHeight, opts = {}) {
    assert(isNonNegativeInt3(outWidth) && isNonNegativeInt3(outHeight), `outWidth/outHeight must be integers >= 0 (got ${outWidth}x${outHeight})`);
    if (outWidth === 0 || outHeight === 0) return;
    const state = this.getOrCreateCanvasState(canvas);
    const format = opts.format ?? state.format ?? getDefaultCanvasFormat();
    const alphaMode = opts.alphaMode ?? state.alphaMode ?? "opaque";
    const didResize = opts.autoResize ?? true ? this.autoResizeCanvas(canvas, state, opts.dpr) : this.syncCanvasSizeWithoutResize(canvas, state);
    const needsConfigure = !state.configured || didResize || state.format !== format || state.alphaMode !== alphaMode;
    if (needsConfigure) {
      state.context.configure({ device: this.device, format, alphaMode });
      state.configured = true;
      state.format = format;
      state.alphaMode = alphaMode;
    }
    const displayW = Math.max(1, canvas.width);
    const displayH = Math.max(1, canvas.height);
    this.paramsF32[0] = displayW;
    this.paramsF32[1] = displayH;
    this.paramsF32[2] = outWidth;
    this.paramsF32[3] = outHeight;
    this.paramsF32[4] = opts.flipY ? 1 : 0;
    this.paramsF32[5] = 0;
    this.paramsF32[6] = 0;
    this.paramsF32[7] = 0;
    const uniformOffset = this.allocParamsChunk();
    this.queue.writeBuffer(this.paramsBuffer, uniformOffset, this.paramsF32.buffer, this.paramsF32.byteOffset, this.paramsF32.byteLength);
    const pipelineState = this.getPipeline(format);
    const srcBuffer = resolveSrcBuffer(src);
    let bindGroup = pipelineState.bindGroups.get(srcBuffer);
    if (!bindGroup) {
      bindGroup = this.device.createBindGroup({
        label: opts.label ? `${opts.label}:bindGroup` : void 0,
        layout: pipelineState.bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: this.paramsBuffer, offset: 0, size: 32 }
          },
          {
            binding: 1,
            resource: { buffer: srcBuffer }
          }
        ]
      });
      pipelineState.bindGroups.set(srcBuffer, bindGroup);
    }
    const view = state.context.getCurrentTexture().createView();
    const loadOp = opts.loadOp ?? "load";
    const storeOp = opts.storeOp ?? "store";
    const clearValue = opts.clearColor ?? { r: 0, g: 0, b: 0, a: 1 };
    const pass = encoder.beginRenderPass({
      label: opts.label,
      colorAttachments: [
        {
          view,
          clearValue,
          loadOp,
          storeOp
        }
      ]
    });
    pass.setPipeline(pipelineState.pipeline);
    pass.setBindGroup(0, bindGroup, [uniformOffset]);
    pass.draw(3, 1, 0, 0);
    pass.end();
  }
  allocParamsChunk() {
    const idx = this.paramsIndex++;
    if (this.paramsIndex >= this.paramsCapacity) this.paramsIndex = 0;
    return idx % this.paramsCapacity * this.paramsStride;
  }
  getOrCreateCanvasState(canvas) {
    const cached = this.canvasState.get(canvas);
    if (cached) return cached;
    const context = canvas.getContext("webgpu");
    assert(!!context, "blitRGBA8BufferToCanvas: failed to acquire a WebGPU canvas context");
    const state = {
      context,
      width: Math.max(1, canvas.width),
      height: Math.max(1, canvas.height),
      format: null,
      alphaMode: "opaque",
      configured: false
    };
    this.canvasState.set(canvas, state);
    return state;
  }
  autoResizeCanvas(canvas, state, dprOverride) {
    const dpr = dprOverride ?? Math.max(1, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (w === state.width && h === state.height) return false;
    state.width = w;
    state.height = h;
    canvas.width = w;
    canvas.height = h;
    return true;
  }
  syncCanvasSizeWithoutResize(canvas, state) {
    const w = Math.max(1, canvas.width);
    const h = Math.max(1, canvas.height);
    if (w === state.width && h === state.height) return false;
    state.width = w;
    state.height = h;
    return true;
  }
  getPipeline(format) {
    const cached = this.pipelineByFormat.get(format);
    if (cached) return cached;
    const module = this.device.createShaderModule({ label: "WasmGPU:compute:blitRGBA8:shader", code: blitRGBA8_default });
    const bindGroupLayout = this.device.createBindGroupLayout({
      label: "WasmGPU:compute:blitRGBA8:bgl",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: 32
          }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: "read-only-storage"
          }
        }
      ]
    });
    const pipeline = this.device.createRenderPipeline({
      label: "WasmGPU:compute:blitRGBA8:pipeline",
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: {
        module,
        entryPoint: "vs_main"
      },
      fragment: {
        module,
        entryPoint: "fs_main",
        targets: [{ format }]
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "none"
      }
    });
    const state = {
      pipeline,
      bindGroupLayout,
      bindGroups: /* @__PURE__ */ new WeakMap()
    };
    this.pipelineByFormat.set(format, state);
    return state;
  }
};

// src/compute/readback.ts
var isNonNegativeInt4 = (n) => Number.isInteger(n) && n >= 0;
var resolveSourceBuffer = (src) => {
  return src instanceof StorageBuffer ? src.buffer : src;
};
var resolveLogicalByteLength = (src) => {
  if (src instanceof StorageBuffer) return src.byteLength;
  return Number(src.size);
};
var resolveSourceUsage = (src) => {
  if (src instanceof StorageBuffer) return src.usage;
  const usage = src.usage;
  return typeof usage === "number" ? usage : null;
};
var ReadbackRing = class {
  device;
  queue;
  labelPrefix;
  slots = [];
  cursor = 0;
  destroyed = false;
  constructor(device, queue, desc = {}) {
    this.device = device;
    this.queue = queue;
    const slotCount = Math.max(1, desc.slots ?? 3);
    this.labelPrefix = desc.labelPrefix ?? "WasmGPU:readback";
    for (let i = 0; i < slotCount; i++) this.slots.push(this.createSlot(4, i));
  }
  createSlot(capacityBytes, index) {
    const size = Math.max(4, alignTo(capacityBytes, 4));
    const buffer = this.device.createBuffer({
      label: `${this.labelPrefix}:slot${index}`,
      size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    return { buffer, capacityBytes: size, tail: Promise.resolve() };
  }
  ensureNotDestroyed() {
    assert(!this.destroyed, "ReadbackRing is destroyed");
  }
  assertSourceCanReadback(src) {
    if (src instanceof StorageBuffer) {
      assert(src.canReadback, "ReadbackRing requires the source StorageBuffer to be created with copySrc: true");
      return;
    }
    const usage = resolveSourceUsage(src);
    if (usage !== null) assert((usage & GPUBufferUsage.COPY_SRC) !== 0, "ReadbackRing requires the source GPUBuffer to have GPUBufferUsage.COPY_SRC");
  }
  async read(src, srcOffsetBytes = 0, sizeBytes, opts = {}) {
    this.ensureNotDestroyed();
    assert(this.slots.length > 0, "ReadbackRing has no slots");
    assert(isNonNegativeInt4(srcOffsetBytes), `srcOffsetBytes must be an integer >= 0 (got ${srcOffsetBytes})`);
    assert((srcOffsetBytes & 3) === 0, `srcOffsetBytes must be 4-byte aligned for readback (got ${srcOffsetBytes})`);
    this.assertSourceCanReadback(src);
    const logicalByteLength = resolveLogicalByteLength(src);
    const remaining = logicalByteLength - srcOffsetBytes;
    assert(remaining >= 0, `srcOffsetBytes (${srcOffsetBytes}) exceeds source byteLength (${logicalByteLength})`);
    const size = sizeBytes ?? remaining;
    assert(isNonNegativeInt4(size), `sizeBytes must be an integer >= 0 (got ${size})`);
    assert(size <= remaining, `sizeBytes (${size}) exceeds remaining bytes (${remaining})`);
    const alignedSize = Math.max(4, alignTo(size, 4));
    assert(alignedSize <= remaining, `Aligned copy size (${alignedSize}) exceeds remaining bytes (${remaining}). copyBufferToBuffer requires multiples of 4.`);
    const slotIndex = this.cursor;
    this.cursor = (this.cursor + 1) % this.slots.length;
    const slot = this.slots[slotIndex];
    const run = async () => {
      this.ensureNotDestroyed();
      if (slot.buffer.mapState === "mapped" || slot.buffer.mapState === "pending") {
        try {
          slot.buffer.unmap();
        } catch {
        }
        assert(slot.buffer.mapState !== "mapped" && slot.buffer.mapState !== "pending", "ReadbackRing internal error: staging buffer is still mapped");
      }
      if (alignedSize > slot.capacityBytes) {
        try {
          slot.buffer.destroy();
        } catch {
        }
        const newSlot = this.createSlot(alignedSize, slotIndex);
        slot.buffer = newSlot.buffer;
        slot.capacityBytes = newSlot.capacityBytes;
      }
      const srcBuf = resolveSourceBuffer(src);
      const encoder = this.device.createCommandEncoder({ label: opts.label ? `${opts.label}:copyToStaging` : `${this.labelPrefix}:copyToStaging` });
      encoder.copyBufferToBuffer(srcBuf, srcOffsetBytes, slot.buffer, 0, alignedSize);
      this.queue.submit([encoder.finish()]);
      try {
        await slot.buffer.mapAsync(GPUMapMode.READ, 0, alignedSize);
        const mapped = slot.buffer.getMappedRange(0, alignedSize);
        const out = mapped.slice(0, size);
        slot.buffer.unmap();
        return out;
      } catch (e) {
        try {
          slot.buffer.unmap();
        } catch {
        }
        throw e;
      }
    };
    const job = slot.tail.then(run, run);
    slot.tail = job.then(() => {
    }, () => {
    });
    return job;
  }
  async readAs(ctor, src, srcOffsetBytes = 0, sizeBytes, opts = {}) {
    const bytes = await this.read(src, srcOffsetBytes, sizeBytes, opts);
    const bpe = ctor.BYTES_PER_ELEMENT;
    assert(bytes.byteLength % bpe === 0, `readAs: byteLength (${bytes.byteLength}) is not divisible by BYTES_PER_ELEMENT (${bpe})`);
    const len = bytes.byteLength / bpe;
    return new ctor(bytes, 0, len);
  }
  readU32(src, elemOffset = 0, elemCount, opts = {}) {
    assert(isNonNegativeInt4(elemOffset), `elemOffset must be an integer >= 0 (got ${elemOffset})`);
    const byteOffset = elemOffset * 4;
    const byteLength = elemCount === void 0 ? void 0 : elemCount * 4;
    return this.readAs(Uint32Array, src, byteOffset, byteLength, opts);
  }
  readF32(src, elemOffset = 0, elemCount, opts = {}) {
    assert(isNonNegativeInt4(elemOffset), `elemOffset must be an integer >= 0 (got ${elemOffset})`);
    const byteOffset = elemOffset * 4;
    const byteLength = elemCount === void 0 ? void 0 : elemCount * 4;
    return this.readAs(Float32Array, src, byteOffset, byteLength, opts);
  }
  async readScalarU32(src, srcOffsetBytes = 0, opts = {}) {
    const out = await this.readAs(Uint32Array, src, srcOffsetBytes, 4, opts);
    return out[0] >>> 0;
  }
  async readScalarF32(src, srcOffsetBytes = 0, opts = {}) {
    const out = await this.readAs(Float32Array, src, srcOffsetBytes, 4, opts);
    return out[0];
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const slot of this.slots) {
      try {
        if (slot.buffer.mapState === "mapped" || slot.buffer.mapState === "pending") slot.buffer.unmap();
      } catch {
      }
      try {
        slot.buffer.destroy();
      } catch {
      }
      slot.tail = Promise.resolve();
    }
    this.slots.length = 0;
  }
};

// src/compute/ndarray.ts
var DTYPE_TABLE = {
  i8: { dtype: "i8", ctor: Int8Array, bytesPerElement: 1, wgslScalarType: null },
  u8: { dtype: "u8", ctor: Uint8Array, bytesPerElement: 1, wgslScalarType: null },
  i16: { dtype: "i16", ctor: Int16Array, bytesPerElement: 2, wgslScalarType: null },
  u16: { dtype: "u16", ctor: Uint16Array, bytesPerElement: 2, wgslScalarType: null },
  i32: { dtype: "i32", ctor: Int32Array, bytesPerElement: 4, wgslScalarType: "i32" },
  u32: { dtype: "u32", ctor: Uint32Array, bytesPerElement: 4, wgslScalarType: "u32" },
  f32: { dtype: "f32", ctor: Float32Array, bytesPerElement: 4, wgslScalarType: "f32" },
  f64: { dtype: "f64", ctor: Float64Array, bytesPerElement: 8, wgslScalarType: "f64" }
};
var dtypeInfo = (dtype) => {
  const info = DTYPE_TABLE[dtype];
  if (!info) throw new Error(`Unknown dtype: ${String(dtype)}`);
  return info;
};
var validateShape = (shape) => {
  assert(Array.isArray(shape), "shape must be an array of dimension sizes");
  const out = new Array(shape.length);
  for (let i = 0; i < shape.length; i++) {
    const d = shape[i];
    assert(Number.isInteger(d) && d >= 0, `shape[${i}] must be an integer >= 0 (got ${d})`);
    out[i] = d;
  }
  return out;
};
var defaultRowMajorStridesBytes = (shape, bytesPerElement2) => {
  const ndim = shape.length;
  const strides = new Array(ndim);
  let stride = bytesPerElement2;
  for (let i = ndim - 1; i >= 0; i--) {
    assert(Number.isInteger(stride) && stride >= 0, "Stride overflow while computing row-major strides");
    assert(stride <= 2147483647, `row-major stride exceeds i32 range (got ${stride})`);
    strides[i] = stride;
    stride = stride * shape[i];
    assert(Number.isFinite(stride) && stride >= 0, "Stride overflow while computing row-major strides");
    assert(stride <= Number.MAX_SAFE_INTEGER, "Stride overflow while computing row-major strides");
  }
  return strides;
};
var validateStridesBytes = (stridesBytes, ndim, bytesPerElement2) => {
  assert(Array.isArray(stridesBytes), "stridesBytes must be an array");
  assert(stridesBytes.length === ndim, `stridesBytes length (${stridesBytes.length}) must equal shape length (${ndim})`);
  const out = new Array(ndim);
  for (let i = 0; i < ndim; i++) {
    const s = stridesBytes[i];
    assert(Number.isInteger(s), `stridesBytes[${i}] must be an integer (got ${s})`);
    assert(s >= -2147483648 && s <= 2147483647, `stridesBytes[${i}] must fit in i32 (got ${s})`);
    assert(s % bytesPerElement2 === 0, `stridesBytes[${i}] (${s}) must be a multiple of bytesPerElement (${bytesPerElement2})`);
    out[i] = s;
  }
  return out;
};
var validateOffsetBytes = (offsetBytes, bytesPerElement2) => {
  const off = offsetBytes ?? 0;
  assert(Number.isInteger(off) && off >= 0, `offsetBytes must be an integer >= 0 (got ${off})`);
  assert(off % bytesPerElement2 === 0, `offsetBytes (${off}) must be a multiple of bytesPerElement (${bytesPerElement2})`);
  return off;
};
var numelFromShape = (shape) => {
  let n = 1;
  for (let i = 0; i < shape.length; i++) {
    n *= shape[i];
    if (shape[i] === 0) return 0;
    assert(Number.isFinite(n), "numel overflow");
  }
  return n;
};
var requiredBackingBytes = (shape, stridesBytes, offsetBytes, bytesPerElement2) => {
  if (shape.length === 0) {
    const req2 = offsetBytes + bytesPerElement2;
    assert(req2 <= 4294967295, `required backing bytes exceeds wasm32 address space (got ${req2})`);
    return req2;
  }
  if (numelFromShape(shape) === 0) return 0;
  let min = BigInt(offsetBytes);
  let max = BigInt(offsetBytes);
  for (let i = 0; i < shape.length; i++) {
    const dim = shape[i];
    const s = BigInt(stridesBytes[i]);
    const extent = BigInt(dim - 1) * s;
    if (extent < 0n) min += extent;
    else max += extent;
  }
  assert(min >= 0n, `layout underflows: minimum byte offset is ${min} (offsetBytes is too small for negative strides)`);
  const req = max + BigInt(bytesPerElement2);
  assert(req <= BigInt(4294967295), `required backing bytes exceeds wasm32 address space (got ${req})`);
  return Number(req);
};
var isContiguousRowMajor = (shape, stridesBytes, offsetBytes, bytesPerElement2) => {
  if (offsetBytes !== 0) return false;
  if (shape.length === 0) return true;
  if (numelFromShape(shape) === 0) return true;
  const expected = defaultRowMajorStridesBytes(shape, bytesPerElement2);
  for (let i = 0; i < shape.length; i++) if (stridesBytes[i] !== expected[i]) return false;
  return true;
};
var Ndarray = class {
  dtype;
  shape;
  stridesBytes;
  offsetBytes;
  bytesPerElement;
  numel;
  byteLength;
  constructor(dtype, shape, stridesBytes, offsetBytes, byteLength) {
    this.dtype = dtype;
    this.shape = shape;
    this.stridesBytes = stridesBytes;
    this.offsetBytes = offsetBytes;
    this.bytesPerElement = dtypeInfo(dtype).bytesPerElement;
    this.numel = numelFromShape(shape);
    this.byteLength = byteLength;
  }
  get ndim() {
    return this.shape.length;
  }
  get wgslScalarType() {
    return dtypeInfo(this.dtype).wgslScalarType;
  }
  get isContiguousC() {
    return isContiguousRowMajor(this.shape, this.stridesBytes, this.offsetBytes, this.bytesPerElement);
  }
  layout() {
    return { shape: this.shape.slice(), stridesBytes: this.stridesBytes.slice(), offsetBytes: this.offsetBytes };
  }
};
var ND_ERROR = 4294967295;
var CPUndarray = class _CPUndarray extends Ndarray {
  basePtrBytes;
  shapePtr;
  stridesPtr;
  indicesPtr;
  _buf = null;
  _all = null;
  constructor(dtype, shape, stridesBytes, offsetBytes, byteLength, basePtrBytes, shapePtr, stridesPtr, indicesPtr) {
    super(dtype, shape, stridesBytes, offsetBytes, byteLength);
    this.basePtrBytes = basePtrBytes;
    this.shapePtr = shapePtr;
    this.stridesPtr = stridesPtr;
    this.indicesPtr = indicesPtr;
  }
  static empty(dtype, layout) {
    wasm.memory();
    const info = dtypeInfo(dtype);
    const shape = validateShape(layout.shape);
    const offsetBytes = validateOffsetBytes(layout.offsetBytes, info.bytesPerElement);
    const stridesBytes = layout.stridesBytes ? validateStridesBytes(layout.stridesBytes, shape.length, info.bytesPerElement) : defaultRowMajorStridesBytes(shape, info.bytesPerElement);
    const byteLength = requiredBackingBytes(shape, stridesBytes, offsetBytes, info.bytesPerElement);
    const shapePtr = wasm.allocU32(shape.length >>> 0);
    const stridesPtr = wasm.allocU32(shape.length >>> 0);
    const indicesPtr = wasm.allocU32(shape.length >>> 0);
    const shapeView = wasm.u32view(shapePtr, shape.length >>> 0);
    for (let i = 0; i < shape.length; i++) shapeView[i] = shape[i] >>> 0;
    const strideView = wasm.i32view(stridesPtr, shape.length >>> 0);
    for (let i = 0; i < stridesBytes.length; i++) strideView[i] = stridesBytes[i] | 0;
    const basePtrBytes = byteLength > 0 ? wasm.allocBytes(byteLength >>> 0) : 0;
    return new _CPUndarray(dtype, shape, stridesBytes, offsetBytes, byteLength, basePtrBytes, shapePtr, stridesPtr, indicesPtr);
  }
  static zeros(dtype, layout) {
    const a = _CPUndarray.empty(dtype, layout);
    a.zero_();
    return a;
  }
  static fromArray(dtype, shape, src) {
    const dst = _CPUndarray.empty(dtype, { shape });
    assert(dst.isContiguousC, "CPUndarray.fromArray currently requires a contiguous row-major layout");
    assert(src.length >= dst.numel, `source length (${src.length}) must be >= numel (${dst.numel})`);
    const data = dst.data();
    for (let i = 0; i < dst.numel; i++) data[i] = src[i];
    return dst;
  }
  get residency() {
    return "cpu-webassembly";
  }
  ensureAllView() {
    const buf = wasm.memory().buffer;
    if (this._buf !== buf) {
      this._buf = buf;
      const ctor = dtypeInfo(this.dtype).ctor;
      this._all = new ctor(buf);
    }
    return this._all;
  }
  backingBytes() {
    if (this.byteLength === 0) return new Uint8Array(wasm.memory().buffer, 0, 0);
    return wasm.u8view(this.basePtrBytes, this.byteLength >>> 0);
  }
  data() {
    assert(this.isContiguousC, "CPUndarray.data() requires a contiguous row-major layout (use backingBytes() for raw backing storage)");
    if (this.numel === 0) {
      const buf = wasm.memory().buffer;
      const ctor = dtypeInfo(this.dtype).ctor;
      return new ctor(buf, 0, 0);
    }
    return new (dtypeInfo(this.dtype)).ctor(wasm.memory().buffer, this.basePtrBytes + this.offsetBytes >>> 0, this.numel >>> 0);
  }
  offsetBytesAt(indices) {
    assert(indices.length === this.ndim, `expected ${this.ndim} indices, got ${indices.length}`);
    if (this.ndim === 0) return this.offsetBytes;
    const idxView = wasm.u32view(this.indicesPtr, this.ndim >>> 0);
    for (let i = 0; i < this.ndim; i++) {
      const v = indices[i];
      assert(Number.isInteger(v) && v >= 0, `index[${i}] must be an integer >= 0 (got ${v})`);
      idxView[i] = v >>> 0;
    }
    const off = ndarrayf.offsetBytes(this.shapePtr, this.stridesPtr, this.indicesPtr, this.ndim >>> 0, this.offsetBytes >>> 0);
    assert(off !== ND_ERROR, "index out of bounds (or offset overflow)");
    assert(off + this.bytesPerElement <= this.byteLength, "computed byte offset is outside backing storage");
    return off;
  }
  get(...indices) {
    const off = this.offsetBytesAt(indices);
    const abs = this.basePtrBytes + off >>> 0;
    assert(abs % this.bytesPerElement === 0, "internal error: misaligned element address");
    const i = abs / this.bytesPerElement;
    const all = this.ensureAllView();
    return all[i];
  }
  set(value, ...indices) {
    const off = this.offsetBytesAt(indices);
    const abs = this.basePtrBytes + off >>> 0;
    assert(abs % this.bytesPerElement === 0, "internal error: misaligned element address");
    const i = abs / this.bytesPerElement;
    const all = this.ensureAllView();
    all[i] = value;
  }
  zero_() {
    if (this.byteLength === 0) return;
    this.backingBytes().fill(0);
  }
  uploadToGPU(ctx, desc = {}) {
    const bytes = this.backingBytes();
    const sb = new StorageBuffer(ctx.device, ctx.queue, {
      label: desc.label,
      byteLength: this.byteLength,
      data: bytes,
      copyDst: desc.copyDst,
      copySrc: desc.copySrc,
      usage: desc.usage
    });
    return new GPUndarray(this.dtype, this.shape.slice(), this.stridesBytes.slice(), this.offsetBytes, this.byteLength, sb, 0, true);
  }
};
var GPUndarray = class _GPUndarray extends Ndarray {
  buffer;
  baseOffsetBytes;
  owned;
  constructor(dtype, shape, stridesBytes, offsetBytes, byteLength, buffer, baseOffsetBytes = 0, owned = false) {
    super(dtype, shape, stridesBytes, offsetBytes, byteLength);
    assert(Number.isInteger(baseOffsetBytes) && baseOffsetBytes >= 0, `baseOffsetBytes must be an integer >= 0 (got ${baseOffsetBytes})`);
    assert((baseOffsetBytes & 3) === 0, `baseOffsetBytes must be 4-byte aligned for storage buffers (got ${baseOffsetBytes})`);
    this.buffer = buffer;
    this.baseOffsetBytes = baseOffsetBytes;
    this.owned = owned;
  }
  static empty(ctx, dtype, layout, desc = {}) {
    const info = dtypeInfo(dtype);
    const shape = validateShape(layout.shape);
    const offsetBytes = validateOffsetBytes(layout.offsetBytes, info.bytesPerElement);
    const stridesBytes = layout.stridesBytes ? validateStridesBytes(layout.stridesBytes, shape.length, info.bytesPerElement) : defaultRowMajorStridesBytes(shape, info.bytesPerElement);
    const byteLength = requiredBackingBytes(shape, stridesBytes, offsetBytes, info.bytesPerElement);
    const sb = new StorageBuffer(ctx.device, ctx.queue, {
      label: desc.label,
      byteLength,
      copyDst: desc.copyDst,
      copySrc: desc.copySrc,
      usage: desc.usage
    });
    return new _GPUndarray(dtype, shape, stridesBytes, offsetBytes, byteLength, sb, 0, true);
  }
  static wrap(buffer, dtype, layout, baseOffsetBytes = 0) {
    const info = dtypeInfo(dtype);
    const shape = validateShape(layout.shape);
    const offsetBytes = validateOffsetBytes(layout.offsetBytes, info.bytesPerElement);
    const stridesBytes = layout.stridesBytes ? validateStridesBytes(layout.stridesBytes, shape.length, info.bytesPerElement) : defaultRowMajorStridesBytes(shape, info.bytesPerElement);
    const byteLength = requiredBackingBytes(shape, stridesBytes, offsetBytes, info.bytesPerElement);
    return new _GPUndarray(dtype, shape, stridesBytes, offsetBytes, byteLength, buffer, baseOffsetBytes, false);
  }
  get residency() {
    return "gpu-storagebuffer";
  }
  bindingResource() {
    return { buffer: this.buffer, offset: this.baseOffsetBytes, size: alignTo(this.byteLength, 4) };
  }
  async readbackToCPU() {
    assert(this.buffer.canReadback, "GPUndarray.readbackToCPU() requires the underlying StorageBuffer to be created with copySrc: true");
    const bytes = await this.buffer.read(this.baseOffsetBytes, this.byteLength);
    const cpu = CPUndarray.empty(this.dtype, { shape: this.shape, stridesBytes: this.stridesBytes, offsetBytes: this.offsetBytes });
    cpu.backingBytes().set(new Uint8Array(bytes), 0);
    return cpu;
  }
  destroy() {
    if (this.owned) this.buffer.destroy();
  }
};

// src/compute/index.ts
var Compute = class {
  device;
  queue;
  kernels;
  readback;
  ndarray = Ndarray;
  CPUndarray = CPUndarray;
  GPUndarray = GPUndarray;
  _rgba8Blitter = null;
  constructor(device, queue, desc = {}) {
    this.device = device;
    this.queue = queue;
    this.kernels = new ComputeKernels(device, queue);
    this.readback = new ReadbackRing(device, queue, desc.readback);
  }
  createStorageBuffer(desc) {
    return new StorageBuffer(this.device, this.queue, desc);
  }
  createUniformBuffer(desc) {
    return new UniformBuffer(this.device, this.queue, desc);
  }
  createPipeline(desc) {
    return new ComputePipeline(this.device, desc);
  }
  createReadbackRing(desc = {}) {
    return new ReadbackRing(this.device, this.queue, desc);
  }
  encodeDispatch(encoder, cmd, validateLimits = false) {
    if (validateLimits) validateWorkgroupsForDevice(this.device, cmd.workgroups);
    encodeDispatch(encoder, cmd);
  }
  encodeDispatchBatch(encoder, commands, label, validateLimits = false) {
    if (validateLimits) for (const cmd of commands) validateWorkgroupsForDevice(this.device, cmd.workgroups);
    encodeDispatchBatch(encoder, commands, label);
  }
  dispatch(cmd, opts = {}) {
    const encoder = this.device.createCommandEncoder();
    this.encodeDispatch(encoder, cmd, opts.validateLimits ?? false);
    const commandBuffer = encoder.finish();
    if (opts.submit !== false) this.queue.submit([commandBuffer]);
    return commandBuffer;
  }
  dispatchBatch(commands, label, opts = {}) {
    const encoder = this.device.createCommandEncoder();
    this.encodeDispatchBatch(encoder, commands, label, opts.validateLimits ?? false);
    const commandBuffer = encoder.finish();
    if (opts.submit !== false) this.queue.submit([commandBuffer]);
    return commandBuffer;
  }
  dispatch1D(pipeline, bindGroups, invocations, workgroupSizeX, label, opts = {}) {
    const workgroups = workgroups1D(invocations, workgroupSizeX);
    return this.dispatch({ pipeline, bindGroups, workgroups, label }, opts);
  }
  dispatch2D(pipeline, bindGroups, width, height, workgroupSizeX, workgroupSizeY, label, opts = {}) {
    const workgroups = workgroups2D(width, height, workgroupSizeX, workgroupSizeY);
    return this.dispatch({ pipeline, bindGroups, workgroups, label }, opts);
  }
  dispatch3D(pipeline, bindGroups, width, height, depth, workgroupSizeX, workgroupSizeY, workgroupSizeZ, label, opts = {}) {
    const workgroups = workgroups3D(width, height, depth, workgroupSizeX, workgroupSizeY, workgroupSizeZ);
    return this.dispatch({ pipeline, bindGroups, workgroups, label }, opts);
  }
  blitRGBA8BufferToCanvas(encoder, canvas, src, outWidth, outHeight, opts = {}) {
    if (!this._rgba8Blitter) this._rgba8Blitter = new RGBA8BufferCanvasBlitter(this.device, this.queue);
    this._rgba8Blitter.encode(encoder, canvas, src, outWidth, outHeight, opts);
  }
  workgroups1D(invocations, workgroupSizeX) {
    return workgroups1D(invocations, workgroupSizeX);
  }
  workgroups2D(width, height, workgroupSizeX, workgroupSizeY) {
    return workgroups2D(width, height, workgroupSizeX, workgroupSizeY);
  }
  workgroups3D(width, height, depth, workgroupSizeX, workgroupSizeY, workgroupSizeZ) {
    return workgroups3D(width, height, depth, workgroupSizeX, workgroupSizeY, workgroupSizeZ);
  }
  destroy() {
    this._rgba8Blitter?.destroy();
    this._rgba8Blitter = null;
    this.readback.destroy();
    this.kernels.destroy();
  }
};

// src/gltf/uri.ts
var isDataUri = (uri) => {
  return uri.startsWith("data:");
};
var decodeDataUri = (uri) => {
  const m = uri.match(/^data:([^,]*),([\s\S]*)$/);
  if (!m) throw new Error(`Invalid data URI: ${uri.slice(0, 64)}...`);
  const meta = m[1] ?? "";
  const payload = m[2] ?? "";
  const parts = meta.split(";").filter((p) => p.length > 0);
  let mimeType = null;
  let isBase64 = false;
  for (const p of parts) {
    if (p === "base64") isBase64 = true;
    else mimeType = p;
  }
  if (isBase64) {
    const binStr = atob(payload);
    const bytes2 = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes2[i] = binStr.charCodeAt(i) & 255;
    return { mimeType, data: bytes2.buffer };
  }
  const decoded = decodeURIComponent(payload);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i) & 255;
  return { mimeType, data: bytes.buffer };
};
var dirnameUrl = (url) => {
  const idx = url.lastIndexOf("/");
  if (idx < 0) return "";
  return url.slice(0, idx + 1);
};
var resolveUri = (baseUrl, uri) => {
  if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("blob:")) return uri;
  if (uri.startsWith("/")) return uri;
  if (!baseUrl) return uri;
  return baseUrl + uri;
};

// src/gltf/glb.ts
var GLB_MAGIC = 1179937895;
var GLB_VERSION_2 = 2;
var CHUNK_JSON = 1313821514;
var CHUNK_BIN = 5130562;
var parseGLB = (glb) => {
  const dv = new DataView(glb);
  if (dv.byteLength < 12) throw new Error("Invalid GLB: too small");
  const magic = dv.getUint32(0, true);
  const version = dv.getUint32(4, true);
  const length = dv.getUint32(8, true);
  if (magic !== GLB_MAGIC) throw new Error("Invalid GLB: bad magic");
  if (version !== GLB_VERSION_2) throw new Error(`Unsupported GLB version: ${version}`);
  if (length > dv.byteLength) throw new Error("Invalid GLB: length exceeds buffer");
  let offset = 12;
  let jsonChunk = null;
  let binChunk = null;
  while (offset + 8 <= length) {
    const chunkLength = dv.getUint32(offset + 0, true);
    const chunkType = dv.getUint32(offset + 4, true);
    offset += 8;
    if (offset + chunkLength > length) throw new Error("Invalid GLB: chunk exceeds buffer length");
    const chunk = glb.slice(offset, offset + chunkLength);
    if (chunkType === CHUNK_JSON) jsonChunk = chunk;
    else if (chunkType === CHUNK_BIN && !binChunk) binChunk = chunk;
    offset += chunkLength;
  }
  if (!jsonChunk) throw new Error("Invalid GLB: missing JSON chunk");
  const jsonText = new TextDecoder("utf-8").decode(jsonChunk);
  const json = JSON.parse(jsonText);
  return { json, binChunk };
};

// src/gltf/accessors.ts
var COMPONENT_INFO = {
  5120: { bytes: 1, ctor: Int8Array, signed: true, bits: 8 },
  5121: { bytes: 1, ctor: Uint8Array, signed: false, bits: 8 },
  5122: { bytes: 2, ctor: Int16Array, signed: true, bits: 16 },
  5123: { bytes: 2, ctor: Uint16Array, signed: false, bits: 16 },
  5124: { bytes: 4, ctor: Int32Array, signed: true, bits: 32 },
  5125: { bytes: 4, ctor: Uint32Array, signed: false, bits: 32 },
  5126: { bytes: 4, ctor: Float32Array, signed: true, bits: 32 }
};
var gltfNumComponents = (type) => {
  switch (type) {
    case "SCALAR":
      return 1;
    case "VEC2":
      return 2;
    case "VEC3":
      return 3;
    case "VEC4":
      return 4;
    case "MAT2":
      return 4;
    case "MAT3":
      return 9;
    case "MAT4":
      return 16;
    default:
      return 1;
  }
};
var getAccessor = (json, index) => {
  const a = json.accessors?.[index];
  if (!a) throw new Error(`Invalid accessor index: ${index}`);
  return a;
};
var getBufferView = (json, index) => {
  const bv = json.bufferViews?.[index];
  if (!bv) throw new Error(`Invalid bufferView index: ${index}`);
  return bv;
};
var readComponent = (dv, byteOffset, componentType) => {
  switch (componentType) {
    case 5120:
      return dv.getInt8(byteOffset);
    case 5121:
      return dv.getUint8(byteOffset);
    case 5122:
      return dv.getInt16(byteOffset, true);
    case 5123:
      return dv.getUint16(byteOffset, true);
    case 5124:
      return dv.getInt32(byteOffset, true);
    case 5125:
      return dv.getUint32(byteOffset, true);
    case 5126:
      return dv.getFloat32(byteOffset, true);
    default:
      throw new Error(`Unsupported componentType: ${componentType}`);
  }
};
var readAccessor = (doc, accessorIndex) => {
  const json = doc.json;
  const accessor = getAccessor(json, accessorIndex);
  const componentType = accessor.componentType;
  const info = COMPONENT_INFO[componentType];
  if (!info) throw new Error(`Unsupported accessor componentType: ${componentType}`);
  const count = accessor.count | 0;
  const type = accessor.type;
  const numComps = gltfNumComponents(type);
  const normalized = accessor.normalized === true;
  const elemByteSize = info.bytes * numComps;
  let base;
  if (accessor.bufferView === void 0) {
    base = new info.ctor(new ArrayBuffer(count * numComps * info.bytes), 0, count * numComps);
  } else {
    const bv = getBufferView(json, accessor.bufferView);
    if (bv.extensions?.["EXT_meshopt_compression"]) throw new Error("EXT_meshopt_compression is not supported yet. Please provide an uncompressed glTF/GLB.");
    const buffer = doc.buffers[bv.buffer];
    if (!buffer) throw new Error(`Missing buffer[${bv.buffer}]`);
    const bvOffset = (bv.byteOffset ?? 0) | 0;
    const accOffset = (accessor.byteOffset ?? 0) | 0;
    const start = bvOffset + accOffset;
    const byteStride = bv.byteStride ?? elemByteSize;
    if (byteStride < elemByteSize) throw new Error(`Invalid bufferView.byteStride (${byteStride}) < element byte size (${elemByteSize})`);
    const isTight = byteStride === elemByteSize;
    const isAligned = start % info.bytes === 0;
    if (isTight && isAligned) {
      base = new info.ctor(buffer, start, count * numComps);
    } else {
      base = new info.ctor(new ArrayBuffer(count * numComps * info.bytes), 0, count * numComps);
      const dv = new DataView(buffer);
      for (let i = 0; i < count; i++) {
        const elemBaseByte = start + i * byteStride;
        for (let c = 0; c < numComps; c++) {
          const byteOff = elemBaseByte + c * info.bytes;
          const outIndex = i * numComps + c;
          base[outIndex] = readComponent(dv, byteOff, componentType);
        }
      }
    }
  }
  if (accessor.sparse) {
    const out = base.slice();
    applySparse(doc, accessor, out, componentType, numComps);
    base = out;
  }
  return {
    accessor,
    componentType,
    type,
    count,
    numComponents: numComps,
    normalized,
    array: base
  };
};
var applySparse = (doc, accessor, out, componentType, numComps) => {
  const sparse = accessor.sparse;
  const scount = sparse.count | 0;
  if (scount <= 0) return;
  const idxBv = getBufferView(doc.json, sparse.indices.bufferView);
  if (idxBv.extensions?.["EXT_meshopt_compression"]) throw new Error("EXT_meshopt_compression sparse indices are not supported yet.");
  const idxBuf = doc.buffers[idxBv.buffer];
  if (!idxBuf) throw new Error(`Missing buffer[${idxBv.buffer}] for sparse indices`);
  const idxOffset = (idxBv.byteOffset ?? 0) + (sparse.indices.byteOffset ?? 0);
  const idxComponent = sparse.indices.componentType;
  const idxInfo = COMPONENT_INFO[idxComponent];
  if (!idxInfo) throw new Error(`Unsupported sparse indices componentType: ${idxComponent}`);
  const idxStride = idxInfo.bytes;
  const idxDv = new DataView(idxBuf);
  const valBv = getBufferView(doc.json, sparse.values.bufferView);
  if (valBv.extensions?.["EXT_meshopt_compression"]) throw new Error("EXT_meshopt_compression sparse values are not supported yet.");
  const valBuf = doc.buffers[valBv.buffer];
  if (!valBuf) throw new Error(`Missing buffer[${valBv.buffer}] for sparse values`);
  const valOffset = (valBv.byteOffset ?? 0) + (sparse.values.byteOffset ?? 0);
  const valDv = new DataView(valBuf);
  const compInfo = COMPONENT_INFO[componentType];
  if (!compInfo) throw new Error(`Unsupported sparse values componentType: ${componentType}`);
  for (let i = 0; i < scount; i++) {
    const idxByte = idxOffset + i * idxStride;
    const dstIndex = readComponent(idxDv, idxByte, idxComponent) | 0;
    const dstBase = dstIndex * numComps;
    const srcBaseByte = valOffset + i * numComps * compInfo.bytes;
    for (let c = 0; c < numComps; c++) {
      const v = readComponent(valDv, srcBaseByte + c * compInfo.bytes, componentType);
      out[dstBase + c] = v;
    }
  }
};
var readAccessorAsFloat32 = (doc, accessorIndex) => {
  const view = readAccessor(doc, accessorIndex);
  const info = COMPONENT_INFO[view.componentType];
  if (!info) throw new Error(`Unsupported componentType: ${view.componentType}`);
  if (view.componentType === 5126 && !view.normalized) return view.array;
  const out = new Float32Array(view.array.length);
  for (let i = 0; i < view.array.length; i++) {
    const v = view.array[i];
    if (!view.normalized || view.componentType === 5126) {
      out[i] = v;
    } else {
      if (info.signed) {
        const maxPos = 2 ** (info.bits - 1) - 1;
        const minNeg = -(2 ** (info.bits - 1));
        const f = v / maxPos;
        out[i] = v === minNeg ? -1 : Math.max(-1, Math.min(1, f));
      } else {
        const max = 2 ** info.bits - 1;
        out[i] = v / max;
      }
    }
  }
  return out;
};
var readAccessorAsUint16 = (doc, accessorIndex) => {
  const view = readAccessor(doc, accessorIndex);
  const ct = view.componentType;
  if (ct === 5123 && !view.normalized) return view.array;
  const out = new Uint16Array(view.array.length);
  if (ct === 5121 && !view.normalized) {
    const src = view.array;
    for (let i = 0; i < src.length; i++) out[i] = src[i];
    return out;
  }
  for (let i = 0; i < view.array.length; i++) {
    const v = view.array[i];
    out[i] = v < 0 ? 0 : v > 65535 ? 65535 : v | 0;
  }
  return out;
};
var readIndicesAsUint32 = (doc, accessorIndex) => {
  const view = readAccessor(doc, accessorIndex);
  const ct = view.componentType;
  if (ct === 5125 && !view.normalized) return view.array;
  const out = new Uint32Array(view.array.length);
  for (let i = 0; i < view.array.length; i++) out[i] = view.array[i] >>> 0;
  return out;
};

// src/gltf/loader.ts
var warn = (opts, msg) => opts?.onWarning?.(msg);
var getFetch = (opts) => {
  const f = opts?.fetch ?? globalThis.fetch;
  if (!f) throw new Error("loadGltf(): fetch() is not available. Pass LoadGltfOptions.fetch or provide an ArrayBuffer source.");
  return f;
};
var fetchArrayBuffer = async (url, opts) => {
  const f = getFetch(opts);
  const res = await f(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return await res.arrayBuffer();
};
var fetchJson = async (url, opts) => {
  const f = getFetch(opts);
  const res = await f(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return await res.json();
};
var resolveBuffers = async (json, baseUrl, opts, glbBinChunk) => {
  const buffers = json.buffers ?? [];
  const out = new Array(buffers.length);
  for (let i = 0; i < buffers.length; i++) {
    const b = buffers[i];
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
var resolveImages = async (json, buffers, baseUrl, opts) => {
  const images = json.images ?? [];
  const out = new Array(images.length);
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (img.uri) {
      if (isDataUri(img.uri)) {
        out[i] = decodeDataUri(img.uri).data;
      } else {
        const url = resolveUri(baseUrl, img.uri);
        out[i] = await fetchArrayBuffer(url, opts);
      }
      continue;
    }
    if (img.bufferView !== void 0) {
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
var loadGltf = async (source, opts) => {
  if (typeof source === "string") {
    const url = source;
    const baseUrl2 = opts?.baseUrl ?? dirnameUrl(url);
    if (url.toLowerCase().endsWith(".glb")) {
      const glb = await fetchArrayBuffer(url, opts);
      const { json: json3, binChunk } = parseGLB(glb);
      const buffers3 = await resolveBuffers(json3, baseUrl2, opts, binChunk);
      const doc3 = { json: json3, buffers: buffers3, baseUrl: baseUrl2 };
      if (opts?.loadImages) doc3.images = await resolveImages(json3, buffers3, baseUrl2, opts);
      return doc3;
    }
    const json2 = await fetchJson(url, opts);
    const buffers2 = await resolveBuffers(json2, baseUrl2, opts, null);
    const doc2 = { json: json2, buffers: buffers2, baseUrl: baseUrl2 };
    if (opts?.loadImages) doc2.images = await resolveImages(json2, buffers2, baseUrl2, opts);
    return doc2;
  }
  const ab = source;
  const dv = new DataView(ab);
  const magic = dv.byteLength >= 4 ? dv.getUint32(0, true) : 0;
  const baseUrl = opts?.baseUrl ?? "";
  if (magic === 1179937895) {
    const { json: json2, binChunk } = parseGLB(ab);
    const buffers2 = await resolveBuffers(json2, baseUrl, opts, binChunk);
    const doc2 = { json: json2, buffers: buffers2, baseUrl };
    if (opts?.loadImages) doc2.images = await resolveImages(json2, buffers2, baseUrl, opts);
    return doc2;
  }
  const jsonText = new TextDecoder("utf-8").decode(ab);
  const json = JSON.parse(jsonText);
  const buffers = await resolveBuffers(json, baseUrl, opts, null);
  const doc = { json, buffers, baseUrl };
  if (opts?.loadImages) doc.images = await resolveImages(json, buffers, baseUrl, opts);
  return doc;
};

// src/graphics/geometry.ts
var Geometry = class _Geometry {
  positions;
  normals;
  uvs;
  joints;
  weights;
  joints1;
  weights1;
  _jointsBuffer = null;
  _weightsBuffer = null;
  _joints1Buffer = null;
  _weights1Buffer = null;
  indices;
  vertexCount;
  indexCount;
  _boundsCenter;
  _boundsRadius;
  _positionBuffer = null;
  _normalBuffer = null;
  _uvBuffer = null;
  _indexBuffer = null;
  _device = null;
  constructor(descriptor) {
    this.positions = descriptor.positions;
    this.vertexCount = this.positions.length / 3;
    this.normals = descriptor.normals ?? new Float32Array(this.vertexCount * 3).fill(0);
    if (!descriptor.normals) for (let i = 1; i < this.normals.length; i += 3) this.normals[i] = 1;
    this.uvs = descriptor.uvs ?? new Float32Array(this.vertexCount * 2);
    let joints = descriptor.joints ?? null;
    let weights = descriptor.weights ?? null;
    const expected = this.vertexCount * 4;
    if (joints && !weights || !joints && weights) {
      console.warn(`[Geometry] JOINTS_0/WEIGHTS_0 must be provided together. Skinning disabled for this geometry.`);
      joints = null;
      weights = null;
    }
    if (joints && joints.length !== expected) {
      console.warn(`[Geometry] joints length mismatch (got ${joints.length}, expected ${expected}). Skinning disabled.`);
      joints = null;
      weights = null;
    }
    if (weights && weights.length !== expected) {
      console.warn(`[Geometry] weights length mismatch (got ${weights.length}, expected ${expected}). Skinning disabled.`);
      joints = null;
      weights = null;
    }
    this.joints = joints;
    this.weights = weights;
    let joints1 = descriptor.joints1 ?? null;
    let weights1 = descriptor.weights1 ?? null;
    if (joints1 && !weights1 || !joints1 && weights1) {
      console.warn(`[Geometry] JOINTS_1/WEIGHTS_1 must be provided together. Ignoring additional influences.`);
      joints1 = null;
      weights1 = null;
    }
    if ((joints1 || weights1) && (!joints || !weights)) {
      console.warn(`[Geometry] JOINTS_1/WEIGHTS_1 provided without JOINTS_0/WEIGHTS_0. Ignoring additional influences.`);
      joints1 = null;
      weights1 = null;
    }
    if (joints1 && joints1.length !== expected) {
      console.warn(`[Geometry] joints1 length mismatch (got ${joints1.length}, expected ${expected}). Ignoring additional influences.`);
      joints1 = null;
      weights1 = null;
    }
    if (weights1 && weights1.length !== expected) {
      console.warn(`[Geometry] weights1 length mismatch (got ${weights1.length}, expected ${expected}). Ignoring additional influences.`);
      joints1 = null;
      weights1 = null;
    }
    this.joints1 = joints1;
    this.weights1 = weights1;
    this.indices = descriptor.indices ?? null;
    this.indexCount = this.indices?.length ?? this.vertexCount;
    if (this.vertexCount > 0) {
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (let i = 0; i < this.positions.length; i += 3) {
        const x = this.positions[i + 0];
        const y = this.positions[i + 1];
        const z = this.positions[i + 2];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
      }
      const cx = (minX + maxX) * 0.5;
      const cy = (minY + maxY) * 0.5;
      const cz = (minZ + maxZ) * 0.5;
      let maxR2 = 0;
      for (let i = 0; i < this.positions.length; i += 3) {
        const dx = this.positions[i + 0] - cx;
        const dy = this.positions[i + 1] - cy;
        const dz = this.positions[i + 2] - cz;
        const r2 = dx * dx + dy * dy + dz * dz;
        if (r2 > maxR2) maxR2 = r2;
      }
      this._boundsCenter = [cx, cy, cz];
      this._boundsRadius = Math.sqrt(maxR2);
    } else {
      this._boundsCenter = [0, 0, 0];
      this._boundsRadius = 0;
    }
  }
  upload(device) {
    if (this._device === device) return;
    this._device = device;
    this._positionBuffer = createBuffer(device, this.positions, GPUBufferUsage.VERTEX);
    this._normalBuffer = createBuffer(device, this.normals, GPUBufferUsage.VERTEX);
    this._uvBuffer = createBuffer(device, this.uvs, GPUBufferUsage.VERTEX);
    if (this.joints) this._jointsBuffer = createBuffer(device, this.joints, GPUBufferUsage.VERTEX);
    if (this.weights) this._weightsBuffer = createBuffer(device, this.weights, GPUBufferUsage.VERTEX);
    if (this.joints1) this._joints1Buffer = createBuffer(device, this.joints1, GPUBufferUsage.VERTEX);
    if (this.weights1) this._weights1Buffer = createBuffer(device, this.weights1, GPUBufferUsage.VERTEX);
    if (this.indices) this._indexBuffer = createBuffer(device, this.indices, GPUBufferUsage.INDEX);
  }
  get positionBuffer() {
    if (!this._positionBuffer) throw new Error("Geometry not uploaded. Call upload(device) first.");
    return this._positionBuffer;
  }
  get normalBuffer() {
    if (!this._normalBuffer) throw new Error("Geometry not uploaded. Call upload(device) first.");
    return this._normalBuffer;
  }
  get uvBuffer() {
    if (!this._uvBuffer) throw new Error("Geometry not uploaded. Call upload(device) first.");
    return this._uvBuffer;
  }
  get jointsBuffer() {
    return this._jointsBuffer;
  }
  get weightsBuffer() {
    return this._weightsBuffer;
  }
  get joints1Buffer() {
    return this._joints1Buffer;
  }
  get weights1Buffer() {
    return this._weights1Buffer;
  }
  get indexBuffer() {
    return this._indexBuffer;
  }
  get isIndexed() {
    return this._indexBuffer !== null;
  }
  get isSkinned() {
    return this._jointsBuffer !== null && this._weightsBuffer !== null;
  }
  get isSkinned8() {
    return this._jointsBuffer !== null && this._weightsBuffer !== null && this._joints1Buffer !== null && this._weights1Buffer !== null;
  }
  get boundsCenter() {
    return this._boundsCenter;
  }
  get boundsRadius() {
    return this._boundsRadius;
  }
  destroy() {
    this._positionBuffer?.destroy();
    this._normalBuffer?.destroy();
    this._uvBuffer?.destroy();
    this._jointsBuffer?.destroy();
    this._weightsBuffer?.destroy();
    this._joints1Buffer?.destroy();
    this._weights1Buffer?.destroy();
    this._jointsBuffer = null;
    this._weightsBuffer = null;
    this._joints1Buffer = null;
    this._weights1Buffer = null;
    this._indexBuffer?.destroy();
    this._positionBuffer = null;
    this._normalBuffer = null;
    this._uvBuffer = null;
    this._indexBuffer = null;
    this._device = null;
  }
  static box(width = 1, height = 1, depth = 1) {
    const w = width / 2, h = height / 2, d = depth / 2;
    const positions = new Float32Array([
      -w,
      -h,
      d,
      w,
      -h,
      d,
      w,
      h,
      d,
      -w,
      h,
      d,
      w,
      -h,
      -d,
      -w,
      -h,
      -d,
      -w,
      h,
      -d,
      w,
      h,
      -d,
      -w,
      h,
      d,
      w,
      h,
      d,
      w,
      h,
      -d,
      -w,
      h,
      -d,
      -w,
      -h,
      -d,
      w,
      -h,
      -d,
      w,
      -h,
      d,
      -w,
      -h,
      d,
      w,
      -h,
      d,
      w,
      -h,
      -d,
      w,
      h,
      -d,
      w,
      h,
      d,
      -w,
      -h,
      -d,
      -w,
      -h,
      d,
      -w,
      h,
      d,
      -w,
      h,
      -d
    ]);
    const normals = new Float32Array([
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0
    ]);
    const uvs = new Float32Array([
      0,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      0,
      0,
      0
    ]);
    const indices = new Uint32Array([
      0,
      1,
      2,
      0,
      2,
      3,
      4,
      5,
      6,
      4,
      6,
      7,
      8,
      9,
      10,
      8,
      10,
      11,
      12,
      13,
      14,
      12,
      14,
      15,
      16,
      17,
      18,
      16,
      18,
      19,
      20,
      21,
      22,
      20,
      22,
      23
    ]);
    return new _Geometry({ positions, normals, uvs, indices });
  }
  static plane(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
    const w = width / 2, h = height / 2;
    const gridX = widthSegments, gridY = heightSegments;
    const gridX1 = gridX + 1, gridY1 = gridY + 1;
    const segmentWidth = width / gridX;
    const segmentHeight = height / gridY;
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    for (let iy = 0; iy < gridY1; iy++) {
      const y = iy * segmentHeight - h;
      for (let ix = 0; ix < gridX1; ix++) {
        const x = ix * segmentWidth - w;
        positions.push(x, 0, y);
        normals.push(0, 1, 0);
        uvs.push(ix / gridX, 1 - iy / gridY);
      }
    }
    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        const a = ix + gridX1 * iy;
        const b = ix + gridX1 * (iy + 1);
        const c = ix + 1 + gridX1 * (iy + 1);
        const d = ix + 1 + gridX1 * iy;
        indices.push(a, b, d, b, c, d);
      }
    }
    return new _Geometry({
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices)
    });
  }
  static sphere(radius = 0.5, widthSegments = 32, heightSegments = 16) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    for (let iy = 0; iy <= heightSegments; iy++) {
      const v = iy / heightSegments;
      const phi = v * Math.PI;
      for (let ix = 0; ix <= widthSegments; ix++) {
        const u = ix / widthSegments;
        const theta = u * Math.PI * 2;
        const x = -Math.cos(theta) * Math.sin(phi);
        const y = Math.cos(phi);
        const z = Math.sin(theta) * Math.sin(phi);
        positions.push(radius * x, radius * y, radius * z);
        normals.push(x, y, z);
        uvs.push(u, v);
      }
    }
    for (let iy = 0; iy < heightSegments; iy++) {
      for (let ix = 0; ix < widthSegments; ix++) {
        const a = ix + (widthSegments + 1) * iy;
        const b = ix + (widthSegments + 1) * (iy + 1);
        const c = ix + 1 + (widthSegments + 1) * (iy + 1);
        const d = ix + 1 + (widthSegments + 1) * iy;
        if (iy !== 0) indices.push(a, b, d);
        if (iy !== heightSegments - 1) indices.push(b, c, d);
      }
    }
    return new _Geometry({
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices)
    });
  }
  static cylinder(radiusTop = 0.5, radiusBottom = 0.5, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let index = 0;
    const halfHeight = height / 2;
    const slope = (radiusBottom - radiusTop) / height;
    for (let iy = 0; iy <= heightSegments; iy++) {
      const v = iy / heightSegments;
      const y = v * height - halfHeight;
      const radius = v * (radiusTop - radiusBottom) + radiusBottom;
      for (let ix = 0; ix <= radialSegments; ix++) {
        const u = ix / radialSegments;
        const theta = u * Math.PI * 2;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        positions.push(radius * sinTheta, y, radius * cosTheta);
        const nLen = Math.sqrt(1 + slope * slope);
        normals.push(sinTheta / nLen, slope / nLen, cosTheta / nLen);
        uvs.push(u, 1 - v);
      }
    }
    for (let iy = 0; iy < heightSegments; iy++) {
      for (let ix = 0; ix < radialSegments; ix++) {
        const a = ix + (radialSegments + 1) * iy;
        const b = ix + (radialSegments + 1) * (iy + 1);
        const c = ix + 1 + (radialSegments + 1) * (iy + 1);
        const d = ix + 1 + (radialSegments + 1) * iy;
        indices.push(a, d, b, b, d, c);
      }
    }
    index = positions.length / 3;
    const generateTopCap = () => {
      const centerIndex = index;
      positions.push(0, halfHeight, 0);
      normals.push(0, 1, 0);
      uvs.push(0.5, 0.5);
      index++;
      for (let ix = 0; ix <= radialSegments; ix++) {
        const u = ix / radialSegments;
        const theta = u * Math.PI * 2;
        const x = radiusTop * Math.sin(theta);
        const z = radiusTop * Math.cos(theta);
        positions.push(x, halfHeight, z);
        normals.push(0, 1, 0);
        uvs.push(Math.sin(theta) * 0.5 + 0.5, Math.cos(theta) * 0.5 + 0.5);
        if (ix > 0) indices.push(centerIndex, index - 1, index);
        index++;
      }
    };
    const generateBottomCap = () => {
      const centerIndex = index;
      positions.push(0, -halfHeight, 0);
      normals.push(0, -1, 0);
      uvs.push(0.5, 0.5);
      index++;
      for (let ix = 0; ix <= radialSegments; ix++) {
        const u = ix / radialSegments;
        const theta = u * Math.PI * 2;
        const x = radiusBottom * Math.sin(theta);
        const z = radiusBottom * Math.cos(theta);
        positions.push(x, -halfHeight, z);
        normals.push(0, -1, 0);
        uvs.push(Math.sin(theta) * 0.5 + 0.5, Math.cos(theta) * 0.5 + 0.5);
        if (ix > 0) indices.push(centerIndex, index, index - 1);
        index++;
      }
    };
    if (!openEnded) {
      generateTopCap();
      generateBottomCap();
    }
    return new _Geometry({
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices)
    });
  }
  static pyramid(baseWidth = 1, baseDepth = 1, height = 1) {
    const w = baseWidth / 2, d = baseDepth / 2;
    const h = height;
    const apex = [0, h, 0];
    const bl = [-w, 0, -d];
    const br = [w, 0, -d];
    const fr = [w, 0, d];
    const fl = [-w, 0, d];
    const faceNormal = (v0, v1, v2) => {
      const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
      const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      return [nx / len, ny / len, nz / len];
    };
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let idx = 0;
    const addFace = (v0, v1, v2) => {
      const n = faceNormal(v0, v1, v2);
      positions.push(...v0, ...v1, ...v2);
      normals.push(...n, ...n, ...n);
      uvs.push(0.5, 0, 0, 1, 1, 1);
      indices.push(idx, idx + 1, idx + 2);
      idx += 3;
    };
    addFace(apex, fl, fr);
    addFace(apex, fr, br);
    addFace(apex, br, bl);
    addFace(apex, bl, fl);
    const baseNormal = [0, -1, 0];
    positions.push(...bl, ...br, ...fr, ...fl);
    normals.push(...baseNormal, ...baseNormal, ...baseNormal, ...baseNormal);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
    return new _Geometry({
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices)
    });
  }
  static torus(radius = 0.5, tube = 0.2, radialSegments = 32, tubularSegments = 24) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    for (let j = 0; j <= radialSegments; j++) {
      for (let i = 0; i <= tubularSegments; i++) {
        const u = i / tubularSegments * Math.PI * 2;
        const v = j / radialSegments * Math.PI * 2;
        const x = (radius + tube * Math.cos(v)) * Math.cos(u);
        const y = tube * Math.sin(v);
        const z = (radius + tube * Math.cos(v)) * Math.sin(u);
        positions.push(x, y, z);
        const cx = radius * Math.cos(u);
        const cz = radius * Math.sin(u);
        const nx = x - cx;
        const ny = y;
        const nz = z - cz;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        normals.push(nx / len, ny / len, nz / len);
        uvs.push(i / tubularSegments, j / radialSegments);
      }
    }
    for (let j = 0; j < radialSegments; j++) {
      for (let i = 0; i < tubularSegments; i++) {
        const a = i + (tubularSegments + 1) * j;
        const b = i + (tubularSegments + 1) * (j + 1);
        const c = i + 1 + (tubularSegments + 1) * (j + 1);
        const d = i + 1 + (tubularSegments + 1) * j;
        indices.push(a, b, d, b, c, d);
      }
    }
    return new _Geometry({
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices)
    });
  }
  static prism(radius = 0.5, height = 1, sides = 6) {
    if (sides < 3) sides = 3;
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const halfHeight = height / 2;
    let idx = 0;
    const topRing = [];
    const bottomRing = [];
    for (let i = 0; i < sides; i++) {
      const theta = i / sides * Math.PI * 2;
      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta);
      topRing.push([x, halfHeight, z]);
      bottomRing.push([x, -halfHeight, z]);
    }
    const faceNormal = (v0, v1, v2) => {
      const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
      const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      return [nx / len, ny / len, nz / len];
    };
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      const t0 = topRing[i];
      const t1 = topRing[next];
      const b0 = bottomRing[i];
      const b1 = bottomRing[next];
      const n = faceNormal(t0, t1, b0);
      positions.push(...t0, ...b0, ...b1, ...t1);
      normals.push(...n, ...n, ...n, ...n);
      const u0 = i / sides;
      const u1 = (i + 1) / sides;
      uvs.push(u0, 0, u0, 1, u1, 1, u1, 0);
      indices.push(idx, idx + 2, idx + 1, idx, idx + 3, idx + 2);
      idx += 4;
    }
    const topCenter = [0, halfHeight, 0];
    const topNormal = [0, 1, 0];
    const topCenterIdx = idx;
    positions.push(...topCenter);
    normals.push(...topNormal);
    uvs.push(0.5, 0.5);
    idx++;
    for (let i = 0; i < sides; i++) {
      const t = topRing[i];
      positions.push(...t);
      normals.push(...topNormal);
      const u = 0.5 + 0.5 * Math.cos(i / sides * Math.PI * 2);
      const v = 0.5 + 0.5 * Math.sin(i / sides * Math.PI * 2);
      uvs.push(u, v);
    }
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      indices.push(topCenterIdx, topCenterIdx + 1 + next, topCenterIdx + 1 + i);
    }
    idx += sides;
    const bottomCenter = [0, -halfHeight, 0];
    const bottomNormal = [0, -1, 0];
    const bottomCenterIdx = idx;
    positions.push(...bottomCenter);
    normals.push(...bottomNormal);
    uvs.push(0.5, 0.5);
    idx++;
    for (let i = 0; i < sides; i++) {
      const b = bottomRing[i];
      positions.push(...b);
      normals.push(...bottomNormal);
      const u = 0.5 + 0.5 * Math.cos(i / sides * Math.PI * 2);
      const v = 0.5 + 0.5 * Math.sin(i / sides * Math.PI * 2);
      uvs.push(u, v);
    }
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      indices.push(bottomCenterIdx, bottomCenterIdx + 1 + i, bottomCenterIdx + 1 + next);
    }
    return new _Geometry({
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices)
    });
  }
};

// src/wgsl/graphics/mipmap.wgsl
var mipmap_default = "@group(0) @binding(0) var samp: sampler; @group(0) @binding(1) var tex: texture_2d<f32>; struct VSOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f }; @vertex fn vs_main(@builtin(vertex_index) idx: u32) -> VSOut { var positions = array<vec2f, 3>( vec2f(-1.0, -1.0), vec2f( 3.0, -1.0), vec2f(-1.0, 3.0) ); var uvs = array<vec2f, 3>( vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0) ); var o: VSOut; o.pos = vec4f(positions[idx], 0.0, 1.0); o.uv = uvs[idx]; return o; } @fragment fn fs_main(in: VSOut) -> @location(0) vec4f { return textureSample(tex, samp, in.uv); }";

// src/graphics/texture.ts
var __texture2d_id = 1;
var hasCreateImageBitmap = () => typeof globalThis.createImageBitmap === "function";
var mipLevelCountForSize = (w, h) => {
  const m = Math.max(1, w | 0, h | 0);
  return (Math.floor(Math.log2(m)) | 0) + 1;
};
var mipmapCache = /* @__PURE__ */ new WeakMap();
var getMipmapCache = (device) => {
  const cached = mipmapCache.get(device);
  if (cached) return cached;
  const module = device.createShaderModule({ code: mipmap_default });
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
    ]
  });
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
  const createPipeline = (format) => {
    return device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module, entryPoint: "vs_main" },
      fragment: { module, entryPoint: "fs_main", targets: [{ format }] },
      primitive: { topology: "triangle-list" }
    });
  };
  const sampler = device.createSampler({ minFilter: "linear", magFilter: "linear" });
  const created = {
    pipelineLinear: createPipeline("rgba8unorm"),
    pipelineSrgb: createPipeline("rgba8unorm-srgb"),
    sampler,
    bindGroupLayout
  };
  mipmapCache.set(device, created);
  return created;
};
var Texture2D = class _Texture2D {
  id = __texture2d_id++;
  _source;
  _mipmaps;
  _mipmapColorSpace = null;
  samplerDesc;
  _gpuTexture = null;
  _viewLinear = null;
  _viewSrgb = null;
  _sampler = null;
  _uploadPromise = null;
  _uploadStarted = false;
  _revision = 0;
  _width = 0;
  _height = 0;
  constructor(desc) {
    this._source = desc.source;
    this._mipmaps = desc.mipmaps ?? true;
    this.samplerDesc = {
      addressModeU: desc.sampler?.addressModeU ?? "repeat",
      addressModeV: desc.sampler?.addressModeV ?? "repeat",
      addressModeW: desc.sampler?.addressModeW ?? "repeat",
      magFilter: desc.sampler?.magFilter ?? "linear",
      minFilter: desc.sampler?.minFilter ?? "linear",
      mipmapFilter: desc.sampler?.mipmapFilter ?? "linear",
      lodMinClamp: desc.sampler?.lodMinClamp ?? 0,
      lodMaxClamp: desc.sampler?.lodMaxClamp ?? 32
    };
  }
  get revision() {
    return this._revision;
  }
  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }
  get uploaded() {
    return !!this._gpuTexture;
  }
  static createFrom(desc) {
    return new _Texture2D(desc);
  }
  getSampler(device, fallback) {
    if (this._sampler) return this._sampler;
    try {
      this._sampler = device.createSampler(this.samplerDesc);
      return this._sampler;
    } catch (e) {
      if (fallback) return fallback;
      throw e;
    }
  }
  getView(device, queue, colorSpace, fallbackView) {
    if (this._gpuTexture) {
      if (colorSpace === "srgb") return this._viewSrgb ?? fallbackView;
      return this._viewLinear ?? fallbackView;
    }
    this.ensureUploaded(device, queue, colorSpace);
    return fallbackView;
  }
  destroy() {
    this._gpuTexture?.destroy();
    this._gpuTexture = null;
    this._viewLinear = null;
    this._viewSrgb = null;
    this._sampler = null;
    this._uploadStarted = false;
    this._uploadPromise = null;
    this._mipmapColorSpace = null;
    this._revision++;
  }
  ensureUploaded(device, queue, colorSpace = "linear") {
    if (this._uploadStarted) return;
    this._uploadStarted = true;
    this._mipmapColorSpace = colorSpace;
    this._uploadPromise = (async () => {
      let bitmap = null;
      let texture = null;
      try {
        bitmap = await this.decodeBitmap();
        const w = bitmap.width | 0;
        const h = bitmap.height | 0;
        const mipLevelCount = this._mipmaps ? mipLevelCountForSize(w, h) : 1;
        texture = device.createTexture({
          size: { width: w, height: h },
          format: "rgba8unorm",
          mipLevelCount,
          usage: this._mipmaps ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
          viewFormats: ["rgba8unorm-srgb"]
        });
        queue.copyExternalImageToTexture({ source: bitmap }, { texture }, { width: w, height: h });
        if (this._mipmaps && mipLevelCount > 1) this.generateMipmaps(device, texture, mipLevelCount, this._mipmapColorSpace ?? "linear");
        const viewLinear = texture.createView({ format: "rgba8unorm" });
        const viewSrgb = texture.createView({ format: "rgba8unorm-srgb" });
        this._viewLinear = viewLinear;
        this._viewSrgb = viewSrgb;
        this._width = w;
        this._height = h;
        this._gpuTexture = texture;
        this._revision++;
      } catch (e) {
        this._uploadStarted = false;
        this._uploadPromise = null;
        this._mipmapColorSpace = null;
        try {
          texture?.destroy();
        } catch {
        }
        throw e;
      } finally {
        if (bitmap && this._source.kind !== "bitmap") try {
          bitmap.close?.();
        } catch {
        }
      }
    })();
    this._uploadPromise.catch((e) => console.warn("Texture2D upload failed: ", e));
  }
  async decodeBitmap() {
    const src = this._source;
    if (src.kind === "bitmap") return src.bitmap;
    if (!hasCreateImageBitmap()) throw new Error("createImageBitmap() is not available in this environment.");
    const options = {
      premultiplyAlpha: "none",
      imageOrientation: "none",
      colorSpaceConversion: this._mipmapColorSpace === "srgb" ? "default" : "none"
    };
    if (src.kind === "url") {
      const res = await fetch(src.url);
      if (!res.ok) throw new Error(`Failed to fetch texture: ${res.status} ${res.statusText}`);
      const blob2 = await res.blob();
      try {
        return await createImageBitmap(blob2, options);
      } catch {
        return await createImageBitmap(blob2);
      }
    }
    const blob = new Blob([src.bytes], { type: src.mimeType ?? "application/octet-stream" });
    try {
      return await createImageBitmap(blob, options);
    } catch {
      return await createImageBitmap(blob);
    }
  }
  generateMipmaps(device, texture, mipLevels, colorSpace) {
    const cache = getMipmapCache(device);
    const pipeline = colorSpace === "srgb" ? cache.pipelineSrgb : cache.pipelineLinear;
    const viewFormat = colorSpace === "srgb" ? "rgba8unorm-srgb" : "rgba8unorm";
    const encoder = device.createCommandEncoder();
    for (let level = 1; level < mipLevels; level++) {
      const srcView = texture.createView({ baseMipLevel: level - 1, mipLevelCount: 1, format: viewFormat });
      const dstView = texture.createView({ baseMipLevel: level, mipLevelCount: 1, format: viewFormat });
      const bindGroup = device.createBindGroup({
        layout: cache.bindGroupLayout,
        entries: [
          { binding: 0, resource: cache.sampler },
          { binding: 1, resource: srcView }
        ]
      });
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: dstView,
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store"
          }
        ]
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();
    }
    device.queue.submit([encoder.finish()]);
  }
};

// src/graphics/animation.ts
var AnimationClip = class {
  name;
  samplerCount;
  channelCount;
  samplersPtr;
  channelsPtr;
  startTime;
  endTime;
  _ownedF32Allocs;
  _ownedU32Allocs;
  _disposed = false;
  constructor(desc) {
    this.name = desc.name;
    this.samplerCount = desc.samplerCount | 0;
    this.channelCount = desc.channelCount | 0;
    this.samplersPtr = desc.samplersPtr;
    this.channelsPtr = desc.channelsPtr;
    this.startTime = desc.startTime;
    this.endTime = desc.endTime;
    this._ownedF32Allocs = desc.ownedF32Allocs ?? null;
    this._ownedU32Allocs = desc.ownedU32Allocs ?? null;
  }
  get duration() {
    return Math.max(0, this.endTime - this.startTime);
  }
  sample(timeSeconds) {
    const store = TransformStore.global();
    const soa = {
      posPtr: store.posPtr,
      rotPtr: store.rotPtr,
      sclPtr: store.sclPtr
    };
    animf.sampleClipTRS(
      soa.posPtr,
      soa.rotPtr,
      soa.sclPtr,
      store.count | 0,
      this.samplersPtr,
      this.samplerCount,
      this.channelsPtr,
      this.channelCount,
      timeSeconds
    );
    store.markDirty();
  }
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    if (this._ownedF32Allocs) {
      for (const a of this._ownedF32Allocs) if (a.ptr) wasm.freeF32(a.ptr, a.len | 0);
    }
    if (this._ownedU32Allocs) {
      for (const a of this._ownedU32Allocs) if (a.ptr) wasm.freeU32(a.ptr, a.len | 0);
    }
    this._ownedF32Allocs = null;
    this._ownedU32Allocs = null;
  }
};
var AnimationPlayer = class {
  clip;
  time = 0;
  speed = 1;
  loop = true;
  playing = true;
  constructor(clip, opts = {}) {
    this.clip = clip;
    if (opts.speed !== void 0) this.speed = opts.speed;
    if (opts.loop !== void 0) this.loop = opts.loop;
    if (opts.playing !== void 0) this.playing = opts.playing;
    this.time = clip.startTime;
  }
  update(dtSeconds) {
    if (!this.playing) return;
    const dur = this.clip.duration;
    if (dur <= 0) {
      this.clip.sample(this.clip.startTime);
      return;
    }
    this.time += dtSeconds * this.speed;
    if (this.loop) {
      const start = this.clip.startTime;
      const end = this.clip.endTime;
      while (this.time < start) this.time += dur;
      while (this.time >= end) this.time -= dur;
    } else {
      this.time = Math.max(this.clip.startTime, Math.min(this.time, this.clip.endTime));
    }
    this.clip.sample(this.time);
  }
};
var Skin = class {
  name;
  joints;
  jointCount;
  jointIndicesPtr;
  invBindPtr;
  _disposed = false;
  constructor(name, joints, inverseBindMatrices) {
    this.name = name;
    this.joints = joints;
    this.jointCount = joints.length | 0;
    this.jointIndicesPtr = wasm.allocU32(this.jointCount);
    const u32 = wasm.u32view(this.jointIndicesPtr, this.jointCount);
    for (let i = 0; i < this.jointCount; i++) u32[i] = joints[i].index >>> 0;
    this.invBindPtr = wasm.allocF32(this.jointCount * 16);
    const f32 = wasm.f32view(this.invBindPtr, this.jointCount * 16);
    if (inverseBindMatrices && inverseBindMatrices.length === this.jointCount * 16) {
      f32.set(inverseBindMatrices);
    } else {
      for (let j = 0; j < this.jointCount; j++) {
        const o = j * 16;
        f32[o + 0] = 1;
        f32[o + 1] = 0;
        f32[o + 2] = 0;
        f32[o + 3] = 0;
        f32[o + 4] = 0;
        f32[o + 5] = 1;
        f32[o + 6] = 0;
        f32[o + 7] = 0;
        f32[o + 8] = 0;
        f32[o + 9] = 0;
        f32[o + 10] = 1;
        f32[o + 11] = 0;
        f32[o + 12] = 0;
        f32[o + 13] = 0;
        f32[o + 14] = 0;
        f32[o + 15] = 1;
      }
    }
  }
  createInstance(meshTransform) {
    return new SkinInstance(this, meshTransform);
  }
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    if (this.jointIndicesPtr) wasm.freeU32(this.jointIndicesPtr, this.jointCount);
    if (this.invBindPtr) wasm.freeF32(this.invBindPtr, this.jointCount * 16);
  }
};
var SkinInstance = class {
  skin;
  meshTransform;
  bindMatrixPtr = 0;
  boneBuffer = null;
  bindGroup = null;
  constructor(skin, meshTransform) {
    this.skin = skin;
    this.meshTransform = meshTransform;
    this.bindMatrixPtr = wasm.allocF32(16);
    const dst = wasm.f32view(this.bindMatrixPtr, 16);
    const m = meshTransform.worldMatrix;
    for (let i = 0; i < 16; i++) dst[i] = m[i] ?? (i % 5 === 0 ? 1 : 0);
  }
  get jointCount() {
    return this.skin.jointCount;
  }
  ensureGpuResources(device, layout) {
    if (this.boneBuffer && this.bindGroup) return;
    const byteSize = this.skin.jointCount * 16 * 4;
    this.boneBuffer = device.createBuffer({
      size: byteSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    this.bindGroup = device.createBindGroup({
      layout,
      entries: [{ binding: 0, resource: { buffer: this.boneBuffer } }]
    });
  }
  dispose() {
    this.boneBuffer?.destroy();
    this.boneBuffer = null;
    this.bindGroup = null;
    if (this.bindMatrixPtr) {
      wasm.freeF32(this.bindMatrixPtr, 16);
      this.bindMatrixPtr = 0;
    }
  }
};

// src/world/camera.ts
var Camera = class {
  transform;
  type;
  _projectionMatrix = null;
  _viewMatrix = null;
  _viewProjectionMatrix = null;
  _projectionDirty = true;
  constructor(type) {
    this.type = type;
    this.transform = new Transform();
  }
  get viewMatrix() {
    const world = this.transform.worldMatrix;
    this._viewMatrix = mat4.invert(world);
    return this._viewMatrix;
  }
  get viewProjectionMatrix() {
    const proj = this.getProjectionMatrix();
    const view = this.viewMatrix;
    this._viewProjectionMatrix = mat4.mul(proj, view);
    return this._viewProjectionMatrix;
  }
  get position() {
    return this.transform.worldPosition;
  }
  lookAt(xOrTarget, y, z) {
    const target = typeof xOrTarget === "number" ? [xOrTarget, y, z] : xOrTarget;
    const eye = this.transform.worldPosition;
    const up = [0, 1, 0];
    const forward = vec3.normalize(vec3.sub(target, eye));
    let upVec = up;
    if (Math.abs(vec3.dot(forward, up)) > 0.999) upVec = [0, 0, 1];
    const right = vec3.normalize(vec3.cross(forward, upVec));
    const correctedUp = vec3.cross(right, forward);
    const lookMatrix = [
      right[0],
      right[1],
      right[2],
      0,
      correctedUp[0],
      correctedUp[1],
      correctedUp[2],
      0,
      -forward[0],
      -forward[1],
      -forward[2],
      0,
      0,
      0,
      0,
      1
    ];
    const quat2 = this.matrixToQuaternion(lookMatrix);
    this.transform.setRotation(quat2[0], quat2[1], quat2[2], quat2[3]);
    return this;
  }
  matrixToQuaternion(m) {
    const trace = m[0] + m[5] + m[10];
    let qw, qx, qy, qz;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      qw = 0.25 / s;
      qx = (m[6] - m[9]) * s;
      qy = (m[8] - m[2]) * s;
      qz = (m[1] - m[4]) * s;
    } else if (m[0] > m[5] && m[0] > m[10]) {
      const s = 2 * Math.sqrt(1 + m[0] - m[5] - m[10]);
      qw = (m[6] - m[9]) / s;
      qx = 0.25 * s;
      qy = (m[4] + m[1]) / s;
      qz = (m[8] + m[2]) / s;
    } else if (m[5] > m[10]) {
      const s = 2 * Math.sqrt(1 + m[5] - m[0] - m[10]);
      qw = (m[8] - m[2]) / s;
      qx = (m[4] + m[1]) / s;
      qy = 0.25 * s;
      qz = (m[9] + m[6]) / s;
    } else {
      const s = 2 * Math.sqrt(1 + m[10] - m[0] - m[5]);
      qw = (m[1] - m[4]) / s;
      qx = (m[8] + m[2]) / s;
      qy = (m[9] + m[6]) / s;
      qz = 0.25 * s;
    }
    return [qx, qy, qz, qw];
  }
  markProjectionDirty() {
    this._projectionDirty = true;
  }
};
var PerspectiveCamera = class extends Camera {
  _fov;
  _aspect;
  _near;
  _far;
  constructor(descriptor = {}) {
    super("perspective");
    this._fov = descriptor.fov ?? 60;
    this._aspect = descriptor.aspect ?? 16 / 9;
    this._near = descriptor.near ?? 0.1;
    this._far = descriptor.far ?? 1e3;
  }
  get fov() {
    return this._fov;
  }
  set fov(value) {
    if (value === this._fov) return;
    this._fov = value;
    this.markProjectionDirty();
  }
  get aspect() {
    return this._aspect;
  }
  set aspect(value) {
    if (value === this._aspect) return;
    this._aspect = value;
    this.markProjectionDirty();
  }
  get near() {
    return this._near;
  }
  set near(value) {
    if (value === this._near) return;
    this._near = value;
    this.markProjectionDirty();
  }
  get far() {
    return this._far;
  }
  set far(value) {
    if (value === this._far) return;
    this._far = value;
    this.markProjectionDirty();
  }
  updateAspect(width, height) {
    this._aspect = width / height;
    this.markProjectionDirty();
    return this;
  }
  getProjectionMatrix() {
    if (this._projectionDirty || !this._projectionMatrix) {
      const fovRad = this._fov * Math.PI / 180;
      this._projectionMatrix = mat4.perspective(fovRad, this._aspect, this._near, this._far);
      this._projectionDirty = false;
    }
    return this._projectionMatrix;
  }
};
var OrthographicCamera = class extends Camera {
  _left;
  _right;
  _top;
  _bottom;
  _near;
  _far;
  constructor(descriptor = {}) {
    super("orthographic");
    this._left = descriptor.left ?? -10;
    this._right = descriptor.right ?? 10;
    this._top = descriptor.top ?? 10;
    this._bottom = descriptor.bottom ?? -10;
    this._near = descriptor.near ?? 0.1;
    this._far = descriptor.far ?? 1e3;
  }
  get left() {
    return this._left;
  }
  set left(value) {
    if (value === this._left) return;
    this._left = value;
    this.markProjectionDirty();
  }
  get right() {
    return this._right;
  }
  set right(value) {
    if (value === this._right) return;
    this._right = value;
    this.markProjectionDirty();
  }
  get top() {
    return this._top;
  }
  set top(value) {
    if (value === this._top) return;
    this._top = value;
    this.markProjectionDirty();
  }
  get bottom() {
    return this._bottom;
  }
  set bottom(value) {
    if (value === this._bottom) return;
    this._bottom = value;
    this.markProjectionDirty();
  }
  get near() {
    return this._near;
  }
  set near(value) {
    if (value === this._near) return;
    this._near = value;
    this.markProjectionDirty();
  }
  get far() {
    return this._far;
  }
  set far(value) {
    if (value === this._far) return;
    this._far = value;
    this.markProjectionDirty();
  }
  updateFromCanvas(width, height, zoom = 1) {
    const halfWidth = width / 2 / zoom;
    const halfHeight = height / 2 / zoom;
    this._left = -halfWidth;
    this._right = halfWidth;
    this._top = halfHeight;
    this._bottom = -halfHeight;
    this.markProjectionDirty();
    return this;
  }
  getProjectionMatrix() {
    if (this._projectionDirty || !this._projectionMatrix) {
      this._projectionMatrix = this.computeOrthographicMatrix();
      this._projectionDirty = false;
    }
    return this._projectionMatrix;
  }
  computeOrthographicMatrix() {
    const lr = 1 / (this._left - this._right);
    const bt = 1 / (this._bottom - this._top);
    const nf = 1 / (this._near - this._far);
    return [
      -2 * lr,
      0,
      0,
      0,
      0,
      -2 * bt,
      0,
      0,
      0,
      0,
      nf,
      0,
      (this._left + this._right) * lr,
      (this._top + this._bottom) * bt,
      this._near * nf,
      1
    ];
  }
};

// src/gltf/import.ts
var warn2 = (opts, msg) => {
  opts?.onWarning?.(msg);
};
var pickPreferredUvSetForMaterial = (mat, opts, context) => {
  if (!mat) return 0;
  const used = /* @__PURE__ */ new Set();
  const addInfo = (info) => {
    if (!info) return;
    const tc = (info.texCoord ?? 0) | 0;
    used.add(tc);
  };
  addInfo(mat.pbrMetallicRoughness?.baseColorTexture);
  addInfo(mat.pbrMetallicRoughness?.metallicRoughnessTexture);
  addInfo(mat.normalTexture);
  addInfo(mat.occlusionTexture);
  addInfo(mat.emissiveTexture);
  const specGloss = mat.extensions?.KHR_materials_pbrSpecularGlossiness;
  addInfo(specGloss?.diffuseTexture);
  addInfo(specGloss?.specularGlossinessTexture);
  const baseTc = mat.pbrMetallicRoughness?.baseColorTexture?.texCoord ?? specGloss?.diffuseTexture?.texCoord;
  let preferred = typeof baseTc === "number" ? baseTc | 0 : 0;
  if (typeof baseTc !== "number" && used.size > 0) preferred = Math.max(...Array.from(used.values()));
  if (preferred < 0 || preferred > 1) {
    warn2(opts, `${context}: TEXCOORD_${preferred} requested by material, but WasmGPU only supports TEXCOORD_0 or TEXCOORD_1; using TEXCOORD_0.`);
    preferred = 0;
  }
  if (used.size > 1) {
    const list = Array.from(used.values()).sort((a, b) => a - b).join(", ");
    warn2(opts, `${context}: material references multiple texCoord sets (${list}). WasmGPU uses TEXCOORD_${preferred} for all textures on this primitive.`);
  }
  return preferred;
};
var GL_NEAREST = 9728;
var GL_LINEAR = 9729;
var GL_NEAREST_MIPMAP_NEAREST = 9984;
var GL_LINEAR_MIPMAP_NEAREST = 9985;
var GL_NEAREST_MIPMAP_LINEAR = 9986;
var GL_LINEAR_MIPMAP_LINEAR = 9987;
var GL_CLAMP_TO_EDGE = 33071;
var GL_MIRRORED_REPEAT = 33648;
var GL_REPEAT = 10497;
var gltfWrapToAddressMode = (wrap) => {
  switch (wrap) {
    case GL_CLAMP_TO_EDGE:
      return "clamp-to-edge";
    case GL_MIRRORED_REPEAT:
      return "mirror-repeat";
    case GL_REPEAT:
    default:
      return "repeat";
  }
};
var gltfMagToFilterMode = (mag) => {
  switch (mag) {
    case GL_NEAREST:
      return "nearest";
    case GL_LINEAR:
    default:
      return "linear";
  }
};
var gltfMinToFilterModes = (min) => {
  switch (min) {
    case GL_NEAREST:
      return { minFilter: "nearest", mipmapFilter: "nearest", useMipmaps: false };
    case GL_LINEAR:
      return { minFilter: "linear", mipmapFilter: "nearest", useMipmaps: false };
    case GL_NEAREST_MIPMAP_NEAREST:
      return { minFilter: "nearest", mipmapFilter: "nearest", useMipmaps: true };
    case GL_LINEAR_MIPMAP_NEAREST:
      return { minFilter: "linear", mipmapFilter: "nearest", useMipmaps: true };
    case GL_NEAREST_MIPMAP_LINEAR:
      return { minFilter: "nearest", mipmapFilter: "linear", useMipmaps: true };
    case GL_LINEAR_MIPMAP_LINEAR:
    default:
      return { minFilter: "linear", mipmapFilter: "linear", useMipmaps: true };
  }
};
var inferMimeTypeFromUri = (uri) => {
  if (!uri) return void 0;
  const u = uri.toLowerCase();
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".gif")) return "image/gif";
  return void 0;
};
var getSceneIndex = (json, opts) => {
  if (opts?.sceneIndex !== void 0) return opts.sceneIndex | 0;
  if (json.scene !== void 0) return json.scene | 0;
  return 0;
};
var getKHRLightsFromRoot = (json) => {
  const ext = json.extensions?.["KHR_lights_punctual"];
  if (!ext) return null;
  return ext;
};
var getNodeKHRLight = (node) => {
  const ext = node.extensions?.["KHR_lights_punctual"];
  if (!ext) return null;
  return ext;
};
var isMaterialUnlit = (mat) => {
  const exts = mat.extensions;
  return !!exts?.["KHR_materials_unlit"];
};
var _tmpMat4Ptr = 0;
var _tmpTRSPtr = 0;
var ensureDecomposeScratch = () => {
  if (_tmpMat4Ptr !== 0 && _tmpTRSPtr !== 0) return;
  _tmpMat4Ptr = wasm.allocF32(16);
  _tmpTRSPtr = wasm.allocF32(10);
};
var applyNodeMatrixViaWasmDecompose = (t, m) => {
  ensureDecomposeScratch();
  const mat = wasm.f32view(_tmpMat4Ptr, 16);
  for (let i = 0; i < 16; i++) mat[i] = m[i] ?? (i % 5 === 0 ? 1 : 0);
  mat4f.decomposeTRS(_tmpTRSPtr, _tmpMat4Ptr);
  const out = wasm.f32view(_tmpTRSPtr, 10);
  t.setPosition(out[0], out[1], out[2]);
  t.setRotation(out[3], out[4], out[5], out[6]);
  t.setScale(out[7], out[8], out[9]);
};
var _normPosPtr = 0;
var _normPosCap = 0;
var _normIdxPtr = 0;
var _normIdxCap = 0;
var _normOutPtr = 0;
var _normOutCap = 0;
var nextPow2 = (x) => {
  let v = Math.max(1, x | 0);
  v--;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  v++;
  return v;
};
var ensureNormalScratch = (posLenF32, idxLenU32) => {
  if (_normPosCap < posLenF32) {
    _normPosCap = nextPow2(posLenF32);
    _normPosPtr = wasm.allocF32(_normPosCap);
  }
  if (_normOutCap < posLenF32) {
    _normOutCap = nextPow2(posLenF32);
    _normOutPtr = wasm.allocF32(_normOutCap);
  }
  if (idxLenU32 > 0 && _normIdxCap < idxLenU32) {
    _normIdxCap = nextPow2(idxLenU32);
    _normIdxPtr = wasm.allocU32(_normIdxCap);
  }
};
var computeVertexNormalsWasm = (positions, indices) => {
  const vcount = positions.length / 3 | 0;
  const idxLen = indices ? indices.length | 0 : 0;
  ensureNormalScratch(positions.length, idxLen);
  wasm.f32view(_normPosPtr, positions.length).set(positions);
  const idxPtr = indices && idxLen > 0 ? _normIdxPtr : 0;
  if (indices && idxLen > 0) wasm.u32view(_normIdxPtr, idxLen).set(indices);
  meshf.computeVertexNormals(_normOutPtr, _normPosPtr, vcount, idxPtr, idxLen);
  const out = new Float32Array(positions.length);
  out.set(wasm.f32view(_normOutPtr, positions.length));
  return out;
};
var normalizeWeightsTo4 = (weights) => {
  const out = new Float32Array(weights);
  for (let i = 0; i < out.length; i += 4) {
    const w0 = out[i + 0] ?? 0;
    const w1 = out[i + 1] ?? 0;
    const w2 = out[i + 2] ?? 0;
    const w3 = out[i + 3] ?? 0;
    const sum = w0 + w1 + w2 + w3;
    if (sum > 0) {
      const inv = 1 / sum;
      out[i + 0] = w0 * inv;
      out[i + 1] = w1 * inv;
      out[i + 2] = w2 * inv;
      out[i + 3] = w3 * inv;
    } else {
      out[i + 0] = 1;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
    }
  }
  return out;
};
var normalizeWeightsTo8 = (weights0, weights1) => {
  const out0 = new Float32Array(weights0);
  const out1 = new Float32Array(weights1);
  for (let i = 0; i < out0.length; i += 4) {
    const w0 = out0[i + 0] ?? 0;
    const w1 = out0[i + 1] ?? 0;
    const w2 = out0[i + 2] ?? 0;
    const w3 = out0[i + 3] ?? 0;
    const w4 = out1[i + 0] ?? 0;
    const w5 = out1[i + 1] ?? 0;
    const w6 = out1[i + 2] ?? 0;
    const w7 = out1[i + 3] ?? 0;
    const sum = w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7;
    if (sum > 0) {
      const inv = 1 / sum;
      out0[i + 0] = w0 * inv;
      out0[i + 1] = w1 * inv;
      out0[i + 2] = w2 * inv;
      out0[i + 3] = w3 * inv;
      out1[i + 0] = w4 * inv;
      out1[i + 1] = w5 * inv;
      out1[i + 2] = w6 * inv;
      out1[i + 3] = w7 * inv;
    } else {
      out0[i + 0] = 1;
      out0[i + 1] = 0;
      out0[i + 2] = 0;
      out0[i + 3] = 0;
      out1[i + 0] = 0;
      out1[i + 1] = 0;
      out1[i + 2] = 0;
      out1[i + 3] = 0;
    }
  }
  return { weights0: out0, weights1: out1 };
};
var triangulateStrip = (indices) => {
  const tris = [];
  for (let i = 0; i + 2 < indices.length; i++) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    if (a === b || b === c || a === c) continue;
    if ((i & 1) === 0) tris.push(a, b, c);
    else tris.push(b, a, c);
  }
  return new Uint32Array(tris);
};
var triangulateFan = (indices) => {
  const tris = [];
  if (indices.length < 3) return new Uint32Array(0);
  const a0 = indices[0];
  for (let i = 1; i + 1 < indices.length; i++) {
    const b = indices[i];
    const c = indices[i + 1];
    if (a0 === b || b === c || a0 === c) continue;
    tris.push(a0, b, c);
  }
  return new Uint32Array(tris);
};
var getOrCreateMaterial = (doc, json, materialIndex, materialCache, textureCache, opts) => {
  if (materialIndex === void 0) return new StandardMaterial({});
  const existing = materialCache.get(materialIndex);
  if (existing) return existing;
  const mat = json.materials?.[materialIndex];
  if (!mat) {
    const created2 = new StandardMaterial({});
    materialCache.set(materialIndex, created2);
    return created2;
  }
  const getOrCreateTextureByIndex = (textureIndex, usage) => {
    if (textureIndex === void 0) return null;
    const cached = textureCache.get(textureIndex);
    if (cached) return cached;
    const texDef = json.textures?.[textureIndex];
    if (!texDef) {
      warn2(opts, `glTF texture index ${textureIndex} missing (usage=${usage}).`);
      return null;
    }
    const imageIndex = texDef.source;
    const img = imageIndex !== void 0 ? json.images?.[imageIndex] : void 0;
    if (imageIndex === void 0 || !img) {
      warn2(opts, `glTF texture ${textureIndex} has no valid source image (usage=${usage}).`);
      return null;
    }
    const sampler = texDef.sampler !== void 0 ? json.samplers?.[texDef.sampler] : void 0;
    const addressModeU = gltfWrapToAddressMode(sampler?.wrapS);
    const addressModeV = gltfWrapToAddressMode(sampler?.wrapT);
    const magFilter = gltfMagToFilterMode(sampler?.magFilter);
    const { minFilter, mipmapFilter, useMipmaps } = gltfMinToFilterModes(sampler?.minFilter);
    let source = null;
    const loadedBytes = doc.images?.[imageIndex];
    const mimeType = img.mimeType ?? inferMimeTypeFromUri(img.uri);
    if (loadedBytes) {
      source = { kind: "bytes", bytes: loadedBytes, mimeType };
    } else if (img.bufferView !== void 0) {
      const bv = json.bufferViews?.[img.bufferView];
      const buf = bv ? doc.buffers[bv.buffer] : void 0;
      if (bv && buf) {
        const start = (bv.byteOffset ?? 0) | 0;
        source = { kind: "bytes", bytes: buf.slice(start, start + bv.byteLength), mimeType };
      } else {
        warn2(opts, `glTF image bufferView ${img.bufferView} missing (texture=${textureIndex}, usage=${usage}).`);
      }
    } else if (img.uri) {
      if (isDataUri(img.uri)) {
        const decoded = decodeDataUri(img.uri);
        source = { kind: "bytes", bytes: decoded.data, mimeType: mimeType ?? decoded.mimeType ?? void 0 };
      } else {
        const url = resolveUri(doc.baseUrl, img.uri);
        source = { kind: "url", url, mimeType };
      }
    }
    if (!source) {
      warn2(opts, `Could not resolve image source for texture=${textureIndex} (usage=${usage}).`);
      return null;
    }
    const created2 = Texture2D.createFrom({
      source,
      mipmaps: useMipmaps,
      sampler: {
        addressModeU,
        addressModeV,
        magFilter,
        minFilter,
        mipmapFilter
      }
    });
    textureCache.set(textureIndex, created2);
    return created2;
  };
  const getTex = (info, usage) => {
    if (!info) return null;
    const texCoord = (info.texCoord ?? 0) | 0;
    if (texCoord > 1) warn2(opts, `Texture texCoord=${texCoord} not supported yet (usage=${usage}); expected 0 or 1.`);
    const ext = info.extensions;
    if (ext?.KHR_texture_transform) warn2(opts, `KHR_texture_transform not supported yet (usage=${usage}); ignoring.`);
    return getOrCreateTextureByIndex(info.index, usage);
  };
  const alphaMode = mat.alphaMode ?? "OPAQUE";
  const alphaCutoff = alphaMode === "MASK" ? mat.alphaCutoff ?? 0.5 : 0;
  const blendMode = alphaMode === "BLEND" ? "transparent" /* Transparent */ : "opaque" /* Opaque */;
  const cullMode = mat.doubleSided ? "none" /* None */ : "back" /* Back */;
  const pbr = mat.pbrMetallicRoughness;
  const specGloss = mat.extensions?.KHR_materials_pbrSpecularGlossiness;
  if (!pbr && specGloss) {
    warn2(opts, `Material '${mat.name ?? materialIndex}' uses KHR_materials_pbrSpecularGlossiness; approximating using diffuse as baseColor. Specular/glossiness are not fully supported yet.`);
    if (specGloss.specularGlossinessTexture) warn2(opts, `Material '${mat.name ?? materialIndex}' has specularGlossinessTexture; currently ignored (highlights/roughness may look off).`);
  }
  const baseColorFactor = pbr?.baseColorFactor ?? specGloss?.diffuseFactor ?? [1, 1, 1, 1];
  const baseColorTexture = getTex(pbr?.baseColorTexture ?? specGloss?.diffuseTexture, "baseColor");
  let metallicFactor = 1;
  let roughnessFactor = 1;
  if (pbr) {
    metallicFactor = pbr.metallicFactor ?? 1;
    roughnessFactor = pbr.roughnessFactor ?? 1;
  } else if (specGloss) {
    metallicFactor = 0;
    const gloss = specGloss.glossinessFactor ?? 1;
    roughnessFactor = 1 - gloss;
    if (roughnessFactor < 0) roughnessFactor = 0;
    if (roughnessFactor > 1) roughnessFactor = 1;
  }
  const metallicRoughnessTexture = pbr ? getTex(pbr.metallicRoughnessTexture, "metallicRoughness") : null;
  const normalTexture = getTex(mat.normalTexture, "normal");
  const occlusionTexture = getTex(mat.occlusionTexture, "occlusion");
  const emissiveTexture = getTex(mat.emissiveTexture, "emissive");
  const normalScale = mat.normalTexture?.scale ?? 1;
  const occlusionStrength = mat.occlusionTexture?.strength ?? 1;
  const emissiveFactor = mat.emissiveFactor ?? [0, 0, 0];
  const emissiveStrength = mat.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1;
  const emissiveIntensity = emissiveStrength;
  const isUnlit = isMaterialUnlit(mat);
  const depthWrite = blendMode === "opaque" /* Opaque */;
  let created;
  if (isUnlit) {
    created = new UnlitMaterial({
      color: [baseColorFactor[0] ?? 1, baseColorFactor[1] ?? 1, baseColorFactor[2] ?? 1],
      opacity: baseColorFactor[3] ?? 1,
      baseColorTexture,
      alphaCutoff,
      blendMode,
      cullMode,
      depthWrite
    });
  } else {
    created = new StandardMaterial({
      color: [baseColorFactor[0] ?? 1, baseColorFactor[1] ?? 1, baseColorFactor[2] ?? 1],
      opacity: baseColorFactor[3] ?? 1,
      metallic: metallicFactor,
      roughness: roughnessFactor,
      emissive: [emissiveFactor[0] ?? 0, emissiveFactor[1] ?? 0, emissiveFactor[2] ?? 0],
      emissiveIntensity,
      baseColorTexture,
      metallicRoughnessTexture,
      normalTexture,
      occlusionTexture,
      emissiveTexture,
      normalScale,
      occlusionStrength,
      alphaCutoff,
      blendMode,
      cullMode,
      depthWrite
    });
  }
  materialCache.set(materialIndex, created);
  return created;
};
var buildGeometryFromPrimitive = (doc, json, prim, computeMissingNormals, opts) => {
  const attrs = prim.attributes;
  const posAcc = attrs["POSITION"];
  if (posAcc === void 0) {
    warn2(opts, "Primitive missing POSITION; skipping");
    return null;
  }
  const positions = readAccessorAsFloat32(doc, posAcc);
  let normals = null;
  const nAcc = attrs["NORMAL"];
  if (nAcc !== void 0) normals = readAccessorAsFloat32(doc, nAcc);
  let uvs = null;
  const uvAcc = attrs["TEXCOORD_0"];
  if (uvAcc !== void 0) uvs = readAccessorAsFloat32(doc, uvAcc);
  let joints = null;
  let weights = null;
  let joints1 = null;
  let weights1 = null;
  const jAcc0 = attrs["JOINTS_0"];
  const wAcc0 = attrs["WEIGHTS_0"];
  const jAcc1 = attrs["JOINTS_1"];
  const wAcc1 = attrs["WEIGHTS_1"];
  if (jAcc0 !== void 0 && wAcc0 !== void 0) {
    const joints0 = readAccessorAsUint16(doc, jAcc0);
    const weights0 = readAccessorAsFloat32(doc, wAcc0);
    if (jAcc1 !== void 0 && wAcc1 !== void 0) {
      const joints1Raw = readAccessorAsUint16(doc, jAcc1);
      const weights1Raw = readAccessorAsFloat32(doc, wAcc1);
      if (joints1Raw.length === joints0.length && weights1Raw.length === weights0.length) {
        const norm = normalizeWeightsTo8(weights0, weights1Raw);
        joints = joints0;
        weights = norm.weights0;
        joints1 = joints1Raw;
        weights1 = norm.weights1;
      } else {
        warn2(opts, "Primitive has JOINTS_1/WEIGHTS_1 but lengths don't match JOINTS_0/WEIGHTS_0; ignoring additional influences");
        joints = joints0;
        weights = normalizeWeightsTo4(weights0);
      }
    } else if (jAcc1 !== void 0 || wAcc1 !== void 0) {
      warn2(opts, "Primitive has JOINTS_1/WEIGHTS_1 mismatch; ignoring additional influences");
      joints = joints0;
      weights = normalizeWeightsTo4(weights0);
    } else {
      joints = joints0;
      weights = normalizeWeightsTo4(weights0);
    }
  } else if (jAcc0 !== void 0 || wAcc0 !== void 0) {
    warn2(opts, "Primitive has JOINTS_0/WEIGHTS_0 mismatch; ignoring skinning attributes for this primitive");
  }
  const mode = prim.mode ?? 4;
  let indices = null;
  if (prim.indices !== void 0) {
    indices = readIndicesAsUint32(doc, prim.indices);
  } else {
    const vcount = positions.length / 3 | 0;
    const seq = new Uint32Array(vcount);
    for (let i = 0; i < vcount; i++) seq[i] = i >>> 0;
    indices = mode === 4 ? null : seq;
  }
  if (mode === 5) {
    const idx = indices ?? new Uint32Array(0);
    indices = triangulateStrip(idx);
  } else if (mode === 6) {
    const idx = indices ?? new Uint32Array(0);
    indices = triangulateFan(idx);
  } else if (mode !== 4) {
    warn2(opts, `Unsupported primitive mode=${mode} (only triangles/strip/fan supported); skipping primitive`);
    return null;
  }
  if (!normals && computeMissingNormals) normals = computeVertexNormalsWasm(positions, indices);
  return new Geometry({
    positions,
    normals: normals ?? void 0,
    uvs: uvs ?? void 0,
    joints: joints ?? void 0,
    weights: weights ?? void 0,
    joints1: joints1 ?? void 0,
    weights1: weights1 ?? void 0,
    indices: indices ?? void 0
  });
};
var instantiateMeshNode = (doc, json, node, nodeT, materialCache, textureCache, geometryCache, opts) => {
  if (node.mesh === void 0) return [];
  const gltfMesh = json.meshes?.[node.mesh];
  if (!gltfMesh) {
    warn2(opts, `nodes[].mesh=${node.mesh} missing; skipping mesh node`);
    return [];
  }
  const out = [];
  const computeMissingNormals = opts.computeMissingNormals !== false;
  for (let primIndex = 0; primIndex < gltfMesh.primitives.length; primIndex++) {
    const prim = gltfMesh.primitives[primIndex];
    if (prim.extensions?.["KHR_draco_mesh_compression"]) {
      warn2(opts, `Mesh ${gltfMesh.name ?? node.mesh} primitive ${primIndex}: KHR_draco_mesh_compression not supported; skipping primitive`);
      continue;
    }
    const cacheKey = `${node.mesh ?? -1}:${primIndex}`;
    let geom = geometryCache.get(cacheKey);
    const meshName = `${gltfMesh.name ?? `mesh_${node.mesh}`}_${primIndex}`;
    const matJson = prim.material !== void 0 ? json.materials?.[prim.material] : void 0;
    const uvSet = pickPreferredUvSetForMaterial(matJson, opts, `Mesh '${gltfMesh.name ?? node.mesh}' primitive ${primIndex}`);
    if (!geom) {
      const built = buildGeometryFromPrimitive(doc, json, prim, computeMissingNormals, opts);
      geom = built;
      geometryCache.set(cacheKey, geom);
    }
    if (!geom) continue;
    const mat = getOrCreateMaterial(doc, json, prim.material, materialCache, textureCache, opts);
    const mesh = new Mesh(geom, mat);
    mesh.name = node.name ?? gltfMesh.name ?? `gltf_mesh_${node.mesh}_${primIndex}`;
    mesh.transform.setParent(nodeT);
    out.push(mesh);
  }
  return out;
};
var instantiateCameraNode = (json, node, nodeT, opts) => {
  if (node.camera === void 0) return null;
  const cam = json.cameras?.[node.camera];
  if (!cam) {
    warn2(opts, `nodes[].camera=${node.camera} missing; skipping camera`);
    return null;
  }
  let out;
  if (cam.type === "perspective") {
    const p = cam.perspective;
    if (!p) {
      warn2(opts, `camera[${node.camera}] missing perspective block; skipping`);
      return null;
    }
    out = new PerspectiveCamera({ fov: p.yfov, near: p.znear, far: p.zfar ?? 1e3 });
  } else {
    const o = cam.orthographic;
    if (!o) {
      warn2(opts, `camera[${node.camera}] missing orthographic block; skipping`);
      return null;
    }
    out = new OrthographicCamera({ left: -o.xmag, right: o.xmag, top: o.ymag, bottom: -o.ymag, near: o.znear, far: o.zfar });
  }
  out.transform.setParent(nodeT);
  return out;
};
var instantiateLightNode = (light, nodeT) => {
  const color = light.color ?? [1, 1, 1];
  const intensity = light.intensity ?? 1;
  if (light.type === "directional") {
    const wm = nodeT.worldMatrix;
    const zx = wm[8] ?? 0;
    const zy = wm[9] ?? 0;
    const zz = wm[10] ?? -1;
    const dx = -zx, dy = -zy, dz = -zz;
    const inv = 1 / (Math.hypot(dx, dy, dz) || 1);
    return new DirectionalLight({
      direction: [dx * inv, dy * inv, dz * inv],
      color: [color[0] ?? 1, color[1] ?? 1, color[2] ?? 1],
      intensity
    });
  }
  if (light.type === "point") {
    const pos = nodeT.worldPosition;
    return new PointLight({
      position: [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0],
      color: [color[0] ?? 1, color[1] ?? 1, color[2] ?? 1],
      intensity,
      range: light.range ?? 10
    });
  }
  return null;
};
var parseSkins = (doc, json, nodeTransforms, opts) => {
  const skins = json.skins ?? [];
  const out = [];
  for (let i = 0; i < skins.length; i++) {
    const s = skins[i];
    const joints = [];
    for (const j of s.joints) {
      const t = nodeTransforms[j];
      if (!t) {
        warn2(opts, `skin[${i}] joint node ${j} missing transform`);
        continue;
      }
      joints.push(t);
    }
    let inverseBind;
    if (s.inverseBindMatrices !== void 0) inverseBind = readAccessorAsFloat32(doc, s.inverseBindMatrices);
    const skel = s.skeleton !== void 0 ? nodeTransforms[s.skeleton] : void 0;
    const runt = new Skin(s.name ?? `skin_${i}`, joints, inverseBind ?? null);
    out.push({
      name: s.name,
      joints,
      inverseBindMatrices: inverseBind,
      skeleton: skel,
      runtime: runt
    });
  }
  return out;
};
var parseAnimations = (doc, json, nodeTransforms, opts) => {
  const anims = json.animations ?? [];
  const out = [];
  const interpToCode = (interp) => {
    switch (interp) {
      case "STEP":
        return 0;
      case "CUBICSPLINE":
        return 2;
      case "LINEAR":
      default:
        return 1;
    }
  };
  const pathToCode = (path) => {
    switch (path) {
      case "translation":
        return 0;
      case "rotation":
        return 1;
      case "scale":
        return 2;
      default:
        return -1;
    }
  };
  for (let i = 0; i < anims.length; i++) {
    const a = anims[i];
    const samplers = [];
    const channels = [];
    const samplerCount = a.samplers.length | 0;
    const samplerTablePtr = samplerCount > 0 ? wasm.allocU32(samplerCount * 5) : 0;
    const samplerTable = samplerCount > 0 ? wasm.u32view(samplerTablePtr, samplerCount * 5) : null;
    const ownedF32Allocs = [];
    const ownedU32Allocs = [];
    if (samplerCount > 0) ownedU32Allocs.push({ ptr: samplerTablePtr, len: samplerCount * 5 });
    let startTime = Number.POSITIVE_INFINITY;
    let endTime = Number.NEGATIVE_INFINITY;
    for (let si = 0; si < a.samplers.length; si++) {
      const s = a.samplers[si];
      const input = readAccessorAsFloat32(doc, s.input);
      const outView = readAccessor(doc, s.output);
      const output = readAccessorAsFloat32(doc, s.output);
      samplers.push({
        interpolation: s.interpolation ?? "LINEAR",
        input,
        output
      });
      if (input.length > 0) {
        startTime = Math.min(startTime, input[0]);
        endTime = Math.max(endTime, input[input.length - 1]);
      }
      if (samplerTable) {
        const timesPtr = wasm.allocF32(input.length);
        wasm.f32view(timesPtr, input.length).set(input);
        ownedF32Allocs.push({ ptr: timesPtr, len: input.length });
        const valuesPtr = wasm.allocF32(output.length);
        wasm.f32view(valuesPtr, output.length).set(output);
        ownedF32Allocs.push({ ptr: valuesPtr, len: output.length });
        const base = si * 5;
        samplerTable[base + 0] = timesPtr >>> 0;
        samplerTable[base + 1] = (input.length | 0) >>> 0;
        samplerTable[base + 2] = valuesPtr >>> 0;
        samplerTable[base + 3] = (outView.numComponents | 0) >>> 0;
        samplerTable[base + 4] = interpToCode(s.interpolation ?? "LINEAR") >>> 0;
      }
    }
    const runtimeChannels = [];
    for (let ci = 0; ci < a.channels.length; ci++) {
      const c = a.channels[ci];
      const nodeIndex = c.target.node;
      const t = nodeIndex !== void 0 ? nodeTransforms[nodeIndex] ?? null : null;
      const chan = {
        sampler: c.sampler | 0,
        targetNode: t,
        path: c.target.path
      };
      channels.push(chan);
      const pathCode = pathToCode(chan.path);
      if (t && pathCode >= 0) {
        runtimeChannels.push({
          sampler: chan.sampler | 0,
          targetIndex: t.index >>> 0,
          pathCode
        });
      }
    }
    let clip = null;
    const channelCount = runtimeChannels.length | 0;
    if (samplerCount > 0 && channelCount > 0) {
      const channelsPtr = wasm.allocU32(channelCount * 3);
      const ch = wasm.u32view(channelsPtr, channelCount * 3);
      ownedU32Allocs.push({ ptr: channelsPtr, len: channelCount * 3 });
      for (let ci = 0; ci < channelCount; ci++) {
        const rc = runtimeChannels[ci];
        const base = ci * 3;
        ch[base + 0] = rc.sampler >>> 0;
        ch[base + 1] = rc.targetIndex >>> 0;
        ch[base + 2] = rc.pathCode >>> 0;
      }
      if (!Number.isFinite(startTime)) startTime = 0;
      if (!Number.isFinite(endTime)) endTime = 0;
      clip = new AnimationClip({
        name: a.name ?? `anim_${i}`,
        samplerCount,
        channelCount,
        samplersPtr: samplerTablePtr,
        channelsPtr,
        startTime,
        endTime,
        ownedF32Allocs,
        ownedU32Allocs
      });
    } else {
      for (const a2 of ownedF32Allocs) wasm.freeF32(a2.ptr, a2.len);
      for (const a2 of ownedU32Allocs) wasm.freeU32(a2.ptr, a2.len);
    }
    out.push({ name: a.name, samplers, channels, clip });
  }
  return out;
};
var importGltf = (doc, opts = {}) => {
  const json = doc.json;
  const scene = opts.targetScene ?? new Scene();
  const addToScene = opts.addToScene !== false;
  const nodes = json.nodes ?? [];
  const nodeTransforms = new Array(nodes.length);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const t = new Transform();
    if (n.matrix && n.matrix.length >= 16) {
      applyNodeMatrixViaWasmDecompose(t, n.matrix);
    } else {
      const tr = n.translation ?? [0, 0, 0];
      const ro = n.rotation ?? [0, 0, 0, 1];
      const sc = n.scale ?? [1, 1, 1];
      t.setPosition(tr[0], tr[1], tr[2]);
      t.setRotation(ro[0], ro[1], ro[2], ro[3]);
      t.setScale(sc[0], sc[1], sc[2]);
    }
    nodeTransforms[i] = t;
  }
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const parentT = nodeTransforms[i];
    for (const child of n.children ?? []) {
      const childT = nodeTransforms[child];
      if (childT) childT.setParent(parentT);
      else warn2(opts, `Node ${i} child ${child} missing transform`);
    }
  }
  const skins = parseSkins(doc, json, nodeTransforms, opts);
  const materialCache = /* @__PURE__ */ new Map();
  const textureCache = /* @__PURE__ */ new Map();
  const geometryCache = /* @__PURE__ */ new Map();
  const meshes = [];
  const cameras = [];
  const lights = [];
  const khrLights = getKHRLightsFromRoot(json);
  const instantiateNodeRecursive = (nodeIndex, inheritedSkinIndex) => {
    const node = nodes[nodeIndex];
    if (!node) return;
    const nodeT = nodeTransforms[nodeIndex];
    if (!nodeT) return;
    const createdMeshes = instantiateMeshNode(doc, json, node, nodeT, materialCache, textureCache, geometryCache, opts);
    const skinIndex = node.skin !== void 0 ? node.skin | 0 : inheritedSkinIndex;
    if (skinIndex !== void 0) {
      const skinDef = skins[skinIndex];
      if (!skinDef) {
        warn2(opts, `nodes[${nodeIndex}].skin=${skinIndex} missing; skipping skin binding`);
      } else {
        for (const m of createdMeshes) {
          if (m.geometry.joints === null || m.geometry.weights === null) {
            warn2(opts, `Mesh '${m.name}' is skinned (node.skin) but is missing JOINTS_0/WEIGHTS_0; it will render unskinned.`);
            continue;
          }
          m.skin = skinDef.runtime.createInstance(m.transform);
        }
      }
    }
    for (const m of createdMeshes) {
      meshes.push(m);
      if (addToScene) scene.add(m);
    }
    if (opts.importCameras) {
      const cam = instantiateCameraNode(json, node, nodeT, opts);
      if (cam) cameras.push(cam);
    }
    if (opts.importLights && khrLights) {
      const nodeLight = getNodeKHRLight(node);
      if (nodeLight) {
        const lightDef = khrLights.lights[nodeLight.light];
        if (!lightDef) {
          warn2(opts, `KHR_lights_punctual node references missing light ${nodeLight.light}`);
        } else {
          const created = instantiateLightNode(lightDef, nodeT);
          if (created) {
            lights.push(created);
            if (addToScene) scene.addLight(created);
          } else {
            warn2(opts, `Light '${node.name ?? `index ${nodeIndex}`}' has unsupported type '${lightDef.type}' and was skipped.`);
          }
        }
      }
    }
    for (const child of node.children ?? []) instantiateNodeRecursive(child, skinIndex);
  };
  const sceneIndex = getSceneIndex(json, opts);
  const gltfScene = json.scenes?.[sceneIndex];
  const roots = gltfScene?.nodes ?? [];
  for (const root of roots) instantiateNodeRecursive(root, void 0);
  const animations = parseAnimations(doc, json, nodeTransforms, opts);
  const clips = animations.map((a) => a.clip).filter((c) => c !== null);
  const uniqueGeometries = Array.from(new Set(meshes.map((m) => m.geometry)));
  const uniqueMaterials = Array.from(new Set(meshes.map((m) => m.material)));
  return {
    scene,
    meshes,
    nodeTransforms,
    lights,
    cameras,
    skins,
    animations,
    clips,
    destroy() {
      if (addToScene) for (const m of meshes) scene.remove(m);
      for (const m of meshes) m.destroy();
      for (const a of animations) a.clip?.dispose();
      for (const s of skins) s.runtime.dispose();
      for (const g of uniqueGeometries) g.destroy();
      for (const tex of textureCache.values()) tex.destroy();
      for (const mat of uniqueMaterials) mat.destroy();
      for (const t of nodeTransforms) t.dispose();
    }
  };
};

// src/python/index.ts
var isPyProxyLike = (x) => {
  return typeof x === "object" && x !== null && typeof x.getBuffer === "function";
};
var isPyBufferLike = (x) => {
  return typeof x === "object" && x !== null && typeof x.data === "object" && Array.isArray(x.shape);
};
var normalizeShape = (shape) => {
  const out = new Array(shape.length);
  for (let i = 0; i < shape.length; i++) {
    const dim = shape[i];
    assert(Number.isFinite(dim), `shape[${i}] must be finite`);
    assert(Number.isInteger(dim), `shape[${i}] must be an integer`);
    assert(dim >= 0, `shape[${i}] must be >= 0`);
    out[i] = dim >>> 0;
  }
  return out;
};
var numelOfShape = (shape) => {
  if (shape.length === 0) return 1;
  let n = 1;
  for (const d of shape) {
    const dim = d >>> 0;
    const next = n * dim;
    assert(Number.isSafeInteger(next), "shape is too large (numel overflow)");
    n = next;
  }
  return n >>> 0;
};
var dtypeOfTypedArray = (view) => {
  if (view instanceof Float32Array) return "f32";
  if (view instanceof Float64Array) return "f64";
  if (view instanceof Int8Array) return "i8";
  if (view instanceof Uint8Array) return "u8";
  if (view instanceof Uint8ClampedArray) return "u8";
  if (view instanceof Int16Array) return "i16";
  if (view instanceof Uint16Array) return "u16";
  if (view instanceof Int32Array) return "i32";
  if (view instanceof Uint32Array) return "u32";
  return null;
};
var viewAsDType = (dtype, view, offsetElements = 0, lengthElements) => {
  const info = dtypeInfo(dtype);
  const ctor = info.ctor;
  const bpe = info.bytesPerElement >>> 0;
  const offEl = offsetElements >>> 0;
  const lenEl = lengthElements === void 0 ? (view.byteLength >>> 0) / bpe >>> 0 : lengthElements >>> 0;
  const byteOffset = (view.byteOffset >>> 0) + offEl * bpe >>> 0;
  return new ctor(view.buffer, byteOffset >>> 0, lenEl >>> 0);
};
var allocBytes = (byteLength, align, allocator) => {
  const bytes = byteLength >>> 0;
  const a0 = align >>> 0;
  const a = a0 === 0 ? 16 : a0;
  if ((a & a - 1) !== 0) throw new Error(`allocBytes(${byteLength}, ${align}): align must be a power of two`);
  if (allocator === "frame") {
    const ptr2 = frameArena.alloc(bytes, a) >>> 0;
    return { kind: "frame", ptr: ptr2 };
  }
  if (allocator && typeof allocator === "object") {
    const arena = allocator;
    const epoch = arena.epoch() >>> 0;
    const ptr2 = arena.alloc(bytes, a) >>> 0;
    return { kind: "arena", ptr: ptr2, epoch };
  }
  const ptr = wasm.allocBytes(bytes) >>> 0;
  if (!ptr && bytes !== 0) throw new Error(`wasm.allocBytes(${bytes}) failed`);
  const heapAlign = Math.min(a, 8) >>> 0;
  if (heapAlign !== 0 && (ptr & heapAlign - 1) !== 0) throw new Error(`wasm.allocBytes(${bytes}) returned ptr 0x${ptr.toString(16)} which is not ${heapAlign}-byte aligned`);
  return { kind: "heap", ptr };
};
var typedViewFromPtr = (dtype, ptr, length) => {
  const info = dtypeInfo(dtype);
  const ctor = info.ctor;
  const buf = wasmInterop.buffer();
  return new ctor(buf, ptr >>> 0, length >>> 0);
};
var bytesViewFromPtr = (ptr, byteLength) => {
  const base = wasmInterop.bytes();
  const start = ptr >>> 0;
  const end = start + (byteLength >>> 0) >>> 0;
  return base.subarray(start, end);
};
var assertIsCContiguous = (buf) => {
  if (typeof buf.c_contiguous === "boolean") {
    assert(buf.c_contiguous, 'Python buffer must be C-contiguous (use numpy.ascontiguousarray(..., order="C"))');
    return;
  }
  const shape = normalizeShape(buf.shape ?? []);
  const strides = Array.from(buf.strides ?? []);
  assert(strides.length === shape.length, "Python buffer strides/shape rank mismatch");
  if (numelOfShape(shape) === 0) return;
  let expected = 1;
  for (let i = shape.length - 1; i >= 0; i--) {
    assert(strides[i] === expected, 'Python buffer must be C-contiguous (use numpy.ascontiguousarray(..., order="C"))');
    expected *= shape[i];
  }
};
var resolveSource = (src, options) => {
  if (isPyProxyLike(src)) {
    const pybuf = src.getBuffer();
    const resolved = resolveSource(pybuf, options);
    const release = typeof pybuf.release === "function" ? () => pybuf.release?.() : void 0;
    return { ...resolved, release };
  }
  if (isPyBufferLike(src)) {
    assertIsCContiguous(src);
    assert(ArrayBuffer.isView(src.data), "Python buffer .data must be an ArrayBufferView");
    assert(typeof src.data.subarray === "function", "Python buffer .data must be a TypedArray (DataView is not supported)");
    const inferred2 = dtypeOfTypedArray(src.data);
    assert(inferred2 !== null, "Unsupported Python buffer dtype (expected a numeric TypedArray)");
    const dtype2 = options.dtype ?? inferred2;
    assert(dtype2 === inferred2, `dtype mismatch: expected ${dtype2}, got ${inferred2}`);
    const srcShape = normalizeShape(src.shape);
    const shape2 = normalizeShape(options.shape ?? srcShape);
    const numel2 = numelOfShape(shape2);
    const offset = (src.offset ?? 0) >>> 0;
    const data2 = viewAsDType(dtype2, src.data, offset, numel2);
    assert(data2.length >>> 0 === numel2 >>> 0, "Python buffer view length mismatch");
    if (options.shape) assert(normalizeShape(options.shape).length === srcShape.length && normalizeShape(options.shape).every((d, i) => d === srcShape[i]), "shape mismatch");
    return { dtype: dtype2, shape: shape2, data: data2, release: typeof src.release === "function" ? () => src.release?.() : void 0 };
  }
  assert(ArrayBuffer.isView(src), "Expected a TypedArray / ArrayBufferView or a PyProxy supporting getBuffer()");
  const inferred = dtypeOfTypedArray(src);
  assert(inferred !== null, "Unsupported TypedArray dtype");
  const dtype = options.dtype ?? inferred;
  assert(dtype === inferred, `dtype mismatch: expected ${dtype}, got ${inferred}`);
  assert(options.shape, "shape is required when sending a plain TypedArray (no Python buffer metadata available)");
  const shape = normalizeShape(options.shape);
  const numel = numelOfShape(shape);
  assert(src.byteLength >>> 0 >= numel * dtypeInfo(dtype).bytesPerElement, "source TypedArray is too small for the provided shape");
  const data = viewAsDType(dtype, src, 0, numel);
  assert(data.length >>> 0 === numel >>> 0, "source TypedArray length mismatch");
  return { dtype, shape, data };
};
var pythonInterop = {
  sendNdarray: (src, options = {}) => {
    const resolved = resolveSource(src, options);
    const { dtype, shape, data } = resolved;
    const info = dtypeInfo(dtype);
    const numel = numelOfShape(shape);
    const byteLength = numel * info.bytesPerElement >>> 0;
    const alloc = allocBytes(byteLength, 16, options.allocator);
    const dst = typedViewFromPtr(dtype, alloc.ptr, numel);
    dst.set(data);
    try {
      resolved.release?.();
    } catch {
    }
    const handle = {
      kind: alloc.kind,
      dtype,
      shape,
      ptr: alloc.ptr >>> 0,
      length: numel >>> 0,
      byteLength: byteLength >>> 0
    };
    if (alloc.epoch !== void 0) handle.epoch = alloc.epoch >>> 0;
    return handle;
  },
  view: (handle) => {
    return typedViewFromPtr(handle.dtype, handle.ptr, handle.length);
  },
  bytes: (handle) => {
    return bytesViewFromPtr(handle.ptr, handle.byteLength);
  },
  copyInto: (handle, src, options = {}) => {
    const resolved = resolveSource(src, { ...options, dtype: handle.dtype, shape: handle.shape });
    const { data } = resolved;
    assert(data.length >>> 0 === handle.length >>> 0, "copyInto: source length mismatch");
    const dst = typedViewFromPtr(handle.dtype, handle.ptr, handle.length);
    dst.set(data);
    try {
      resolved.release?.();
    } catch {
    }
  },
  receiveNdarray: (handle, options = {}) => {
    const view = typedViewFromPtr(handle.dtype, handle.ptr, handle.length);
    if (!options.copy) return { dtype: handle.dtype, shape: Array.from(handle.shape), data: view };
    const info = dtypeInfo(handle.dtype);
    const ctor = info.ctor;
    const out = new ctor(handle.length >>> 0);
    out.set(view);
    return { dtype: handle.dtype, shape: Array.from(handle.shape), data: out };
  },
  free: (handle) => {
    if (handle.kind !== "heap") throw new Error(`pythonInterop.free(): cannot free a ${handle.kind} allocation. Use reset() for arena-like allocators (frameArena.reset() / WasmHeapArena.reset()).`);
    wasm.freeBytes(handle.ptr >>> 0, handle.byteLength >>> 0);
  }
};

// src/world/controls.ts
var OrbitControls = class {
  camera;
  domElement;
  target;
  enabled = true;
  enableRotate = true;
  enablePan = true;
  enableZoom = true;
  rotateSpeed = 1;
  panSpeed = 1;
  zoomSpeed = 1;
  zoomOnCursor = false;
  enableDamping = false;
  dampingFactor = 0.1;
  minDistance = 0;
  maxDistance = Infinity;
  minZoom = 0.01;
  maxZoom = Infinity;
  minPolarAngle = 0;
  maxPolarAngle = Math.PI;
  minAzimuthAngle = -Infinity;
  maxAzimuthAngle = Infinity;
  mouseButtons = { rotate: 0, zoom: 1, pan: 2 };
  _state = "none";
  _pointerId = null;
  _pointerX = 0;
  _pointerY = 0;
  _theta = 0;
  _phi = Math.PI * 0.5;
  _radius = 1;
  _zoom = 1;
  _zoomCursorClientX = 0;
  _zoomCursorClientY = 0;
  _zoomCursorValid = false;
  _thetaDelta = 0;
  _phiDelta = 0;
  _dollyDelta = 0;
  _panOffsetX = 0;
  _panOffsetY = 0;
  _panOffsetZ = 0;
  _orthoBaseLeft = -1;
  _orthoBaseRight = 1;
  _orthoBaseTop = 1;
  _orthoBaseBottom = -1;
  _savedTarget = [0, 0, 0];
  _savedTheta = 0;
  _savedPhi = Math.PI * 0.5;
  _savedRadius = 1;
  _savedZoom = 1;
  _wheelListenerOptions = { passive: false };
  constructor(camera, domElement, desc = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = desc.target ? [desc.target[0], desc.target[1], desc.target[2]] : [0, 0, 0];
    if (desc.enabled !== void 0) this.enabled = desc.enabled;
    if (desc.enableRotate !== void 0) this.enableRotate = desc.enableRotate;
    if (desc.enablePan !== void 0) this.enablePan = desc.enablePan;
    if (desc.enableZoom !== void 0) this.enableZoom = desc.enableZoom;
    if (desc.rotateSpeed !== void 0) this.rotateSpeed = desc.rotateSpeed;
    if (desc.panSpeed !== void 0) this.panSpeed = desc.panSpeed;
    if (desc.zoomSpeed !== void 0) this.zoomSpeed = desc.zoomSpeed;
    if (desc.zoomOnCursor !== void 0) this.zoomOnCursor = desc.zoomOnCursor;
    if (desc.enableDamping !== void 0) this.enableDamping = desc.enableDamping;
    if (desc.dampingFactor !== void 0) this.dampingFactor = desc.dampingFactor;
    if (desc.minDistance !== void 0) this.minDistance = desc.minDistance;
    if (desc.maxDistance !== void 0) this.maxDistance = desc.maxDistance;
    if (desc.minZoom !== void 0) this.minZoom = desc.minZoom;
    if (desc.maxZoom !== void 0) this.maxZoom = desc.maxZoom;
    if (desc.minPolarAngle !== void 0) this.minPolarAngle = desc.minPolarAngle;
    if (desc.maxPolarAngle !== void 0) this.maxPolarAngle = desc.maxPolarAngle;
    if (desc.minAzimuthAngle !== void 0) this.minAzimuthAngle = desc.minAzimuthAngle;
    if (desc.maxAzimuthAngle !== void 0) this.maxAzimuthAngle = desc.maxAzimuthAngle;
    if (desc.mouseButtons) {
      if (desc.mouseButtons.rotate !== void 0) this.mouseButtons.rotate = desc.mouseButtons.rotate;
      if (desc.mouseButtons.zoom !== void 0) this.mouseButtons.zoom = desc.mouseButtons.zoom;
      if (desc.mouseButtons.pan !== void 0) this.mouseButtons.pan = desc.mouseButtons.pan;
    }
    this.domElement.style.touchAction = "none";
    this.syncFromCamera();
    this.saveState();
    this.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.domElement.addEventListener("pointermove", this.onPointerMove);
    this.domElement.addEventListener("pointerup", this.onPointerUp);
    this.domElement.addEventListener("pointercancel", this.onPointerUp);
    this.domElement.addEventListener("wheel", this.onWheel, this._wheelListenerOptions);
    this.domElement.addEventListener("contextmenu", this.onContextMenu);
  }
  dispose() {
    this.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.domElement.removeEventListener("pointerup", this.onPointerUp);
    this.domElement.removeEventListener("pointercancel", this.onPointerUp);
    this.domElement.removeEventListener("wheel", this.onWheel, this._wheelListenerOptions);
    this.domElement.removeEventListener("contextmenu", this.onContextMenu);
  }
  syncFromCamera() {
    const p = this.camera.transform.position;
    const ox = p[0] - this.target[0];
    const oy = p[1] - this.target[1];
    const oz = p[2] - this.target[2];
    const r = Math.sqrt(ox * ox + oy * oy + oz * oz);
    this._radius = Math.max(1e-9, r);
    this._theta = Math.atan2(ox, oz);
    const y = oy / this._radius;
    this._phi = Math.acos(this.clamp(y, -1, 1));
    this._thetaDelta = 0;
    this._phiDelta = 0;
    this._dollyDelta = 0;
    this._panOffsetX = 0;
    this._panOffsetY = 0;
    this._panOffsetZ = 0;
    if (this.camera.type === "orthographic") {
      const c = this.camera;
      this._orthoBaseLeft = c.left;
      this._orthoBaseRight = c.right;
      this._orthoBaseTop = c.top;
      this._orthoBaseBottom = c.bottom;
      this._zoom = 1;
    }
  }
  saveState() {
    this._savedTarget = [this.target[0], this.target[1], this.target[2]];
    this._savedTheta = this._theta;
    this._savedPhi = this._phi;
    this._savedRadius = this._radius;
    this._savedZoom = this._zoom;
  }
  reset() {
    this.target[0] = this._savedTarget[0];
    this.target[1] = this._savedTarget[1];
    this.target[2] = this._savedTarget[2];
    this._theta = this._savedTheta;
    this._phi = this._savedPhi;
    this._radius = this._savedRadius;
    this._zoom = this._savedZoom;
    this._thetaDelta = 0;
    this._phiDelta = 0;
    this._dollyDelta = 0;
    this._panOffsetX = 0;
    this._panOffsetY = 0;
    this._panOffsetZ = 0;
  }
  get azimuthAngle() {
    return this._theta;
  }
  set azimuthAngle(value) {
    this._theta = value;
  }
  get polarAngle() {
    return this._phi;
  }
  set polarAngle(value) {
    this._phi = value;
  }
  get distance() {
    return this._radius;
  }
  set distance(value) {
    this._radius = value;
  }
  get zoom() {
    return this._zoom;
  }
  set zoom(value) {
    this._zoom = value;
  }
  setTarget(xOrTarget, y, z) {
    if (typeof xOrTarget === "number") {
      this.target[0] = xOrTarget;
      this.target[1] = y;
      this.target[2] = z;
    } else {
      this.target[0] = xOrTarget[0];
      this.target[1] = xOrTarget[1];
      this.target[2] = xOrTarget[2];
    }
    return this;
  }
  update(dtSeconds = 0) {
    if (!this.enabled) return;
    const dt = dtSeconds > 0 ? dtSeconds : 1 / 60;
    const damping = this.enableDamping ? 1 - Math.pow(1 - this.clamp(this.dampingFactor, 0, 1), dt * 60) : 1;
    if (this.enableRotate) {
      this._theta += this._thetaDelta * damping;
      this._phi += this._phiDelta * damping;
      this._thetaDelta *= 1 - damping;
      this._phiDelta *= 1 - damping;
    } else {
      this._thetaDelta = 0;
      this._phiDelta = 0;
    }
    this._phi = this.clamp(this._phi, this.minPolarAngle, this.maxPolarAngle);
    this._theta = this.clamp(this._theta, this.minAzimuthAngle, this.maxAzimuthAngle);
    if (this.enableZoom) {
      const dolly = this._dollyDelta * damping;
      if (dolly !== 0) {
        const prevRadius = this._radius;
        const prevZoom = this._zoom;
        if (this.camera.type === "orthographic") {
          this._zoom *= Math.exp(-dolly);
          this._zoom = this.clamp(this._zoom, this.minZoom, this.maxZoom);
        } else {
          this._radius *= Math.exp(dolly);
          this._radius = this.clamp(this._radius, this.minDistance, this.maxDistance);
        }
        if (this.zoomOnCursor && this._zoomCursorValid) {
          this.applyZoomOnCursor(prevRadius, prevZoom);
        }
        this._dollyDelta *= 1 - damping;
      }
    } else {
      this._dollyDelta = 0;
    }
    if (this.enablePan) {
      this.target[0] += this._panOffsetX * damping;
      this.target[1] += this._panOffsetY * damping;
      this.target[2] += this._panOffsetZ * damping;
      this._panOffsetX *= 1 - damping;
      this._panOffsetY *= 1 - damping;
      this._panOffsetZ *= 1 - damping;
    } else {
      this._panOffsetX = 0;
      this._panOffsetY = 0;
      this._panOffsetZ = 0;
    }
    this._radius = this.clamp(this._radius, this.minDistance, this.maxDistance);
    this._radius = Math.max(1e-6, this._radius);
    const sinPhi = Math.sin(this._phi);
    const cosPhi = Math.cos(this._phi);
    const sinTheta = Math.sin(this._theta);
    const cosTheta = Math.cos(this._theta);
    const px = this.target[0] + this._radius * sinPhi * sinTheta;
    const py = this.target[1] + this._radius * cosPhi;
    const pz = this.target[2] + this._radius * sinPhi * cosTheta;
    this.camera.transform.setPosition(px, py, pz);
    this.setCameraRotationLookAt(px, py, pz, this.target[0], this.target[1], this.target[2]);
    if (this.camera.type === "orthographic") this.applyOrthographicZoom();
  }
  applyZoomOnCursor(prevRadius, prevZoom) {
    const rect = this.domElement.getBoundingClientRect();
    const rw = Math.max(1, rect.width);
    const rh = Math.max(1, rect.height);
    const x01 = (this._zoomCursorClientX - rect.left) / rw;
    const y01 = (this._zoomCursorClientY - rect.top) / rh;
    const ndcX = x01 * 2 - 1;
    const ndcY = 1 - y01 * 2;
    const sinPhi = Math.sin(this._phi);
    const cosPhi = Math.cos(this._phi);
    const sinTheta = Math.sin(this._theta);
    const cosTheta = Math.cos(this._theta);
    let fx = -sinPhi * sinTheta;
    let fy = -cosPhi;
    let fz = -sinPhi * cosTheta;
    let upx = 0;
    let upy = 1;
    let upz = 0;
    const dotFU = fx * upx + fy * upy + fz * upz;
    if (Math.abs(dotFU) > 0.999) {
      upx = 0;
      upy = 0;
      upz = 1;
    }
    let rx = fy * upz - fz * upy;
    let ry = fz * upx - fx * upz;
    let rz = fx * upy - fy * upx;
    const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
    if (rl <= 0) return;
    rx /= rl;
    ry /= rl;
    rz /= rl;
    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy - ry * fx;
    if (this.camera.type === "orthographic") {
      const baseW = this._orthoBaseRight - this._orthoBaseLeft;
      const baseH = this._orthoBaseTop - this._orthoBaseBottom;
      const oldHalfW2 = baseW / Math.max(1e-9, prevZoom) * 0.5;
      const newHalfW2 = baseW / Math.max(1e-9, this._zoom) * 0.5;
      const oldHalfH2 = baseH / Math.max(1e-9, prevZoom) * 0.5;
      const newHalfH2 = baseH / Math.max(1e-9, this._zoom) * 0.5;
      const dx2 = ndcX * (oldHalfW2 - newHalfW2);
      const dy2 = ndcY * (oldHalfH2 - newHalfH2);
      this.target[0] += rx * dx2 + ux * dy2;
      this.target[1] += ry * dx2 + uy * dy2;
      this.target[2] += rz * dx2 + uz * dy2;
      return;
    }
    const cam = this.camera;
    const fovRad = cam.fov * Math.PI / 180;
    const aspect = rw / rh;
    const tanHalfFov = Math.tan(fovRad * 0.5);
    const oldHalfH = prevRadius * tanHalfFov;
    const newHalfH = this._radius * tanHalfFov;
    const oldHalfW = oldHalfH * aspect;
    const newHalfW = newHalfH * aspect;
    const dx = ndcX * (oldHalfW - newHalfW);
    const dy = ndcY * (oldHalfH - newHalfH);
    this.target[0] += rx * dx + ux * dy;
    this.target[1] += ry * dx + uy * dy;
    this.target[2] += rz * dx + uz * dy;
  }
  applyOrthographicZoom() {
    const cam = this.camera;
    const baseW = this._orthoBaseRight - this._orthoBaseLeft;
    const baseH = this._orthoBaseTop - this._orthoBaseBottom;
    const cx = (this._orthoBaseLeft + this._orthoBaseRight) * 0.5;
    const cy = (this._orthoBaseBottom + this._orthoBaseTop) * 0.5;
    const w = baseW / this._zoom;
    const h = baseH / this._zoom;
    cam.left = cx - w * 0.5;
    cam.right = cx + w * 0.5;
    cam.bottom = cy - h * 0.5;
    cam.top = cy + h * 0.5;
  }
  onPointerDown = (event) => {
    if (!this.enabled) return;
    if (this._pointerId !== null) return;
    this._pointerId = event.pointerId;
    this.domElement.setPointerCapture(this._pointerId);
    this._pointerX = event.clientX;
    this._pointerY = event.clientY;
    this._zoomCursorClientX = event.clientX;
    this._zoomCursorClientY = event.clientY;
    this._zoomCursorValid = true;
    if (event.button === this.mouseButtons.rotate) this._state = "rotate";
    else if (event.button === this.mouseButtons.pan) this._state = "pan";
    else if (event.button === this.mouseButtons.zoom) this._state = "zoom";
    else this._state = "none";
    event.preventDefault();
  };
  onPointerMove = (event) => {
    if (!this.enabled) return;
    if (this._pointerId === null) return;
    if (event.pointerId !== this._pointerId) return;
    const dx = event.clientX - this._pointerX;
    const dy = event.clientY - this._pointerY;
    this._pointerX = event.clientX;
    this._pointerY = event.clientY;
    this._zoomCursorClientX = event.clientX;
    this._zoomCursorClientY = event.clientY;
    this._zoomCursorValid = true;
    if (dx === 0 && dy === 0) return;
    const h = Math.max(1, this.domElement.clientHeight);
    if (this._state === "rotate" && this.enableRotate) {
      const s = 2 * Math.PI / h;
      this._thetaDelta += -dx * s * this.rotateSpeed;
      this._phiDelta += -dy * s * this.rotateSpeed;
    } else if (this._state === "pan" && this.enablePan) {
      this.pan(dx, dy);
    } else if (this._state === "zoom" && this.enableZoom) {
      this._dollyDelta += dy * this.zoomSpeed * 2e-3;
    }
    event.preventDefault();
  };
  onPointerUp = (event) => {
    if (this._pointerId === null) return;
    if (event.pointerId !== this._pointerId) return;
    this.domElement.releasePointerCapture(this._pointerId);
    this._pointerId = null;
    this._state = "none";
    event.preventDefault();
  };
  onWheel = (event) => {
    if (!this.enabled) return;
    if (!this.enableZoom) return;
    this._dollyDelta += event.deltaY * this.zoomSpeed * 1e-3;
    this._zoomCursorClientX = event.clientX;
    this._zoomCursorClientY = event.clientY;
    this._zoomCursorValid = true;
    event.preventDefault();
    event.stopPropagation();
  };
  onContextMenu = (event) => {
    event.preventDefault();
  };
  pan(deltaX, deltaY) {
    const w = Math.max(1, this.domElement.clientWidth);
    const h = Math.max(1, this.domElement.clientHeight);
    const sinPhi = Math.sin(this._phi);
    const cosPhi = Math.cos(this._phi);
    const sinTheta = Math.sin(this._theta);
    const cosTheta = Math.cos(this._theta);
    const px = this.target[0] + this._radius * sinPhi * sinTheta;
    const py = this.target[1] + this._radius * cosPhi;
    const pz = this.target[2] + this._radius * sinPhi * cosTheta;
    let fx = this.target[0] - px;
    let fy = this.target[1] - py;
    let fz = this.target[2] - pz;
    const fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
    if (fl > 0) {
      fx /= fl;
      fy /= fl;
      fz /= fl;
    }
    let upx = 0;
    let upy = 1;
    let upz = 0;
    const dotFU = fx * upx + fy * upy + fz * upz;
    if (Math.abs(dotFU) > 0.999) {
      upx = 0;
      upy = 0;
      upz = 1;
    }
    let rx = fy * upz - fz * upy;
    let ry = fz * upx - fx * upz;
    let rz = fx * upy - fy * upx;
    const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
    if (rl > 0) {
      rx /= rl;
      ry /= rl;
      rz /= rl;
    }
    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy - ry * fx;
    let panX = 0;
    let panY = 0;
    if (this.camera.type === "orthographic") {
      const baseW = this._orthoBaseRight - this._orthoBaseLeft;
      const baseH = this._orthoBaseTop - this._orthoBaseBottom;
      const viewW = baseW / this._zoom;
      const viewH = baseH / this._zoom;
      panX = deltaX * viewW / w * this.panSpeed;
      panY = deltaY * viewH / h * this.panSpeed;
    } else {
      const cam = this.camera;
      const fovRad = cam.fov * Math.PI / 180;
      const targetDistance = this._radius * Math.tan(fovRad * 0.5);
      panX = 2 * deltaX * targetDistance / h * this.panSpeed;
      panY = 2 * deltaY * targetDistance / h * this.panSpeed;
    }
    this._panOffsetX += rx * -panX + ux * panY;
    this._panOffsetY += ry * -panX + uy * panY;
    this._panOffsetZ += rz * -panX + uz * panY;
  }
  setCameraRotationLookAt(px, py, pz, tx, ty, tz) {
    let fx = tx - px;
    let fy = ty - py;
    let fz = tz - pz;
    const fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
    if (fl <= 0) return;
    fx /= fl;
    fy /= fl;
    fz /= fl;
    let upx = 0;
    let upy = 1;
    let upz = 0;
    const dotFU = fx * upx + fy * upy + fz * upz;
    if (Math.abs(dotFU) > 0.999) {
      upx = 0;
      upy = 0;
      upz = 1;
    }
    let rx = fy * upz - fz * upy;
    let ry = fz * upx - fx * upz;
    let rz = fx * upy - fy * upx;
    const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
    if (rl <= 0) return;
    rx /= rl;
    ry /= rl;
    rz /= rl;
    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy - ry * fx;
    const m00 = rx;
    const m10 = ry;
    const m20 = rz;
    const m01 = ux;
    const m11 = uy;
    const m21 = uz;
    const m02 = -fx;
    const m12 = -fy;
    const m22 = -fz;
    const trace = m00 + m11 + m22;
    let qw;
    let qx;
    let qy;
    let qz;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      qw = 0.25 / s;
      qx = (m21 - m12) * s;
      qy = (m02 - m20) * s;
      qz = (m10 - m01) * s;
    } else if (m00 > m11 && m00 > m22) {
      const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
      qw = (m21 - m12) / s;
      qx = 0.25 * s;
      qy = (m01 + m10) / s;
      qz = (m02 + m20) / s;
    } else if (m11 > m22) {
      const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
      qw = (m02 - m20) / s;
      qx = (m01 + m10) / s;
      qy = 0.25 * s;
      qz = (m12 + m21) / s;
    } else {
      const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
      qw = (m10 - m01) / s;
      qx = (m02 + m20) / s;
      qy = (m12 + m21) / s;
      qz = 0.25 * s;
    }
    this.camera.transform.setRotation(qx, qy, qz, qw);
  }
  clamp(x, min, max) {
    return Math.max(min, Math.min(max, x));
  }
};
var TrackballControls = class {
  camera;
  domElement;
  target;
  enabled = true;
  enableRotate = true;
  enablePan = true;
  enableZoom = true;
  rotateSpeed = 1;
  panSpeed = 1;
  zoomSpeed = 1;
  zoomOnCursor = false;
  enableDamping = false;
  dampingFactor = 0.1;
  minDistance = 0;
  maxDistance = Infinity;
  minZoom = 0.01;
  maxZoom = Infinity;
  mouseButtons = { rotate: 0, zoom: 1, pan: 2 };
  _state = "none";
  _pointerId = null;
  _pointerX = 0;
  _pointerY = 0;
  _rotateStartX = 0;
  _rotateStartY = 0;
  _rotateStartZ = 1;
  _rotationDeltaX = 0;
  _rotationDeltaY = 0;
  _rotationDeltaZ = 0;
  _rotationDeltaW = 1;
  _dollyDelta = 0;
  _panOffsetX = 0;
  _panOffsetY = 0;
  _panOffsetZ = 0;
  _eyeX = 0;
  _eyeY = 0;
  _eyeZ = 1;
  _radius = 1;
  _zoom = 1;
  _upX = 0;
  _upY = 1;
  _upZ = 0;
  _zoomCursorClientX = 0;
  _zoomCursorClientY = 0;
  _zoomCursorValid = false;
  _orthoBaseLeft = -1;
  _orthoBaseRight = 1;
  _orthoBaseTop = 1;
  _orthoBaseBottom = -1;
  _savedTarget = [0, 0, 0];
  _savedEye = [0, 0, 1];
  _savedUp = [0, 1, 0];
  _savedZoom = 1;
  _wheelListenerOptions = { passive: false };
  constructor(camera, domElement, desc = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = desc.target ? [desc.target[0], desc.target[1], desc.target[2]] : [0, 0, 0];
    if (desc.enabled !== void 0) this.enabled = desc.enabled;
    if (desc.enableRotate !== void 0) this.enableRotate = desc.enableRotate;
    if (desc.enablePan !== void 0) this.enablePan = desc.enablePan;
    if (desc.enableZoom !== void 0) this.enableZoom = desc.enableZoom;
    if (desc.rotateSpeed !== void 0) this.rotateSpeed = desc.rotateSpeed;
    if (desc.panSpeed !== void 0) this.panSpeed = desc.panSpeed;
    if (desc.zoomSpeed !== void 0) this.zoomSpeed = desc.zoomSpeed;
    if (desc.zoomOnCursor !== void 0) this.zoomOnCursor = desc.zoomOnCursor;
    if (desc.enableDamping !== void 0) this.enableDamping = desc.enableDamping;
    if (desc.dampingFactor !== void 0) this.dampingFactor = desc.dampingFactor;
    if (desc.minDistance !== void 0) this.minDistance = desc.minDistance;
    if (desc.maxDistance !== void 0) this.maxDistance = desc.maxDistance;
    if (desc.minZoom !== void 0) this.minZoom = desc.minZoom;
    if (desc.maxZoom !== void 0) this.maxZoom = desc.maxZoom;
    if (desc.mouseButtons) {
      if (desc.mouseButtons.rotate !== void 0) this.mouseButtons.rotate = desc.mouseButtons.rotate;
      if (desc.mouseButtons.zoom !== void 0) this.mouseButtons.zoom = desc.mouseButtons.zoom;
      if (desc.mouseButtons.pan !== void 0) this.mouseButtons.pan = desc.mouseButtons.pan;
    }
    this.domElement.style.touchAction = "none";
    this.syncFromCamera();
    this.saveState();
    this.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.domElement.addEventListener("pointermove", this.onPointerMove);
    this.domElement.addEventListener("pointerup", this.onPointerUp);
    this.domElement.addEventListener("pointercancel", this.onPointerUp);
    this.domElement.addEventListener("wheel", this.onWheel, this._wheelListenerOptions);
    this.domElement.addEventListener("contextmenu", this.onContextMenu);
  }
  dispose() {
    this.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.domElement.removeEventListener("pointerup", this.onPointerUp);
    this.domElement.removeEventListener("pointercancel", this.onPointerUp);
    this.domElement.removeEventListener("wheel", this.onWheel, this._wheelListenerOptions);
    this.domElement.removeEventListener("contextmenu", this.onContextMenu);
  }
  syncFromCamera() {
    const p = this.camera.transform.position;
    const ex = p[0] - this.target[0];
    const ey = p[1] - this.target[1];
    const ez = p[2] - this.target[2];
    const r = Math.sqrt(ex * ex + ey * ey + ez * ez);
    this._radius = Math.max(1e-9, r);
    this._eyeX = ex;
    this._eyeY = ey;
    this._eyeZ = ez;
    if (r <= 1e-9) {
      this._eyeX = 0;
      this._eyeY = 0;
      this._eyeZ = this._radius;
    }
    const m = this.camera.transform.worldMatrix;
    const upx = m[4];
    const upy = m[5];
    const upz = m[6];
    const ul = Math.sqrt(upx * upx + upy * upy + upz * upz);
    if (ul > 0) {
      this._upX = upx / ul;
      this._upY = upy / ul;
      this._upZ = upz / ul;
    } else {
      this._upX = 0;
      this._upY = 1;
      this._upZ = 0;
    }
    this._rotateStartX = 0;
    this._rotateStartY = 0;
    this._rotateStartZ = 1;
    this._rotationDeltaX = 0;
    this._rotationDeltaY = 0;
    this._rotationDeltaZ = 0;
    this._rotationDeltaW = 1;
    this._dollyDelta = 0;
    this._panOffsetX = 0;
    this._panOffsetY = 0;
    this._panOffsetZ = 0;
    if (this.camera.type === "orthographic") {
      const c = this.camera;
      this._orthoBaseLeft = c.left;
      this._orthoBaseRight = c.right;
      this._orthoBaseTop = c.top;
      this._orthoBaseBottom = c.bottom;
      this._zoom = 1;
    }
  }
  saveState() {
    this._savedTarget = [this.target[0], this.target[1], this.target[2]];
    this._savedEye = [this._eyeX, this._eyeY, this._eyeZ];
    this._savedUp = [this._upX, this._upY, this._upZ];
    this._savedZoom = this._zoom;
  }
  reset() {
    this.target[0] = this._savedTarget[0];
    this.target[1] = this._savedTarget[1];
    this.target[2] = this._savedTarget[2];
    this._eyeX = this._savedEye[0];
    this._eyeY = this._savedEye[1];
    this._eyeZ = this._savedEye[2];
    this._upX = this._savedUp[0];
    this._upY = this._savedUp[1];
    this._upZ = this._savedUp[2];
    this._zoom = this._savedZoom;
    const r = Math.sqrt(this._eyeX * this._eyeX + this._eyeY * this._eyeY + this._eyeZ * this._eyeZ);
    this._radius = Math.max(1e-9, r);
    this._rotationDeltaX = 0;
    this._rotationDeltaY = 0;
    this._rotationDeltaZ = 0;
    this._rotationDeltaW = 1;
    this._dollyDelta = 0;
    this._panOffsetX = 0;
    this._panOffsetY = 0;
    this._panOffsetZ = 0;
  }
  get distance() {
    return this._radius;
  }
  set distance(value) {
    const next = Math.max(1e-9, value);
    const r = Math.sqrt(this._eyeX * this._eyeX + this._eyeY * this._eyeY + this._eyeZ * this._eyeZ);
    if (r > 0) {
      const s = next / r;
      this._eyeX *= s;
      this._eyeY *= s;
      this._eyeZ *= s;
    } else {
      this._eyeX = 0;
      this._eyeY = 0;
      this._eyeZ = next;
    }
    this._radius = next;
  }
  get zoom() {
    return this._zoom;
  }
  set zoom(value) {
    this._zoom = value;
  }
  setTarget(xOrTarget, y, z) {
    if (typeof xOrTarget === "number") {
      this.target[0] = xOrTarget;
      this.target[1] = y;
      this.target[2] = z;
    } else {
      this.target[0] = xOrTarget[0];
      this.target[1] = xOrTarget[1];
      this.target[2] = xOrTarget[2];
    }
    return this;
  }
  update(dtSeconds = 0) {
    if (!this.enabled) return;
    const dt = dtSeconds > 0 ? dtSeconds : 1 / 60;
    const damping = this.enableDamping ? 1 - Math.pow(1 - this.clamp(this.dampingFactor, 0, 1), dt * 60) : 1;
    if (this.enableRotate) {
      if (!this.isIdentityQuat(this._rotationDeltaX, this._rotationDeltaY, this._rotationDeltaZ, this._rotationDeltaW)) {
        const step = this.slerpIdentityToQuat(this._rotationDeltaX, this._rotationDeltaY, this._rotationDeltaZ, this._rotationDeltaW, damping);
        this.applyRotation(step[0], step[1], step[2], step[3]);
        const inv = this.quatInvert(step[0], step[1], step[2], step[3]);
        const rem = this.quatMul(this._rotationDeltaX, this._rotationDeltaY, this._rotationDeltaZ, this._rotationDeltaW, inv[0], inv[1], inv[2], inv[3]);
        this._rotationDeltaX = rem[0];
        this._rotationDeltaY = rem[1];
        this._rotationDeltaZ = rem[2];
        this._rotationDeltaW = rem[3];
        this.normalizeQuatInPlace();
      }
    } else {
      this._rotationDeltaX = 0;
      this._rotationDeltaY = 0;
      this._rotationDeltaZ = 0;
      this._rotationDeltaW = 1;
    }
    if (this.enableZoom) {
      const dolly = this._dollyDelta * damping;
      if (dolly !== 0) {
        const prevRadius = this._radius;
        const prevZoom = this._zoom;
        if (this.camera.type === "orthographic") {
          this._zoom *= Math.exp(-dolly);
          this._zoom = this.clamp(this._zoom, this.minZoom, this.maxZoom);
        } else {
          const oldR = Math.max(1e-9, this._radius);
          const targetR = oldR * Math.exp(dolly);
          const newR = this.clamp(targetR, this.minDistance, this.maxDistance);
          const s = newR / oldR;
          this._eyeX *= s;
          this._eyeY *= s;
          this._eyeZ *= s;
          this._radius = newR;
        }
        if (this.zoomOnCursor && this._zoomCursorValid) {
          this.applyZoomOnCursor(prevRadius, prevZoom);
        }
        this._dollyDelta *= 1 - damping;
      }
    } else {
      this._dollyDelta = 0;
    }
    if (this.enablePan) {
      this.target[0] += this._panOffsetX * damping;
      this.target[1] += this._panOffsetY * damping;
      this.target[2] += this._panOffsetZ * damping;
      this._panOffsetX *= 1 - damping;
      this._panOffsetY *= 1 - damping;
      this._panOffsetZ *= 1 - damping;
    } else {
      this._panOffsetX = 0;
      this._panOffsetY = 0;
      this._panOffsetZ = 0;
    }
    const r = Math.sqrt(this._eyeX * this._eyeX + this._eyeY * this._eyeY + this._eyeZ * this._eyeZ);
    this._radius = Math.max(1e-6, this.clamp(r, this.minDistance, this.maxDistance));
    if (r > 0) {
      const s = this._radius / r;
      this._eyeX *= s;
      this._eyeY *= s;
      this._eyeZ *= s;
    } else {
      this._eyeX = 0;
      this._eyeY = 0;
      this._eyeZ = this._radius;
    }
    const px = this.target[0] + this._eyeX;
    const py = this.target[1] + this._eyeY;
    const pz = this.target[2] + this._eyeZ;
    this.camera.transform.setPosition(px, py, pz);
    this.setCameraRotationLookAtUp(px, py, pz, this.target[0], this.target[1], this.target[2], this._upX, this._upY, this._upZ);
    if (this.camera.type === "orthographic") this.applyOrthographicZoom();
  }
  applyRotation(qx, qy, qz, qw) {
    const e = this.rotateVectorByQuat(this._eyeX, this._eyeY, this._eyeZ, qx, qy, qz, qw);
    this._eyeX = e[0];
    this._eyeY = e[1];
    this._eyeZ = e[2];
    const u = this.rotateVectorByQuat(this._upX, this._upY, this._upZ, qx, qy, qz, qw);
    const ul = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
    if (ul > 0) {
      this._upX = u[0] / ul;
      this._upY = u[1] / ul;
      this._upZ = u[2] / ul;
    }
  }
  applyZoomOnCursor(prevRadius, prevZoom) {
    const rect = this.domElement.getBoundingClientRect();
    const rw = Math.max(1, rect.width);
    const rh = Math.max(1, rect.height);
    const x01 = (this._zoomCursorClientX - rect.left) / rw;
    const y01 = (this._zoomCursorClientY - rect.top) / rh;
    const ndcX = x01 * 2 - 1;
    const ndcY = 1 - y01 * 2;
    const basis = this.computeBasis();
    const rx = basis[0];
    const ry = basis[1];
    const rz = basis[2];
    const ux = basis[3];
    const uy = basis[4];
    const uz = basis[5];
    if (this.camera.type === "orthographic") {
      const baseW = this._orthoBaseRight - this._orthoBaseLeft;
      const baseH = this._orthoBaseTop - this._orthoBaseBottom;
      const oldHalfW2 = baseW / Math.max(1e-9, prevZoom) * 0.5;
      const newHalfW2 = baseW / Math.max(1e-9, this._zoom) * 0.5;
      const oldHalfH2 = baseH / Math.max(1e-9, prevZoom) * 0.5;
      const newHalfH2 = baseH / Math.max(1e-9, this._zoom) * 0.5;
      const dx2 = ndcX * (oldHalfW2 - newHalfW2);
      const dy2 = ndcY * (oldHalfH2 - newHalfH2);
      this.target[0] += rx * dx2 + ux * dy2;
      this.target[1] += ry * dx2 + uy * dy2;
      this.target[2] += rz * dx2 + uz * dy2;
      return;
    }
    const cam = this.camera;
    const fovRad = cam.fov * Math.PI / 180;
    const aspect = rw / rh;
    const tanHalfFov = Math.tan(fovRad * 0.5);
    const oldHalfH = prevRadius * tanHalfFov;
    const newHalfH = this._radius * tanHalfFov;
    const oldHalfW = oldHalfH * aspect;
    const newHalfW = newHalfH * aspect;
    const dx = ndcX * (oldHalfW - newHalfW);
    const dy = ndcY * (oldHalfH - newHalfH);
    this.target[0] += rx * dx + ux * dy;
    this.target[1] += ry * dx + uy * dy;
    this.target[2] += rz * dx + uz * dy;
  }
  applyOrthographicZoom() {
    const cam = this.camera;
    const baseW = this._orthoBaseRight - this._orthoBaseLeft;
    const baseH = this._orthoBaseTop - this._orthoBaseBottom;
    const cx = (this._orthoBaseLeft + this._orthoBaseRight) * 0.5;
    const cy = (this._orthoBaseBottom + this._orthoBaseTop) * 0.5;
    const w = baseW / this._zoom;
    const h = baseH / this._zoom;
    cam.left = cx - w * 0.5;
    cam.right = cx + w * 0.5;
    cam.bottom = cy - h * 0.5;
    cam.top = cy + h * 0.5;
  }
  onPointerDown = (event) => {
    if (!this.enabled) return;
    if (this._pointerId !== null) return;
    this._pointerId = event.pointerId;
    this.domElement.setPointerCapture(this._pointerId);
    this._pointerX = event.clientX;
    this._pointerY = event.clientY;
    this._zoomCursorClientX = event.clientX;
    this._zoomCursorClientY = event.clientY;
    this._zoomCursorValid = true;
    if (event.button === this.mouseButtons.rotate) this._state = "rotate";
    else if (event.button === this.mouseButtons.pan) this._state = "pan";
    else if (event.button === this.mouseButtons.zoom) this._state = "zoom";
    else this._state = "none";
    if (this._state === "rotate" && this.enableRotate) {
      const v = this.getTrackballVector(event.clientX, event.clientY);
      this._rotateStartX = v[0];
      this._rotateStartY = v[1];
      this._rotateStartZ = v[2];
    }
    event.preventDefault();
  };
  onPointerMove = (event) => {
    if (!this.enabled) return;
    if (this._pointerId === null) return;
    if (event.pointerId !== this._pointerId) return;
    const dx = event.clientX - this._pointerX;
    const dy = event.clientY - this._pointerY;
    this._pointerX = event.clientX;
    this._pointerY = event.clientY;
    this._zoomCursorClientX = event.clientX;
    this._zoomCursorClientY = event.clientY;
    this._zoomCursorValid = true;
    if (dx === 0 && dy === 0) return;
    if (this._state === "rotate" && this.enableRotate) {
      const v = this.getTrackballVector(event.clientX, event.clientY);
      const q = this.rotationFromTrackballDrag(this._rotateStartX, this._rotateStartY, this._rotateStartZ, v[0], v[1], v[2]);
      if (q) {
        const out = this.quatMul(q[0], q[1], q[2], q[3], this._rotationDeltaX, this._rotationDeltaY, this._rotationDeltaZ, this._rotationDeltaW);
        this._rotationDeltaX = out[0];
        this._rotationDeltaY = out[1];
        this._rotationDeltaZ = out[2];
        this._rotationDeltaW = out[3];
        this.normalizeQuatInPlace();
      }
      this._rotateStartX = v[0];
      this._rotateStartY = v[1];
      this._rotateStartZ = v[2];
    } else if (this._state === "pan" && this.enablePan) {
      this.pan(dx, dy);
    } else if (this._state === "zoom" && this.enableZoom) {
      this._dollyDelta += dy * this.zoomSpeed * 2e-3;
    }
    event.preventDefault();
  };
  onPointerUp = (event) => {
    if (this._pointerId === null) return;
    if (event.pointerId !== this._pointerId) return;
    this.domElement.releasePointerCapture(this._pointerId);
    this._pointerId = null;
    this._state = "none";
    event.preventDefault();
  };
  onWheel = (event) => {
    if (!this.enabled) return;
    if (!this.enableZoom) return;
    this._dollyDelta += event.deltaY * this.zoomSpeed * 1e-3;
    this._zoomCursorClientX = event.clientX;
    this._zoomCursorClientY = event.clientY;
    this._zoomCursorValid = true;
    event.preventDefault();
    event.stopPropagation();
  };
  onContextMenu = (event) => {
    event.preventDefault();
  };
  getTrackballVector(clientX, clientY) {
    const rect = this.domElement.getBoundingClientRect();
    const rw = Math.max(1, rect.width);
    const rh = Math.max(1, rect.height);
    const x = (clientX - rect.left) / rw * 2 - 1;
    const y = 1 - (clientY - rect.top) / rh * 2;
    const len2 = x * x + y * y;
    if (len2 <= 1) {
      const z = Math.sqrt(1 - len2);
      return [x, y, z];
    }
    const inv = 1 / Math.sqrt(len2);
    return [x * inv, y * inv, 0];
  }
  rotationFromTrackballDrag(sx, sy, sz, ex, ey, ez) {
    const dot = this.clamp(sx * ex + sy * ey + sz * ez, -1, 1);
    let angle = Math.acos(dot);
    if (angle <= 1e-9) return null;
    angle *= this.rotateSpeed;
    let ax = sy * ez - sz * ey;
    let ay = sz * ex - sx * ez;
    let az = sx * ey - sy * ex;
    const al = Math.sqrt(ax * ax + ay * ay + az * az);
    if (al <= 1e-9) return null;
    ax /= al;
    ay /= al;
    az /= al;
    const basis = this.computeBasis();
    const rx = basis[0];
    const ry = basis[1];
    const rz = basis[2];
    const ux = basis[3];
    const uy = basis[4];
    const uz = basis[5];
    const bx = basis[6];
    const by = basis[7];
    const bz = basis[8];
    let wx = rx * ax + ux * ay + bx * az;
    let wy = ry * ax + uy * ay + by * az;
    let wz = rz * ax + uz * ay + bz * az;
    const wl = Math.sqrt(wx * wx + wy * wy + wz * wz);
    if (wl <= 1e-9) return null;
    wx /= wl;
    wy /= wl;
    wz /= wl;
    const half = angle * 0.5;
    const s = Math.sin(half);
    const qw = Math.cos(half);
    const qx = wx * s;
    const qy = wy * s;
    const qz = wz * s;
    return [qx, qy, qz, qw];
  }
  pan(deltaX, deltaY) {
    const w = Math.max(1, this.domElement.clientWidth);
    const h = Math.max(1, this.domElement.clientHeight);
    const basis = this.computeBasis();
    const rx = basis[0];
    const ry = basis[1];
    const rz = basis[2];
    const ux = basis[3];
    const uy = basis[4];
    const uz = basis[5];
    let panX = 0;
    let panY = 0;
    if (this.camera.type === "orthographic") {
      const baseW = this._orthoBaseRight - this._orthoBaseLeft;
      const baseH = this._orthoBaseTop - this._orthoBaseBottom;
      const viewW = baseW / this._zoom;
      const viewH = baseH / this._zoom;
      panX = deltaX * viewW / w * this.panSpeed;
      panY = deltaY * viewH / h * this.panSpeed;
    } else {
      const cam = this.camera;
      const fovRad = cam.fov * Math.PI / 180;
      const targetDistance = this._radius * Math.tan(fovRad * 0.5);
      panX = 2 * deltaX * targetDistance / h * this.panSpeed;
      panY = 2 * deltaY * targetDistance / h * this.panSpeed;
    }
    this._panOffsetX += rx * -panX + ux * panY;
    this._panOffsetY += ry * -panX + uy * panY;
    this._panOffsetZ += rz * -panX + uz * panY;
  }
  computeBasis() {
    let bx = this._eyeX;
    let by = this._eyeY;
    let bz = this._eyeZ;
    const bl = Math.sqrt(bx * bx + by * by + bz * bz);
    if (bl > 0) {
      bx /= bl;
      by /= bl;
      bz /= bl;
    } else {
      bx = 0;
      by = 0;
      bz = 1;
    }
    let upx = this._upX;
    let upy = this._upY;
    let upz = this._upZ;
    const ul = Math.sqrt(upx * upx + upy * upy + upz * upz);
    if (ul > 0) {
      upx /= ul;
      upy /= ul;
      upz /= ul;
    } else {
      upx = 0;
      upy = 1;
      upz = 0;
    }
    const dotBU = bx * upx + by * upy + bz * upz;
    if (Math.abs(dotBU) > 0.999) {
      if (Math.abs(by) < 0.9) {
        upx = 0;
        upy = 1;
        upz = 0;
      } else {
        upx = 1;
        upy = 0;
        upz = 0;
      }
    }
    let rx = upy * bz - upz * by;
    let ry = upz * bx - upx * bz;
    let rz = upx * by - upy * bx;
    const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
    if (rl > 0) {
      rx /= rl;
      ry /= rl;
      rz /= rl;
    } else {
      rx = 1;
      ry = 0;
      rz = 0;
    }
    const ux = by * rz - bz * ry;
    const uy = bz * rx - bx * rz;
    const uz = bx * ry - by * rx;
    this._upX = ux;
    this._upY = uy;
    this._upZ = uz;
    return [rx, ry, rz, ux, uy, uz, bx, by, bz];
  }
  setCameraRotationLookAtUp(px, py, pz, tx, ty, tz, upxIn, upyIn, upzIn) {
    let fx = tx - px;
    let fy = ty - py;
    let fz = tz - pz;
    const fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
    if (fl <= 0) return;
    fx /= fl;
    fy /= fl;
    fz /= fl;
    let upx = upxIn;
    let upy = upyIn;
    let upz = upzIn;
    const ul = Math.sqrt(upx * upx + upy * upy + upz * upz);
    if (ul > 0) {
      upx /= ul;
      upy /= ul;
      upz /= ul;
    } else {
      upx = 0;
      upy = 1;
      upz = 0;
    }
    const dotFU = fx * upx + fy * upy + fz * upz;
    if (Math.abs(dotFU) > 0.999) {
      if (Math.abs(fy) < 0.9) {
        upx = 0;
        upy = 1;
        upz = 0;
      } else {
        upx = 1;
        upy = 0;
        upz = 0;
      }
    }
    let rx = fy * upz - fz * upy;
    let ry = fz * upx - fx * upz;
    let rz = fx * upy - fy * upx;
    const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
    if (rl <= 0) return;
    rx /= rl;
    ry /= rl;
    rz /= rl;
    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy - ry * fx;
    const m00 = rx;
    const m10 = ry;
    const m20 = rz;
    const m01 = ux;
    const m11 = uy;
    const m21 = uz;
    const m02 = -fx;
    const m12 = -fy;
    const m22 = -fz;
    const trace = m00 + m11 + m22;
    let qw;
    let qx;
    let qy;
    let qz;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      qw = 0.25 / s;
      qx = (m21 - m12) * s;
      qy = (m02 - m20) * s;
      qz = (m10 - m01) * s;
    } else if (m00 > m11 && m00 > m22) {
      const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
      qw = (m21 - m12) / s;
      qx = 0.25 * s;
      qy = (m01 + m10) / s;
      qz = (m02 + m20) / s;
    } else if (m11 > m22) {
      const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
      qw = (m02 - m20) / s;
      qx = (m01 + m10) / s;
      qy = 0.25 * s;
      qz = (m12 + m21) / s;
    } else {
      const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
      qw = (m10 - m01) / s;
      qx = (m02 + m20) / s;
      qy = (m12 + m21) / s;
      qz = 0.25 * s;
    }
    this.camera.transform.setRotation(qx, qy, qz, qw);
    this._upX = ux;
    this._upY = uy;
    this._upZ = uz;
  }
  rotateVectorByQuat(vx, vy, vz, qx, qy, qz, qw) {
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    const outX = vx + qw * tx + (qy * tz - qz * ty);
    const outY = vy + qw * ty + (qz * tx - qx * tz);
    const outZ = vz + qw * tz + (qx * ty - qy * tx);
    return [outX, outY, outZ];
  }
  quatMul(ax, ay, az, aw, bx, by, bz, bw) {
    const x = aw * bx + ax * bw + ay * bz - az * by;
    const y = aw * by - ax * bz + ay * bw + az * bx;
    const z = aw * bz + ax * by - ay * bx + az * bw;
    const w = aw * bw - ax * bx - ay * by - az * bz;
    return [x, y, z, w];
  }
  quatInvert(x, y, z, w) {
    return [-x, -y, -z, w];
  }
  normalizeQuatInPlace() {
    const l = Math.sqrt(this._rotationDeltaX * this._rotationDeltaX + this._rotationDeltaY * this._rotationDeltaY + this._rotationDeltaZ * this._rotationDeltaZ + this._rotationDeltaW * this._rotationDeltaW);
    if (l > 0) {
      const inv = 1 / l;
      this._rotationDeltaX *= inv;
      this._rotationDeltaY *= inv;
      this._rotationDeltaZ *= inv;
      this._rotationDeltaW *= inv;
    } else {
      this._rotationDeltaX = 0;
      this._rotationDeltaY = 0;
      this._rotationDeltaZ = 0;
      this._rotationDeltaW = 1;
    }
  }
  isIdentityQuat(x, y, z, w) {
    return Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9 && Math.abs(z) < 1e-9 && Math.abs(1 - w) < 1e-9;
  }
  slerpIdentityToQuat(x, y, z, w, t) {
    const tt = this.clamp(t, 0, 1);
    let cosHalfTheta = this.clamp(w, -1, 1);
    let qx = x;
    let qy = y;
    let qz = z;
    let qw = w;
    if (cosHalfTheta < 0) {
      cosHalfTheta = -cosHalfTheta;
      qx = -qx;
      qy = -qy;
      qz = -qz;
      qw = -qw;
    }
    if (cosHalfTheta >= 0.9995) {
      const ox2 = qx * tt;
      const oy2 = qy * tt;
      const oz2 = qz * tt;
      const ow2 = 1 - tt + qw * tt;
      const l = Math.sqrt(ox2 * ox2 + oy2 * oy2 + oz2 * oz2 + ow2 * ow2);
      if (l > 0) {
        const inv = 1 / l;
        return [ox2 * inv, oy2 * inv, oz2 * inv, ow2 * inv];
      }
      return [0, 0, 0, 1];
    }
    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1 - cosHalfTheta * cosHalfTheta);
    if (sinHalfTheta <= 1e-9) return [0, 0, 0, 1];
    const a = Math.sin((1 - tt) * halfTheta) / sinHalfTheta;
    const b = Math.sin(tt * halfTheta) / sinHalfTheta;
    const ox = qx * b;
    const oy = qy * b;
    const oz = qz * b;
    const ow = a + qw * b;
    return [ox, oy, oz, ow];
  }
  clamp(x, min, max) {
    return Math.max(min, Math.min(max, x));
  }
};

// src/world/glyphfield.ts
var UNIFORM_FLOAT_COUNT2 = 44;
var UNIFORM_BYTE_SIZE2 = UNIFORM_FLOAT_COUNT2 * 4;
function clamp013(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function clampMin2(x, min) {
  return x < min ? min : x;
}
function normalizeStops3(stops) {
  if (!stops || stops.length === 0) {
    return [
      [0, 0, 0, 1],
      [1, 1, 1, 1]
    ];
  }
  const out = [];
  const n = Math.min(8, stops.length);
  for (let i = 0; i < n; i++) {
    const c = stops[i];
    out.push([c[0], c[1], c[2], c[3]]);
  }
  return out;
}
function colorModeId(mode) {
  switch (mode) {
    case "rgba":
      return 0;
    case "scalar":
      return 1;
    case "solid":
      return 2;
  }
}
function resolveBufferHandle(x) {
  if (!x) return null;
  return x.buffer ? x.buffer : x;
}
function createUvEllipsoidGeometry(latSegments = 8, lonSegments = 12) {
  const lat = Math.max(3, latSegments | 0);
  const lon = Math.max(3, lonSegments | 0);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let y = 0; y <= lat; y++) {
    const v = y / lat;
    const theta = v * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    for (let x = 0; x <= lon; x++) {
      const u = x / lon;
      const phi = u * Math.PI * 2;
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);
      const nx = cosP * sinT;
      const ny = cosT;
      const nz = sinP * sinT;
      positions.push(nx, ny, nz);
      normals.push(nx, ny, nz);
      uvs.push(u, 1 - v);
    }
  }
  const stride = lon + 1;
  for (let y = 0; y < lat; y++) {
    for (let x = 0; x < lon; x++) {
      const i0 = y * stride + x;
      const i1 = i0 + 1;
      const i2 = i0 + stride;
      const i3 = i2 + 1;
      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
    }
  }
  return new Geometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices)
  });
}
function createArrowGeometry(radialSegments = 12) {
  const seg = Math.max(3, radialSegments | 0);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const z0 = -0.5;
  const z1 = 0.15;
  const z2 = 0.2;
  const z3 = 0.5;
  const r0 = 0.05;
  const r1 = 0.1;
  const pushVertex = (px, py, pz, nx, ny, nz, u, v) => {
    const idx = positions.length / 3 | 0;
    positions.push(px, py, pz);
    normals.push(nx, ny, nz);
    uvs.push(u, v);
    return idx;
  };
  const ring = (z, r, nz, forCap) => {
    const out = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const a = t * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const px = c * r;
      const py = s * r;
      let nx = c;
      let ny = s;
      let nzz = nz;
      if (forCap) {
        nx = 0;
        ny = 0;
        nzz = nz;
      }
      out.push(pushVertex(px, py, z, nx, ny, nzz, t, z - z0));
    }
    return out;
  };
  const cylBottom = ring(z0, r0, 0, false);
  const cylTop = ring(z1, r0, 0, false);
  for (let i = 0; i < seg; i++) {
    const i0 = cylBottom[i];
    const i1 = cylBottom[i + 1];
    const i2 = cylTop[i];
    const i3 = cylTop[i + 1];
    indices.push(i0, i1, i2);
    indices.push(i1, i3, i2);
  }
  const fr0 = ring(z1, r0, 0, false);
  const fr1 = ring(z2, r1, 0, false);
  const slope = (r0 - r1) / (z2 - z1);
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const a = t * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const nx = c;
    const ny = s;
    const nz = slope;
    const inv = 1 / Math.hypot(nx, ny, nz);
    normals[fr0[i] * 3 + 0] = nx * inv;
    normals[fr0[i] * 3 + 1] = ny * inv;
    normals[fr0[i] * 3 + 2] = nz * inv;
    normals[fr1[i] * 3 + 0] = nx * inv;
    normals[fr1[i] * 3 + 1] = ny * inv;
    normals[fr1[i] * 3 + 2] = nz * inv;
  }
  for (let i = 0; i < seg; i++) {
    const i0 = fr0[i];
    const i1 = fr0[i + 1];
    const i2 = fr1[i];
    const i3 = fr1[i + 1];
    indices.push(i0, i1, i2);
    indices.push(i1, i3, i2);
  }
  const coneBase = ring(z2, r1, 0, false);
  const coneTipVerts = [];
  const coneH = z3 - z2;
  const coneNz = r1 / coneH;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const a = t * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const nx = c;
    const ny = s;
    const nz = coneNz;
    const inv = 1 / Math.hypot(nx, ny, nz);
    coneTipVerts.push(pushVertex(0, 0, z3, nx * inv, ny * inv, nz * inv, t, z3 - z0));
  }
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const a = t * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const nx = c;
    const ny = s;
    const nz = coneNz;
    const inv = 1 / Math.hypot(nx, ny, nz);
    normals[coneBase[i] * 3 + 0] = nx * inv;
    normals[coneBase[i] * 3 + 1] = ny * inv;
    normals[coneBase[i] * 3 + 2] = nz * inv;
  }
  for (let i = 0; i < seg; i++) {
    const b0 = coneBase[i];
    const b1 = coneBase[i + 1];
    const t0 = coneTipVerts[i];
    indices.push(b0, b1, t0);
  }
  const capCenter = pushVertex(0, 0, z0, 0, 0, -1, 0.5, 0);
  const capRing = ring(z0, r0, -1, true);
  for (let i = 0; i < seg; i++) {
    const rA = capRing[i];
    const rB = capRing[i + 1];
    indices.push(capCenter, rB, rA);
  }
  return new Geometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices)
  });
}
var cachedEllipsoid = null;
var cachedArrow = null;
var defaultGlyphGeometry = (shape) => {
  switch (shape) {
    case "ellipsoid":
      cachedEllipsoid ??= createUvEllipsoidGeometry();
      return cachedEllipsoid;
    case "arrow":
      cachedArrow ??= createArrowGeometry();
      return cachedArrow;
    default:
      cachedEllipsoid ??= createUvEllipsoidGeometry();
      return cachedEllipsoid;
  }
};
var GlyphField = class {
  transform = new Transform();
  name = null;
  visible = true;
  blendMode = "opaque" /* Opaque */;
  cullMode = "back" /* Back */;
  depthWrite = true;
  depthTest = true;
  boundsCenter = [0, 0, 0];
  boundsRadius = 0;
  shape = "ellipsoid";
  geometry;
  positionsBuffer = null;
  rotationsBuffer = null;
  scalesBuffer = null;
  attributesBuffer = null;
  uniformBuffer = null;
  bindGroup = null;
  bindGroupKey = null;
  _instanceCount = 0;
  _positionsCPU = null;
  _rotationsCPU = null;
  _scalesCPU = null;
  _attributesCPU = null;
  _positionsPtr = 0;
  _rotationsPtr = 0;
  _scalesPtr = 0;
  _attributesPtr = 0;
  _usingWasmPtrs = false;
  _usingExternalBuffers = false;
  _keepCPUData = false;
  _dataDirty = true;
  _uniformDirty = true;
  _colorMode = "rgba";
  _colormap = "viridis";
  _colormapStops = [[0.267, 487e-5, 0.32942, 1], [0.99325, 0.90616, 0.14394, 1]];
  _scalarMin = 0;
  _scalarMax = 1;
  _opacity = 1;
  _gamma = 1;
  _invert = false;
  _lit = true;
  _solidColor = [1, 1, 1, 1];
  constructor(desc = {}) {
    if (desc.name !== void 0) this.name = desc.name;
    if (desc.visible !== void 0) this.visible = !!desc.visible;
    this.shape = desc.shape ?? "ellipsoid";
    this.geometry = desc.geometry ?? defaultGlyphGeometry(this.shape);
    if (desc.boundsCenter) this.boundsCenter = [desc.boundsCenter[0], desc.boundsCenter[1], desc.boundsCenter[2]];
    if (desc.boundsRadius !== void 0) this.boundsRadius = desc.boundsRadius;
    if (desc.blendMode !== void 0) this.blendMode = desc.blendMode;
    if (desc.cullMode !== void 0) this.cullMode = desc.cullMode;
    if (desc.depthWrite !== void 0) this.depthWrite = !!desc.depthWrite;
    if (desc.depthTest !== void 0) this.depthTest = !!desc.depthTest;
    if (desc.colorMode !== void 0) this._colorMode = desc.colorMode;
    if (desc.colormap !== void 0) this._colormap = desc.colormap;
    if (desc.colormapStops !== void 0) this._colormapStops = normalizeStops3(desc.colormapStops);
    if (desc.scalarMin !== void 0) this._scalarMin = desc.scalarMin;
    if (desc.scalarMax !== void 0) this._scalarMax = desc.scalarMax;
    if (desc.opacity !== void 0) this._opacity = desc.opacity;
    if (desc.gamma !== void 0) this._gamma = desc.gamma;
    if (desc.invert !== void 0) this._invert = !!desc.invert;
    if (desc.lit !== void 0) this._lit = !!desc.lit;
    if (desc.solidColor !== void 0) this._solidColor = [desc.solidColor[0], desc.solidColor[1], desc.solidColor[2], desc.solidColor[3]];
    if (desc.keepCPUData !== void 0) this._keepCPUData = !!desc.keepCPUData;
    const positionsBuffer = resolveBufferHandle(desc.positionsBuffer);
    const rotationsBuffer = resolveBufferHandle(desc.rotationsBuffer);
    const scalesBuffer = resolveBufferHandle(desc.scalesBuffer);
    const attributesBuffer = resolveBufferHandle(desc.attributesBuffer);
    if (positionsBuffer || rotationsBuffer || scalesBuffer || attributesBuffer) {
      assert(!!positionsBuffer && !!rotationsBuffer && !!scalesBuffer, "GlyphField: positionsBuffer, rotationsBuffer, and scalesBuffer are required when using external buffers.");
      const count = desc.instanceCount ?? 0;
      assert(count > 0, "GlyphField: instanceCount is required when using external buffers.");
      this.setBuffers(positionsBuffer, rotationsBuffer, scalesBuffer, attributesBuffer, count);
    } else if (desc.positionsPtr || desc.rotationsPtr || desc.scalesPtr) {
      assert(!!desc.positionsPtr && !!desc.rotationsPtr && !!desc.scalesPtr, "GlyphField: positionsPtr, rotationsPtr, and scalesPtr are required when using wasm pointers.");
      const count = desc.instanceCount ?? 0;
      assert(count > 0, "GlyphField: instanceCount is required when using wasm pointers.");
      this.setWasmSoA(desc.positionsPtr, desc.rotationsPtr, desc.scalesPtr, desc.attributesPtr ?? 0, count);
    } else if (desc.positions || desc.rotations || desc.scales || desc.attributes) {
      this.setCPUData(desc.positions ?? null, desc.rotations ?? null, desc.scales ?? null, desc.attributes ?? null, { keepCPUData: this._keepCPUData, instanceCount: desc.instanceCount });
    } else if (desc.instanceCount !== void 0) {
      this._instanceCount = desc.instanceCount | 0;
      this._dataDirty = false;
    }
  }
  get instanceCount() {
    return this._instanceCount;
  }
  set instanceCount(v) {
    const n = v | 0;
    if (n === this._instanceCount) return;
    assert(n >= 0, "GlyphField: instanceCount must be >= 0.");
    this._instanceCount = n;
    this._dataDirty = true;
  }
  get colorMode() {
    return this._colorMode;
  }
  set colorMode(v) {
    if (v === this._colorMode) return;
    this._colorMode = v;
    this._uniformDirty = true;
  }
  get colormap() {
    return this._colormap;
  }
  set colormap(v) {
    this._colormap = v;
    this._uniformDirty = true;
    this.bindGroupKey = null;
  }
  get colormapStops() {
    return this._colormapStops;
  }
  set colormapStops(v) {
    this._colormapStops = normalizeStops3(v);
    this._uniformDirty = true;
  }
  getColormapKey() {
    const c = this._colormap;
    return c instanceof Colormap ? `cm:${c.id}` : `cm:${c}`;
  }
  getColormapForBinding() {
    const c = this._colormap;
    if (c instanceof Colormap) return c;
    if (c === "custom") return Colormap.builtin("grayscale");
    return Colormap.builtin(c);
  }
  get scalarMin() {
    return this._scalarMin;
  }
  set scalarMin(v) {
    if (v === this._scalarMin) return;
    this._scalarMin = v;
    this._uniformDirty = true;
  }
  get scalarMax() {
    return this._scalarMax;
  }
  set scalarMax(v) {
    if (v === this._scalarMax) return;
    this._scalarMax = v;
    this._uniformDirty = true;
  }
  get opacity() {
    return this._opacity;
  }
  set opacity(v) {
    if (v === this._opacity) return;
    this._opacity = v;
    this._uniformDirty = true;
  }
  get gamma() {
    return this._gamma;
  }
  set gamma(v) {
    if (v === this._gamma) return;
    this._gamma = v;
    this._uniformDirty = true;
  }
  get invert() {
    return this._invert;
  }
  set invert(v) {
    const b = !!v;
    if (b === this._invert) return;
    this._invert = b;
    this._uniformDirty = true;
  }
  get lit() {
    return this._lit;
  }
  set lit(v) {
    const b = !!v;
    if (b === this._lit) return;
    this._lit = b;
    this._uniformDirty = true;
  }
  get solidColor() {
    return this._solidColor;
  }
  set solidColor(v) {
    this._solidColor = [v[0], v[1], v[2], v[3]];
    this._uniformDirty = true;
  }
  markDataDirty() {
    if (this._usingExternalBuffers) return;
    this._dataDirty = true;
  }
  markUniformsDirty() {
    this._uniformDirty = true;
  }
  setCPUData(positions, rotations, scales, attributes, opts = {}) {
    if (positions) assert(positions.length % 4 === 0, "GlyphField: positions length must be a multiple of 4 (x,y,z,_ per instance).");
    if (rotations) assert(rotations.length % 4 === 0, "GlyphField: rotations length must be a multiple of 4 (qx,qy,qz,qw per instance).");
    if (scales) assert(scales.length % 4 === 0, "GlyphField: scales length must be a multiple of 4 (sx,sy,sz,_ per instance).");
    if (attributes) assert(attributes.length % 4 === 0, "GlyphField: attributes length must be a multiple of 4 (a0,a1,a2,a3 per instance).");
    const count = opts.instanceCount !== void 0 ? opts.instanceCount | 0 : positions ? positions.length / 4 : rotations ? rotations.length / 4 : scales ? scales.length / 4 : attributes ? attributes.length / 4 : 0;
    assert(count >= 0, "GlyphField: instanceCount must be >= 0.");
    if (count > 0) assert(!!positions && !!rotations && !!scales, "GlyphField: positions, rotations, and scales are required for CPU-backed glyph fields.");
    if (positions) assert(positions.length / 4 === count, "GlyphField: positions length does not match instanceCount.");
    if (rotations) assert(rotations.length / 4 === count, "GlyphField: rotations length does not match instanceCount.");
    if (scales) assert(scales.length / 4 === count, "GlyphField: scales length does not match instanceCount.");
    if (attributes) assert(attributes.length / 4 === count, "GlyphField: attributes length does not match instanceCount.");
    this._instanceCount = count;
    this._positionsCPU = positions;
    this._rotationsCPU = rotations;
    this._scalesCPU = scales;
    this._attributesCPU = attributes;
    this._positionsPtr = 0;
    this._rotationsPtr = 0;
    this._scalesPtr = 0;
    this._attributesPtr = 0;
    this._usingWasmPtrs = false;
    this._usingExternalBuffers = false;
    this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
    this._dataDirty = true;
    this.bindGroupKey = null;
  }
  setWasmSoA(positionsPtr, rotationsPtr, scalesPtr, attributesPtr, instanceCount) {
    const count = instanceCount | 0;
    assert(count > 0, "GlyphField: instanceCount must be > 0.");
    this._instanceCount = count;
    this._positionsCPU = null;
    this._rotationsCPU = null;
    this._scalesCPU = null;
    this._attributesCPU = null;
    this._positionsPtr = positionsPtr >>> 0;
    this._rotationsPtr = rotationsPtr >>> 0;
    this._scalesPtr = scalesPtr >>> 0;
    this._attributesPtr = attributesPtr >>> 0;
    this._usingWasmPtrs = true;
    this._usingExternalBuffers = false;
    this._dataDirty = true;
    this.bindGroupKey = null;
  }
  setBuffers(positions, rotations, scales, attributes, instanceCount) {
    const count = instanceCount | 0;
    assert(count > 0, "GlyphField: instanceCount must be > 0.");
    this._instanceCount = count;
    this.positionsBuffer = positions;
    this.rotationsBuffer = rotations;
    this.scalesBuffer = scales;
    this.attributesBuffer = attributes;
    this._positionsCPU = null;
    this._rotationsCPU = null;
    this._scalesCPU = null;
    this._attributesCPU = null;
    this._positionsPtr = 0;
    this._rotationsPtr = 0;
    this._scalesPtr = 0;
    this._attributesPtr = 0;
    this._usingWasmPtrs = false;
    this._usingExternalBuffers = true;
    this._dataDirty = false;
    this.bindGroupKey = null;
  }
  upload(device, queue) {
    if (this._usingExternalBuffers) return;
    if (!this._dataDirty) return;
    if (this._instanceCount <= 0) {
      this._dataDirty = false;
      return;
    }
    const bytes = wasmInterop.bytes();
    const requiredBytes = this._instanceCount * 16;
    const uploadSoA = (buf, cpu, ptr, label) => {
      if (!cpu && !ptr) return buf;
      const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
      const byteLength = requiredBytes;
      if (!buf) buf = device.createBuffer({ size: byteLength, usage, label });
      try {
        if (cpu) queue.writeBuffer(buf, 0, cpu.buffer, cpu.byteOffset, Math.min(cpu.byteLength, byteLength));
        else queue.writeBuffer(buf, 0, bytes, ptr >>> 0, byteLength);
      } catch {
        buf.destroy();
        buf = device.createBuffer({ size: byteLength, usage, label });
        if (cpu) queue.writeBuffer(buf, 0, cpu.buffer, cpu.byteOffset, Math.min(cpu.byteLength, byteLength));
        else queue.writeBuffer(buf, 0, bytes, ptr >>> 0, byteLength);
      }
      return buf;
    };
    this.positionsBuffer = uploadSoA(this.positionsBuffer, this._positionsCPU, this._positionsPtr, "GlyphField.positions");
    this.rotationsBuffer = uploadSoA(this.rotationsBuffer, this._rotationsCPU, this._rotationsPtr, "GlyphField.rotations");
    this.scalesBuffer = uploadSoA(this.scalesBuffer, this._scalesCPU, this._scalesPtr, "GlyphField.scales");
    if (this._attributesCPU || this._attributesPtr) this.attributesBuffer = uploadSoA(this.attributesBuffer, this._attributesCPU, this._attributesPtr, "GlyphField.attributes");
    else if (!this.attributesBuffer) this.attributesBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: "GlyphField.attributesDummy" });
    if (!this._keepCPUData) {
      this._positionsCPU = null;
      this._rotationsCPU = null;
      this._scalesCPU = null;
      this._attributesCPU = null;
    }
    this._dataDirty = false;
    this.bindGroupKey = null;
  }
  getUniformBufferSize() {
    return UNIFORM_BYTE_SIZE2;
  }
  getUniformData() {
    const out = new Float32Array(UNIFORM_FLOAT_COUNT2);
    out[0] = this._scalarMin;
    out[1] = this._scalarMax;
    out[2] = clamp013(this._opacity);
    out[3] = clampMin2(this._gamma, 1e-6);
    out[4] = this._invert ? 1 : 0;
    out[5] = this._solidColor[3];
    out[6] = typeof this._colormap === "string" && this._colormap === "custom" ? Math.min(8, Math.max(2, this._colormapStops.length)) : 0;
    out[7] = colorModeId(this._colorMode);
    out[8] = this._lit ? 1 : 0;
    out[9] = this._solidColor[0];
    out[10] = this._solidColor[1];
    out[11] = this._solidColor[2];
    const stops = this._colormapStops;
    const nStops = Math.min(8, Math.max(2, stops.length));
    for (let i = 0; i < 8; i++) {
      const src = stops[Math.min(i, nStops - 1)];
      const o = 12 + i * 4;
      out[o + 0] = src[0];
      out[o + 1] = src[1];
      out[o + 2] = src[2];
      out[o + 3] = src[3];
    }
    return out;
  }
  get dirtyUniforms() {
    return this._uniformDirty;
  }
  markUniformsClean() {
    this._uniformDirty = false;
  }
  destroy() {
    this.positionsBuffer?.destroy();
    this.rotationsBuffer?.destroy();
    this.scalesBuffer?.destroy();
    this.attributesBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.positionsBuffer = null;
    this.rotationsBuffer = null;
    this.scalesBuffer = null;
    this.attributesBuffer = null;
    this.uniformBuffer = null;
    this.bindGroup = null;
    this.bindGroupKey = null;
    this._positionsCPU = null;
    this._rotationsCPU = null;
    this._scalesCPU = null;
    this._attributesCPU = null;
    this._instanceCount = 0;
    this.transform.dispose();
  }
};

// src/core/engine.ts
var WasmGPU = class _WasmGPU {
  renderer;
  compute;
  _performanceStats = null;
  _isRunning = false;
  _lastTime = 0;
  _frameCallback = null;
  _animationFrameId = null;
  constructor(renderer, desc) {
    this.renderer = renderer;
    const gpu = renderer.gpu;
    this.compute = new Compute(gpu.device, gpu.queue, desc);
  }
  static async create(canvas, descriptor = {}) {
    await initWebAssembly();
    const renderer = await Renderer.create(canvas, descriptor);
    return new _WasmGPU(renderer, descriptor);
  }
  run(callback) {
    if (this._isRunning) return;
    this._isRunning = true;
    this._frameCallback = callback;
    this._lastTime = performance.now();
    const loop = (now) => {
      if (!this._isRunning) return;
      frameArena.reset();
      const dt = (now - this._lastTime) / 1e3;
      this._lastTime = now;
      const cpuStart = performance.now();
      this._frameCallback?.(dt, now / 1e3, this);
      const cpuMs = performance.now() - cpuStart;
      this._performanceStats?.update(dt, cpuMs);
      this._animationFrameId = requestAnimationFrame(loop);
    };
    this._animationFrameId = requestAnimationFrame(loop);
  }
  stop() {
    this._isRunning = false;
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }
  get gpu() {
    return this.renderer.gpu;
  }
  get isRunning() {
    return this._isRunning;
  }
  get cullingStats() {
    return this.renderer.cullingStats;
  }
  static get interop() {
    return wasmInterop;
  }
  get interop() {
    return wasmInterop;
  }
  static get python() {
    return pythonInterop;
  }
  get python() {
    return pythonInterop;
  }
  static get math() {
    return { mat4, quat, vec3 };
  }
  get math() {
    return { mat4, quat, vec3 };
  }
  static createHeapArena(capBytes, align = 16) {
    return wasmInterop.createHeapArena(capBytes, align);
  }
  createHeapArena(capBytes, align = 16) {
    return wasmInterop.createHeapArena(capBytes, align);
  }
  static get frameArena() {
    return frameArena;
  }
  get frameArena() {
    return frameArena;
  }
  createPerformanceStats(desc = {}) {
    this._performanceStats?.destroy();
    this.renderer.enableGpuTiming(desc.showGpuTime ?? true);
    const stats = new PerformanceStats({
      getGpuTimeNs: () => this.renderer.gpuTimeNs,
      getCullingStats: () => this.renderer.cullingStats
    }, {
      canvas: this.renderer.canvas,
      ...desc
    });
    this._performanceStats = stats;
    return stats;
  }
  get performanceStats() {
    return this._performanceStats;
  }
  destroyPerformanceStats() {
    this._performanceStats?.destroy();
    this._performanceStats = null;
    this.renderer.enableGpuTiming(false);
  }
  render(scene, camera) {
    if (!this._isRunning) frameArena.reset();
    this.renderer.render(scene, camera);
  }
  createScene(background) {
    return new Scene({ background });
  }
  createCamera = {
    perspective: (options) => {
      return new PerspectiveCamera(options);
    },
    orthographic: (options) => {
      return new OrthographicCamera(options);
    }
  };
  createControls = {
    orbit: (camera, domElement, options) => {
      return new OrbitControls(camera, domElement, options);
    },
    trackball: (camera, domElement, options) => {
      return new TrackballControls(camera, domElement, options);
    }
  };
  geometry = {
    box: (width, height, depth) => {
      return Geometry.box(width, height, depth);
    },
    sphere: (radius, widthSegments, heightSegments) => {
      return Geometry.sphere(radius, widthSegments, heightSegments);
    },
    plane: (width, height, widthSegments, heightSegments) => {
      return Geometry.plane(width, height, widthSegments, heightSegments);
    },
    cylinder: (radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded) => {
      return Geometry.cylinder(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded);
    },
    pyramid: (baseWidth, baseDepth, height) => {
      return Geometry.pyramid(baseWidth, baseDepth, height);
    },
    torus: (radius, tube, radialSegments, tubularSegments) => {
      return Geometry.torus(radius, tube, radialSegments, tubularSegments);
    },
    prism: (radius, height, sides) => {
      return Geometry.prism(radius, height, sides);
    },
    custom: (descriptor) => {
      return new Geometry(descriptor);
    }
  };
  material = {
    unlit: (options) => {
      return new UnlitMaterial(options);
    },
    standard: (options) => {
      return new StandardMaterial(options);
    },
    data: (options) => {
      return new DataMaterial(options);
    },
    custom: (options) => {
      return new CustomMaterial(options);
    }
  };
  texture = {
    create2D: (descriptor) => {
      return Texture2D.createFrom(descriptor);
    }
  };
  createTransform() {
    return new Transform();
  }
  createMesh(geometry, material) {
    return new Mesh(geometry, material);
  }
  createPointCloud(descriptor = {}) {
    return new PointCloud(descriptor);
  }
  createGlyphField(descriptor = {}) {
    return new GlyphField(descriptor);
  }
  colormap = {
    builtin: (name) => {
      return Colormap.builtin(name);
    },
    grayscale: () => {
      return Colormap.builtin("grayscale");
    },
    turbo: () => {
      return Colormap.builtin("turbo");
    },
    viridis: () => {
      return Colormap.builtin("viridis");
    },
    magma: () => {
      return Colormap.builtin("magma");
    },
    plasma: () => {
      return Colormap.builtin("plasma");
    },
    inferno: () => {
      return Colormap.builtin("inferno");
    },
    fromStops: (stops, desc = {}) => {
      return Colormap.fromStops(stops, desc);
    },
    fromPalette: (colors, desc = {}) => {
      return Colormap.fromPalette(colors, desc);
    }
  };
  createLight = {
    ambient: (options) => {
      return new AmbientLight(options);
    },
    directional: (options) => {
      return new DirectionalLight(options);
    },
    point: (options) => {
      return new PointLight(options);
    }
  };
  gltf = {
    load: async (source, options) => {
      return loadGltf(source, options);
    },
    import: async (doc, options) => {
      return importGltf(doc, options);
    },
    loadAndImport: async (source, options = {}) => {
      const doc = await loadGltf(source, options.load);
      return importGltf(doc, options.import);
    },
    parseGLB: (glb) => {
      return parseGLB(glb);
    },
    readAccessor: (doc, accessorIndex) => {
      return readAccessor(doc, accessorIndex);
    },
    readAccessorAsFloat32: (doc, accessorIndex) => {
      return readAccessorAsFloat32(doc, accessorIndex);
    },
    readAccessorAsUint16: (doc, accessorIndex) => {
      return readAccessorAsUint16(doc, accessorIndex);
    },
    readIndicesAsUint32: (doc, accessorIndex) => {
      return readIndicesAsUint32(doc, accessorIndex);
    }
  };
  animation = {
    createClip: (descriptor) => {
      return new AnimationClip(descriptor);
    },
    createPlayer: (clip, options) => {
      return new AnimationPlayer(clip, options);
    },
    createSkin: (name, joints, inverseBindMatrices) => {
      return new Skin(name, joints, inverseBindMatrices);
    }
  };
  destroy() {
    this.stop();
    this.destroyPerformanceStats();
    this.compute.destroy();
    this.renderer.destroy();
  }
};
export {
  AmbientLight,
  AnimationClip,
  AnimationPlayer,
  BlendMode,
  CPUndarray,
  Camera,
  Colormap,
  Compute,
  ComputeKernels,
  ComputePipeline,
  CullMode,
  CustomMaterial,
  DataMaterial,
  DirectionalLight,
  GPUndarray,
  Geometry,
  GlyphField,
  Light,
  Material,
  Mesh,
  Ndarray,
  OrbitControls,
  OrthographicCamera,
  PerformanceStats,
  PerspectiveCamera,
  PointCloud,
  PointLight,
  ReadbackRing,
  Renderer,
  Scene,
  Skin,
  SkinInstance,
  StandardMaterial,
  StorageBuffer,
  Texture2D,
  TrackballControls,
  Transform,
  TransformStore,
  UniformBuffer,
  UnlitMaterial,
  WasmGPU,
  WasmHeapArena,
  WasmSlice,
  cullf,
  WasmGPU as default,
  dtypeInfo,
  frameArena,
  frustumf,
  importGltf,
  initWebAssembly,
  loadGltf,
  makeWorkgroupCounts,
  makeWorkgroupSize,
  mat4,
  ndarrayf,
  normalizeWorkgroups,
  parseGLB,
  pythonInterop,
  quat,
  readAccessor,
  readAccessorAsFloat32,
  readAccessorAsUint16,
  readIndicesAsUint32,
  vec3,
  wasm,
  wasmInterop,
  workgroups1D,
  workgroups2D,
  workgroups3D
};
