struct MaterialUniforms {
    dataLayout: vec4f,
    range0: vec4f,
    range1: vec4f,
    scaleParams: vec4f,
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

fn clamp01(x: f32) -> f32 {
    return clamp(x, 0.0, 1.0);
}

fn srgbFromLinear(c: vec3f) -> vec3f {
    let a = vec3f(0.055);
    return select(12.92 * c, (1.0 + a) * pow(c, vec3f(1.0 / 2.4)) - a, c > vec3f(0.0031308));
}

fn logBase(x: f32, base: f32) -> f32 {
    let b = max(base, 1.000001);
    return log(x) / log(b);
}

fn applyScale(x: f32, scaleMode: u32, linthresh: f32, base: f32) -> f32 {
    if (scaleMode == 0u) {
        return x;
    }
    if (scaleMode == 1u) {
        return logBase(max(x, 1e-20), base);
    }
    let lt = max(linthresh, 1e-20);
    let s = select(-1.0, 1.0, x >= 0.0);
    let y = logBase(1.0 + abs(x) / lt, base);
    return s * y;
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
    let componentCount = max(1u, min(4u, u32(material.dataLayout.x + 0.5)));
    let stride = max(1u, u32(material.dataLayout.w + 0.5));
    let dataOffset = u32(material.scaleParams.w + 0.5);
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
    let componentCount = max(1u, min(4u, u32(material.dataLayout.x + 0.5)));
    let componentIndex = min(3u, u32(material.dataLayout.y + 0.5));
    let valueMode = u32(material.dataLayout.z + 0.5);
    var v: f32 = 0.0;
    if (valueMode == 1u) {
        if (componentCount == 1u) {
            v = abs(in.dataValue.x);
        } else if (componentCount == 2u) {
            v = length(in.dataValue.xy);
        } else if (componentCount == 3u) {
            v = length(in.dataValue.xyz);
        } else {
            v = length(in.dataValue);
        }
    } else {
        v = select(
                select(
                    select(
                        in.dataValue.x,
                        in.dataValue.y,
                        componentIndex == 1u
                    ),
                    in.dataValue.z,
                    componentIndex == 2u
                ),
                in.dataValue.w,
                componentIndex == 3u
        );
    }
    if (isNan(v) || isInf(v)) {
        discard;
    }
    let clipMin = material.range0.z;
    let clipMax = material.range0.w;
    if (clipMax > clipMin) {
        v = clamp(v, clipMin, clipMax);
    }
    var domainMin = material.range0.x;
    var domainMax = material.range0.y;
    if (domainMax <= domainMin && clipMax > clipMin) {
        domainMin = clipMin;
        domainMax = clipMax;
    }
    let scaleMode = u32(material.scaleParams.x + 0.5);
    let linthresh = material.scaleParams.y;
    let base = material.scaleParams.z;
    let a = applyScale(domainMin, scaleMode, linthresh, base);
    let b = applyScale(domainMax, scaleMode, linthresh, base);
    let x = applyScale(v, scaleMode, linthresh, base);
    let denom = max(1e-20, b - a);
    var t = clamp01((x - a) / denom);
    let gamma = max(material.range1.z, 1e-6);
    t = pow(t, gamma);
    if (material.range1.w > 0.5) {
        t = 1.0 - t;
    }
    let t0 = clamp01(material.range1.x);
    let t1 = clamp01(material.range1.y);
    let tc = clamp01(t0 + t * (t1 - t0));
    var cmap = textureSample(colormapTex, colormapSampler, tc);
    let shading = clamp01(material.colorParams.y);
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
        cmap.rgb = mix(cmap.rgb, shadedRgb, shading);
    }
    let opacity = clamp01(material.colorParams.x);
    cmap.a = cmap.a * opacity;
    cmap.rgb = clamp(cmap.rgb, vec3f(0.0), vec3f(1.0));
    return vec4f(srgbFromLinear(cmap.rgb), cmap.a);
}
