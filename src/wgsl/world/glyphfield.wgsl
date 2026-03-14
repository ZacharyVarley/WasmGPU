fn scale_is_nan(v: f32) -> bool {
    let u = bitcast<u32>(v);
    return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) != 0u;
}

fn scale_is_inf(v: f32) -> bool {
    let u = bitcast<u32>(v);
    return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) == 0u;
}

fn scale_is_finite(v: f32) -> bool {
    return !scale_is_nan(v) && !scale_is_inf(v);
}

fn scale_clamp01(x: f32) -> f32 {
    return clamp(x, 0.0, 1.0);
}

fn scale_log_base(x: f32, base: f32) -> f32 {
    let b = max(base, 1.000001);
    return log(x) / log(b);
}

fn scale_apply_mode(x: f32, modeId: u32, linthresh: f32, base: f32) -> f32 {
    if (modeId == 0u) {
        return x;
    }
    if (modeId == 1u) {
        return scale_log_base(max(x, 1e-20), base);
    }
    let lt = max(linthresh, 1e-20);
    let s = select(-1.0, 1.0, x >= 0.0);
    let y = scale_log_base(1.0 + abs(x) / lt, base);
    return s * y;
}

fn scale_select_value(v: vec4f, componentCountIn: u32, componentIndexIn: u32, valueMode: u32) -> f32 {
    let componentCount = max(1u, min(4u, componentCountIn));
    let componentIndex = min(3u, componentIndexIn);
    if (valueMode == 1u) {
        if (componentCount == 1u) { return abs(v.x); }
        if (componentCount == 2u) { return length(v.xy); }
        if (componentCount == 3u) { return length(v.xyz); }
        return length(v);
    }
    if (componentIndex == 0u) { return v.x; }
    if (componentIndex == 1u) { return v.y; }
    if (componentIndex == 2u) { return v.z; }
    return v.w;
}

fn scale_apply_transform(rawValue: f32, domain: vec4f, clampConfig: vec4f, params: vec4f, flags: vec4f) -> f32 {
    if (!scale_is_finite(rawValue)) {
        return 0.0;
    }
    var v = rawValue;
    let clampMode = u32(domain.w + 0.5);
    let clampMin = clampConfig.x;
    let clampMax = clampConfig.y;
    if (clampMode != 0u && clampMax > clampMin) {
        v = clamp(v, clampMin, clampMax);
    }
    var d0 = domain.x;
    var d1 = domain.y;
    if (d1 <= d0 && clampMax > clampMin) {
        d0 = clampMin;
        d1 = clampMax;
    }
    let modeId = u32(params.x + 0.5);
    let base = params.y;
    let linthresh = params.z;
    let gamma = max(params.w, 1e-6);
    let a = scale_apply_mode(d0, modeId, linthresh, base);
    let b = scale_apply_mode(d1, modeId, linthresh, base);
    let x = scale_apply_mode(v, modeId, linthresh, base);
    let denom = max(1e-20, b - a);
    var t = scale_clamp01((x - a) / denom);
    t = pow(t, gamma);
    if (flags.x > 0.5) {
        t = 1.0 - t;
    }
    return scale_clamp01(t);
}

@group(1) @binding(0) var<storage, read> positions: array<vec4f>;
@group(1) @binding(1) var<storage, read> rotations: array<vec4f>;
@group(1) @binding(2) var<storage, read> scales: array<vec4f>;
@group(1) @binding(3) var<storage, read> attributes: array<vec4f>;

struct GlyphFieldUniforms {
    scaleSource: vec4f,
    scaleDomain: vec4f,
    scaleClamp: vec4f,
    scaleParams: vec4f,
    scaleFlags: vec4f,
    visual: vec4f,
    solidColor: vec4f,
    colors: array<vec4f, 8>
};

@group(1) @binding(4) var<uniform> glyph: GlyphFieldUniforms;
@group(1) @binding(5) var colormapSampler: sampler;
@group(1) @binding(6) var colormapTex: texture_1d<f32>;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) normal: vec3f,
    @location(2) @interpolate(flat) attrib: vec4f
};

struct CameraUniforms {
    viewProj: mat4x4f,
    position: vec3f,
    _pad0: f32
};

struct ModelUniforms {
    model: mat4x4f,
    normal: mat4x4f
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

fn srgbFromLinear(linear: vec3f) -> vec3f {
    let a = 0.055;
    let lo = 12.92 * linear;
    let hi = (1.0 + a) * pow(linear, vec3f(1.0 / 2.4)) - vec3f(a);
    let useHi = linear > vec3f(0.0031308);
    return select(lo, hi, useHi);
}

fn rotateByQuat(v: vec3f, q: vec4f) -> vec3f {
    let u = q.xyz;
    let s = q.w;
    let t = 2.0 * cross(u, v);
    return v + s * t + cross(u, t);
}

fn sampleCustomStops(t: f32) -> vec4f {
    let count = u32(glyph.visual.y + 0.5);
    if (count <= 1u) {
        return glyph.colors[0u];
    }
    let n = min(count, 8u);
    let x = scale_clamp01(t) * f32(n - 1u);
    let i = u32(floor(x));
    let f = x - f32(i);
    if (i >= n - 1u) {
        return glyph.colors[n - 1u];
    }
    return glyph.colors[i] + f * (glyph.colors[i + 1u] - glyph.colors[i]);
}

fn colormap(tIn: f32) -> vec4f {
    let t = scale_clamp01(tIn);
    let stopCount = u32(glyph.visual.y + 0.5);
    if (stopCount >= 2u) {
        return sampleCustomStops(t);
    }
    return textureSample(colormapTex, colormapSampler, t);
}

fn applyLighting(worldPos: vec3f, N: vec3f, baseColor: vec3f) -> vec3f {
    var Lo = lighting.ambient.rgb * baseColor;
    let lightCount = min(lighting.lightCount, 8u);
    for (var i = 0u; i < lightCount; i++) {
        let light = lighting.lights[i];
        var L: vec3f;
        var attenuation: f32 = 1.0;
        if (light.position.w == 0.0) {
            L = normalize(-light.position.xyz);
        } else {
            let lightDir = light.position.xyz - worldPos;
            let distance = length(lightDir);
            L = select(vec3f(0.0, 1.0, 0.0), lightDir / distance, distance > 1e-6);
            attenuation = 1.0 / max(distance * distance, 1e-6);
            let range = light.params.x;
            if (range > 0.0) {
                let f = scale_clamp01(1.0 - distance / range);
                attenuation *= f * f;
            }
        }
        let NdotL = max(dot(N, L), 0.0);
        let radiance = light.color.rgb * light.color.a * attenuation;
        Lo += baseColor * radiance * NdotL;
    }
    return Lo;
}

fn vec4Component(v: vec4f, idx: u32) -> f32 {
    if (idx == 0u) { return v.x; }
    if (idx == 1u) { return v.y; }
    if (idx == 2u) { return v.z; }
    return v.w;
}

fn shiftedValueVector(v: vec4f, offsetFloats: f32) -> vec4f {
    let o = min(3u, u32(offsetFloats + 0.5));
    let i0 = min(3u, o + 0u);
    let i1 = min(3u, o + 1u);
    let i2 = min(3u, o + 2u);
    let i3 = min(3u, o + 3u);
    return vec4f(vec4Component(v, i0), vec4Component(v, i1), vec4Component(v, i2), vec4Component(v, i3));
}

@vertex
fn vs_main(in: VertexInput, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    let p4 = positions[instanceIndex];
    let q = rotations[instanceIndex];
    let s4 = scales[instanceIndex];
    let a4 = attributes[instanceIndex];
    let scl = s4.xyz;
    let localPos = rotateByQuat(in.position * scl, q) + p4.xyz;
    let worldPos4 = model.model * vec4f(localPos, 1.0);
    let worldPos = worldPos4.xyz;
    let invScale = 1.0 / max(abs(scl), vec3f(1e-6));
    let localN = in.normal * invScale;
    let instN = rotateByQuat(localN, q);
    let worldN = normalize((model.normal * vec4f(instN, 0.0)).xyz);
    var out: VertexOutput;
    out.position = camera.viewProj * vec4f(worldPos, 1.0);
    out.worldPos = worldPos;
    out.normal = worldN;
    out.attrib = a4;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    let colorMode = u32(round(glyph.visual.z));
    let lit = glyph.visual.w > 0.5;
    var baseColor: vec3f;
    var alpha: f32 = 1.0;
    if (colorMode == 0u) {
        baseColor = in.attrib.rgb;
        alpha = in.attrib.a;
    } else if (colorMode == 1u) {
        let shifted = shiftedValueVector(in.attrib, glyph.scaleDomain.z);
        let componentCount = u32(glyph.scaleSource.x + 0.5);
        let componentIndex = u32(glyph.scaleSource.y + 0.5);
        let valueMode = u32(glyph.scaleSource.z + 0.5);
        let rawValue = scale_select_value(shifted, componentCount, componentIndex, valueMode);
        if (!scale_is_finite(rawValue)) {
            discard;
        }
        let t = scale_apply_transform(rawValue, vec4f(glyph.scaleDomain.x, glyph.scaleDomain.y, 0.0, glyph.scaleDomain.w), glyph.scaleClamp, glyph.scaleParams, glyph.scaleFlags);
        let cmap = colormap(t);
        baseColor = cmap.rgb;
        alpha = cmap.a;
    } else {
        baseColor = glyph.solidColor.rgb;
        alpha = glyph.solidColor.a;
    }
    baseColor = max(baseColor, vec3f(0.0));
    alpha = scale_clamp01(alpha) * scale_clamp01(glyph.visual.x);
    var shaded = baseColor;
    if (lit) {
        shaded = applyLighting(in.worldPos, normalize(in.normal), baseColor);
    }
    return vec4f(srgbFromLinear(shaded), alpha);
}
