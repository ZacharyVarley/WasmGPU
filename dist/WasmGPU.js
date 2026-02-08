// src/wasm/index.ts
var modPromise = null;
var mod = null;
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
var initMath = async (baseURL) => {
  if (mod) return;
  const base = baseURL ?? defaultBaseURL();
  const mathURL = new URL("math.js", base).toString();
  modPromise ??= import(mathURL);
  mod = await modPromise;
  mod.wasmgpu_frame_arena_init(DEFAULT_FRAME_ARENA_BYTES);
};
var ensure = () => {
  if (!mod) throw new Error("Math module not initialized. Call await initMath() first.");
  return mod;
};
var bool = (x) => !!x;
var wasm = {
  memory: () => ensure().memory,
  seed: (seed) => {
    ensure().wasmgpu_seed(seed >>> 0);
  },
  allocF32: (len) => ensure().wasmgpu_alloc_f32(len >>> 0) >>> 0,
  freeF32: (ptr, len) => ensure().wasmgpu_free_f32(ptr >>> 0, len >>> 0),
  f32view: (ptr, len) => ensure().f32view(ptr >>> 0, len >>> 0),
  u32view: (ptr, len) => ensure().u32view(ptr >>> 0, len >>> 0),
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
    return base;
  },
  reset: () => {
    ensure().wasmgpu_frame_arena_reset();
  },
  alloc: (bytes, align = 16) => {
    const ptr = ensure().wasmgpu_frame_alloc(bytes >>> 0, align >>> 0) >>> 0;
    if (!ptr) {
      const used = ensure().wasmgpu_frame_arena_used() >>> 0;
      const cap = ensure().wasmgpu_frame_arena_cap() >>> 0;
      throw new Error(`Frame arena OOM: alloc ${bytes} bytes (align ${align}). used=${used} cap=${cap}`);
    }
    return ptr;
  },
  allocF32: (len) => {
    const ptr = ensure().wasmgpu_frame_alloc_f32(len >>> 0) >>> 0;
    if (!ptr) {
      const used = ensure().wasmgpu_frame_arena_used() >>> 0;
      const cap = ensure().wasmgpu_frame_arena_cap() >>> 0;
      throw new Error(`Frame arena OOM: allocF32 len=${len} (${len * 4} bytes). used=${used} cap=${cap}`);
    }
    return ptr;
  },
  usedBytes: () => ensure().wasmgpu_frame_arena_used() >>> 0,
  capBytes: () => ensure().wasmgpu_frame_arena_cap() >>> 0
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
  constructor(initialCap) {
    this.count = 0;
    this.posPtr = 0;
    this.rotPtr = 0;
    this.sclPtr = 0;
    this.localPtr = 0;
    this.worldPtr = 0;
    this.parentPtr = 0;
    this.orderPtr = 0;
    this.tmpAxisPtr = 0;
    this.tmpQuatPtr = 0;
    this._buf = null;
    this._f32 = null;
    this._u32 = null;
    this._dirty = true;
    this._orderDirty = true;
    this._nodes = [];
    this._freeList = [];
    this._visited = new Uint8Array(0);
    this._stack = [];
    this.cap = Math.max(1, initialCap | 0);
    this.allocateArrays(this.cap);
  }
  static {
    this._global = null;
  }
  static global() {
    if (!_TransformStore._global) _TransformStore._global = new _TransformStore(16384);
    return _TransformStore._global;
  }
  allocateArrays(cap) {
    this.posPtr = wasm.allocF32(cap * 3);
    this.rotPtr = wasm.allocF32(cap * 4);
    this.sclPtr = wasm.allocF32(cap * 3);
    this.localPtr = wasm.allocF32(cap * 16);
    this.worldPtr = wasm.allocF32(cap * 16);
    this.parentPtr = wasm.allocF32(cap);
    this.orderPtr = wasm.allocF32(cap);
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
  markDirty() {
    this._dirty = true;
  }
  markOrderDirty() {
    this._orderDirty = true;
    this._dirty = true;
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
    if (this.count === 0) {
      this._dirty = false;
      return;
    }
    if (this._orderDirty) this.buildOrder();
    transformf.composeLocalMany(this.localPtr, this.posPtr, this.rotPtr, this.sclPtr, this.count);
    transformf.updateWorldOrdered(this.worldPtr, this.localPtr, this.parentPtr, this.orderPtr, this.count);
    this._dirty = false;
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
  }
};
var Transform = class _Transform {
  constructor() {
    this._parent = null;
    this._children = [];
    this._position = [0, 0, 0];
    this._rotation = [0, 0, 0, 1];
    this._scale = [1, 1, 1];
    this._localMatrix = [
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
    this._worldMatrix = [
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
    this._disposed = false;
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
    T.markDirty();
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
    T.markDirty();
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
    T.markDirty();
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
    T.markDirty();
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
    T.markDirty();
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
    T.markDirty();
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
    T.markDirty();
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
    T.markDirty();
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

// src/world/scene.ts
var Scene = class _Scene {
  constructor(descriptor = {}) {
    this._meshes = [];
    this._lights = [];
    this._background = descriptor.background ?? [0, 0, 0];
  }
  static {
    this.MAX_LIGHTS = 8;
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
  add(mesh) {
    if (!this._meshes.includes(mesh)) this._meshes.push(mesh);
    return this;
  }
  remove(mesh) {
    const idx = this._meshes.indexOf(mesh);
    if (idx !== -1) this._meshes.splice(idx, 1);
    return this;
  }
  clear() {
    this._meshes = [];
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
  get visibleMeshes() {
    return this._meshes.filter((m) => m.visible);
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
  destroy() {
    for (const mesh of this._meshes) mesh.destroy();
    this._meshes = [];
    this._lights = [];
  }
};

// src/world/light.ts
var Light = class {
  constructor(type) {
    this._color = [1, 1, 1];
    this._intensity = 1;
    this._enabled = true;
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

// src/shaders/unlit.wgsl
var unlit_default = "struct MaterialUniforms {\r\n    color: vec4f\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> material: MaterialUniforms;\r\n\r\nstruct VertexInput {\r\n    @location(0) position: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f\r\n};\r\n\r\nstruct VertexOutput {\r\n    @builtin(position) position: vec4f,\r\n    @location(0) normal: vec3f,\r\n    @location(1) uv: vec2f\r\n};\r\n\r\nstruct CameraUniforms {\r\n    viewProjection: mat4x4f,\r\n    position: vec3f\r\n};\r\n\r\nstruct ModelUniforms {\r\n    model: mat4x4f,\r\n    normalMatrix: mat4x4f\r\n};\r\n\r\n@group(0) @binding(0) var<uniform> camera: CameraUniforms;\r\n@group(0) @binding(1) var<uniform> model: ModelUniforms;\r\n\r\n@vertex\r\nfn vs_main(in: VertexInput) -> VertexOutput {\r\n    var out: VertexOutput;\r\n    out.position = camera.viewProjection * model.model * vec4f(in.position, 1.0);\r\n    out.normal = (model.normalMatrix * vec4f(in.normal, 0.0)).xyz;\r\n    out.uv = in.uv;\r\n    return out;\r\n}\r\n\r\n@fragment\r\nfn fs_main(in: VertexOutput) -> @location(0) vec4f {\r\n    return material.color;\r\n}\r\n";

// src/shaders/unlit-instanced.wgsl
var unlit_instanced_default = "struct MaterialUniforms {\r\n    color: vec4f\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> material: MaterialUniforms;\r\n\r\nstruct VertexInput {\r\n    @location(0) position: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f,\r\n    @location(3) m0: vec4f,\r\n    @location(4) m1: vec4f,\r\n    @location(5) m2: vec4f,\r\n    @location(6) m3: vec4f,\r\n    @location(7) n0: vec4f,\r\n    @location(8) n1: vec4f,\r\n    @location(9) n2: vec4f,\r\n    @location(10) n3: vec4f\r\n};\r\n\r\nstruct VertexOutput {\r\n    @builtin(position) position: vec4f,\r\n    @location(0) normal: vec3f,\r\n    @location(1) uv: vec2f\r\n};\r\n\r\nstruct CameraUniforms {\r\n    viewProjection: mat4x4f,\r\n    position: vec3f\r\n};\r\n\r\n@group(0) @binding(0) var<uniform> camera: CameraUniforms;\r\n\r\n@vertex\r\nfn vs_main(in: VertexInput) -> VertexOutput {\r\n    var out: VertexOutput;\r\n    let modelM = mat4x4f(in.m0, in.m1, in.m2, in.m3);\r\n    let normalM = mat4x4f(in.n0, in.n1, in.n2, in.n3);\r\n    out.position = camera.viewProjection * modelM * vec4f(in.position, 1.0);\r\n    out.normal = (normalM * vec4f(in.normal, 0.0)).xyz;\r\n    out.uv = in.uv;\r\n    return out;\r\n}\r\n\r\n@fragment\r\nfn fs_main(in: VertexOutput) -> @location(0) vec4f {\r\n    return material.color;\r\n}\r\n";

// src/shaders/standard.wgsl
var standard_default = "struct MaterialUniforms {\r\n    color: vec4f,\r\n    emissive: vec4f,\r\n    params: vec4f\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> material: MaterialUniforms;\r\n\r\nstruct VertexInput {\r\n    @location(0) position: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f\r\n};\r\n\r\nstruct VertexOutput {\r\n    @builtin(position) position: vec4f,\r\n    @location(0) worldPos: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f\r\n};\r\n\r\nstruct CameraUniforms {\r\n    viewProjection: mat4x4f,\r\n    position: vec3f\r\n};\r\n\r\nstruct ModelUniforms {\r\n    model: mat4x4f,\r\n    normalMatrix: mat4x4f\r\n};\r\n\r\nstruct Light {\r\n    position: vec4f,\r\n    color: vec4f,\r\n    params: vec4f\r\n};\r\n\r\nstruct LightingUniforms {\r\n    ambient: vec4f,\r\n    lightCount: u32,\r\n    _pad0: u32,\r\n    _pad1: u32,\r\n    _pad2: u32,\r\n    lights: array<Light, 8>\r\n};\r\n\r\n@group(0) @binding(0) var<uniform> camera: CameraUniforms;\r\n@group(0) @binding(1) var<uniform> model: ModelUniforms;\r\n@group(0) @binding(2) var<uniform> lighting: LightingUniforms;\r\n\r\nconst PI: f32 = 3.14159265359;\r\n\r\n@vertex\r\nfn vs_main(in: VertexInput) -> VertexOutput {\r\n    var out: VertexOutput;\r\n    let worldPos = model.model * vec4f(in.position, 1.0);\r\n    out.position = camera.viewProjection * worldPos;\r\n    out.worldPos = worldPos.xyz;\r\n    out.normal = normalize((model.normalMatrix * vec4f(in.normal, 0.0)).xyz);\r\n    out.uv = in.uv;\r\n    return out;\r\n}\r\n\r\nfn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f {\r\n    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);\r\n}\r\n\r\nfn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 {\r\n    let a = roughness * roughness;\r\n    let a2 = a * a;\r\n    let NdotH = max(dot(N, H), 0.0);\r\n    let NdotH2 = NdotH * NdotH;\r\n    let denom = NdotH2 * (a2 - 1.0) + 1.0;\r\n    return a2 / (PI * denom * denom);\r\n}\r\n\r\nfn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {\r\n    let r = roughness + 1.0;\r\n    let k = (r * r) / 8.0;\r\n    return NdotV / (NdotV * (1.0 - k) + k);\r\n}\r\n\r\nfn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 {\r\n    let NdotV = max(dot(N, V), 0.0);\r\n    let NdotL = max(dot(N, L), 0.0);\r\n    return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);\r\n}\r\n\r\n@fragment\r\nfn fs_main(in: VertexOutput) -> @location(0) vec4f {\r\n    let albedo = material.color.rgb;\r\n    let metallic = material.params.x;\r\n    let roughness = material.params.y;\r\n    let emissiveIntensity = material.params.z;\r\n    let N = normalize(in.normal);\r\n    let V = normalize(camera.position - in.worldPos);\r\n    let F0 = mix(vec3f(0.04), albedo, metallic);\r\n    var Lo = lighting.ambient.rgb * albedo;\r\n    for (var i = 0u; i < lighting.lightCount; i++) {\r\n        let light = lighting.lights[i];\r\n        var L: vec3f;\r\n        var attenuation: f32 = 1.0;\r\n        if (light.position.w == 0.0) {\r\n            L = normalize(-light.position.xyz);\r\n        } else {\r\n            let lightDir = light.position.xyz - in.worldPos;\r\n            let distance = length(lightDir);\r\n            L = normalize(lightDir);\r\n            attenuation = 1.0 / (distance * distance);\r\n        }\r\n        let H = normalize(V + L);\r\n        let radiance = light.color.rgb * light.color.a * attenuation;\r\n        let NDF = distributionGGX(N, H, roughness);\r\n        let G = geometrySmith(N, V, L, roughness);\r\n        let F = fresnelSchlick(max(dot(H, V), 0.0), F0);\r\n        let numerator = NDF * G * F;\r\n        let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;\r\n        let specular = numerator / denominator;\r\n        let kS = F;\r\n        let kD = (1.0 - kS) * (1.0 - metallic);\r\n        let NdotL = max(dot(N, L), 0.0);\r\n        Lo += (kD * albedo / PI + specular) * radiance * NdotL;\r\n    }\r\n    Lo += material.emissive.rgb * emissiveIntensity;\r\n    Lo = Lo / (Lo + vec3f(1.0));\r\n    Lo = pow(Lo, vec3f(1.0 / 2.2));\r\n    return vec4f(Lo, material.color.a);\r\n}\r\n";

// src/shaders/standard-instanced.wgsl
var standard_instanced_default = "struct MaterialUniforms {\r\n    color: vec4f,\r\n    emissive: vec4f,\r\n    params: vec4f\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> material: MaterialUniforms;\r\n\r\nstruct VertexInput {\r\n    @location(0) position: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f,\r\n    @location(3) m0: vec4f,\r\n    @location(4) m1: vec4f,\r\n    @location(5) m2: vec4f,\r\n    @location(6) m3: vec4f,\r\n    @location(7) n0: vec4f,\r\n    @location(8) n1: vec4f,\r\n    @location(9) n2: vec4f,\r\n    @location(10) n3: vec4f\r\n};\r\n\r\nstruct VertexOutput {\r\n    @builtin(position) position: vec4f,\r\n    @location(0) worldPos: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f\r\n};\r\n\r\nstruct CameraUniforms {\r\n    viewProjection: mat4x4f,\r\n    position: vec3f\r\n};\r\n\r\nstruct Light {\r\n    position: vec4f,\r\n    color: vec4f,\r\n    params: vec4f\r\n};\r\n\r\nstruct LightingUniforms {\r\n    ambient: vec4f,\r\n    lightCount: u32,\r\n    _pad0: u32,\r\n    _pad1: u32,\r\n    _pad2: u32,\r\n    lights: array<Light, 8>\r\n};\r\n\r\n@group(0) @binding(0) var<uniform> camera: CameraUniforms;\r\n@group(0) @binding(2) var<uniform> lighting: LightingUniforms;\r\n\r\nconst PI: f32 = 3.14159265359;\r\n\r\n@vertex\r\nfn vs_main(in: VertexInput) -> VertexOutput {\r\n    var out: VertexOutput;\r\n    let modelM = mat4x4f(in.m0, in.m1, in.m2, in.m3);\r\n    let normalM = mat4x4f(in.n0, in.n1, in.n2, in.n3);\r\n    let worldPos = modelM * vec4f(in.position, 1.0);\r\n    out.position = camera.viewProjection * worldPos;\r\n    out.worldPos = worldPos.xyz;\r\n    out.normal = normalize((normalM * vec4f(in.normal, 0.0)).xyz);\r\n    out.uv = in.uv;\r\n    return out;\r\n}\r\n\r\nfn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f {\r\n    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);\r\n}\r\n\r\nfn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 {\r\n    let a = roughness * roughness;\r\n    let a2 = a * a;\r\n    let NdotH = max(dot(N, H), 0.0);\r\n    let NdotH2 = NdotH * NdotH;\r\n    let denom = NdotH2 * (a2 - 1.0) + 1.0;\r\n    return a2 / (PI * denom * denom);\r\n}\r\n\r\nfn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {\r\n    let r = roughness + 1.0;\r\n    let k = (r * r) / 8.0;\r\n    return NdotV / (NdotV * (1.0 - k) + k);\r\n}\r\n\r\nfn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 {\r\n    let NdotV = max(dot(N, V), 0.0);\r\n    let NdotL = max(dot(N, L), 0.0);\r\n    return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);\r\n}\r\n\r\n@fragment\r\nfn fs_main(in: VertexOutput) -> @location(0) vec4f {\r\n    let albedo = material.color.rgb;\r\n    let metallic = material.params.x;\r\n    let roughness = material.params.y;\r\n    let emissiveIntensity = material.params.z;\r\n    let N = normalize(in.normal);\r\n    let V = normalize(camera.position - in.worldPos);\r\n    let F0 = mix(vec3f(0.04), albedo, metallic);\r\n    var Lo = lighting.ambient.rgb * albedo;\r\n    for (var i = 0u; i < lighting.lightCount; i++) {\r\n        let light = lighting.lights[i];\r\n        var L: vec3f;\r\n        var attenuation: f32 = 1.0;\r\n        if (light.position.w == 0.0) {\r\n            L = normalize(-light.position.xyz);\r\n        } else {\r\n            let lightDir = light.position.xyz - in.worldPos;\r\n            let distance = length(lightDir);\r\n            L = normalize(lightDir);\r\n            attenuation = 1.0 / (distance * distance);\r\n        }\r\n        let H = normalize(V + L);\r\n        let radiance = light.color.rgb * light.color.a * attenuation;\r\n        let NDF = distributionGGX(N, H, roughness);\r\n        let G = geometrySmith(N, V, L, roughness);\r\n        let F = fresnelSchlick(max(dot(H, V), 0.0), F0);\r\n        let numerator = NDF * G * F;\r\n        let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;\r\n        let specular = numerator / denominator;\r\n        let kS = F;\r\n        let kD = (1.0 - kS) * (1.0 - metallic);\r\n        let NdotL = max(dot(N, L), 0.0);\r\n        Lo += (kD * albedo / PI + specular) * radiance * NdotL;\r\n    }\r\n    Lo += material.emissive.rgb * emissiveIntensity;\r\n    Lo = Lo / (Lo + vec3f(1.0));\r\n    Lo = pow(Lo, vec3f(1.0 / 2.2));\r\n    return vec4f(Lo, material.color.a);\r\n}\r\n";

// src/shaders/custom-default-vertex.wgsl
var custom_default_vertex_default = "struct VertexInput {\r\n    @location(0) position: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f\r\n};\r\n\r\nstruct VertexOutput {\r\n    @builtin(position) position: vec4f,\r\n    @location(0) worldPos: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f\r\n};\r\n\r\nstruct CameraUniforms {\r\n    viewProjection: mat4x4f,\r\n    position: vec3f\r\n};\r\n\r\nstruct ModelUniforms {\r\n    model: mat4x4f,\r\n    normalMatrix: mat4x4f\r\n};\r\n\r\n@group(0) @binding(0) var<uniform> camera: CameraUniforms;\r\n@group(0) @binding(1) var<uniform> model: ModelUniforms;\r\n\r\n@vertex\r\nfn vs_main(in: VertexInput) -> VertexOutput {\r\n    var out: VertexOutput;\r\n    let worldPos = model.model * vec4f(in.position, 1.0);\r\n    out.position = camera.viewProjection * worldPos;\r\n    out.worldPos = worldPos.xyz;\r\n    out.normal = normalize((model.normalMatrix * vec4f(in.normal, 0.0)).xyz);\r\n    out.uv = in.uv;\r\n    return out;\r\n}\r\n";

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
  constructor(descriptor = {}) {
    this.pipeline = null;
    this.bindGroup = null;
    this.uniformBuffer = null;
    this._dirty = true;
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
  destroy() {
    this.uniformBuffer?.destroy();
    this.uniformBuffer = null;
    this.bindGroup = null;
    this.pipeline = null;
  }
};
var UnlitMaterial = class extends Material {
  constructor(descriptor = {}) {
    super({
      ...descriptor,
      blendMode: descriptor.opacity !== void 0 && descriptor.opacity < 1 ? "transparent" /* Transparent */ : descriptor.blendMode
    });
    this._color = descriptor.color ?? [1, 1, 1];
    this._opacity = descriptor.opacity ?? 1;
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
  getUniformBufferSize() {
    return 32;
  }
  getUniformData() {
    return new Float32Array([
      this._color[0],
      this._color[1],
      this._color[2],
      this._opacity,
      0,
      0,
      0,
      0
    ]);
  }
  createBindGroupLayout(device) {
    return device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" }
        }
      ]
    });
  }
  getShaderCode(instanced = false) {
    if (!instanced) return unlit_default;
    return unlit_instanced_default;
  }
};
var StandardMaterial = class extends Material {
  constructor(descriptor = {}) {
    super({
      ...descriptor,
      blendMode: descriptor.opacity !== void 0 && descriptor.opacity < 1 ? "transparent" /* Transparent */ : descriptor.blendMode
    });
    this._color = descriptor.color ?? [1, 1, 1];
    this._opacity = descriptor.opacity ?? 1;
    this._metallic = descriptor.metallic ?? 0;
    this._roughness = descriptor.roughness ?? 0.5;
    this._emissive = descriptor.emissive ?? [0, 0, 0];
    this._emissiveIntensity = descriptor.emissiveIntensity ?? 1;
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
  getUniformBufferSize() {
    return 48;
  }
  getUniformData() {
    return new Float32Array([
      this._color[0],
      this._color[1],
      this._color[2],
      this._opacity,
      this._emissive[0],
      this._emissive[1],
      this._emissive[2],
      0,
      this._metallic,
      this._roughness,
      this._emissiveIntensity,
      0
    ]);
  }
  createBindGroupLayout(device) {
    return device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" }
        }
      ]
    });
  }
  getShaderCode(instanced = false) {
    if (!instanced) return standard_default;
    return standard_instanced_default;
  }
};
var CustomMaterial = class extends Material {
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
  getUniformBufferSize() {
    let size = 0;
    for (const uniform of Object.values(this._uniforms)) size += this.getUniformSize(uniform.type);
    return Math.ceil(size / 16) * 16 || 16;
  }
  getUniformData() {
    const data = [];
    for (const uniform of Object.values(this._uniforms)) {
      if (typeof uniform.value === "number") data.push(uniform.value);
      else data.push(...uniform.value);
    }
    const floatCount = this.getUniformBufferSize() / 4;
    while (data.length < floatCount) data.push(0);
    return new Float32Array(data);
  }
  createBindGroupLayout(device) {
    return device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" }
        }
      ]
    });
  }
  defaultVertexShader() {
    return custom_default_vertex_default;
  }
  getShaderCode(_instanced = false) {
    let uniformStruct = "struct CustomUniforms {\n";
    for (const [name, def] of Object.entries(this._uniforms)) uniformStruct += `    ${name}: ${def.type},
`;
    uniformStruct += "};\n\n@group(1) @binding(0) var<uniform> custom: CustomUniforms;\n\n";
    return this._vertexShader + "\n" + uniformStruct + this._fragmentShader;
  }
};

// src/utils/index.ts
var alignTo = (n, alignment) => {
  return Math.ceil(n / alignment) * alignment;
};
var createBuffer = (device, data, usage) => {
  const buffer = device.createBuffer({ size: alignTo(data.byteLength, 4), usage, mappedAtCreation: true });
  new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  buffer.unmap();
  return buffer;
};
var createDepthTexture = (device, width, height) => {
  return device.createTexture({
    size: { width, height, depthOrArrayLayers: 1 },
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  });
};

// src/core/renderer.ts
var Renderer = class _Renderer {
  constructor(canvas) {
    this.width = 0;
    this.height = 0;
    this.globalBindGroups = [];
    this.modelUniformBuffers = [];
    this.modelBufferIndex = 0;
    this.MODEL_BUFFER_POOL_SIZE = 64;
    this.instanceBuffer = null;
    this.instanceBufferCapacityBytes = 0;
    this.INSTANCE_STRIDE_BYTES = 128;
    this.pipelineCache = /* @__PURE__ */ new Map();
    this.shaderCache = /* @__PURE__ */ new Map();
    this.drawItemPool = [];
    this.drawItemPoolUsed = 0;
    this.opaqueDrawList = [];
    this.transparentDrawList = [];
    this.objectIds = /* @__PURE__ */ new WeakMap();
    this.nextObjectId = 1;
    this._wasmBuffer = null;
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
    this.device = await adapter.requestDevice();
    this.queue = this.device.queue;
    this.context = this.canvas.getContext("webgpu");
    if (!this.context) throw new Error("Failed to get WebGPU canvas context.");
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.createGlobalBindGroupLayout();
    this.createUniformBuffers();
    this.resize();
  }
  get gpu() {
    return {
      device: this.device,
      queue: this.queue,
      format: this.format
    };
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
  }
  get aspectRatio() {
    return this.width / this.height;
  }
  refreshWasmStagingViews() {
    const buf = wasm.memory().buffer;
    if (this._wasmBuffer === buf) return;
    this._wasmBuffer = buf;
    this.cameraUniformStagingView = wasm.f32view(this.cameraUniformStagingPtr, 20);
    this.lightingUniformStagingView = wasm.f32view(this.lightingUniformStagingPtr, 104);
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
        geometryId: 0
      };
      this.drawItemPool[i] = item;
    }
    return item;
  }
  render(scene, camera) {
    this.resize();
    this.modelBufferIndex = 0;
    this.cameraUniformStagingPtr = frameArena.allocF32(20);
    this.lightingUniformStagingPtr = frameArena.allocF32(104);
    this.modelUniformStagingPtr = frameArena.allocF32(32);
    this._wasmBuffer = null;
    if ("aspect" in camera) camera.aspect = this.aspectRatio;
    const colorTexture = this.context.getCurrentTexture();
    const colorView = colorTexture.createView();
    Transform.updateAll();
    this.writeCameraUniforms(camera);
    this.writeLightingUniforms(scene);
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: colorView,
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
      }
    });
    this.buildDrawLists(scene);
    this.executeDrawList(pass, this.opaqueDrawList);
    this.executeDrawList(pass, this.transparentDrawList);
    pass.end();
    this.queue.submit([encoder.finish()]);
  }
  destroy() {
    this.depthTexture?.destroy();
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
  writeCameraUniforms(camera) {
    const viewProj = camera.viewProjectionMatrix;
    const pos = camera.position;
    this.refreshWasmStagingViews();
    const data = this.cameraUniformStagingView;
    data.set(viewProj, 0);
    data.set(pos, 16);
    this.queue.writeBuffer(this.cameraUniformBuffer, 0, data);
  }
  writeLightingUniforms(scene) {
    const { ambient, lights } = scene.getLightingData();
    this.refreshWasmStagingViews();
    const data = this.lightingUniformStagingView;
    data[0] = ambient[0];
    data[1] = ambient[1];
    data[2] = ambient[2];
    data[3] = 1;
    const countView = new Uint32Array(data.buffer, data.byteOffset + 16, 1);
    countView[0] = lights.length;
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
  buildDrawLists(scene) {
    this.drawItemPoolUsed = 0;
    this.opaqueDrawList.length = 0;
    this.transparentDrawList.length = 0;
    for (const mesh of scene.meshes) {
      if (!mesh.visible) continue;
      const geometry = mesh.geometry;
      const material = mesh.material;
      const pipeline = this.getOrCreatePipeline(material);
      const item = this.acquireDrawItem();
      item.mesh = mesh;
      item.geometry = geometry;
      item.material = material;
      item.pipeline = pipeline;
      item.pipelineId = this.getObjectId(pipeline);
      item.materialId = this.getObjectId(material);
      item.geometryId = this.getObjectId(geometry);
      if (material.blendMode === "opaque" /* Opaque */) this.opaqueDrawList.push(item);
      else this.transparentDrawList.push(item);
    }
    this.opaqueDrawList.sort((a, b) => a.pipelineId - b.pipelineId || a.materialId - b.materialId || a.geometryId - b.geometryId);
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
        if (geometry.isIndexed) pass.setIndexBuffer(geometry.indexBuffer, "uint32");
        lastGeometry = geometry;
      }
      const canInstance = runCount > 1 && this.materialSupportsInstancing(material) && items === this.opaqueDrawList;
      if (canInstance) {
        const instancedPipeline = this.getOrCreatePipeline(material, true);
        if (instancedPipeline !== lastPipeline) {
          pass.setPipeline(instancedPipeline);
          lastPipeline = instancedPipeline;
        }
        this.drawInstancedRun(pass, geometry, material, items, i, runCount);
      } else {
        for (let k = i; k < j; k++) {
          if (this.modelBufferIndex >= this.MODEL_BUFFER_POOL_SIZE) {
            console.warn("Model buffer pool exhausted! Increase MODEL_BUFFER_POOL_SIZE.");
            return;
          }
          const modelSlot = this.modelBufferIndex++;
          const modelBuffer = this.modelUniformBuffers[modelSlot];
          const globalBindGroup = this.globalBindGroups[modelSlot];
          const mesh = items[k].mesh;
          const modelPtr = mesh.transform.worldMatrixPtr;
          const invPtr = this.modelUniformStagingPtr;
          const normalPtr = this.modelUniformStagingPtr + 16 * 4;
          mat4f.invert(invPtr, modelPtr);
          mat4f.transpose(normalPtr, invPtr);
          const mem = wasm.memory().buffer;
          this.queue.writeBuffer(modelBuffer, 0, mem, modelPtr, 16 * 4);
          this.queue.writeBuffer(modelBuffer, 16 * 4, mem, normalPtr, 16 * 4);
          pass.setBindGroup(0, globalBindGroup);
          if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount);
          else pass.draw(geometry.vertexCount);
        }
      }
      i = j;
    }
  }
  drawInstancedRun(pass, geometry, material, items, start, count) {
    const ptrsPtr = frameArena.allocF32(count);
    const ptrs = wasm.u32view(ptrsPtr, count);
    for (let i = 0; i < count; i++) ptrs[i] = items[start + i].mesh.transform.worldMatrixPtr >>> 0;
    const outPtr = frameArena.allocF32(count * 32);
    transformf.packModelNormalMat4FromPtrs(outPtr, ptrsPtr, count);
    const outBytes = count * this.INSTANCE_STRIDE_BYTES;
    this.ensureInstanceBuffer(outBytes);
    const mem = wasm.memory().buffer;
    this.queue.writeBuffer(this.instanceBuffer, 0, mem, outPtr, outBytes);
    pass.setBindGroup(0, this.globalBindGroups[0]);
    pass.setVertexBuffer(3, this.instanceBuffer);
    if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, count);
    else pass.draw(geometry.vertexCount, count);
  }
  getOrCreatePipeline(material, instanced = false) {
    const key = this.getPipelineCacheKey(material, instanced);
    let pipeline = this.pipelineCache.get(key);
    if (pipeline) return pipeline;
    const shaderCode = material.getShaderCode(instanced);
    let shaderModule = this.shaderCache.get(shaderCode);
    if (!shaderModule) {
      shaderModule = this.device.createShaderModule({ code: shaderCode });
      this.shaderCache.set(shaderCode, shaderModule);
    }
    const materialBindGroupLayout = material.createBindGroupLayout(this.device);
    const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.globalBindGroupLayout, materialBindGroupLayout] });
    pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: instanced ? [
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
        ] : [
          { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
          { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
          { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] }
        ]
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
  getPipelineCacheKey(material, instanced) {
    return `${material.constructor.name}_${material.blendMode}_${material.cullMode}_${material.depthWrite}_${material.depthTest}_${instanced ? "inst" : "mesh"}`;
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
  ensureMaterialBindGroup(material) {
    if (!material.uniformBuffer) {
      material.uniformBuffer = this.device.createBuffer({ size: material.getUniformBufferSize(), usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    }
    if (material.dirty) {
      const data = material.getUniformData();
      this.queue.writeBuffer(material.uniformBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
      material.markClean();
    }
    if (!material.bindGroup) {
      const layout = material.createBindGroupLayout(this.device);
      material.bindGroup = this.device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: material.uniformBuffer } }] });
    }
  }
  materialSupportsInstancing(material) {
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
};

// src/world/camera.ts
var Camera = class {
  constructor(type) {
    this._projectionMatrix = null;
    this._viewMatrix = null;
    this._viewProjectionMatrix = null;
    this._projectionDirty = true;
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
    this._fov = value;
    this.markProjectionDirty();
  }
  get aspect() {
    return this._aspect;
  }
  set aspect(value) {
    this._aspect = value;
    this.markProjectionDirty();
  }
  get near() {
    return this._near;
  }
  set near(value) {
    this._near = value;
    this.markProjectionDirty();
  }
  get far() {
    return this._far;
  }
  set far(value) {
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
    this._left = value;
    this.markProjectionDirty();
  }
  get right() {
    return this._right;
  }
  set right(value) {
    this._right = value;
    this.markProjectionDirty();
  }
  get top() {
    return this._top;
  }
  set top(value) {
    this._top = value;
    this.markProjectionDirty();
  }
  get bottom() {
    return this._bottom;
  }
  set bottom(value) {
    this._bottom = value;
    this.markProjectionDirty();
  }
  get near() {
    return this._near;
  }
  set near(value) {
    this._near = value;
    this.markProjectionDirty();
  }
  get far() {
    return this._far;
  }
  set far(value) {
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

// src/world/mesh.ts
var Mesh = class _Mesh {
  constructor(geometry, material) {
    this._visible = true;
    this._castShadow = true;
    this._receiveShadow = true;
    this.name = "";
    this.userData = {};
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

// src/graphics/geometry.ts
var Geometry = class _Geometry {
  constructor(descriptor) {
    this._positionBuffer = null;
    this._normalBuffer = null;
    this._uvBuffer = null;
    this._indexBuffer = null;
    this._device = null;
    this.positions = descriptor.positions;
    this.vertexCount = this.positions.length / 3;
    this.normals = descriptor.normals ?? new Float32Array(this.vertexCount * 3).fill(0);
    if (!descriptor.normals) for (let i = 1; i < this.normals.length; i += 3) this.normals[i] = 1;
    this.uvs = descriptor.uvs ?? new Float32Array(this.vertexCount * 2);
    this.indices = descriptor.indices ?? null;
    this.indexCount = this.indices?.length ?? this.vertexCount;
  }
  upload(device) {
    if (this._device === device) return;
    this._device = device;
    this._positionBuffer = createBuffer(device, this.positions, GPUBufferUsage.VERTEX);
    this._normalBuffer = createBuffer(device, this.normals, GPUBufferUsage.VERTEX);
    this._uvBuffer = createBuffer(device, this.uvs, GPUBufferUsage.VERTEX);
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
  get indexBuffer() {
    return this._indexBuffer;
  }
  get isIndexed() {
    return this._indexBuffer !== null;
  }
  destroy() {
    this._positionBuffer?.destroy();
    this._normalBuffer?.destroy();
    this._uvBuffer?.destroy();
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

// src/core/engine.ts
var WasmGPU = class _WasmGPU {
  constructor(renderer) {
    this._isRunning = false;
    this._lastTime = 0;
    this._frameCallback = null;
    this._animationFrameId = null;
    this.createCamera = {
      perspective: (options) => {
        return new PerspectiveCamera(options);
      },
      orthographic: (options) => {
        return new OrthographicCamera(options);
      }
    };
    this.geometry = {
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
    this.material = {
      unlit: (options) => {
        return new UnlitMaterial(options);
      },
      standard: (options) => {
        return new StandardMaterial(options);
      },
      custom: (options) => {
        return new CustomMaterial(options);
      }
    };
    this.createLight = {
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
    this.renderer = renderer;
  }
  static async create(canvas, descriptor = {}) {
    await initMath();
    const renderer = await Renderer.create(canvas, descriptor);
    return new _WasmGPU(renderer);
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
      this._frameCallback?.(dt, now / 1e3, this);
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
  get isRunning() {
    return this._isRunning;
  }
  render(scene, camera) {
    if (!this._isRunning) frameArena.reset();
    this.renderer.render(scene, camera);
  }
  createScene(background) {
    return new Scene({ background });
  }
  createMesh(geometry, material) {
    return new Mesh(geometry, material);
  }
  get gpu() {
    return this.renderer.gpu;
  }
  destroy() {
    this.stop();
    this.renderer.destroy();
  }
};
export {
  AmbientLight,
  BlendMode,
  Camera,
  CullMode,
  CustomMaterial,
  DirectionalLight,
  Geometry,
  Light,
  Material,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PointLight,
  Renderer,
  Scene,
  StandardMaterial,
  Transform,
  UnlitMaterial,
  WasmGPU,
  WasmGPU as default,
  initMath,
  mat4,
  quat,
  vec3
};
