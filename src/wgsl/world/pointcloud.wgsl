struct PointData {
    position: vec3<f32>,
    scalar: f32
};

@group(1) @binding(0) var<storage, read> points: array<PointData>;

struct PointCloudUniforms {
    sizeParams: vec4<f32>,
    scalarParams: vec4<f32>,
    options: vec4<f32>,
    colors: array<vec4<f32>, 8>
};

@group(1) @binding(1) var<uniform> pc: PointCloudUniforms;
@group(1) @binding(2) var colormapSampler: sampler;
@group(1) @binding(3) var colormapTex: texture_1d<f32>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) t: f32,
    @location(1) pointCoord: vec2<f32>
};

struct CameraUniforms {
    viewProj: mat4x4<f32>,
    position: vec3<f32>,
    _pad0: f32
};

struct ModelUniforms {
    model: mat4x4<f32>,
    normal: mat4x4<f32>
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;

fn srgbFromLinear(linear: vec3<f32>) -> vec3<f32> {
    let a = 0.055;
    let lo = 12.92 * linear;
    let hi = (1.0 + a) * pow(linear, vec3<f32>(1.0 / 2.4)) - vec3<f32>(a);
    let useHi = linear > vec3<f32>(0.0031308);
    return select(lo, hi, useHi);
}

fn saturate(x: f32) -> f32 {
    return clamp(x, 0.0, 1.0);
}

fn sampleCustomStops(t: f32) -> vec4<f32> {
    let count = u32(pc.options.z + 0.5);
    if (count <= 1u) {
        return pc.colors[0u];
    }
    let n = min(count, 8u);
    let x = saturate(t) * f32(n - 1u);
    let i = u32(floor(x));
    let f = x - f32(i);
    if (i >= n - 1u) {
        return pc.colors[n - 1u];
    }
    return pc.colors[i] + f * (pc.colors[i + 1u] - pc.colors[i]);
}

fn colormap(tIn: f32) -> vec4<f32> {
    let t = saturate(tIn);
    let stopCount = u32(pc.options.z + 0.5);
    if (stopCount >= 2u) {
        return sampleCustomStops(t);
    }
    return textureSample(colormapTex, colormapSampler, t);
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    let p = points[instanceIndex];
    let worldPos = model.model * vec4<f32>(p.position, 1.0);
    let clip = camera.viewProj * worldPos;
    let dist = distance(camera.position, worldPos.xyz);
    let baseSize = pc.sizeParams.x;
    let minSize = pc.sizeParams.y;
    let maxSize = pc.sizeParams.z;
    let atten = pc.sizeParams.w;
    var sizePx = baseSize;
    if (atten > 0.0) {
        sizePx = baseSize * (atten / max(dist, 1e-6));
    }
    sizePx = clamp(sizePx, minSize, maxSize);
    var uv = vec2<f32>(0.0);
    if (vertexIndex == 0u) {
        uv = vec2<f32>(0.0, 0.0);
    } else if (vertexIndex == 1u) {
        uv = vec2<f32>(1.0, 0.0);
    } else if (vertexIndex == 2u) {
        uv = vec2<f32>(0.0, 1.0);
    } else if (vertexIndex == 3u) {
        uv = vec2<f32>(1.0, 0.0);
    } else if (vertexIndex == 4u) {
        uv = vec2<f32>(1.0, 1.0);
    } else if (vertexIndex == 5u) {
        uv = vec2<f32>(0.0, 1.0);
    }
    let ndcSize = sizePx / 800.0;
    let aspect = abs(camera.viewProj[1][1] / max(abs(camera.viewProj[0][0]), 1e-6));
    let offsetX = (uv.x - 0.5) * ndcSize / aspect * clip.w;
    let offsetY = -(uv.y - 0.5) * ndcSize * clip.w;
    var out: VertexOutput;
    out.position = clip + vec4<f32>(offsetX, offsetY, 0.0, 0.0);
    out.pointCoord = uv;
    let denom = max(pc.scalarParams.y - pc.scalarParams.x, 1e-6);
    var t = (p.scalar - pc.scalarParams.x) / denom;
    if (pc.options.x > 0.5) {
        t = 1.0 - t;
    }
    out.t = pow(saturate(t), pc.scalarParams.w);
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = in.pointCoord * 2.0 - vec2<f32>(1.0, 1.0);
    let r2 = dot(uv, uv);
    if (r2 > 1.0) {
        discard;
    }
    let softness = pc.options.w;
    var alpha = 1.0;
    if (softness > 0.0) {
        let r = sqrt(r2);
        alpha = 1.0 - smoothstep(1.0 - softness, 1.0, r);
    }
    var c = colormap(in.t);
    c.a = c.a * pc.scalarParams.z * alpha;
    c = vec4<f32>(srgbFromLinear(c.rgb), c.a);
    return c;
}
