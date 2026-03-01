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

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @builtin(point_size) pointSize: f32,
    @location(0) t: f32
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

fn lerp(a: vec3<f32>, b: vec3<f32>, t: f32) -> vec3<f32> {
    return a + t * (b - a);
}

const TURBO_STOPS: array<vec3<f32>, 8> = array<vec3<f32>, 8>(
    vec3<f32>(0.18995, 0.07176, 0.23217),
    vec3<f32>(0.25107, 0.25237, 0.63374),
    vec3<f32>(0.27628, 0.41652, 0.94105),
    vec3<f32>(0.20206, 0.65991, 0.98456),
    vec3<f32>(0.12756, 0.81980, 0.55455),
    vec3<f32>(0.47750, 0.95192, 0.14111),
    vec3<f32>(0.88360, 0.82706, 0.04124),
    vec3<f32>(0.98360, 0.48249, 0.27230)
);

const VIRIDIS_STOPS: array<vec3<f32>, 8> = array<vec3<f32>, 8>(
    vec3<f32>(0.26700, 0.00487, 0.32942),
    vec3<f32>(0.27495, 0.19938, 0.49704),
    vec3<f32>(0.21240, 0.35968, 0.55217),
    vec3<f32>(0.15336, 0.49700, 0.55772),
    vec3<f32>(0.12231, 0.63315, 0.53040),
    vec3<f32>(0.28892, 0.75839, 0.42843),
    vec3<f32>(0.62658, 0.85465, 0.22335),
    vec3<f32>(0.99325, 0.90616, 0.14394)
);

const MAGMA_STOPS: array<vec3<f32>, 8> = array<vec3<f32>, 8>(
    vec3<f32>(0.00146, 0.00047, 0.01387),
    vec3<f32>(0.08285, 0.07968, 0.21277),
    vec3<f32>(0.22111, 0.11957, 0.34655),
    vec3<f32>(0.37423, 0.16129, 0.40945),
    vec3<f32>(0.53312, 0.22127, 0.41007),
    vec3<f32>(0.71639, 0.31726, 0.37420),
    vec3<f32>(0.90200, 0.47331, 0.32110),
    vec3<f32>(0.98705, 0.99144, 0.74950)
);

const PLASMA_STOPS: array<vec3<f32>, 8> = array<vec3<f32>, 8>(
    vec3<f32>(0.05038, 0.02980, 0.52798),
    vec3<f32>(0.20788, 0.01698, 0.59336),
    vec3<f32>(0.34393, 0.06224, 0.63377),
    vec3<f32>(0.47578, 0.10964, 0.65108),
    vec3<f32>(0.61067, 0.17509, 0.62517),
    vec3<f32>(0.74139, 0.26130, 0.55876),
    vec3<f32>(0.86642, 0.36966, 0.46756),
    vec3<f32>(0.94002, 0.97516, 0.13133)
);

fn sampleStops8(stops: array<vec3<f32>, 8>, t: f32) -> vec3<f32> {
    let x = saturate(t) * 7.0;
    let i = u32(floor(x));
    let f = x - f32(i);
    if (i >= 7u) {
        return stops[7u];
    }
    return lerp(stops[i], stops[i + 1u], f);
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
    let cmap = u32(pc.options.y + 0.5);
    if (cmap == 0u) {
        return vec4<f32>(vec3<f32>(t), 1.0);
    } else if (cmap == 1u) {
        return vec4<f32>(sampleStops8(TURBO_STOPS, t), 1.0);
    } else if (cmap == 2u) {
        return vec4<f32>(sampleStops8(VIRIDIS_STOPS, t), 1.0);
    } else if (cmap == 3u) {
        return vec4<f32>(sampleStops8(MAGMA_STOPS, t), 1.0);
    } else if (cmap == 4u) {
        return vec4<f32>(sampleStops8(PLASMA_STOPS, t), 1.0);
    } else {
        return sampleCustomStops(t);
    }
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    let p = points[vertexIndex];
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
    let denom = max(pc.scalarParams.y - pc.scalarParams.x, 1e-6);
    var t = (p.scalar - pc.scalarParams.x) / denom;
    if (pc.options.x > 0.5) {
        t = 1.0 - t;
    }
    t = pow(saturate(t), pc.scalarParams.w);
    var out: VertexOutput;
    out.position = clip;
    out.pointSize = sizePx;
    out.t = t;
    return out;
}

@fragment
fn fs_main(in: VertexOutput, @builtin(point_coord) pointCoord: vec2<f32>) -> @location(0) vec4<f32> {
    let uv = pointCoord * 2.0 - vec2<f32>(1.0, 1.0);
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
    c.rgb = srgbFromLinear(c.rgb);
    return c;
}
