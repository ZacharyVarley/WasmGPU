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
@group(1) @binding(5) var colormapSampler: sampler;
@group(1) @binding(6) var colormapTex: texture_1d<f32>;

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

fn rotateByQuat(v: vec3<f32>, q: vec4<f32>) -> vec3<f32> {
    let u = q.xyz;
    let s = q.w;
    let t = 2.0 * cross(u, v);
    return v + s * t + cross(u, t);
}

fn sampleCustomStops(t: f32) -> vec4<f32> {
    let count = u32(glyph.options.z + 0.5);
    if (count <= 1u) {
        return glyph.colors[0u];
    }
    let n = min(count, 8u);
    let x = saturate(t) * f32(n - 1u);
    let i = u32(floor(x));
    let f = x - f32(i);
    if (i >= n - 1u) {
        return glyph.colors[n - 1u];
    }
    return glyph.colors[i] + f * (glyph.colors[i + 1u] - glyph.colors[i]);
}

fn colormap(tIn: f32) -> vec4<f32> {
    let t = saturate(tIn);
    let stopCount = u32(glyph.options.z + 0.5);
    if (stopCount >= 2u) {
        return sampleCustomStops(t);
    }
    return textureSample(colormapTex, colormapSampler, t);
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
        let cmap = colormap(t);
        baseColor = cmap.rgb;
        alpha = cmap.a;
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
