// src/shaders.ts
var WGSL = {
  cube: {
    uniforms: (
      /* wgsl */
      `
struct Uniforms {
	mvp : mat4x4<f32>
};
@group(0) @binding(0) var<uniform> u : Uniforms;
`
    ),
    vertex: (
      /* wgsl */
      `
struct VSIn {
	@location(0) pos : vec3<f32>,
	@location(1) col : vec3<f32>,
};

struct VSOut {
	@builtin(position) Position : vec4<f32>,
	@location(0) col : vec3<f32>,
};

@vertex
fn vsMain(input : VSIn) -> VSOut {
	var out : VSOut;
	out.Position = u.mvp * vec4<f32>(input.pos, 1.0);
	out.col = input.col;
	return out;
}
`
    ),
    fragment: (
      /* wgsl */
      `
@fragment
fn fsMain(input : VSOut) -> @location(0) vec4<f32> {
	return vec4<f32>(input.col, 1.0);
}
`
    ),
    code() {
      return this.uniforms + this.vertex + this.fragment;
    }
  }
};

// src/util.ts
var assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
var alignTo = (n, alignment) => {
  return Math.ceil(n / alignment) * alignment;
};
var createBuffer = (device, data, usage) => {
  const buffer = device.createBuffer({
    size: alignTo(data.byteLength, 4),
    usage,
    mappedAtCreation: true
  });
  new Uint8Array(buffer.getMappedRange()).set(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  );
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

// src/math.ts
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
  if (!mod) {
    throw new Error("Math module not initialized. Call await initMath() first.");
  }
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

// src/core.ts
var WasmGPU = class _WasmGPU {
  constructor() {
    this.clearColor = { r: 0, g: 0, b: 0, a: 1 };
    this.indexCount = 0;
    this.width = 0;
    this.height = 0;
  }
  static async create(canvas, _opts = {}) {
    const w = new _WasmGPU();
    await w.init(canvas);
    return w;
  }
  async init(canvas) {
    await initMath();
    this.canvas = canvas;
    assert("gpu" in navigator, "WebGPU not supported in this browser.");
    const adapter = await navigator.gpu.requestAdapter();
    assert(adapter, "Failed to get GPU adapter.");
    this.device = await adapter.requestDevice();
    this.queue = this.device.queue;
    this.context = canvas.getContext("webgpu");
    assert(this.context, "Failed to get webgpu canvas context.");
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.configureContext();
    this.createDepthResources();
    this.createCubePipelineAndBuffers();
  }
  setClearColor(r, g, b, a = 1) {
    this.clearColor = { r: r / 255, g: g / 255, b: b / 255, a };
  }
  /**
   * Call on resize (or just call every frame if you want; it’s cheap if unchanged).
   */
  resizeToCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.configureContext();
    this.createDepthResources();
  }
  renderFrame(timeSeconds) {
    this.resizeToCanvas();
    const aspect = this.width / this.height;
    const proj = mat4.perspective(60 * Math.PI / 180, aspect, 0.1, 100);
    const view = mat4.lookAt([0, 0, 4], [0, 0, 0], [0, 1, 0]);
    let model = mat4.identity();
    model = mat4.rotateY(model, timeSeconds);
    const mv = mat4.mul(view, model);
    const mvp = mat4.mul(proj, mv);
    const mvpF32 = new Float32Array(mvp);
    this.queue.writeBuffer(this.uniformBuffer, 0, mvpF32.buffer, mvpF32.byteOffset, mvpF32.byteLength);
    const colorView = this.context.getCurrentTexture().createView();
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: colorView,
          clearValue: this.clearColor,
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
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setIndexBuffer(this.indexBuffer, "uint16");
    pass.drawIndexed(this.indexCount);
    pass.end();
    this.queue.submit([encoder.finish()]);
  }
  configureContext() {
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque"
    });
  }
  createDepthResources() {
    if (this.depthTexture) {
    }
    this.depthTexture = createDepthTexture(this.device, this.width || this.canvas.width, this.height || this.canvas.height);
    this.depthView = this.depthTexture.createView();
  }
  createCubePipelineAndBuffers() {
    const shader = this.device.createShaderModule({
      code: WGSL.cube.code()
    });
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" }
        }
      ]
    });
    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });
    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shader,
        entryPoint: "vsMain",
        buffers: [
          {
            arrayStride: 6 * 4,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x3" },
              { shaderLocation: 1, offset: 3 * 4, format: "float32x3" }
            ]
          }
        ]
      },
      fragment: {
        module: shader,
        entryPoint: "fsMain",
        targets: [{ format: this.format }]
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "back",
        frontFace: "ccw"
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less"
      }
    });
    const verts = new Float32Array([
      -1,
      -1,
      1,
      1,
      0,
      0,
      1,
      -1,
      1,
      0,
      1,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      -1,
      1,
      1,
      1,
      1,
      0,
      -1,
      -1,
      -1,
      1,
      0,
      1,
      1,
      -1,
      -1,
      0,
      1,
      1,
      1,
      1,
      -1,
      1,
      1,
      1,
      -1,
      1,
      -1,
      0,
      0,
      0
    ]);
    const indices = new Uint16Array([
      0,
      1,
      2,
      0,
      2,
      3,
      1,
      5,
      6,
      1,
      6,
      2,
      5,
      4,
      7,
      5,
      7,
      6,
      4,
      0,
      3,
      4,
      3,
      7,
      3,
      2,
      6,
      3,
      6,
      7,
      4,
      5,
      1,
      4,
      1,
      0
    ]);
    this.vertexBuffer = createBuffer(this.device, verts, GPUBufferUsage.VERTEX);
    this.indexBuffer = createBuffer(this.device, indices, GPUBufferUsage.INDEX);
    this.indexCount = indices.length;
    this.uniformBuffer = this.device.createBuffer({
      size: 16 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer }
        }
      ]
    });
  }
};
export {
  WasmGPU,
  WasmGPU as default,
  initMath,
  mat4,
  quat,
  vec3
};
