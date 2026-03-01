@group(1) @binding(0) var<storage, read> positions: array<vec4<f32>>;
@group(1) @binding(1) var<storage, read> rotations: array<vec4<f32>>;
@group(1) @binding(2) var<storage, read> scales: array<vec4<f32>>;
@group(1) @binding(3) var<storage, read> attributes: array<vec4<f32>>;

struct GlyphUniforms {
    scalarParams: vec4<f32>,
    options: vec4<f32>,
    lightingParams: vec4<f32>,
    colors: array<vec4<f32>, 8>
};

@group(1) @binding(4) var<uniform> glyph: GlyphUniforms;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) worldPos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) @interpolate(flat) attrib: vec4<f32>
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

struct Light {
    position: vec4<f32>,
    color: vec4<f32>,
    params: vec4<f32>
};

struct LightingUniforms {
    ambient: vec4<f32>,
    lightCount: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
    lights: array<Light, 8>
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(0) @binding(2) var<uniform> lighting: LightingUniforms;

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

fn rotateByQuat(v: vec3<f32>, q: vec4<f32>) -> vec3<f32> {
    let u = q.xyz;
    let s = q.w;
    let t = 2.0 * cross(u, v);
    return v + s * t + cross(u, t);
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
    vec3<f32>(0.13113, 0.05725, 0.35556),
    vec3<f32>(0.31238, 0.06789, 0.54309),
    vec3<f32>(0.50234, 0.09336, 0.59451),
    vec3<f32>(0.70468, 0.21172, 0.51867),
    vec3<f32>(0.86603, 0.42959, 0.38448),
    vec3<f32>(0.96436, 0.66756, 0.24003),
    vec3<f32>(0.98705, 0.99144, 0.74950)
);

const PLASMA_STOPS: array<vec3<f32>, 8> = array<vec3<f32>, 8>(
    vec3<f32>(0.05038, 0.02980, 0.52798),
    vec3<f32>(0.27259, 0.01296, 0.62272),
    vec3<f32>(0.44771, 0.00266, 0.66034),
    vec3<f32>(0.61067, 0.09020, 0.61995),
    vec3<f32>(0.74014, 0.21342, 0.52422),
    vec3<f32>(0.84679, 0.34255, 0.42058),
    vec3<f32>(0.92833, 0.47297, 0.32607),
    vec3<f32>(0.94002, 0.97516, 0.13133)
);

fn sampleStops(stops: array<vec3<f32>, 8>, t: f32) -> vec3<f32> {
    let x = saturate(t) * 7.0;
    let i0 = u32(floor(x));
    let i1 = min(i0 + 1u, 7u);
    let f = fract(x);
    return lerp(stops[i0], stops[i1], f);
}

fn sampleCustomStops(t: f32) -> vec3<f32> {
    let n = max(2.0, min(8.0, glyph.options.z));
    let x = saturate(t) * (n - 1.0);
    let i0 = u32(floor(x));
    let i1 = min(i0 + 1u, u32(n - 1.0));
    let f = fract(x);
    return lerp(glyph.colors[i0].rgb, glyph.colors[i1].rgb, f);
}

fn colormap(t: f32) -> vec3<f32> {
    let id = u32(round(glyph.options.y));
    switch (id) {
        case 0u: { return vec3<f32>(t, t, t); }
        case 1u: { return sampleStops(TURBO_STOPS, t); }
        case 2u: { return sampleStops(VIRIDIS_STOPS, t); }
        case 3u: { return sampleStops(MAGMA_STOPS, t); }
        case 4u: { return sampleStops(PLASMA_STOPS, t); }
        default: { return sampleCustomStops(t); }
    }
}

fn applyLighting(worldPos: vec3<f32>, N: vec3<f32>, baseColor: vec3<f32>) -> vec3<f32> {
    var Lo = lighting.ambient.rgb * baseColor;
    let lightCount = min(lighting.lightCount, 8u);
    for (var i = 0u; i < lightCount; i++) {
        let light = lighting.lights[i];
        var L: vec3<f32>;
        var attenuation: f32 = 1.0;
        if (light.position.w == 0.0) {
            L = normalize(-light.position.xyz);
        } else {
            let lightDir = light.position.xyz - worldPos;
            let distance = length(lightDir);
            L = select(vec3<f32>(0.0, 1.0, 0.0), lightDir / distance, distance > 1e-6);
            attenuation = 1.0 / max(distance * distance, 1e-6);
            let range = light.params.x;
            if (range > 0.0) {
                let f = saturate(1.0 - distance / range);
                attenuation *= f * f;
            }
        }
        let NdotL = max(dot(N, L), 0.0);
        let radiance = light.color.rgb * light.color.a * attenuation;
        Lo += baseColor * radiance * NdotL;
    }
    return Lo;
}

@vertex
fn vs_main(in: VertexInput, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    let p4 = positions[instanceIndex];
    let q = rotations[instanceIndex];
    let s4 = scales[instanceIndex];
    let a4 = attributes[instanceIndex];
    let scl = s4.xyz;
    let localPos = rotateByQuat(in.position * scl, q) + p4.xyz;
    let worldPos4 = model.model * vec4<f32>(localPos, 1.0);
    let worldPos = worldPos4.xyz;
    let invScale = 1.0 / max(abs(scl), vec3<f32>(1e-6));
    let localN = in.normal * invScale;
    let instN = rotateByQuat(localN, q);
    let worldN = normalize((model.normal * vec4<f32>(instN, 0.0)).xyz);
    var out: VertexOutput;
    out.position = camera.viewProj * vec4<f32>(worldPos, 1.0);
    out.worldPos = worldPos;
    out.normal = worldN;
    out.attrib = a4;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let scalarMin = glyph.scalarParams.x;
    let scalarMax = glyph.scalarParams.y;
    let opacity = saturate(glyph.scalarParams.z);
    let gamma = max(glyph.scalarParams.w, 1e-6);
    let invert = glyph.options.x > 0.5;
    let colorMode = u32(round(glyph.options.w));
    let lit = glyph.lightingParams.x > 0.5;
    var baseColor: vec3<f32>;
    var alpha: f32 = 1.0;
    if (colorMode == 0u) {
        baseColor = in.attrib.rgb;
        alpha = in.attrib.a;
    } else if (colorMode == 1u) {
        let denom = max(scalarMax - scalarMin, 1e-6);
        var t = saturate((in.attrib.x - scalarMin) / denom);
        if (invert) { t = 1.0 - t; }
        t = pow(t, gamma);
        baseColor = colormap(t);
        alpha = 1.0;
    } else {
        baseColor = glyph.lightingParams.yzw;
        alpha = 1.0;
    }
    baseColor = max(baseColor, vec3<f32>(0.0));
    alpha = saturate(alpha) * opacity;
    var shaded = baseColor;
    if (lit) {
        shaded = applyLighting(in.worldPos, normalize(in.normal), baseColor);
    }
    return vec4<f32>(srgbFromLinear(shaded), alpha);
}
