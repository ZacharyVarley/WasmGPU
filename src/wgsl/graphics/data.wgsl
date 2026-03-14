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

struct MaterialUniforms {
    scaleSource: vec4f,
    scaleDomain: vec4f,
    scaleClamp: vec4f,
    scaleParams: vec4f,
    scaleFlags: vec4f,
    colorParams: vec4f
};

@group(1) @binding(0) var<uniform> material: MaterialUniforms;
@group(1) @binding(1) var<storage, read> data: array<f32>;
@group(1) @binding(2) var colormapSampler: sampler;
@group(1) @binding(3) var colormapTex: texture_1d<f32>;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) normal: vec3f,
    @location(2) dataValue: vec4f
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

fn srgbFromLinear(c: vec3f) -> vec3f {
    let a = vec3f(0.055);
    return select(12.92 * c, (1.0 + a) * pow(c, vec3f(1.0 / 2.4)) - a, c > vec3f(0.0031308));
}

fn luminance(rgb: vec3f) -> f32 {
    return dot(rgb, vec3f(0.2126, 0.7152, 0.0722));
}

@vertex
fn vs_main(in: VertexInput, @builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var out: VertexOutput;
    let worldPos4 = model.model * vec4f(in.position, 1.0);
    out.position = camera.viewProjection * worldPos4;
    out.worldPos = worldPos4.xyz;
    out.normal = normalize((model.normalMatrix * vec4f(in.normal, 0.0)).xyz);
    let componentCount = max(1u, min(4u, u32(material.scaleSource.x + 0.5)));
    let stride = max(1u, u32(material.scaleSource.w + 0.5));
    let dataOffset = u32(material.scaleDomain.z + 0.5);
    let base = vertexIndex * stride + dataOffset;
    var x: f32 = data[base + 0u];
    var y: f32 = 0.0;
    var z: f32 = 0.0;
    var w: f32 = 0.0;
    if (componentCount > 1u) { y = data[base + 1u]; }
    if (componentCount > 2u) { z = data[base + 2u]; }
    if (componentCount > 3u) { w = data[base + 3u]; }
    out.dataValue = vec4f(x, y, z, w);
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    let componentCount = max(1u, min(4u, u32(material.scaleSource.x + 0.5)));
    let componentIndex = min(3u, u32(material.scaleSource.y + 0.5));
    let valueMode = u32(material.scaleSource.z + 0.5);
    let v = scale_select_value(in.dataValue, componentCount, componentIndex, valueMode);
    if (!scale_is_finite(v)) {
        discard;
    }
    let t = scale_apply_transform(v, vec4f(material.scaleDomain.x, material.scaleDomain.y, 0.0, material.scaleDomain.w), material.scaleClamp, material.scaleParams, material.scaleFlags);
    var cmap = textureSample(colormapTex, colormapSampler, t);
    let shading = scale_clamp01(material.colorParams.y);
    if (shading > 0.0) {
        let N = normalize(in.normal);
        var lightFactor: f32 = luminance(lighting.ambient.rgb);
        for (var i = 0u; i < lighting.lightCount; i++) {
            let light = lighting.lights[i];
            var L: vec3f;
            var attenuation: f32 = 1.0;
            if (light.position.w == 0.0) {
                L = normalize(-light.position.xyz);
            } else {
                let lightDir = light.position.xyz - in.worldPos;
                let dist = length(lightDir);
                L = normalize(lightDir);
                attenuation = 1.0 / max(1e-6, dist * dist);
            }
            let ndotl = max(dot(N, L), 0.0);
            let lum = luminance(light.color.rgb) * light.color.a;
            lightFactor += lum * attenuation * ndotl;
        }
        let shadedRgb = cmap.rgb * lightFactor;
        cmap = vec4f(mix(cmap.rgb, shadedRgb, shading), cmap.a);
    }
    let opacity = scale_clamp01(material.colorParams.x);
    let finalA = cmap.a * opacity;
    let finalRgb = clamp(cmap.rgb, vec3f(0.0), vec3f(1.0));
    cmap = vec4f(finalRgb, finalA);
    return vec4f(srgbFromLinear(cmap.rgb), cmap.a);
}
