async function instantiate(module, imports = {}) {
  const adaptedImports = {
    env: Object.setPrototypeOf({
      abort(message, fileName, lineNumber, columnNumber) {
        // ~lib/builtins/abort(~lib/string/String | null?, ~lib/string/String | null?, u32?, u32?) => void
        message = __liftString(message >>> 0);
        fileName = __liftString(fileName >>> 0);
        lineNumber = lineNumber >>> 0;
        columnNumber = columnNumber >>> 0;
        (() => {
          // @external.js
          throw Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`);
        })();
      },
      "console.log"(text) {
        // ~lib/bindings/dom/console.log(~lib/string/String) => void
        text = __liftString(text >>> 0);
        console.log(text);
      },
      seed() {
        // ~lib/builtins/seed() => f64
        return (() => {
          // @external.js
          return Date.now() * Math.random();
        })();
      },
    }, Object.assign(Object.create(globalThis), imports.env || {})),
  };
  const { exports } = await WebAssembly.instantiate(module, adaptedImports);
  const memory = exports.memory || imports.env.memory;
  const adaptedExports = Object.setPrototypeOf({
    mat4abs(m) {
      // assembly/math/mat4abs(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return __liftArray(__getF32, 2, exports.mat4abs(m) >>> 0);
    },
    mat4add(m1, m2) {
      // assembly/math/mat4add(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      m1 = __retain(__lowerArray(__setF32, 4, 2, m1) || __notnull());
      m2 = __lowerArray(__setF32, 4, 2, m2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.mat4add(m1, m2) >>> 0);
      } finally {
        __release(m1);
      }
    },
    mat4copy(m) {
      // assembly/math/mat4copy(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return __liftArray(__getF32, 2, exports.mat4copy(m) >>> 0);
    },
    mat4det(m) {
      // assembly/math/mat4det(~lib/array/Array<f32>) => f32
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return exports.mat4det(m);
    },
    mat4identity() {
      // assembly/math/mat4identity() => ~lib/array/Array<f32>
      return __liftArray(__getF32, 2, exports.mat4identity() >>> 0);
    },
    mat4init(m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15) {
      // assembly/math/mat4init(f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32) => ~lib/array/Array<f32>
      return __liftArray(__getF32, 2, exports.mat4init(m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15) >>> 0);
    },
    mat4invert(m) {
      // assembly/math/mat4invert(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return __liftArray(__getF32, 2, exports.mat4invert(m) >>> 0);
    },
    mat4isEqual(m1, m2) {
      // assembly/math/mat4isEqual(~lib/array/Array<f32>, ~lib/array/Array<f32>) => bool
      m1 = __retain(__lowerArray(__setF32, 4, 2, m1) || __notnull());
      m2 = __lowerArray(__setF32, 4, 2, m2) || __notnull();
      try {
        return exports.mat4isEqual(m1, m2) != 0;
      } finally {
        __release(m1);
      }
    },
    mat4isIdentity(m) {
      // assembly/math/mat4isIdentity(~lib/array/Array<f32>) => bool
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return exports.mat4isIdentity(m) != 0;
    },
    mat4isInverse(m1, m2) {
      // assembly/math/mat4isInverse(~lib/array/Array<f32>, ~lib/array/Array<f32>) => bool
      m1 = __retain(__lowerArray(__setF32, 4, 2, m1) || __notnull());
      m2 = __lowerArray(__setF32, 4, 2, m2) || __notnull();
      try {
        return exports.mat4isInverse(m1, m2) != 0;
      } finally {
        __release(m1);
      }
    },
    mat4isZero(m) {
      // assembly/math/mat4isZero(~lib/array/Array<f32>) => bool
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return exports.mat4isZero(m) != 0;
    },
    mat4lookAt(eye, center, up) {
      // assembly/math/mat4lookAt(~lib/array/Array<f32>, ~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      eye = __retain(__lowerArray(__setF32, 4, 2, eye) || __notnull());
      center = __retain(__lowerArray(__setF32, 4, 2, center) || __notnull());
      up = __lowerArray(__setF32, 4, 2, up) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.mat4lookAt(eye, center, up) >>> 0);
      } finally {
        __release(eye);
        __release(center);
      }
    },
    mat4mul(m1, m2) {
      // assembly/math/mat4mul(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      m1 = __retain(__lowerArray(__setF32, 4, 2, m1) || __notnull());
      m2 = __lowerArray(__setF32, 4, 2, m2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.mat4mul(m1, m2) >>> 0);
      } finally {
        __release(m1);
      }
    },
    mat4neg(m) {
      // assembly/math/mat4neg(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return __liftArray(__getF32, 2, exports.mat4neg(m) >>> 0);
    },
    mat4norm(m) {
      // assembly/math/mat4norm(~lib/array/Array<f32>) => f32
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return exports.mat4norm(m);
    },
    mat4normalize(m) {
      // assembly/math/mat4normalize(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return __liftArray(__getF32, 2, exports.mat4normalize(m) >>> 0);
    },
    mat4normsq(m) {
      // assembly/math/mat4normsq(~lib/array/Array<f32>) => f32
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return exports.mat4normsq(m);
    },
    mat4perspective(fovY, aspect, near, far) {
      // assembly/math/mat4perspective(f32, f32, f32, f32) => ~lib/array/Array<f32>
      return __liftArray(__getF32, 2, exports.mat4perspective(fovY, aspect, near, far) >>> 0);
    },
    mat4print(m) {
      // assembly/math/mat4print(~lib/array/Array<f32>) => void
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      exports.mat4print(m);
    },
    mat4random(a, b) {
      // assembly/math/mat4random(f32, f32) => ~lib/array/Array<f32>
      return __liftArray(__getF32, 2, exports.mat4random(a, b) >>> 0);
    },
    mat4rotateX(m, angle) {
      // assembly/math/mat4rotateX(~lib/array/Array<f32>, f32) => ~lib/array/Array<f32>
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return __liftArray(__getF32, 2, exports.mat4rotateX(m, angle) >>> 0);
    },
    mat4rotateY(m, angle) {
      // assembly/math/mat4rotateY(~lib/array/Array<f32>, f32) => ~lib/array/Array<f32>
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return __liftArray(__getF32, 2, exports.mat4rotateY(m, angle) >>> 0);
    },
    mat4rotateZ(m, angle) {
      // assembly/math/mat4rotateZ(~lib/array/Array<f32>, f32) => ~lib/array/Array<f32>
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return __liftArray(__getF32, 2, exports.mat4rotateZ(m, angle) >>> 0);
    },
    mat4round(m) {
      // assembly/math/mat4round(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return __liftArray(__getF32, 2, exports.mat4round(m) >>> 0);
    },
    mat4scl(m, n) {
      // assembly/math/mat4scl(~lib/array/Array<f32>, f32) => ~lib/array/Array<f32>
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return __liftArray(__getF32, 2, exports.mat4scl(m, n) >>> 0);
    },
    mat4sub(m1, m2) {
      // assembly/math/mat4sub(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      m1 = __retain(__lowerArray(__setF32, 4, 2, m1) || __notnull());
      m2 = __lowerArray(__setF32, 4, 2, m2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.mat4sub(m1, m2) >>> 0);
      } finally {
        __release(m1);
      }
    },
    mat4trace(m) {
      // assembly/math/mat4trace(~lib/array/Array<f32>) => f32
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return exports.mat4trace(m);
    },
    mat4translate(m, v) {
      // assembly/math/mat4translate(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      m = __retain(__lowerArray(__setF32, 4, 2, m) || __notnull());
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.mat4translate(m, v) >>> 0);
      } finally {
        __release(m);
      }
    },
    mat4transpose(m) {
      // assembly/math/mat4transpose(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      m = __lowerArray(__setF32, 4, 2, m) || __notnull();
      return __liftArray(__getF32, 2, exports.mat4transpose(m) >>> 0);
    },
    quatabs(q) {
      // assembly/math/quatabs(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      return __liftArray(__getF32, 2, exports.quatabs(q) >>> 0);
    },
    quatadd(q1, q2) {
      // assembly/math/quatadd(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      q1 = __retain(__lowerArray(__setF32, 4, 2, q1) || __notnull());
      q2 = __lowerArray(__setF32, 4, 2, q2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.quatadd(q1, q2) >>> 0);
      } finally {
        __release(q1);
      }
    },
    quatcopy(q) {
      // assembly/math/quatcopy(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      return __liftArray(__getF32, 2, exports.quatcopy(q) >>> 0);
    },
    quatdist(q1, q2) {
      // assembly/math/quatdist(~lib/array/Array<f32>, ~lib/array/Array<f32>) => f32
      q1 = __retain(__lowerArray(__setF32, 4, 2, q1) || __notnull());
      q2 = __lowerArray(__setF32, 4, 2, q2) || __notnull();
      try {
        return exports.quatdist(q1, q2);
      } finally {
        __release(q1);
      }
    },
    quatdistsq(q1, q2) {
      // assembly/math/quatdistsq(~lib/array/Array<f32>, ~lib/array/Array<f32>) => f32
      q1 = __retain(__lowerArray(__setF32, 4, 2, q1) || __notnull());
      q2 = __lowerArray(__setF32, 4, 2, q2) || __notnull();
      try {
        return exports.quatdistsq(q1, q2);
      } finally {
        __release(q1);
      }
    },
    quatfromAxisAngle(axis, angle) {
      // assembly/math/quatfromAxisAngle(~lib/array/Array<f32>, f32) => ~lib/array/Array<f32>
      axis = __lowerArray(__setF32, 4, 2, axis) || __notnull();
      return __liftArray(__getF32, 2, exports.quatfromAxisAngle(axis, angle) >>> 0);
    },
    quatinit(a, b, c, d) {
      // assembly/math/quatinit(f32, f32, f32, f32) => ~lib/array/Array<f32>
      return __liftArray(__getF32, 2, exports.quatinit(a, b, c, d) >>> 0);
    },
    quatinvert(q) {
      // assembly/math/quatinvert(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      return __liftArray(__getF32, 2, exports.quatinvert(q) >>> 0);
    },
    quatisEqual(q1, q2) {
      // assembly/math/quatisEqual(~lib/array/Array<f32>, ~lib/array/Array<f32>) => bool
      q1 = __retain(__lowerArray(__setF32, 4, 2, q1) || __notnull());
      q2 = __lowerArray(__setF32, 4, 2, q2) || __notnull();
      try {
        return exports.quatisEqual(q1, q2) != 0;
      } finally {
        __release(q1);
      }
    },
    quatisNormalized(q) {
      // assembly/math/quatisNormalized(~lib/array/Array<f32>) => bool
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      return exports.quatisNormalized(q) != 0;
    },
    quatisZero(q) {
      // assembly/math/quatisZero(~lib/array/Array<f32>) => bool
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      return exports.quatisZero(q) != 0;
    },
    quatmul(q1, q2) {
      // assembly/math/quatmul(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      q1 = __retain(__lowerArray(__setF32, 4, 2, q1) || __notnull());
      q2 = __lowerArray(__setF32, 4, 2, q2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.quatmul(q1, q2) >>> 0);
      } finally {
        __release(q1);
      }
    },
    quatneg(q) {
      // assembly/math/quatneg(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      return __liftArray(__getF32, 2, exports.quatneg(q) >>> 0);
    },
    quatnorm(q) {
      // assembly/math/quatnorm(~lib/array/Array<f32>) => f32
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      return exports.quatnorm(q);
    },
    quatnormalize(q) {
      // assembly/math/quatnormalize(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      return __liftArray(__getF32, 2, exports.quatnormalize(q) >>> 0);
    },
    quatnormscl(q, n) {
      // assembly/math/quatnormscl(~lib/array/Array<f32>, f32) => ~lib/array/Array<f32>
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      return __liftArray(__getF32, 2, exports.quatnormscl(q, n) >>> 0);
    },
    quatnormsq(q) {
      // assembly/math/quatnormsq(~lib/array/Array<f32>) => f32
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      return exports.quatnormsq(q);
    },
    quatprint(q) {
      // assembly/math/quatprint(~lib/array/Array<f32>) => void
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      exports.quatprint(q);
    },
    quatrandom(a, b) {
      // assembly/math/quatrandom(f32, f32) => ~lib/array/Array<f32>
      return __liftArray(__getF32, 2, exports.quatrandom(a, b) >>> 0);
    },
    quatround(q) {
      // assembly/math/quatround(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      return __liftArray(__getF32, 2, exports.quatround(q) >>> 0);
    },
    quatscl(q, n) {
      // assembly/math/quatscl(~lib/array/Array<f32>, f32) => ~lib/array/Array<f32>
      q = __lowerArray(__setF32, 4, 2, q) || __notnull();
      return __liftArray(__getF32, 2, exports.quatscl(q, n) >>> 0);
    },
    quatslerp(q1, q2, t) {
      // assembly/math/quatslerp(~lib/array/Array<f32>, ~lib/array/Array<f32>, f32) => ~lib/array/Array<f32>
      q1 = __retain(__lowerArray(__setF32, 4, 2, q1) || __notnull());
      q2 = __lowerArray(__setF32, 4, 2, q2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.quatslerp(q1, q2, t) >>> 0);
      } finally {
        __release(q1);
      }
    },
    quatsub(q1, q2) {
      // assembly/math/quatsub(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      q1 = __retain(__lowerArray(__setF32, 4, 2, q1) || __notnull());
      q2 = __lowerArray(__setF32, 4, 2, q2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.quatsub(q1, q2) >>> 0);
      } finally {
        __release(q1);
      }
    },
    quattoRotation(q, v) {
      // assembly/math/quattoRotation(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      q = __retain(__lowerArray(__setF32, 4, 2, q) || __notnull());
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.quattoRotation(q, v) >>> 0);
      } finally {
        __release(q);
      }
    },
    vec3abs(v) {
      // assembly/math/vec3abs(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return __liftArray(__getF32, 2, exports.vec3abs(v) >>> 0);
    },
    vec3add(v1, v2) {
      // assembly/math/vec3add(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.vec3add(v1, v2) >>> 0);
      } finally {
        __release(v1);
      }
    },
    vec3ang(v) {
      // assembly/math/vec3ang(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return __liftArray(__getF32, 2, exports.vec3ang(v) >>> 0);
    },
    vec3angBetween(v1, v2) {
      // assembly/math/vec3angBetween(~lib/array/Array<f32>, ~lib/array/Array<f32>) => f32
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return exports.vec3angBetween(v1, v2);
      } finally {
        __release(v1);
      }
    },
    vec3copy(v) {
      // assembly/math/vec3copy(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return __liftArray(__getF32, 2, exports.vec3copy(v) >>> 0);
    },
    vec3cross(v1, v2) {
      // assembly/math/vec3cross(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.vec3cross(v1, v2) >>> 0);
      } finally {
        __release(v1);
      }
    },
    vec3dist(v1, v2) {
      // assembly/math/vec3dist(~lib/array/Array<f32>, ~lib/array/Array<f32>) => f32
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return exports.vec3dist(v1, v2);
      } finally {
        __release(v1);
      }
    },
    vec3distsq(v1, v2) {
      // assembly/math/vec3distsq(~lib/array/Array<f32>, ~lib/array/Array<f32>) => f32
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return exports.vec3distsq(v1, v2);
      } finally {
        __release(v1);
      }
    },
    vec3dot(v1, v2) {
      // assembly/math/vec3dot(~lib/array/Array<f32>, ~lib/array/Array<f32>) => f32
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return exports.vec3dot(v1, v2);
      } finally {
        __release(v1);
      }
    },
    vec3init(x, y, z) {
      // assembly/math/vec3init(f32, f32, f32) => ~lib/array/Array<f32>
      return __liftArray(__getF32, 2, exports.vec3init(x, y, z) >>> 0);
    },
    vec3interp(v, a, b, c) {
      // assembly/math/vec3interp(~lib/array/Array<f32>, f32, f32, f32) => ~lib/array/Array<f32>
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return __liftArray(__getF32, 2, exports.vec3interp(v, a, b, c) >>> 0);
    },
    vec3isEqual(v1, v2) {
      // assembly/math/vec3isEqual(~lib/array/Array<f32>, ~lib/array/Array<f32>) => bool
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return exports.vec3isEqual(v1, v2) != 0;
      } finally {
        __release(v1);
      }
    },
    vec3isNormalized(v) {
      // assembly/math/vec3isNormalized(~lib/array/Array<f32>) => bool
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return exports.vec3isNormalized(v) != 0;
    },
    vec3isOrthogonal(v1, v2) {
      // assembly/math/vec3isOrthogonal(~lib/array/Array<f32>, ~lib/array/Array<f32>) => bool
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return exports.vec3isOrthogonal(v1, v2) != 0;
      } finally {
        __release(v1);
      }
    },
    vec3isParallel(v1, v2) {
      // assembly/math/vec3isParallel(~lib/array/Array<f32>, ~lib/array/Array<f32>) => bool
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return exports.vec3isParallel(v1, v2) != 0;
      } finally {
        __release(v1);
      }
    },
    vec3isZero(v) {
      // assembly/math/vec3isZero(~lib/array/Array<f32>) => bool
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return exports.vec3isZero(v) != 0;
    },
    vec3neg(v) {
      // assembly/math/vec3neg(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return __liftArray(__getF32, 2, exports.vec3neg(v) >>> 0);
    },
    vec3norm(v) {
      // assembly/math/vec3norm(~lib/array/Array<f32>) => f32
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return exports.vec3norm(v);
    },
    vec3normalize(v) {
      // assembly/math/vec3normalize(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return __liftArray(__getF32, 2, exports.vec3normalize(v) >>> 0);
    },
    vec3normscl(v, n) {
      // assembly/math/vec3normscl(~lib/array/Array<f32>, f32) => ~lib/array/Array<f32>
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return __liftArray(__getF32, 2, exports.vec3normscl(v, n) >>> 0);
    },
    vec3normsq(v) {
      // assembly/math/vec3normsq(~lib/array/Array<f32>) => f32
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return exports.vec3normsq(v);
    },
    vec3oproj(v1, v2) {
      // assembly/math/vec3oproj(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.vec3oproj(v1, v2) >>> 0);
      } finally {
        __release(v1);
      }
    },
    vec3print(v) {
      // assembly/math/vec3print(~lib/array/Array<f32>) => void
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      exports.vec3print(v);
    },
    vec3proj(v1, v2) {
      // assembly/math/vec3proj(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.vec3proj(v1, v2) >>> 0);
      } finally {
        __release(v1);
      }
    },
    vec3random(a, b) {
      // assembly/math/vec3random(f32, f32) => ~lib/array/Array<f32>
      return __liftArray(__getF32, 2, exports.vec3random(a, b) >>> 0);
    },
    vec3reflect(v1, v2) {
      // assembly/math/vec3reflect(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.vec3reflect(v1, v2) >>> 0);
      } finally {
        __release(v1);
      }
    },
    vec3refract(v1, v2, n) {
      // assembly/math/vec3refract(~lib/array/Array<f32>, ~lib/array/Array<f32>, f32) => ~lib/array/Array<f32>
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.vec3refract(v1, v2, n) >>> 0);
      } finally {
        __release(v1);
      }
    },
    vec3round(v) {
      // assembly/math/vec3round(~lib/array/Array<f32>) => ~lib/array/Array<f32>
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return __liftArray(__getF32, 2, exports.vec3round(v) >>> 0);
    },
    vec3scl(v, n) {
      // assembly/math/vec3scl(~lib/array/Array<f32>, f32) => ~lib/array/Array<f32>
      v = __lowerArray(__setF32, 4, 2, v) || __notnull();
      return __liftArray(__getF32, 2, exports.vec3scl(v, n) >>> 0);
    },
    vec3sub(v1, v2) {
      // assembly/math/vec3sub(~lib/array/Array<f32>, ~lib/array/Array<f32>) => ~lib/array/Array<f32>
      v1 = __retain(__lowerArray(__setF32, 4, 2, v1) || __notnull());
      v2 = __lowerArray(__setF32, 4, 2, v2) || __notnull();
      try {
        return __liftArray(__getF32, 2, exports.vec3sub(v1, v2) >>> 0);
      } finally {
        __release(v1);
      }
    },
  }, exports);
  function __liftString(pointer) {
    if (!pointer) return null;
    const
      end = pointer + new Uint32Array(memory.buffer)[pointer - 4 >>> 2] >>> 1,
      memoryU16 = new Uint16Array(memory.buffer);
    let
      start = pointer >>> 1,
      string = "";
    while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
    return string + String.fromCharCode(...memoryU16.subarray(start, end));
  }
  function __liftArray(liftElement, align, pointer) {
    if (!pointer) return null;
    const
      dataStart = __getU32(pointer + 4),
      length = __dataview.getUint32(pointer + 12, true),
      values = new Array(length);
    for (let i = 0; i < length; ++i) values[i] = liftElement(dataStart + (i << align >>> 0));
    return values;
  }
  function __lowerArray(lowerElement, id, align, values) {
    if (values == null) return 0;
    const
      length = values.length,
      buffer = exports.__pin(exports.__new(length << align, 1)) >>> 0,
      header = exports.__pin(exports.__new(16, id)) >>> 0;
    __setU32(header + 0, buffer);
    __dataview.setUint32(header + 4, buffer, true);
    __dataview.setUint32(header + 8, length << align, true);
    __dataview.setUint32(header + 12, length, true);
    for (let i = 0; i < length; ++i) lowerElement(buffer + (i << align >>> 0), values[i]);
    exports.__unpin(buffer);
    exports.__unpin(header);
    return header;
  }
  const refcounts = new Map();
  function __retain(pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer);
      if (refcount) refcounts.set(pointer, refcount + 1);
      else refcounts.set(exports.__pin(pointer), 1);
    }
    return pointer;
  }
  function __release(pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer);
      if (refcount === 1) exports.__unpin(pointer), refcounts.delete(pointer);
      else if (refcount) refcounts.set(pointer, refcount - 1);
      else throw Error(`invalid refcount '${refcount}' for reference '${pointer}'`);
    }
  }
  function __notnull() {
    throw TypeError("value must not be null");
  }
  let __dataview = new DataView(memory.buffer);
  function __setU32(pointer, value) {
    try {
      __dataview.setUint32(pointer, value, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      __dataview.setUint32(pointer, value, true);
    }
  }
  function __setF32(pointer, value) {
    try {
      __dataview.setFloat32(pointer, value, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      __dataview.setFloat32(pointer, value, true);
    }
  }
  function __getU32(pointer) {
    try {
      return __dataview.getUint32(pointer, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      return __dataview.getUint32(pointer, true);
    }
  }
  function __getF32(pointer) {
    try {
      return __dataview.getFloat32(pointer, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      return __dataview.getFloat32(pointer, true);
    }
  }
  return adaptedExports;
}
export const {
  memory,
  mat4abs,
  mat4add,
  mat4copy,
  mat4det,
  mat4identity,
  mat4init,
  mat4invert,
  mat4isEqual,
  mat4isIdentity,
  mat4isInverse,
  mat4isZero,
  mat4lookAt,
  mat4mul,
  mat4neg,
  mat4norm,
  mat4normalize,
  mat4normsq,
  mat4perspective,
  mat4print,
  mat4random,
  mat4rotateX,
  mat4rotateY,
  mat4rotateZ,
  mat4round,
  mat4scl,
  mat4sub,
  mat4trace,
  mat4translate,
  mat4transpose,
  quatabs,
  quatadd,
  quatcopy,
  quatdist,
  quatdistsq,
  quatfromAxisAngle,
  quatinit,
  quatinvert,
  quatisEqual,
  quatisNormalized,
  quatisZero,
  quatmul,
  quatneg,
  quatnorm,
  quatnormalize,
  quatnormscl,
  quatnormsq,
  quatprint,
  quatrandom,
  quatround,
  quatscl,
  quatslerp,
  quatsub,
  quattoRotation,
  vec3abs,
  vec3add,
  vec3ang,
  vec3angBetween,
  vec3copy,
  vec3cross,
  vec3dist,
  vec3distsq,
  vec3dot,
  vec3init,
  vec3interp,
  vec3isEqual,
  vec3isNormalized,
  vec3isOrthogonal,
  vec3isParallel,
  vec3isZero,
  vec3neg,
  vec3norm,
  vec3normalize,
  vec3normscl,
  vec3normsq,
  vec3oproj,
  vec3print,
  vec3proj,
  vec3random,
  vec3reflect,
  vec3refract,
  vec3round,
  vec3scl,
  vec3sub,
} = await (async url => instantiate(
  await (async () => {
    const isNodeOrBun = typeof process != "undefined" && process.versions != null && (process.versions.node != null || process.versions.bun != null);
    if (isNodeOrBun) { return globalThis.WebAssembly.compile(await (await import("node:fs/promises")).readFile(url)); }
    else { return await globalThis.WebAssembly.compileStreaming(globalThis.fetch(url)); }
  })(), {
  }
))(new URL("math.wasm", import.meta.url));
