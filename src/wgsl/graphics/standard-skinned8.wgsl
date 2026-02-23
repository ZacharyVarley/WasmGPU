struct MaterialUniforms {
    color: vec4f,
    emissive: vec4f,
    params: vec4f,
    params2: vec4f
};

@group(1) @binding(0) var<uniform> material: MaterialUniforms;
@group(1) @binding(1) var baseColorSampler: sampler;
@group(1) @binding(2) var baseColorTex: texture_2d<f32>;
@group(1) @binding(3) var metallicRoughnessSampler: sampler;
@group(1) @binding(4) var metallicRoughnessTex: texture_2d<f32>;
@group(1) @binding(5) var normalSampler: sampler;
@group(1) @binding(6) var normalTex: texture_2d<f32>;
@group(1) @binding(7) var occlusionSampler: sampler;
@group(1) @binding(8) var occlusionTex: texture_2d<f32>;
@group(1) @binding(9) var emissiveSampler: sampler;
@group(1) @binding(10) var emissiveTex: texture_2d<f32>;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) joints0: vec4u,
    @location(4) weights0: vec4f,
    @location(5) joints1: vec4u,
    @location(6) weights1: vec4f
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

struct SkinBuffer {
    joints: array<mat4x4f>
};

@group(2) @binding(0) var<storage, read> skin: SkinBuffer;

const PI: f32 = 3.14159265359;

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let j0 = in.joints0;
    let w0 = in.weights0;
    let j1 = in.joints1;
    let w1 = in.weights1;
    let skinMatrix = skin.joints[j0.x] * w0.x +
                     skin.joints[j0.y] * w0.y +
                     skin.joints[j0.z] * w0.z +
                     skin.joints[j0.w] * w0.w +
                     skin.joints[j1.x] * w1.x +
                     skin.joints[j1.y] * w1.y +
                     skin.joints[j1.z] * w1.z +
                     skin.joints[j1.w] * w1.w;
    let localPos = skinMatrix * vec4f(in.position, 1.0);
    let localNormal = (skinMatrix * vec4f(in.normal, 0.0)).xyz;
    let worldPos4 = model.model * localPos;
    out.position = camera.viewProjection * worldPos4;
    out.worldPos = worldPos4.xyz;
    out.normal = normalize((model.normalMatrix * vec4f(localNormal, 0.0)).xyz);
    out.uv = in.uv;
    return out;
}

fn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f {
    return F0 + (vec3f(1.0) - F0) * pow(1.0 - cosTheta, 5.0);
}

fn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 {
    let a = roughness * roughness;
    let a2 = a * a;
    let NdotH = max(dot(N, H), 0.0);
    let NdotH2 = NdotH * NdotH;
    let denom = (NdotH2 * (a2 - 1.0) + 1.0);
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
    let ggx2 = geometrySchlickGGX(NdotV, roughness);
    let ggx1 = geometrySchlickGGX(NdotL, roughness);
    return ggx1 * ggx2;
}

fn toneMap(color: vec3f) -> vec3f {
    return color / (color + vec3f(1.0));
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    let baseColor = material.color * textureSample(baseColorTex, baseColorSampler, in.uv);
    let mrSample = textureSample(metallicRoughnessTex, metallicRoughnessSampler, in.uv);
    let metallic = material.params.z * mrSample.b;
    let roughness = material.params.y * mrSample.g;
    let N = normalize(in.normal);
    let V = normalize(camera.position - in.worldPos);
    let F0 = mix(vec3f(0.04), baseColor.rgb, metallic);
    var Lo = vec3f(0.0);
    for (var i: u32 = 0u; i < lighting.lightCount; i = i + 1u) {
        let light = lighting.lights[i];
        let L = normalize(light.position.xyz - in.worldPos);
        let H = normalize(V + L);
        let distance = length(light.position.xyz - in.worldPos);
        let attenuation = 1.0 / max(distance * distance, 0.0001);
        let radiance = light.color.rgb * attenuation * light.params.x;
        let NDF = distributionGGX(N, H, roughness);
        let G = geometrySmith(N, V, L, roughness);
        let F = fresnelSchlick(max(dot(H, V), 0.0), F0);
        let kS = F;
        let kD = (vec3f(1.0) - kS) * (1.0 - metallic);
        let numerator = NDF * G * F;
        let denom = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
        let specular = numerator / denom;
        let NdotL = max(dot(N, L), 0.0);
        Lo = Lo + (kD * baseColor.rgb / PI + specular) * radiance * NdotL;
    }
    let ambient = lighting.ambient.rgb * baseColor.rgb;
    let color = ambient + Lo + material.emissive.rgb * textureSample(emissiveTex, emissiveSampler, in.uv).rgb;
    let mapped = toneMap(color);
    return vec4f(mapped, baseColor.a);
}
