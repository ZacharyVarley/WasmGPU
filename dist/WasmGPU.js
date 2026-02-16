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
var initWebAssembly = async (baseURL) => {
  if (mod) return;
  const base = baseURL ?? defaultBaseURL();
  const wasmURL = new URL("wasm.js", base).toString();
  modPromise ??= import(wasmURL);
  mod = await modPromise;
  mod.wasmgpu_frame_arena_init(DEFAULT_FRAME_ARENA_BYTES);
};
var ensure = () => {
  if (!mod) throw new Error("WebAssembly driver not initialized. Call await initWebAssembly() first.");
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
  allocU32: (len) => ensure().wasmgpu_alloc_u32(len >>> 0) >>> 0,
  freeU32: (ptr, len) => ensure().wasmgpu_free_u32(ptr >>> 0, len >>> 0),
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

// src/wgsl/unlit.wgsl
var unlit_default = "struct MaterialUniforms {\r\n    color: vec4f,\r\n    params: vec4f\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> material: MaterialUniforms;\r\n@group(1) @binding(1) var baseSampler: sampler;\r\n@group(1) @binding(2) var baseTex: texture_2d<f32>;\r\n\r\nstruct VertexInput {\r\n    @location(0) position: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f\r\n};\r\n\r\nstruct VertexOutput {\r\n    @builtin(position) position: vec4f,\r\n    @location(0) normal: vec3f,\r\n    @location(1) uv: vec2f\r\n};\r\n\r\nstruct CameraUniforms {\r\n    viewProjection: mat4x4f,\r\n    position: vec3f\r\n};\r\n\r\nstruct ModelUniforms {\r\n    model: mat4x4f,\r\n    normalMatrix: mat4x4f\r\n};\r\n\r\n@group(0) @binding(0) var<uniform> camera: CameraUniforms;\r\n@group(0) @binding(1) var<uniform> model: ModelUniforms;\r\n\r\nfn linearToSrgb(c: vec3f) -> vec3f {\r\n    return pow(c, vec3f(1.0 / 2.2));\r\n}\r\n\r\n@vertex\r\nfn vs_main(in: VertexInput) -> VertexOutput {\r\n    var out: VertexOutput;\r\n    out.position = camera.viewProjection * model.model * vec4f(in.position, 1.0);\r\n    out.normal = (model.normalMatrix * vec4f(in.normal, 0.0)).xyz;\r\n    out.uv = in.uv;\r\n    return out;\r\n}\r\n\r\n@fragment\r\nfn fs_main(in: VertexOutput) -> @location(0) vec4f {\r\n    let texColor = textureSample(baseTex, baseSampler, in.uv);\r\n    var outColor = material.color * texColor;\r\n    let alphaCutoff = material.params.x;\r\n    if (alphaCutoff > 0.0 && outColor.a < alphaCutoff) {\r\n        discard;\r\n    }\r\n    outColor.rgb = linearToSrgb(outColor.rgb);\r\n    return outColor;\r\n}\r\n";

// src/wgsl/unlit-instanced.wgsl
var unlit_instanced_default = "struct MaterialUniforms {\r\n    color: vec4f,\r\n    params: vec4f\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> material: MaterialUniforms;\r\n@group(1) @binding(1) var baseSampler: sampler;\r\n@group(1) @binding(2) var baseTex: texture_2d<f32>;\r\n\r\nstruct VertexInput {\r\n    @location(0) position: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f,\r\n    @location(3) m0: vec4f,\r\n    @location(4) m1: vec4f,\r\n    @location(5) m2: vec4f,\r\n    @location(6) m3: vec4f,\r\n    @location(7) n0: vec4f,\r\n    @location(8) n1: vec4f,\r\n    @location(9) n2: vec4f,\r\n    @location(10) n3: vec4f\r\n};\r\n\r\nstruct VertexOutput {\r\n    @builtin(position) position: vec4f,\r\n    @location(0) normal: vec3f,\r\n    @location(1) uv: vec2f\r\n};\r\n\r\nstruct CameraUniforms {\r\n    viewProjection: mat4x4f,\r\n    position: vec3f\r\n};\r\n\r\n@group(0) @binding(0) var<uniform> camera: CameraUniforms;\r\n\r\nfn linearToSrgb(c: vec3f) -> vec3f {\r\n    return pow(c, vec3f(1.0 / 2.2));\r\n}\r\n\r\n@vertex\r\nfn vs_main(in: VertexInput) -> VertexOutput {\r\n    var out: VertexOutput;\r\n    let modelM = mat4x4f(in.m0, in.m1, in.m2, in.m3);\r\n    let normalM = mat4x4f(in.n0, in.n1, in.n2, in.n3);\r\n    out.position = camera.viewProjection * modelM * vec4f(in.position, 1.0);\r\n    out.normal = (normalM * vec4f(in.normal, 0.0)).xyz;\r\n    out.uv = in.uv;\r\n    return out;\r\n}\r\n\r\n@fragment\r\nfn fs_main(in: VertexOutput) -> @location(0) vec4f {\r\n    let texColor = textureSample(baseTex, baseSampler, in.uv);\r\n    var outColor = material.color * texColor;\r\n    let alphaCutoff = material.params.x;\r\n    if (alphaCutoff > 0.0 && outColor.a < alphaCutoff) {\r\n        discard;\r\n    }\r\n    outColor.rgb = linearToSrgb(outColor.rgb);\r\n    return outColor;\r\n}\r\n";

// src/wgsl/unlit-skinned.wgsl
var unlit_skinned_default = "struct MaterialUniforms {\r\n    color: vec4<f32>\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> material: MaterialUniforms;\r\n@group(1) @binding(1) var baseColorSampler: sampler;\r\n@group(1) @binding(2) var baseColorTexture: texture_2d<f32>;\r\n\r\nstruct VertexInput {\r\n    @location(0) position: vec3<f32>,\r\n    @location(1) normal: vec3<f32>,\r\n    @location(2) uv: vec2<f32>,\r\n    @location(3) joints: vec4<u32>,\r\n    @location(4) weights: vec4<f32>\r\n};\r\n\r\nstruct VertexOutput {\r\n    @builtin(position) position: vec4<f32>,\r\n    @location(0) uv: vec2<f32>\r\n};\r\n\r\nstruct CameraUniforms {\r\n    viewProjection: mat4x4<f32>,\r\n    position: vec4<f32>\r\n};\r\n\r\nstruct ModelUniforms {\r\n    model: mat4x4<f32>,\r\n    normalMatrix: mat4x4<f32>\r\n};\r\n\r\n@group(0) @binding(0) var<uniform> camera: CameraUniforms;\r\n@group(0) @binding(1) var<uniform> model: ModelUniforms;\r\n\r\nstruct SkinBuffer {\r\n    joints: array<mat4x4<f32>>,\r\n};\r\n\r\n@group(2) @binding(0) var<storage, read> skin: SkinBuffer;\r\n\r\n@vertex\r\nfn vs_main(in: VertexInput) -> VertexOutput {\r\n    var out: VertexOutput;\r\n    let j = in.joints;\r\n    let w = in.weights;\r\n    let m = skin.joints[j.x] * w.x + skin.joints[j.y] * w.y + skin.joints[j.z] * w.z + skin.joints[j.w] * w.w;\r\n    let localPos = m * vec4<f32>(in.position, 1.0);\r\n    out.position = camera.viewProjection * model.model * localPos;\r\n    out.uv = in.uv;\r\n    return out;\r\n}\r\n\r\n@fragment\r\nfn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {\r\n    let baseColorSample = textureSample(baseColorTexture, baseColorSampler, in.uv);\r\n    return material.color * baseColorSample;\r\n}\r\n";

// src/wgsl/standard.wgsl
var standard_default = "struct MaterialUniforms {\r\n    color: vec4f,\r\n    emissive: vec4f,\r\n    params: vec4f,\r\n    params2: vec4f\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> material: MaterialUniforms;\r\n@group(1) @binding(1) var baseColorSampler: sampler;\r\n@group(1) @binding(2) var baseColorTex: texture_2d<f32>;\r\n@group(1) @binding(3) var metallicRoughnessSampler: sampler;\r\n@group(1) @binding(4) var metallicRoughnessTex: texture_2d<f32>;\r\n@group(1) @binding(5) var normalSampler: sampler;\r\n@group(1) @binding(6) var normalTex: texture_2d<f32>;\r\n@group(1) @binding(7) var occlusionSampler: sampler;\r\n@group(1) @binding(8) var occlusionTex: texture_2d<f32>;\r\n@group(1) @binding(9) var emissiveSampler: sampler;\r\n@group(1) @binding(10) var emissiveTex: texture_2d<f32>;\r\n\r\nstruct VertexInput {\r\n    @location(0) position: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f\r\n};\r\n\r\nstruct VertexOutput {\r\n    @builtin(position) position: vec4f,\r\n    @location(0) worldPos: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f\r\n};\r\n\r\nstruct CameraUniforms {\r\n    viewProjection: mat4x4f,\r\n    position: vec3f\r\n};\r\n\r\nstruct ModelUniforms {\r\n    model: mat4x4f,\r\n    normalMatrix: mat4x4f\r\n};\r\n\r\nstruct Light {\r\n    position: vec4f,\r\n    color: vec4f,\r\n    params: vec4f\r\n};\r\n\r\nstruct LightingUniforms {\r\n    ambient: vec4f,\r\n    lightCount: u32,\r\n    _pad0: u32,\r\n    _pad1: u32,\r\n    _pad2: u32,\r\n    lights: array<Light, 8>\r\n};\r\n\r\n@group(0) @binding(0) var<uniform> camera: CameraUniforms;\r\n@group(0) @binding(1) var<uniform> model: ModelUniforms;\r\n@group(0) @binding(2) var<uniform> lighting: LightingUniforms;\r\n\r\nconst PI: f32 = 3.14159265359;\r\n\r\n@vertex\r\nfn vs_main(in: VertexInput) -> VertexOutput {\r\n    var out: VertexOutput;\r\n    let worldPos4 = model.model * vec4f(in.position, 1.0);\r\n    out.position = camera.viewProjection * worldPos4;\r\n    out.worldPos = worldPos4.xyz;\r\n    out.normal = normalize((model.normalMatrix * vec4f(in.normal, 0.0)).xyz);\r\n    out.uv = in.uv;\r\n    return out;\r\n}\r\n\r\nfn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f {\r\n    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);\r\n}\r\n\r\nfn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 {\r\n    let a = roughness * roughness;\r\n    let a2 = a * a;\r\n    let NdotH = max(dot(N, H), 0.0);\r\n    let NdotH2 = NdotH * NdotH;\r\n    let denom = NdotH2 * (a2 - 1.0) + 1.0;\r\n    return a2 / (PI * denom * denom);\r\n}\r\n\r\nfn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {\r\n    let r = roughness + 1.0;\r\n    let k = (r * r) / 8.0;\r\n    return NdotV / (NdotV * (1.0 - k) + k);\r\n}\r\n\r\nfn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 {\r\n    let NdotV = max(dot(N, V), 0.0);\r\n    let NdotL = max(dot(N, L), 0.0);\r\n    return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);\r\n}\r\n\r\nfn applyNormalMap(N: vec3f, worldPos: vec3f, uv: vec2f, normalSample: vec3f, normalScale: f32) -> vec3f {\r\n    let n = normalize(N);\r\n    let dp1 = dpdx(worldPos);\r\n    let dp2 = dpdy(worldPos);\r\n    let duv1 = dpdx(uv);\r\n    let duv2 = dpdy(uv);\r\n    let det = duv1.x * duv2.y - duv1.y * duv2.x;\r\n    if (abs(det) < 1e-6) {\r\n        return n;\r\n    }\r\n    let r = 1.0 / det;\r\n    var T = (dp1 * duv2.y - dp2 * duv1.y) * r;\r\n    T = normalize(T - n * dot(n, T));\r\n    let B = normalize(cross(n, T)) * sign(det);\r\n    let tbn = mat3x3f(T, B, n);\r\n    var ns = normalSample * 2.0 - vec3f(1.0);\r\n    ns = vec3f(ns.x * normalScale, ns.y * normalScale, ns.z);\r\n    return normalize(tbn * ns);\r\n}\r\n\r\n@fragment\r\nfn fs_main(in: VertexOutput) -> @location(0) vec4f {\r\n    let baseSample = textureSample(baseColorTex, baseColorSampler, in.uv);\r\n    let baseColor = material.color * baseSample;\r\n    let alphaCutoff = material.params2.x;\r\n    if (alphaCutoff > 0.0 && baseColor.a < alphaCutoff) {\r\n        discard;\r\n    }\r\n    let mrSample = textureSample(metallicRoughnessTex, metallicRoughnessSampler, in.uv);\r\n    let metallic = clamp(material.params.x * mrSample.b, 0.0, 1.0);\r\n    let roughness = clamp(material.params.y * mrSample.g, 0.04, 1.0);\r\n    let normalSample = textureSample(normalTex, normalSampler, in.uv).xyz;\r\n    let N = applyNormalMap(in.normal, in.worldPos, in.uv, normalSample, material.params.z);\r\n    let occlSample = textureSample(occlusionTex, occlusionSampler, in.uv).r;\r\n    let ao = 1.0 + material.params.w * (occlSample - 1.0);\r\n    let emissiveSample = textureSample(emissiveTex, emissiveSampler, in.uv).rgb;\r\n    let emissive = emissiveSample * material.emissive.rgb * material.emissive.a;\r\n    let albedo = baseColor.rgb;\r\n    let V = normalize(camera.position - in.worldPos);\r\n    let F0 = mix(vec3f(0.04), albedo, metallic);\r\n    var Lo = lighting.ambient.rgb * albedo * ao;\r\n    for (var i = 0u; i < lighting.lightCount; i++) {\r\n        let light = lighting.lights[i];\r\n        var L: vec3f;\r\n        var attenuation: f32 = 1.0;\r\n        if (light.position.w == 0.0) {\r\n            L = normalize(-light.position.xyz);\r\n        } else {\r\n            let lightDir = light.position.xyz - in.worldPos;\r\n            let distance = length(lightDir);\r\n            L = normalize(lightDir);\r\n            attenuation = 1.0 / (distance * distance);\r\n        }\r\n        let H = normalize(V + L);\r\n        let radiance = light.color.rgb * light.color.a * attenuation;\r\n        let NDF = distributionGGX(N, H, roughness);\r\n        let G = geometrySmith(N, V, L, roughness);\r\n        let F = fresnelSchlick(max(dot(H, V), 0.0), F0);\r\n        let numerator = NDF * G * F;\r\n        let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;\r\n        let specular = numerator / denominator;\r\n        let kS = F;\r\n        let kD = (1.0 - kS) * (1.0 - metallic);\r\n        let NdotL = max(dot(N, L), 0.0);\r\n        Lo += (kD * albedo / PI + specular) * radiance * NdotL;\r\n    }\r\n    Lo += emissive;\r\n    Lo = Lo / (Lo + vec3f(1.0));\r\n    Lo = pow(Lo, vec3f(1.0 / 2.2));\r\n    return vec4f(Lo, baseColor.a);\r\n}\r\n";

// src/wgsl/standard-instanced.wgsl
var standard_instanced_default = "struct MaterialUniforms {\r\n    color: vec4f,\r\n    emissive: vec4f,\r\n    params: vec4f,\r\n    params2: vec4f\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> material: MaterialUniforms;\r\n@group(1) @binding(1) var baseColorSampler: sampler;\r\n@group(1) @binding(2) var baseColorTex: texture_2d<f32>;\r\n@group(1) @binding(3) var metallicRoughnessSampler: sampler;\r\n@group(1) @binding(4) var metallicRoughnessTex: texture_2d<f32>;\r\n@group(1) @binding(5) var normalSampler: sampler;\r\n@group(1) @binding(6) var normalTex: texture_2d<f32>;\r\n@group(1) @binding(7) var occlusionSampler: sampler;\r\n@group(1) @binding(8) var occlusionTex: texture_2d<f32>;\r\n@group(1) @binding(9) var emissiveSampler: sampler;\r\n@group(1) @binding(10) var emissiveTex: texture_2d<f32>;\r\n\r\nstruct VertexInput {\r\n    @location(0) position: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f,\r\n    @location(3) m0: vec4f,\r\n    @location(4) m1: vec4f,\r\n    @location(5) m2: vec4f,\r\n    @location(6) m3: vec4f,\r\n    @location(7) n0: vec4f,\r\n    @location(8) n1: vec4f,\r\n    @location(9) n2: vec4f,\r\n    @location(10) n3: vec4f\r\n};\r\n\r\nstruct VertexOutput {\r\n    @builtin(position) position: vec4f,\r\n    @location(0) worldPos: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f\r\n};\r\n\r\nstruct CameraUniforms {\r\n    viewProjection: mat4x4f,\r\n    position: vec3f\r\n};\r\n\r\nstruct Light {\r\n    position: vec4f,\r\n    color: vec4f,\r\n    params: vec4f\r\n};\r\n\r\nstruct LightingUniforms {\r\n    ambient: vec4f,\r\n    lightCount: u32,\r\n    _pad0: u32,\r\n    _pad1: u32,\r\n    _pad2: u32,\r\n    lights: array<Light, 8>\r\n};\r\n\r\n@group(0) @binding(0) var<uniform> camera: CameraUniforms;\r\n@group(0) @binding(2) var<uniform> lighting: LightingUniforms;\r\n\r\nconst PI: f32 = 3.14159265359;\r\n\r\n@vertex\r\nfn vs_main(in: VertexInput) -> VertexOutput {\r\n    var out: VertexOutput;\r\n    let modelM = mat4x4f(in.m0, in.m1, in.m2, in.m3);\r\n    let normalM = mat4x4f(in.n0, in.n1, in.n2, in.n3);\r\n    let worldPos4 = modelM * vec4f(in.position, 1.0);\r\n    out.position = camera.viewProjection * worldPos4;\r\n    out.worldPos = worldPos4.xyz;\r\n    out.normal = normalize((normalM * vec4f(in.normal, 0.0)).xyz);\r\n    out.uv = in.uv;\r\n    return out;\r\n}\r\n\r\nfn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f {\r\n    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);\r\n}\r\n\r\nfn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 {\r\n    let a = roughness * roughness;\r\n    let a2 = a * a;\r\n    let NdotH = max(dot(N, H), 0.0);\r\n    let NdotH2 = NdotH * NdotH;\r\n    let denom = NdotH2 * (a2 - 1.0) + 1.0;\r\n    return a2 / (PI * denom * denom);\r\n}\r\n\r\nfn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {\r\n    let r = roughness + 1.0;\r\n    let k = (r * r) / 8.0;\r\n    return NdotV / (NdotV * (1.0 - k) + k);\r\n}\r\n\r\nfn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 {\r\n    let NdotV = max(dot(N, V), 0.0);\r\n    let NdotL = max(dot(N, L), 0.0);\r\n    return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);\r\n}\r\n\r\nfn applyNormalMap(N: vec3f, worldPos: vec3f, uv: vec2f, normalSample: vec3f, normalScale: f32) -> vec3f {\r\n    let n = normalize(N);\r\n    let dp1 = dpdx(worldPos);\r\n    let dp2 = dpdy(worldPos);\r\n    let duv1 = dpdx(uv);\r\n    let duv2 = dpdy(uv);\r\n    let det = duv1.x * duv2.y - duv1.y * duv2.x;\r\n    if (abs(det) < 1e-6) {\r\n        return n;\r\n    }\r\n    let r = 1.0 / det;\r\n    var T = (dp1 * duv2.y - dp2 * duv1.y) * r;\r\n    T = normalize(T - n * dot(n, T));\r\n    let B = normalize(cross(n, T)) * sign(det);\r\n    let tbn = mat3x3f(T, B, n);\r\n    var ns = normalSample * 2.0 - vec3f(1.0);\r\n    ns = vec3f(ns.x * normalScale, ns.y * normalScale, ns.z);\r\n    return normalize(tbn * ns);\r\n}\r\n\r\n@fragment\r\nfn fs_main(in: VertexOutput) -> @location(0) vec4f {\r\n    let baseSample = textureSample(baseColorTex, baseColorSampler, in.uv);\r\n    let baseColor = material.color * baseSample;\r\n    let alphaCutoff = material.params2.x;\r\n    if (alphaCutoff > 0.0 && baseColor.a < alphaCutoff) {\r\n        discard;\r\n    }\r\n    let mrSample = textureSample(metallicRoughnessTex, metallicRoughnessSampler, in.uv);\r\n    let metallic = clamp(material.params.x * mrSample.b, 0.0, 1.0);\r\n    let roughness = clamp(material.params.y * mrSample.g, 0.04, 1.0);\r\n    let normalSample = textureSample(normalTex, normalSampler, in.uv).xyz;\r\n    let N = applyNormalMap(in.normal, in.worldPos, in.uv, normalSample, material.params.z);\r\n    let occlSample = textureSample(occlusionTex, occlusionSampler, in.uv).r;\r\n    let ao = 1.0 + material.params.w * (occlSample - 1.0);\r\n    let emissiveSample = textureSample(emissiveTex, emissiveSampler, in.uv).rgb;\r\n    let emissive = emissiveSample * material.emissive.rgb * material.emissive.a;\r\n    let albedo = baseColor.rgb;\r\n    let V = normalize(camera.position - in.worldPos);\r\n    let F0 = mix(vec3f(0.04), albedo, metallic);\r\n    var Lo = lighting.ambient.rgb * albedo * ao;\r\n    for (var i = 0u; i < lighting.lightCount; i++) {\r\n        let light = lighting.lights[i];\r\n        var L: vec3f;\r\n        var attenuation: f32 = 1.0;\r\n        if (light.position.w == 0.0) {\r\n            L = normalize(-light.position.xyz);\r\n        } else {\r\n            let lightDir = light.position.xyz - in.worldPos;\r\n            let distance = length(lightDir);\r\n            L = normalize(lightDir);\r\n            attenuation = 1.0 / (distance * distance);\r\n        }\r\n        let H = normalize(V + L);\r\n        let radiance = light.color.rgb * light.color.a * attenuation;\r\n        let NDF = distributionGGX(N, H, roughness);\r\n        let G = geometrySmith(N, V, L, roughness);\r\n        let F = fresnelSchlick(max(dot(H, V), 0.0), F0);\r\n        let numerator = NDF * G * F;\r\n        let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;\r\n        let specular = numerator / denominator;\r\n        let kS = F;\r\n        let kD = (1.0 - kS) * (1.0 - metallic);\r\n        let NdotL = max(dot(N, L), 0.0);\r\n        Lo += (kD * albedo / PI + specular) * radiance * NdotL;\r\n    }\r\n    Lo += emissive;\r\n    Lo = Lo / (Lo + vec3f(1.0));\r\n    Lo = pow(Lo, vec3f(1.0 / 2.2));\r\n    return vec4f(Lo, baseColor.a);\r\n}\r\n";

// src/wgsl/standard-skinned.wgsl
var standard_skinned_default = "struct MaterialUniforms {\r\n    color: vec4f,\r\n    emissive: vec4f,\r\n    params: vec4f,\r\n    params2: vec4f\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> material: MaterialUniforms;\r\n@group(1) @binding(1) var baseColorSampler: sampler;\r\n@group(1) @binding(2) var baseColorTex: texture_2d<f32>;\r\n@group(1) @binding(3) var metallicRoughnessSampler: sampler;\r\n@group(1) @binding(4) var metallicRoughnessTex: texture_2d<f32>;\r\n@group(1) @binding(5) var normalSampler: sampler;\r\n@group(1) @binding(6) var normalTex: texture_2d<f32>;\r\n@group(1) @binding(7) var occlusionSampler: sampler;\r\n@group(1) @binding(8) var occlusionTex: texture_2d<f32>;\r\n@group(1) @binding(9) var emissiveSampler: sampler;\r\n@group(1) @binding(10) var emissiveTex: texture_2d<f32>;\r\n\r\nstruct VertexInput {\r\n    @location(0) position: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f,\r\n    @location(3) joints: vec4u,\r\n    @location(4) weights: vec4f\r\n};\r\n\r\nstruct VertexOutput {\r\n    @builtin(position) position: vec4f,\r\n    @location(0) worldPos: vec3f,\r\n    @location(1) normal: vec3f,\r\n    @location(2) uv: vec2f\r\n};\r\n\r\nstruct CameraUniforms {\r\n    viewProjection: mat4x4f,\r\n    position: vec3f\r\n};\r\n\r\nstruct ModelUniforms {\r\n    model: mat4x4f,\r\n    normalMatrix: mat4x4f\r\n};\r\n\r\nstruct Light {\r\n    position: vec4f,\r\n    color: vec4f,\r\n    params: vec4f\r\n};\r\n\r\nstruct LightingUniforms {\r\n    ambient: vec4f,\r\n    lightCount: u32,\r\n    _pad0: u32,\r\n    _pad1: u32,\r\n    _pad2: u32,\r\n    lights: array<Light, 8>\r\n};\r\n\r\n@group(0) @binding(0) var<uniform> camera: CameraUniforms;\r\n@group(0) @binding(1) var<uniform> model: ModelUniforms;\r\n@group(0) @binding(2) var<uniform> lighting: LightingUniforms;\r\n\r\nstruct SkinBuffer {\r\n    joints: array<mat4x4f>,\r\n};\r\n\r\n@group(2) @binding(0) var<storage, read> skin: SkinBuffer;\r\n\r\nconst PI: f32 = 3.14159265359;\r\n\r\n@vertex\r\nfn vs_main(in: VertexInput) -> VertexOutput {\r\n    var out: VertexOutput;\r\n    let j = in.joints;\r\n    let w = in.weights;\r\n    let skinMatrix = skin.joints[j.x] * w.x + \r\n                     skin.joints[j.y] * w.y + \r\n                     skin.joints[j.z] * w.z + \r\n                     skin.joints[j.w] * w.w;\r\n\r\n    let localPos = skinMatrix * vec4f(in.position, 1.0);\r\n    let localNormal = (skinMatrix * vec4f(in.normal, 0.0)).xyz;\r\n    let worldPos4 = model.model * localPos;\r\n    out.position = camera.viewProjection * worldPos4;\r\n    out.worldPos = worldPos4.xyz;\r\n    out.normal = normalize((model.normalMatrix * vec4f(localNormal, 0.0)).xyz);\r\n    out.uv = in.uv;\r\n    return out;\r\n}\r\n\r\nfn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f {\r\n    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);\r\n}\r\n\r\nfn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 {\r\n    let a = roughness * roughness;\r\n    let a2 = a * a;\r\n    let NdotH = max(dot(N, H), 0.0);\r\n    let NdotH2 = NdotH * NdotH;\r\n    let denom = NdotH2 * (a2 - 1.0) + 1.0;\r\n    return a2 / (PI * denom * denom);\r\n}\r\n\r\nfn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {\r\n    let r = roughness + 1.0;\r\n    let k = (r * r) / 8.0;\r\n    return NdotV / (NdotV * (1.0 - k) + k);\r\n}\r\n\r\nfn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 {\r\n    let NdotV = max(dot(N, V), 0.0);\r\n    let NdotL = max(dot(N, L), 0.0);\r\n    return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);\r\n}\r\n\r\nfn applyNormalMap(N: vec3f, worldPos: vec3f, uv: vec2f, normalSample: vec3f, normalScale: f32) -> vec3f {\r\n    let n = normalize(N);\r\n    let dp1 = dpdx(worldPos);\r\n    let dp2 = dpdy(worldPos);\r\n    let duv1 = dpdx(uv);\r\n    let duv2 = dpdy(uv);\r\n    let det = duv1.x * duv2.y - duv1.y * duv2.x;\r\n    if (abs(det) < 1e-6) {\r\n        return n;\r\n    }\r\n    let r = 1.0 / det;\r\n    var T = (dp1 * duv2.y - dp2 * duv1.y) * r;\r\n    T = normalize(T - n * dot(n, T));\r\n    let B = normalize(cross(n, T)) * sign(det);\r\n    let tbn = mat3x3f(T, B, n);\r\n    var ns = normalSample * 2.0 - vec3f(1.0);\r\n    ns = vec3f(ns.x * normalScale, ns.y * normalScale, ns.z);\r\n    return normalize(tbn * ns);\r\n}\r\n\r\n@fragment\r\nfn fs_main(in: VertexOutput) -> @location(0) vec4f {\r\n    let baseSample = textureSample(baseColorTex, baseColorSampler, in.uv);\r\n    let baseColor = material.color * baseSample;\r\n    let alphaCutoff = material.params2.x;\r\n    if (alphaCutoff > 0.0 && baseColor.a < alphaCutoff) {\r\n        discard;\r\n    }\r\n    let mrSample = textureSample(metallicRoughnessTex, metallicRoughnessSampler, in.uv);\r\n    let metallic = clamp(material.params.x * mrSample.b, 0.0, 1.0);\r\n    let roughness = clamp(material.params.y * mrSample.g, 0.04, 1.0);\r\n    let normalSample = textureSample(normalTex, normalSampler, in.uv).xyz;\r\n    let N = applyNormalMap(in.normal, in.worldPos, in.uv, normalSample, material.params.z);\r\n    let occlSample = textureSample(occlusionTex, occlusionSampler, in.uv).r;\r\n    let ao = 1.0 + material.params.w * (occlSample - 1.0);\r\n    let emissiveSample = textureSample(emissiveTex, emissiveSampler, in.uv).rgb;\r\n    let emissive = emissiveSample * material.emissive.rgb * material.emissive.a;\r\n    let albedo = baseColor.rgb;\r\n    let V = normalize(camera.position - in.worldPos);\r\n    let F0 = mix(vec3f(0.04), albedo, metallic);\r\n    var Lo = lighting.ambient.rgb * albedo * ao;\r\n    for (var i = 0u; i < lighting.lightCount; i++) {\r\n        let light = lighting.lights[i];\r\n        var L: vec3f;\r\n        var attenuation: f32 = 1.0;\r\n        if (light.position.w == 0.0) {\r\n            L = normalize(-light.position.xyz);\r\n        } else {\r\n            let lightDir = light.position.xyz - in.worldPos;\r\n            let distance = length(lightDir);\r\n            L = normalize(lightDir);\r\n            attenuation = 1.0 / (distance * distance);\r\n        }\r\n        let H = normalize(V + L);\r\n        let radiance = light.color.rgb * light.color.a * attenuation;\r\n        let NDF = distributionGGX(N, H, roughness);\r\n        let G = geometrySmith(N, V, L, roughness);\r\n        let F = fresnelSchlick(max(dot(H, V), 0.0), F0);\r\n        let numerator = NDF * G * F;\r\n        let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;\r\n        let specular = numerator / denominator;\r\n        let kS = F;\r\n        let kD = (1.0 - kS) * (1.0 - metallic);\r\n        let NdotL = max(dot(N, L), 0.0);\r\n        Lo += (kD * albedo / PI + specular) * radiance * NdotL;\r\n    }\r\n    Lo += emissive;\r\n    Lo = Lo / (Lo + vec3f(1.0));\r\n    Lo = pow(Lo, vec3f(1.0 / 2.2));\r\n    return vec4f(Lo, baseColor.a);\r\n}\r\n";

// src/wgsl/custom-default-vertex.wgsl
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
    this.bindGroupKey = null;
    this.uniformBuffer = null;
    this._uniformDataCache = null;
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
  static {
    this._cachedBindGroupLayout = null;
  }
  static {
    this._cachedLayoutDevice = null;
  }
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
    if (opts.skinned) return unlit_skinned_default;
    return unlit_default;
  }
};
var StandardMaterial = class _StandardMaterial extends Material {
  static {
    this._cachedBindGroupLayout = null;
  }
  static {
    this._cachedLayoutDevice = null;
  }
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
    if (opts.skinned) return standard_skinned_default;
    return standard_default;
  }
};
var CustomMaterial = class extends Material {
  constructor(descriptor) {
    super(descriptor);
    this._uniformLayout = null;
    this._cachedBindGroupLayout = null;
    this._cachedLayoutDevice = null;
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

// src/wgsl/smaa.wgsl
var smaa_default = "struct Params {\r\n    rtMetrics: vec4f,\r\n    threshold: f32,\r\n    _pad0: vec3f\r\n};\r\n\r\n@group(0) @binding(0) var<uniform> params: Params;\r\n@group(0) @binding(1) var sampLinear: sampler;\r\n@group(0) @binding(2) var sampPoint: sampler;\r\n@group(0) @binding(3) var sceneTex: texture_2d<f32>;\r\n@group(0) @binding(4) var edgesTex: texture_2d<f32>;\r\n@group(0) @binding(5) var blendTex: texture_2d<f32>;\r\n\r\nstruct VsOut {\r\n    @builtin(position) pos: vec4f,\r\n    @location(0) uv: vec2f\r\n};\r\n\r\n@vertex\r\nfn vs_fullscreen(@builtin(vertex_index) vi: u32) -> VsOut {\r\n    var positions = array<vec2f, 3>(\r\n        vec2f(-1.0, -1.0),\r\n        vec2f(3.0, -1.0),\r\n        vec2f(-1.0, 3.0)\r\n    );\r\n    var uvs = array<vec2f, 3>(\r\n        vec2f(0.0, 0.0),\r\n        vec2f(2.0, 0.0),\r\n        vec2f(0.0, 2.0)\r\n    );\r\n    var out: VsOut;\r\n    out.pos = vec4f(positions[vi], 0.0, 1.0);\r\n    out.uv = uvs[vi];\r\n    return out;\r\n}\r\n\r\nfn luma(rgb: vec3f) -> f32 {\r\n    return dot(rgb, vec3f(0.2126, 0.7152, 0.0722));\r\n}\r\n\r\n@fragment\r\nfn fs_smaa_edges(in: VsOut) -> @location(0) vec4f {\r\n    let t = params.rtMetrics.xy;\r\n    let c = textureSampleLevel(sceneTex, sampPoint, in.uv, 0.0).rgb;\r\n    let l = luma(c);\r\n    let lLeft = luma(textureSampleLevel(sceneTex, sampPoint, in.uv + vec2f(-t.x, 0.0), 0.0).rgb);\r\n    let lTop  = luma(textureSampleLevel(sceneTex, sampPoint, in.uv + vec2f(0.0, -t.y), 0.0).rgb);\r\n    let dLeft = abs(l - lLeft);\r\n    let dTop  = abs(l - lTop);\r\n    let eV = select(0.0, 1.0, dLeft >= params.threshold);\r\n    let eH = select(0.0, 1.0, dTop  >= params.threshold);\r\n    return vec4f(eV, eH, 0.0, 0.0);\r\n}\r\n\r\nfn edgeV(uv: vec2f) -> bool {\r\n    return textureSampleLevel(edgesTex, sampPoint, uv, 0.0).r > 0.5;\r\n}\r\n\r\nfn edgeH(uv: vec2f) -> bool {\r\n    return textureSampleLevel(edgesTex, sampPoint, uv, 0.0).g > 0.5;\r\n}\r\n\r\n@fragment\r\nfn fs_smaa_weights(in: VsOut) -> @location(0) vec4f {\r\n    let t = params.rtMetrics.xy;\r\n    let e = textureSampleLevel(edgesTex, sampPoint, in.uv, 0.0);\r\n    var wLeft: f32 = 0.0;\r\n    var wTop: f32 = 0.0;\r\n    if (e.r > 0.5) {\r\n        var up: i32 = 0;\r\n        var down: i32 = 0;\r\n        for (var s: i32 = 1; s <= 8; s = s + 1) {\r\n            if (!edgeV(in.uv + vec2f(0.0, -t.y * f32(s)))) {\r\n                break;\r\n            }\r\n            up = up + 1;\r\n        }\r\n        for (var s: i32 = 1; s <= 8; s = s + 1) {\r\n            if (!edgeV(in.uv + vec2f(0.0, t.y * f32(s)))) {\r\n                break;\r\n            }\r\n            down = down + 1;\r\n        }\r\n        let len = f32(up + down + 1);\r\n        wLeft = clamp(len / 17.0, 0.0, 1.0) * 0.5;\r\n    }\r\n    if (e.g > 0.5) {\r\n        var left: i32 = 0;\r\n        var right: i32 = 0;\r\n        for (var s: i32 = 1; s <= 8; s = s + 1) {\r\n            if (!edgeH(in.uv + vec2f(-t.x * f32(s), 0.0))) {\r\n                break;\r\n            }\r\n            left = left + 1;\r\n        }\r\n        for (var s: i32 = 1; s <= 8; s = s + 1) {\r\n            if (!edgeH(in.uv + vec2f(t.x * f32(s), 0.0))) {\r\n                break;\r\n            }\r\n            right = right + 1;\r\n        }\r\n        let len = f32(left + right + 1);\r\n        wTop = clamp(len / 17.0, 0.0, 1.0) * 0.5;\r\n    }\r\n    return vec4f(wLeft, wTop, 0.0, 0.0);\r\n}\r\n\r\n@fragment\r\nfn fs_smaa_neighborhood(in: VsOut) -> @location(0) vec4f {\r\n    let t = params.rtMetrics.xy;\r\n    let c = textureSampleLevel(sceneTex, sampLinear, in.uv, 0.0);\r\n    let w = textureSampleLevel(blendTex, sampPoint, in.uv, 0.0);\r\n    let wL = w.r;\r\n    let wT = w.g;\r\n    let wR = textureSampleLevel(blendTex, sampPoint, in.uv + vec2f(t.x, 0.0), 0.0).r;\r\n    let wB = textureSampleLevel(blendTex, sampPoint, in.uv + vec2f(0.0, t.y), 0.0).g;\r\n    var bestW: f32 = 0.0;\r\n    var dir: i32 = -1;\r\n    if (wL > bestW) {\r\n        bestW = wL; dir = 0;\r\n    }\r\n    if (wR > bestW) {\r\n        bestW = wR; dir = 1;\r\n    }\r\n    if (wT > bestW) {\r\n        bestW = wT; dir = 2;\r\n    }\r\n    if (wB > bestW) {\r\n        bestW = wB; dir = 3;\r\n    }\r\n    if (bestW <= 0.0) {\r\n        return c;\r\n    }\r\n    var n: vec4f = c;\r\n    if (dir == 0) {\r\n        n = textureSampleLevel(sceneTex, sampLinear, in.uv + vec2f(-t.x, 0.0), 0.0);\r\n    } else if (dir == 1) {\r\n        n = textureSampleLevel(sceneTex, sampLinear, in.uv + vec2f(t.x, 0.0), 0.0);\r\n    } else if (dir == 2) {\r\n        n = textureSampleLevel(sceneTex, sampLinear, in.uv + vec2f(0.0, -t.y), 0.0);\r\n    } else {\r\n        n = textureSampleLevel(sceneTex, sampLinear, in.uv + vec2f(0.0, t.y), 0.0);\r\n    }\r\n    return mix(c, n, bestW);\r\n}\r\n";

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
var createDepthTexture = (device, width, height, sampleCount = 1) => {
  return device.createTexture({
    size: { width, height, depthOrArrayLayers: 1 },
    format: "depth24plus",
    sampleCount,
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  });
};

// src/core/renderer.ts
var Renderer = class _Renderer {
  constructor(canvas) {
    this.width = 0;
    this.height = 0;
    this.smaaEnabled = false;
    this.smaaSceneColorTexture = null;
    this.smaaSceneColorView = null;
    this.smaaEdgesTexture = null;
    this.smaaEdgesView = null;
    this.smaaBlendTexture = null;
    this.smaaBlendView = null;
    this.smaaParamsBuffer = null;
    this.smaaSamplerPoint = null;
    this.smaaSamplerLinear = null;
    this.smaaShaderModule = null;
    this.smaaEdgePipeline = null;
    this.smaaWeightPipeline = null;
    this.smaaNeighborhoodPipeline = null;
    this.smaaEdgeBindGroupLayout = null;
    this.smaaWeightBindGroupLayout = null;
    this.smaaNeighborhoodBindGroupLayout = null;
    this.smaaEdgeBindGroup = null;
    this.smaaWeightBindGroup = null;
    this.smaaNeighborhoodBindGroup = null;
    this.globalBindGroups = [];
    this.modelUniformBuffers = [];
    this.modelBufferIndex = 0;
    this.MODEL_BUFFER_POOL_SIZE = 64;
    this.instanceBuffer = null;
    this.instanceBufferCapacityBytes = 0;
    this.instanceBufferOffset = 0;
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
    this.frustumCullingEnabled = true;
    this.frustumCullingStatsEnabled = false;
    this.cullingStats = { tested: 0, visible: 0 };
    this.cullCentersPtr = 0;
    this.cullRadiiPtr = 0;
    this.cullCapacity = 0;
    this.cullMeshScratch = [];
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
        sortKey: 0
      };
      this.drawItemPool[i] = item;
    }
    return item;
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
        }
      });
      this.buildDrawLists(scene, camera);
      this.executeDrawList(pass, this.opaqueDrawList);
      this.executeDrawList(pass, this.transparentDrawList);
      pass.end();
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
        }
      });
      this.buildDrawLists(scene, camera);
      this.executeDrawList(pass, this.opaqueDrawList);
      this.executeDrawList(pass, this.transparentDrawList);
      pass.end();
    }
    this.queue.submit([encoder.finish()]);
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
    this.cameraUniformStagingView[19] = 0;
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
    let visibleIndices = null;
    let visibleCount = count;
    const storeF32 = TransformStore.global().f32();
    const camWb = camera.transform.worldMatrixPtr >>> 2;
    const camX = storeF32[camWb + 12];
    const camY = storeF32[camWb + 13];
    const camZ = storeF32[camWb + 14];
    if (this.frustumCullingEnabled) {
      this.ensureCullingCapacity(count);
      const centers = wasm.f32view(this.cullCentersPtr, count * 3);
      const radii = wasm.f32view(this.cullRadiiPtr, count);
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
        const base = i * 3;
        centers[base + 0] = cx;
        centers[base + 1] = cy;
        centers[base + 2] = cz;
        const sx = Math.hypot(w0, w1, w2);
        const sy = Math.hypot(w4, w5, w6);
        const sz = Math.hypot(w8, w9, w10);
        const smax = Math.max(sx, sy, sz);
        radii[i] = lr * smax;
      }
      const frustumPtr = frameArena.allocF32(24);
      frustumf.writePlanesFromViewProjection(frustumPtr, this.cameraUniformStagingView);
      const outPtr = frameArena.alloc(count * 4, 4);
      visibleCount = cullf.spheresFrustum(outPtr, this.cullCentersPtr, this.cullRadiiPtr, count, frustumPtr);
      visibleIndices = wasm.u32view(outPtr, visibleCount);
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
        const pipeline = this.getOrCreatePipeline(material, false, skinned);
        const item = this.acquireDrawItem();
        item.mesh = mesh;
        item.geometry = geometry;
        item.material = material;
        item.pipeline = pipeline;
        item.pipelineId = this.getObjectId(pipeline);
        item.materialId = this.getObjectId(material);
        item.geometryId = this.getObjectId(geometry);
        item.skinned = skinned;
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
      const vis = visibleIndices;
      for (let k = 0; k < visibleCount; k++) {
        const i = vis[k];
        const mesh = candidates[i];
        const geometry = mesh.geometry;
        const material = mesh.material;
        const skinned = mesh.skin !== null && geometry.joints !== null && geometry.weights !== null && this.materialSupportsSkinning(material);
        const pipeline = this.getOrCreatePipeline(material, false, skinned);
        const item = this.acquireDrawItem();
        item.mesh = mesh;
        item.geometry = geometry;
        item.material = material;
        item.pipeline = pipeline;
        item.pipelineId = this.getObjectId(pipeline);
        item.materialId = this.getObjectId(material);
        item.geometryId = this.getObjectId(geometry);
        item.skinned = skinned;
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
          const mesh = items[k].mesh;
          const skin = first.skinned ? mesh.skin : null;
          if (skin) {
            skin.ensureGpuResources(this.device, this.skinBindGroupLayout);
            const jointCount = skin.jointCount | 0;
            const jointMatPtr = frameArena.allocF32(jointCount * 16);
            animf.computeJointMatricesTo(jointMatPtr, skin.skin.jointIndicesPtr, jointCount, skin.skin.invBindPtr, TransformStore.global().worldPtr, skin.meshTransform.worldMatrixPtr);
            this.queue.writeBuffer(skin.boneBuffer, 0, wasm.memory().buffer, jointMatPtr, jointCount * 64);
            pass.setBindGroup(2, skin.bindGroup);
          }
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
    const ptrsPtr = frameArena.alloc(count * 4, 4);
    const ptrs = wasm.u32view(ptrsPtr, count);
    for (let i = 0; i < count; i++) ptrs[i] = items[start + i].mesh.transform.worldMatrixPtr >>> 0;
    const outPtr = frameArena.allocF32(count * 32);
    transformf.packModelNormalMat4FromPtrs(outPtr, ptrsPtr, count);
    const outBytes = count * this.INSTANCE_STRIDE_BYTES;
    const dstOffset = this.instanceBufferOffset;
    const dstEnd = dstOffset + outBytes;
    this.ensureInstanceBuffer(dstEnd);
    const mem = wasm.memory().buffer;
    this.queue.writeBuffer(this.instanceBuffer, dstOffset, mem, outPtr, outBytes);
    pass.setBindGroup(0, this.globalBindGroups[0]);
    pass.setVertexBuffer(3, this.instanceBuffer, dstOffset, outBytes);
    if (geometry.isIndexed) pass.drawIndexed(geometry.indexCount, count);
    else pass.draw(geometry.vertexCount, count);
    this.instanceBufferOffset = dstEnd;
  }
  getOrCreatePipeline(material, instanced = false, skinned = false) {
    if (instanced && skinned) throw new Error("Renderer: instanced + skinned pipelines are not supported (attribute layout conflict).");
    const key = this.getPipelineCacheKey(material, instanced, skinned);
    let pipeline = this.pipelineCache.get(key);
    if (pipeline) return pipeline;
    const shaderCode = material.getShaderCode({ instanced, skinned });
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
  getPipelineCacheKey(material, instanced, skinned) {
    const ctorId = this.getObjectId(material.constructor);
    const isBuiltin = material.constructor === UnlitMaterial || material.constructor === StandardMaterial;
    const matKey = isBuiltin ? `${ctorId}` : `${ctorId}_${this.getObjectId(material)}`;
    return `${matKey}_${material.blendMode}_${material.cullMode}_${material.depthWrite}_${material.depthTest}_${instanced ? "inst" : "mesh"}_${skinned ? "skinned" : "noskin"}`;
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
      const t = material.baseColorTexture;
      return `unlit:${t?.id ?? 0}:${t?.revision ?? 0}`;
    }
    if (material instanceof StandardMaterial) {
      const bc = material.baseColorTexture;
      const mr = material.metallicRoughnessTexture;
      const n = material.normalTexture;
      const o = material.occlusionTexture;
      const e = material.emissiveTexture;
      return `standard:${bc?.id ?? 0}:${bc?.revision ?? 0}:${mr?.id ?? 0}:${mr?.revision ?? 0}:${n?.id ?? 0}:${n?.revision ?? 0}:${o?.id ?? 0}:${o?.revision ?? 0}:${e?.id ?? 0}:${e?.revision ?? 0}`;
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
      const bcSampler = bc ? bc.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler;
      const bcView = bc ? bc.getView(this.device, this.queue, "srgb", this.fallbackWhiteViewSrgb) : this.fallbackWhiteViewSrgb;
      const mrSampler = mr ? mr.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler;
      const mrView = mr ? mr.getView(this.device, this.queue, "linear", this.fallbackMRViewLinear) : this.fallbackMRViewLinear;
      const nSampler = n ? n.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler;
      const nView = n ? n.getView(this.device, this.queue, "linear", this.fallbackNormalViewLinear) : this.fallbackNormalViewLinear;
      const oSampler = o ? o.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler;
      const oView = o ? o.getView(this.device, this.queue, "linear", this.fallbackOcclusionViewLinear) : this.fallbackOcclusionViewLinear;
      const eSampler = e ? e.getSampler(this.device, this.fallbackSampler) : this.fallbackSampler;
      const eView = e ? e.getView(this.device, this.queue, "srgb", this.fallbackWhiteViewSrgb) : this.fallbackWhiteViewSrgb;
      material.bindGroup = this.device.createBindGroup({
        layout,
        entries: [
          { binding: 0, resource: { buffer: material.uniformBuffer } },
          { binding: 1, resource: bcSampler },
          { binding: 2, resource: bcView },
          { binding: 3, resource: mrSampler },
          { binding: 4, resource: mrView },
          { binding: 5, resource: nSampler },
          { binding: 6, resource: nView },
          { binding: 7, resource: oSampler },
          { binding: 8, resource: oView },
          { binding: 9, resource: eSampler },
          { binding: 10, resource: eView }
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
    this.skin = null;
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

// src/graphics/geometry.ts
var Geometry = class _Geometry {
  constructor(descriptor) {
    this._jointsBuffer = null;
    this._weightsBuffer = null;
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
  get indexBuffer() {
    return this._indexBuffer;
  }
  get isIndexed() {
    return this._indexBuffer !== null;
  }
  get isSkinned() {
    return this._jointsBuffer !== null && this._weightsBuffer !== null;
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
    this._jointsBuffer = null;
    this._weightsBuffer = null;
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

// src/wgsl/mipmap.wgsl
var mipmap_default = "@group(0) @binding(0) var samp: sampler;\r\n@group(0) @binding(1) var tex: texture_2d<f32>;\r\n\r\nstruct VSOut {\r\n    @builtin(position) pos: vec4f,\r\n    @location(0) uv: vec2f\r\n};\r\n\r\n@vertex\r\nfn vs_main(@builtin(vertex_index) idx: u32) -> VSOut {\r\n    var positions = array<vec2f, 3>(\r\n        vec2f(-1.0, -1.0),\r\n        vec2f( 3.0, -1.0),\r\n        vec2f(-1.0,  3.0)\r\n    );\r\n    var uvs = array<vec2f, 3>(\r\n        vec2f(0.0, 1.0),\r\n        vec2f(2.0, 1.0),\r\n        vec2f(0.0, -1.0)\r\n    );\r\n    var o: VSOut;\r\n    o.pos = vec4f(positions[idx], 0.0, 1.0);\r\n    o.uv = uvs[idx];\r\n    return o;\r\n}\r\n\r\n@fragment\r\nfn fs_main(in: VSOut) -> @location(0) vec4f {\r\n    return textureSample(tex, samp, in.uv);\r\n}\r\n";

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
  constructor(desc) {
    this.id = __texture2d_id++;
    this._mipmapColorSpace = null;
    this._gpuTexture = null;
    this._viewLinear = null;
    this._viewSrgb = null;
    this._sampler = null;
    this._uploadPromise = null;
    this._uploadStarted = false;
    this._revision = 0;
    this._width = 0;
    this._height = 0;
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
    this._revision++;
  }
  ensureUploaded(device, queue, colorSpace = "linear") {
    if (this._uploadStarted) return;
    this._uploadStarted = true;
    this._mipmapColorSpace = colorSpace;
    this._uploadPromise = (async () => {
      const bitmap = await this.decodeBitmap();
      const w = bitmap.width | 0;
      const h = bitmap.height | 0;
      const mipLevelCount = this._mipmaps ? mipLevelCountForSize(w, h) : 1;
      const texture = device.createTexture({
        size: { width: w, height: h },
        format: "rgba8unorm",
        mipLevelCount,
        usage: this._mipmaps ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        viewFormats: ["rgba8unorm-srgb"]
      });
      queue.copyExternalImageToTexture({ source: bitmap }, { texture }, { width: w, height: h });
      if (this._mipmaps && mipLevelCount > 1) this.generateMipmaps(device, texture, mipLevelCount, this._mipmapColorSpace ?? "linear");
      this._viewLinear = texture.createView({ format: "rgba8unorm" });
      this._viewSrgb = texture.createView({ format: "rgba8unorm-srgb" });
      this._width = w;
      this._height = h;
      this._gpuTexture = texture;
      this._revision++;
    })();
    this._uploadPromise.catch((e) => console.warn("Texture2D upload failed:", e));
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
  constructor(desc) {
    this._disposed = false;
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
  constructor(clip, opts = {}) {
    this.time = 0;
    this.speed = 1;
    this.loop = true;
    this.playing = true;
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
  constructor(name, joints, inverseBindMatrices) {
    this._disposed = false;
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
  constructor(skin, meshTransform) {
    this.boneBuffer = null;
    this.bindGroup = null;
    this.skin = skin;
    this.meshTransform = meshTransform;
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
  }
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

// src/gltf/import.ts
var warn2 = (opts, msg) => {
  opts?.onWarning?.(msg);
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
    _normIdxPtr = wasm.allocF32(_normIdxCap);
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
    if (texCoord !== 0) warn2(opts, `Texture texCoord=${texCoord} not supported yet (usage=${usage}); using TEXCOORD_0.`);
    const ext = info.extensions;
    if (ext?.KHR_texture_transform) warn2(opts, `KHR_texture_transform not supported yet (usage=${usage}); ignoring.`);
    return getOrCreateTextureByIndex(info.index, usage);
  };
  const alphaMode = mat.alphaMode ?? "OPAQUE";
  const alphaCutoff = alphaMode === "MASK" ? mat.alphaCutoff ?? 0.5 : 0;
  const blendMode = alphaMode === "BLEND" ? "transparent" /* Transparent */ : "opaque" /* Opaque */;
  const cullMode = mat.doubleSided ? "none" /* None */ : "back" /* Back */;
  const pbr = mat.pbrMetallicRoughness;
  const baseColorFactor = pbr?.baseColorFactor ?? [1, 1, 1, 1];
  const metallicFactor = pbr?.metallicFactor ?? 1;
  const roughnessFactor = pbr?.roughnessFactor ?? 1;
  const baseColorTexture = getTex(pbr?.baseColorTexture, "baseColor");
  const metallicRoughnessTexture = getTex(pbr?.metallicRoughnessTexture, "metallicRoughness");
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
  const jAcc = attrs["JOINTS_0"];
  const wAcc = attrs["WEIGHTS_0"];
  if (jAcc !== void 0 && wAcc !== void 0) {
    joints = readAccessorAsUint16(doc, jAcc);
    weights = readAccessorAsFloat32(doc, wAcc);
  } else if (jAcc !== void 0 || wAcc !== void 0) {
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
  const instantiateNodeRecursive = (nodeIndex) => {
    const node = nodes[nodeIndex];
    if (!node) return;
    const nodeT = nodeTransforms[nodeIndex];
    if (!nodeT) return;
    const createdMeshes = instantiateMeshNode(doc, json, node, nodeT, materialCache, textureCache, geometryCache, opts);
    if (node.skin !== void 0) {
      const skinDef = skins[node.skin];
      if (!skinDef) {
        warn2(opts, `nodes[${nodeIndex}].skin=${node.skin} missing; skipping skin binding`);
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
    for (const child of node.children ?? []) instantiateNodeRecursive(child);
  };
  const sceneIndex = getSceneIndex(json, opts);
  const gltfScene = json.scenes?.[sceneIndex];
  const roots = gltfScene?.nodes ?? [];
  for (const root of roots) instantiateNodeRecursive(root);
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
    await initWebAssembly();
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
  get gpu() {
    return this.renderer.gpu;
  }
  get isRunning() {
    return this._isRunning;
  }
  get cullingStats() {
    return this.renderer.cullingStats;
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
  async loadGLTF(source, options = {}) {
    const doc = await loadGltf(source, options.load);
    return importGltf(doc, options.import);
  }
  destroy() {
    this.stop();
    this.renderer.destroy();
  }
};
export {
  AmbientLight,
  AnimationClip,
  AnimationPlayer,
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
  Skin,
  SkinInstance,
  StandardMaterial,
  Texture2D,
  Transform,
  UnlitMaterial,
  WasmGPU,
  cullf,
  WasmGPU as default,
  frameArena,
  frustumf,
  importGltf,
  initWebAssembly,
  loadGltf,
  mat4,
  parseGLB,
  quat,
  readAccessor,
  readAccessorAsFloat32,
  readAccessorAsUint16,
  readIndicesAsUint32,
  vec3,
  wasm
};
