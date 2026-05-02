/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct MaterialUniforms {
    color: vec4f,
    emissive: vec4f,
    params: vec4f,
    params2: vec4f,
    baseColorTransform0: vec4f,
    baseColorTransform1: vec4f,
    metallicRoughnessTransform0: vec4f,
    metallicRoughnessTransform1: vec4f,
    normalTransform0: vec4f,
    normalTransform1: vec4f,
    occlusionTransform0: vec4f,
    occlusionTransform1: vec4f,
    emissiveTransform0: vec4f,
    emissiveTransform1: vec4f
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
    @location(11) uv1: vec2f,
    @location(3) joints0: vec4u,
    @location(4) weights0: vec4f,
    @location(5) joints1: vec4u,
    @location(6) weights1: vec4f
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) uv1: vec2f
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
    direction: vec4f,
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
    out.uv1 = in.uv1;
    return out;
}

fn applyTextureTransform(uv0: vec2f, uv1: vec2f, transform0: vec4f, transform1: vec4f) -> vec2f {
    let uv = select(uv0, uv1, transform1.z >= 0.5);
    let scaled = uv * transform1.xy;
    let rotated = vec2f(
        transform0.z * scaled.x + transform0.w * scaled.y,
        -transform0.w * scaled.x + transform0.z * scaled.y
    );
    return rotated + transform0.xy;
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

fn applyNormalMap(N: vec3f, worldPos: vec3f, uv: vec2f, normalSample: vec3f, normalScale: f32) -> vec3f {
    let n = normalize(N);
    let dp1 = dpdx(worldPos);
    let dp2 = dpdy(worldPos);
    let duv1 = dpdx(uv);
    let duv2 = dpdy(uv);
    let dp2perp = cross(dp2, n);
    let dp1perp = cross(n, dp1);
    let T = (dp2perp * duv1.x) + (dp1perp * duv2.x);
    let B = (dp2perp * duv1.y) + (dp1perp * duv2.y);
    let frameLength2 = max(dot(T, T), dot(B, B));
    if (frameLength2 <= 1e-20) {
        return n;
    }
    let frameScale = 1.0 / sqrt(frameLength2);
    let tbn = mat3x3f(T * frameScale, B * frameScale, n);
    var ns = normalSample * 2.0 - vec3f(1.0);
    ns = vec3f(ns.x * normalScale, ns.y * normalScale, ns.z);
    return normalize(tbn * ns);
}

fn computeRangeAttenuation(distance: f32, range: f32) -> f32 {
    let invSq = 1.0 / max(distance * distance, 0.0001);
    if (range <= 0.0) {
        return invSq;
    }
    let fade = clamp(1.0 - distance / range, 0.0, 1.0);
    return invSq * fade * fade;
}

fn computeSpotFactor(L: vec3f, direction: vec3f, cosInner: f32, cosOuter: f32) -> f32 {
    let angleCos = dot(-L, normalize(direction));
    if (cosInner <= cosOuter) {
        return select(0.0, 1.0, angleCos >= cosOuter);
    }
    return clamp((angleCos - cosOuter) / max(cosInner - cosOuter, 1e-4), 0.0, 1.0);
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    let baseUv = applyTextureTransform(in.uv, in.uv1, material.baseColorTransform0, material.baseColorTransform1);
    let mrUv = applyTextureTransform(in.uv, in.uv1, material.metallicRoughnessTransform0, material.metallicRoughnessTransform1);
    let normalUv = applyTextureTransform(in.uv, in.uv1, material.normalTransform0, material.normalTransform1);
    let occlusionUv = applyTextureTransform(in.uv, in.uv1, material.occlusionTransform0, material.occlusionTransform1);
    let emissiveUv = applyTextureTransform(in.uv, in.uv1, material.emissiveTransform0, material.emissiveTransform1);
    let baseSample = textureSample(baseColorTex, baseColorSampler, baseUv);
    let baseColor = material.color * baseSample;
    let alphaCutoff = material.params2.x;
    if (alphaCutoff > 0.0 && baseColor.a < alphaCutoff) {
        discard;
    }
    let mrSample = textureSample(metallicRoughnessTex, metallicRoughnessSampler, mrUv);
    let metallic = clamp(material.params.x * mrSample.b, 0.0, 1.0);
    let roughness = clamp(material.params.y * mrSample.g, 0.04, 1.0);
    let normalSample = textureSample(normalTex, normalSampler, normalUv).xyz;
    let N = applyNormalMap(in.normal, in.worldPos, normalUv, normalSample, material.params.z);
    let occlSample = textureSample(occlusionTex, occlusionSampler, occlusionUv).r;
    let ao = 1.0 + material.params.w * (occlSample - 1.0);
    let emissiveSample = textureSample(emissiveTex, emissiveSampler, emissiveUv).rgb;
    let emissive = emissiveSample * material.emissive.rgb * material.emissive.a;
    let albedo = baseColor.rgb;
    let V = normalize(camera.position - in.worldPos);
    let F0 = mix(vec3f(0.04), albedo, metallic);
    var Lo = lighting.ambient.rgb * albedo * ao;
    for (var i = 0u; i < lighting.lightCount; i++) {
        let light = lighting.lights[i];
        var L: vec3f;
        var attenuation: f32 = 1.0;
        if (light.position.w == 0.0) {
            L = normalize(-light.position.xyz);
        } else {
            let lightDir = light.position.xyz - in.worldPos;
            let distance = length(lightDir);
            if (distance <= 1e-5) {
                continue;
            }
            L = lightDir / distance;
            attenuation = computeRangeAttenuation(distance, light.params.x);
            if (light.position.w == 2.0) {
                attenuation = attenuation * computeSpotFactor(L, light.direction.xyz, light.params.y, light.params.z);
            }
        }
        if (attenuation <= 0.0) {
            continue;
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
    Lo += emissive;
    Lo = Lo / (Lo + vec3f(1.0));
    Lo = pow(Lo, vec3f(1.0 / 2.2));
    return vec4f(Lo, baseColor.a);
}
