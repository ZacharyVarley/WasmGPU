// src/math/index.ts
var modPromise = null;
var mod = null;
var IIFE_SCRIPT_URL = (() => {
  if (typeof document === "undefined") return null;
  const cs = document.currentScript;
  const src = cs?.src;
  return src && src.length > 0 ? src : null;
})();
var defaultBaseURL = () => {
  if (import.meta.url !== "__CURRENT_SCRIPT__") {
    return new URL(".", import.meta.url).toString();
  }
  const base = IIFE_SCRIPT_URL ?? location.href;
  return new URL(".", base).toString();
};
var initMath = async (baseURL) => {
  if (mod) return;
  const base = baseURL ?? defaultBaseURL();
  const mathURL = new URL("math.js", base).toString();
  modPromise ??= import(mathURL);
  mod = await modPromise;
};
var ensure = () => {
  if (!mod) throw new Error("Math module not initialized. Call await initMath() first.");
  return mod;
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
  abs: (quat2) => ensure().quatabs(quat2),
  add: (quat1, quat2) => ensure().quatadd(quat1, quat2),
  copy: (quat2) => ensure().quatcopy(quat2),
  dist: (quat1, quat2) => ensure().quatdist(quat1, quat2),
  distsq: (quat1, quat2) => ensure().quatdistsq(quat1, quat2),
  fromAxisAngle: (axis, angle) => ensure().quatfromAxisAngle(axis, angle),
  init: (a, b, c, d) => ensure().quatinit(a, b, c, d),
  invert: (quat2) => ensure().quatinvert(quat2),
  isEqual: (quat1, quat2) => ensure().quatisEqual(quat1, quat2),
  isNormalized: (quat2) => ensure().quatisNormalized(quat2),
  isZero: (quat2) => ensure().quatisZero(quat2),
  mul: (quat1, quat2) => ensure().quatmul(quat1, quat2),
  neg: (quat2) => ensure().quatneg(quat2),
  norm: (quat2) => ensure().quatnorm(quat2),
  normalize: (quat2) => ensure().quatnormalize(quat2),
  normscl: (quat2, scalar) => ensure().quatnormscl(quat2, scalar),
  normsq: (quat2) => ensure().quatnormsq(quat2),
  print: (quat2) => ensure().quatprint(quat2),
  random: (min, max) => ensure().quatrandom(min, max),
  round: (quat2) => ensure().quatround(quat2),
  scl: (quat2, scalar) => ensure().quatscl(quat2, scalar),
  slerp: (quat1, quat2, t) => ensure().quatslerp(quat1, quat2, t),
  sub: (quat1, quat2) => ensure().quatsub(quat1, quat2),
  toRotation: (quat2, vect) => ensure().quattoRotation(quat2, vect)
};
var vec3 = {
  abs: (vect) => ensure().vec3abs(vect),
  add: (vect1, vect2) => ensure().vec3add(vect1, vect2),
  ang: (vect) => ensure().vec3ang(vect),
  angBetween: (vect1, vect2) => ensure().vec3angBetween(vect1, vect2),
  copy: (vect) => ensure().vec3copy(vect),
  cross: (vect1, vect2) => ensure().vec3cross(vect1, vect2),
  dist: (vect1, vect2) => ensure().vec3dist(vect1, vect2),
  distsq: (vect1, vect2) => ensure().vec3distsq(vect1, vect2),
  dot: (vect1, vect2) => ensure().vec3dot(vect1, vect2),
  init: (x, y, z) => ensure().vec3init(x, y, z),
  interp: (vect, a, b, c) => ensure().vec3interp(vect, a, b, c),
  isEqual: (vect1, vect2) => ensure().vec3isEqual(vect1, vect2),
  isNormalized: (vect) => ensure().vec3isNormalized(vect),
  isOrthogonal: (vect1, vect2) => ensure().vec3isOrthogonal(vect1, vect2),
  isParallel: (vect1, vect2) => ensure().vec3isParallel(vect1, vect2),
  isZero: (vect) => ensure().vec3isZero(vect),
  neg: (vect) => ensure().vec3neg(vect),
  norm: (vect) => ensure().vec3norm(vect),
  normalize: (vect) => ensure().vec3normalize(vect),
  normscl: (vect, scalar) => ensure().vec3normscl(vect, scalar),
  normsq: (vect) => ensure().vec3normsq(vect),
  oproj: (vect1, vect2) => ensure().vec3oproj(vect1, vect2),
  print: (vect) => ensure().vec3print(vect),
  proj: (vect1, vect2) => ensure().vec3proj(vect1, vect2),
  random: (min, max) => ensure().vec3random(min, max),
  reflect: (vect1, vect2) => ensure().vec3reflect(vect1, vect2),
  refract: (vect1, vect2, refractiveIndex) => ensure().vec3refract(vect1, vect2, refractiveIndex),
  round: (vect) => ensure().vec3round(vect),
  scl: (vect, scalar) => ensure().vec3scl(vect, scalar),
  sub: (vect1, vect2) => ensure().vec3sub(vect1, vect2)
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
  getShaderCode() {
    return (
      /* wgsl */
      `
            struct MaterialUniforms {
                color: vec4f
            };
            @group(1) @binding(0) var<uniform> material: MaterialUniforms;
            struct VertexInput {
                @location(0) position: vec3f,
                @location(1) normal: vec3f,
                @location(2) uv: vec2f
            };
            struct VertexOutput {
                @builtin(position) position: vec4f,
                @location(0) normal: vec3f,
                @location(1) uv: vec2f
            };
            struct CameraUniforms {
                viewProjection: mat4x4f,
                position: vec3f
            };
            struct ModelUniforms {
                model: mat4x4f,
                normalMatrix: mat4x4f
            };
            @group(0) @binding(0) var<uniform> camera: CameraUniforms;
            @group(0) @binding(1) var<uniform> model: ModelUniforms;
            @vertex
            fn vs_main(in: VertexInput) -> VertexOutput {
                var out: VertexOutput;
                out.position = camera.viewProjection * model.model * vec4f(in.position, 1.0);
                out.normal = (model.normalMatrix * vec4f(in.normal, 0.0)).xyz;
                out.uv = in.uv;
                return out;
            }
            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4f {
                return material.color;
            }
        `
    );
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
  getShaderCode() {
    return (
      /* wgsl */
      `
            struct MaterialUniforms {
                color: vec4f,
                emissive: vec4f,
                params: vec4f  // x: metallic, y: roughness, z: emissiveIntensity
            };
            @group(1) @binding(0) var<uniform> material: MaterialUniforms;
            struct VertexInput {
                @location(0) position: vec3f,
                @location(1) normal: vec3f,
                @location(2) uv: vec2f
            };
            struct VertexOutput {
                @builtin(position) position: vec4f,
                @location(0) worldPos: vec3f,
                @location(1) normal: vec3f,
                @location(2) uv: vec2f
            };
            struct CameraUniforms {
                viewProjection: mat4x4f,
                position: vec3f
            };
            struct ModelUniforms {
                model: mat4x4f,
                normalMatrix: mat4x4f
            };
            struct Light {
                position: vec4f,
                color: vec4f,
                params: vec4f
            };
            struct LightingUniforms {
                ambient: vec4f,
                lightCount: u32,
                _pad0: u32,
                _pad1: u32,
                _pad2: u32,
                lights: array<Light, 8>
            };
            @group(0) @binding(0) var<uniform> camera: CameraUniforms;
            @group(0) @binding(1) var<uniform> model: ModelUniforms;
            @group(0) @binding(2) var<uniform> lighting: LightingUniforms;
            const PI: f32 = 3.14159265359;
            @vertex
            fn vs_main(in: VertexInput) -> VertexOutput {
                var out: VertexOutput;
                let worldPos = model.model * vec4f(in.position, 1.0);
                out.position = camera.viewProjection * worldPos;
                out.worldPos = worldPos.xyz;
                out.normal = normalize((model.normalMatrix * vec4f(in.normal, 0.0)).xyz);
                out.uv = in.uv;
                return out;
            }
            fn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f {
                return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
            }
            fn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 {
                let a = roughness * roughness;
                let a2 = a * a;
                let NdotH = max(dot(N, H), 0.0);
                let NdotH2 = NdotH * NdotH;
                let denom = NdotH2 * (a2 - 1.0) + 1.0;
                return a2 / (PI * denom * denom);
            }
            fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
                let r = roughness + 1.0;
                let k = (r * r) / 8.0;
                return NdotV / (NdotV * (1.0 - k) + k);
            }
            fn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 {
                let NdotV = max(dot(N, V), 0.0);
                let NdotL = max(dot(N, L), 0.0);
                return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
            }
            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4f {
                let albedo = material.color.rgb;
                let metallic = material.params.x;
                let roughness = material.params.y;
                let emissiveIntensity = material.params.z;
                let N = normalize(in.normal);
                let V = normalize(camera.position - in.worldPos);
                let F0 = mix(vec3f(0.04), albedo, metallic);
                var Lo = lighting.ambient.rgb * albedo;
                for (var i = 0u; i < lighting.lightCount; i++) {
                    let light = lighting.lights[i];
                    var L: vec3f;
                    var attenuation: f32 = 1.0;
                    if (light.position.w == 0.0) {
                        L = normalize(-light.position.xyz);
                    } else {
                        let lightDir = light.position.xyz - in.worldPos;
                        let distance = length(lightDir);
                        L = normalize(lightDir);
                        attenuation = 1.0 / (distance * distance);
                    }
                    let H = normalize(V + L);
                    let radiance = light.color.rgb * light.color.a * attenuation;
                    let NDF = distributionGGX(N, H, roughness);
                    let G = geometrySmith(N, V, L, roughness);
                    let F = fresnelSchlick(max(dot(H, V), 0.0), F0);
                    let numerator = NDF * G * F;
                    let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
                    let specular = numerator / denominator;
                    let kS = F;
                    let kD = (1.0 - kS) * (1.0 - metallic);
                    let NdotL = max(dot(N, L), 0.0);
                    Lo += (kD * albedo / PI + specular) * radiance * NdotL;
                }
                Lo += material.emissive.rgb * emissiveIntensity;
                Lo = Lo / (Lo + vec3f(1.0));
                Lo = pow(Lo, vec3f(1.0 / 2.2));
                return vec4f(Lo, material.color.a);
            }
        `
    );
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
    return (
      /* wgsl */
      `
            struct VertexInput {
                @location(0) position: vec3f,
                @location(1) normal: vec3f,
                @location(2) uv: vec2f
            };
            struct VertexOutput {
                @builtin(position) position: vec4f,
                @location(0) worldPos: vec3f,
                @location(1) normal: vec3f,
                @location(2) uv: vec2f
            };
            struct CameraUniforms {
                viewProjection: mat4x4f,
                position: vec3f
            };
            struct ModelUniforms {
                model: mat4x4f,
                normalMatrix: mat4x4f
            };
            @group(0) @binding(0) var<uniform> camera: CameraUniforms;
            @group(0) @binding(1) var<uniform> model: ModelUniforms;
            @vertex
            fn vs_main(in: VertexInput) -> VertexOutput {
                var out: VertexOutput;
                let worldPos = model.model * vec4f(in.position, 1.0);
                out.position = camera.viewProjection * worldPos;
                out.worldPos = worldPos.xyz;
                out.normal = normalize((model.normalMatrix * vec4f(in.normal, 0.0)).xyz);
                out.uv = in.uv;
                return out;
            }
        `
    );
  }
  getShaderCode() {
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
    this.modelUniformBuffers = [];
    this.modelBufferIndex = 0;
    this.MODEL_BUFFER_POOL_SIZE = 64;
    this.pipelineCache = /* @__PURE__ */ new Map();
    this.shaderCache = /* @__PURE__ */ new Map();
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
  render(scene, camera) {
    this.resize();
    this.modelBufferIndex = 0;
    if ("aspect" in camera) camera.aspect = this.aspectRatio;
    const colorTexture = this.context.getCurrentTexture();
    const colorView = colorTexture.createView();
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
    for (const mesh of scene.visibleMeshes) {
      this.renderMesh(pass, mesh, camera);
    }
    pass.end();
    this.queue.submit([encoder.finish()]);
  }
  destroy() {
    this.depthTexture?.destroy();
    this.cameraUniformBuffer?.destroy();
    for (const buffer of this.modelUniformBuffers) buffer.destroy();
    this.modelUniformBuffers = [];
    this.lightingUniformBuffer?.destroy();
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
  }
  writeCameraUniforms(camera) {
    const viewProj = camera.viewProjectionMatrix;
    const pos = camera.position;
    const data = new Float32Array(20);
    data.set(viewProj, 0);
    data.set(pos, 16);
    this.queue.writeBuffer(this.cameraUniformBuffer, 0, data);
  }
  writeLightingUniforms(scene) {
    const { ambient, lights } = scene.getLightingData();
    const data = new Float32Array(104);
    data[0] = ambient[0];
    data[1] = ambient[1];
    data[2] = ambient[2];
    data[3] = 1;
    const countView = new Uint32Array(data.buffer, 16, 1);
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
  computeNormalMatrix(model) {
    const m00 = model[0], m01 = model[4], m02 = model[8];
    const m10 = model[1], m11 = model[5], m12 = model[9];
    const m20 = model[2], m21 = model[6], m22 = model[10];
    const det = m00 * (m11 * m22 - m12 * m21) - m01 * (m10 * m22 - m12 * m20) + m02 * (m10 * m21 - m11 * m20);
    if (Math.abs(det) < 1e-6) return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const invDet = 1 / det;
    const i00 = (m11 * m22 - m12 * m21) * invDet;
    const i01 = (m02 * m21 - m01 * m22) * invDet;
    const i02 = (m01 * m12 - m02 * m11) * invDet;
    const i10 = (m12 * m20 - m10 * m22) * invDet;
    const i11 = (m00 * m22 - m02 * m20) * invDet;
    const i12 = (m02 * m10 - m00 * m12) * invDet;
    const i20 = (m10 * m21 - m11 * m20) * invDet;
    const i21 = (m01 * m20 - m00 * m21) * invDet;
    const i22 = (m00 * m11 - m01 * m10) * invDet;
    return [i00, i10, i20, 0, i01, i11, i21, 0, i02, i12, i22, 0, 0, 0, 0, 1];
  }
  renderMesh(pass, mesh, camera) {
    const { geometry, material } = mesh;
    geometry.upload(this.device);
    const pipeline = this.getOrCreatePipeline(material);
    this.ensureMaterialBindGroup(material);
    if (this.modelBufferIndex >= this.MODEL_BUFFER_POOL_SIZE) {
      console.warn("Model buffer pool exhausted! Increase MODEL_BUFFER_POOL_SIZE.");
      return;
    }
    const modelBuffer = this.modelUniformBuffers[this.modelBufferIndex++];
    const model = mesh.worldMatrix;
    const normalMatrix = this.computeNormalMatrix(model);
    const data = new Float32Array(32);
    data.set(model, 0);
    data.set(normalMatrix, 16);
    this.queue.writeBuffer(modelBuffer, 0, data);
    const globalBindGroup = this.device.createBindGroup({
      layout: this.globalBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
        { binding: 1, resource: { buffer: modelBuffer } },
        { binding: 2, resource: { buffer: this.lightingUniformBuffer } }
      ]
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, globalBindGroup);
    pass.setBindGroup(1, material.bindGroup);
    pass.setVertexBuffer(0, geometry.positionBuffer);
    pass.setVertexBuffer(1, geometry.normalBuffer);
    pass.setVertexBuffer(2, geometry.uvBuffer);
    if (geometry.isIndexed) {
      pass.setIndexBuffer(geometry.indexBuffer, "uint32");
      pass.drawIndexed(geometry.indexCount);
    } else {
      pass.draw(geometry.vertexCount);
    }
  }
  getOrCreatePipeline(material) {
    const key = this.getPipelineCacheKey(material);
    let pipeline = this.pipelineCache.get(key);
    if (pipeline) return pipeline;
    const shaderCode = material.getShaderCode();
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
        buffers: [
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }]
          },
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }]
          },
          {
            arrayStride: 8,
            attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }]
          }
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
  getPipelineCacheKey(material) {
    return `${material.constructor.name}_${material.blendMode}_${material.cullMode}_${material.depthWrite}_${material.depthTest}`;
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
};

// src/core/transform.ts
var Transform = class _Transform {
  constructor() {
    this._position = [0, 0, 0];
    this._rotation = [0, 0, 0, 1];
    this._scale = [1, 1, 1];
    this._localMatrix = null;
    this._worldMatrix = null;
    this._localDirty = true;
    this._worldDirty = true;
    this._parent = null;
    this._children = [];
  }
  get parent() {
    return this._parent;
  }
  get children() {
    return this._children;
  }
  setParent(parent) {
    if (this._parent === parent) return this;
    if (this._parent) {
      const idx = this._parent._children.indexOf(this);
      if (idx !== -1) {
        this._parent._children.splice(idx, 1);
      }
    }
    this._parent = parent;
    if (parent) {
      parent._children.push(this);
    }
    this.markWorldDirty();
    return this;
  }
  addChild(child) {
    child.setParent(this);
    return this;
  }
  removeChild(child) {
    if (child._parent === this) {
      child.setParent(null);
    }
    return this;
  }
  removeFromParent() {
    this.setParent(null);
    return this;
  }
  traverse(callback) {
    callback(this);
    for (const child of this._children) {
      child.traverse(callback);
    }
  }
  get root() {
    let current = this;
    while (current._parent) {
      current = current._parent;
    }
    return current;
  }
  get position() {
    return this._position;
  }
  setPosition(x, y, z) {
    this._position = [x, y, z];
    this.markLocalDirty();
    return this;
  }
  translate(x, y, z) {
    this._position = vec3.add(this._position, [x, y, z]);
    this.markLocalDirty();
    return this;
  }
  get worldPosition() {
    const m = this.worldMatrix;
    return [m[12], m[13], m[14]];
  }
  get rotation() {
    return this._rotation;
  }
  setRotation(qx, qy, qz, qw) {
    this._rotation = quat.normalize([qx, qy, qz, qw]);
    this.markLocalDirty();
    return this;
  }
  setRotationFromAxisAngle(axis, angle) {
    this._rotation = quat.fromAxisAngle(vec3.normalize(axis), angle);
    this.markLocalDirty();
    return this;
  }
  setRotationFromEuler(x, y, z) {
    const qx = quat.fromAxisAngle([1, 0, 0], x);
    const qy = quat.fromAxisAngle([0, 1, 0], y);
    const qz = quat.fromAxisAngle([0, 0, 1], z);
    this._rotation = quat.mul(quat.mul(qz, qy), qx);
    this.markLocalDirty();
    return this;
  }
  rotateX(angle) {
    const q = quat.fromAxisAngle([1, 0, 0], angle);
    this._rotation = quat.normalize(quat.mul(this._rotation, q));
    this.markLocalDirty();
    return this;
  }
  rotateY(angle) {
    const q = quat.fromAxisAngle([0, 1, 0], angle);
    this._rotation = quat.normalize(quat.mul(this._rotation, q));
    this.markLocalDirty();
    return this;
  }
  rotateZ(angle) {
    const q = quat.fromAxisAngle([0, 0, 1], angle);
    this._rotation = quat.normalize(quat.mul(this._rotation, q));
    this.markLocalDirty();
    return this;
  }
  rotateOnAxis(axis, angle) {
    const q = quat.fromAxisAngle(vec3.normalize(axis), angle);
    this._rotation = quat.normalize(quat.mul(this._rotation, q));
    this.markLocalDirty();
    return this;
  }
  get scale() {
    return this._scale;
  }
  setScale(x, y, z) {
    this._scale = [x, y, z];
    this.markLocalDirty();
    return this;
  }
  setUniformScale(s) {
    this._scale = [s, s, s];
    this.markLocalDirty();
    return this;
  }
  get localMatrix() {
    if (this._localDirty || !this._localMatrix) {
      this._localMatrix = this.computeLocalMatrix();
      this._localDirty = false;
    }
    return this._localMatrix;
  }
  get worldMatrix() {
    if (this._worldDirty || !this._worldMatrix) {
      this._worldMatrix = this.computeWorldMatrix();
      this._worldDirty = false;
    }
    return this._worldMatrix;
  }
  computeLocalMatrix() {
    const [px, py, pz] = this._position;
    const [qx, qy, qz, qw] = this._rotation;
    const [sx, sy, sz] = this._scale;
    const xx = qx * qx, yy = qy * qy, zz = qz * qz;
    const xy = qx * qy, xz = qx * qz, yz = qy * qz;
    const wx = qw * qx, wy = qw * qy, wz = qw * qz;
    return [
      (1 - 2 * (yy + zz)) * sx,
      2 * (xy + wz) * sx,
      2 * (xz - wy) * sx,
      0,
      2 * (xy - wz) * sy,
      (1 - 2 * (xx + zz)) * sy,
      2 * (yz + wx) * sy,
      0,
      2 * (xz + wy) * sz,
      2 * (yz - wx) * sz,
      (1 - 2 * (xx + yy)) * sz,
      0,
      px,
      py,
      pz,
      1
    ];
  }
  computeWorldMatrix() {
    const local = this.localMatrix;
    if (this._parent) {
      return mat4.mul(this._parent.worldMatrix, local);
    }
    return local;
  }
  markLocalDirty() {
    this._localDirty = true;
    this.markWorldDirty();
  }
  markWorldDirty() {
    if (this._worldDirty) return;
    this._worldDirty = true;
    for (const child of this._children) {
      child.markWorldDirty();
    }
  }
  reset() {
    this._position = [0, 0, 0];
    this._rotation = [0, 0, 0, 1];
    this._scale = [1, 1, 1];
    this.markLocalDirty();
    return this;
  }
  copyFrom(other) {
    this._position = [...other._position];
    this._rotation = [...other._rotation];
    this._scale = [...other._scale];
    this.markLocalDirty();
    return this;
  }
  clone() {
    const t = new _Transform();
    t.copyFrom(this);
    return t;
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
      const radius = v * (radiusBottom - radiusTop) + radiusTop;
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
        indices.push(a, b, d, b, c, d);
      }
    }
    index = positions.length / 3;
    const generateCap = (top) => {
      const y = top ? halfHeight : -halfHeight;
      const radius = top ? radiusTop : radiusBottom;
      const normalY = top ? 1 : -1;
      if (radius === 0) return;
      const centerIndex = positions.length / 3;
      positions.push(0, y, 0);
      normals.push(0, normalY, 0);
      uvs.push(0.5, 0.5);
      for (let ix = 0; ix <= radialSegments; ix++) {
        const u = ix / radialSegments;
        const theta = u * Math.PI * 2;
        const x = radius * Math.sin(theta);
        const z = radius * Math.cos(theta);
        positions.push(x, y, z);
        normals.push(0, normalY, 0);
        uvs.push(Math.sin(theta) * 0.5 + 0.5, Math.cos(theta) * 0.5 + 0.5);
      }
      for (let ix = 0; ix < radialSegments; ix++) {
        const i = centerIndex + 1 + ix;
        if (top) {
          indices.push(centerIndex, i, i + 1);
        } else {
          indices.push(centerIndex, i + 1, i);
        }
      }
    };
    if (!openEnded) {
      generateCap(true);
      generateCap(false);
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
      const n = faceNormal(t0, b0, t1);
      positions.push(...t0, ...b0, ...b1, ...t1);
      normals.push(...n, ...n, ...n, ...n);
      const u0 = i / sides;
      const u1 = (i + 1) / sides;
      uvs.push(u0, 0, u0, 1, u1, 1, u1, 0);
      indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
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
      indices.push(topCenterIdx, topCenterIdx + 1 + i, topCenterIdx + 1 + next);
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
      indices.push(bottomCenterIdx, bottomCenterIdx + 1 + next, bottomCenterIdx + 1 + i);
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
