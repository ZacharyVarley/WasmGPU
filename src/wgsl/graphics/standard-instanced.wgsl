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
    emissiveTransform1: vec4f,
    clearcoatParams: vec4f,
    specularParams: vec4f,
    extensionParams: vec4f,
    clearcoatTransform0: vec4f,
    clearcoatTransform1: vec4f,
    clearcoatRoughnessTransform0: vec4f,
    clearcoatRoughnessTransform1: vec4f,
    clearcoatNormalTransform0: vec4f,
    clearcoatNormalTransform1: vec4f,
    specularTransform0: vec4f,
    specularTransform1: vec4f,
    specularColorTransform0: vec4f,
    specularColorTransform1: vec4f
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
@group(1) @binding(11) var clearcoatSampler: sampler;
@group(1) @binding(12) var clearcoatTex: texture_2d<f32>;
@group(1) @binding(13) var clearcoatRoughnessSampler: sampler;
@group(1) @binding(14) var clearcoatRoughnessTex: texture_2d<f32>;
@group(1) @binding(15) var clearcoatNormalSampler: sampler;
@group(1) @binding(16) var clearcoatNormalTex: texture_2d<f32>;
@group(1) @binding(17) var specularSampler: sampler;
@group(1) @binding(18) var specularTex: texture_2d<f32>;
@group(1) @binding(19) var specularColorSampler: sampler;
@group(1) @binding(20) var specularColorTex: texture_2d<f32>;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(11) uv1: vec2f,
    @location(12) tangent: vec4f,
    @location(3) m0: vec4f,
    @location(4) m1: vec4f,
    @location(5) m2: vec4f,
    @location(6) m3: vec4f,
    @location(7) n0: vec4f,
    @location(8) n1: vec4f,
    @location(9) n2: vec4f,
    @location(10) n3: vec4f
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) uv1: vec2f,
    @location(4) tangent: vec4f
};

struct CameraUniforms {
    viewProjection: mat4x4f,
    position: vec3f
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
@group(0) @binding(2) var<uniform> lighting: LightingUniforms;

const PI: f32 = 3.14159265359;

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let modelM = mat4x4f(in.m0, in.m1, in.m2, in.m3);
    let normalM = mat4x4f(in.n0, in.n1, in.n2, in.n3);
    let worldPos4 = modelM * vec4f(in.position, 1.0);
    out.position = camera.viewProjection * worldPos4;
    out.worldPos = worldPos4.xyz;
    out.normal = normalize((normalM * vec4f(in.normal, 0.0)).xyz);
    out.tangent = vec4f(normalize((normalM * vec4f(in.tangent.xyz, 0.0)).xyz), in.tangent.w);
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

fn fresnelSchlick(cosTheta: f32, F0: vec3f, F90: vec3f) -> vec3f {
    return F0 + (F90 - F0) * pow(1.0 - cosTheta, 5.0);
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

fn applyDerivativeNormalMap(N: vec3f, worldPos: vec3f, uv: vec2f, normalSample: vec3f, normalScale: f32) -> vec3f {
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

fn applyNormalMap(N: vec3f, tangent: vec4f, worldPos: vec3f, uv: vec2f, normalSample: vec3f, normalScale: f32) -> vec3f {
    let n = normalize(N);
    let derivativeNormal = applyDerivativeNormalMap(n, worldPos, uv, normalSample, normalScale);
    var t = tangent.xyz - n * dot(n, tangent.xyz);
    let tLen2 = dot(t, t);
    t = t * inverseSqrt(max(tLen2, 1e-20));
    let b = cross(n, t) * select(-1.0, 1.0, tangent.w >= 0.0);
    var ns = normalSample * 2.0 - vec3f(1.0);
    ns = vec3f(ns.x * normalScale, ns.y * normalScale, ns.z);
    let tangentNormal = normalize(t * ns.x + b * ns.y + n * ns.z);
    return select(derivativeNormal, tangentNormal, tLen2 > 1e-20);
}

fn maxComponent(v: vec3f) -> f32 {
    return max(max(v.x, v.y), v.z);
}

fn dielectricF0FromIor(ior: f32) -> f32 {
    if (ior == 0.0) {
        return 1.0;
    }
    let safeIor = max(ior, 1.0);
    let r = (safeIor - 1.0) / (safeIor + 1.0);
    return r * r;
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
    let clearcoatUv = applyTextureTransform(in.uv, in.uv1, material.clearcoatTransform0, material.clearcoatTransform1);
    let clearcoatRoughnessUv = applyTextureTransform(in.uv, in.uv1, material.clearcoatRoughnessTransform0, material.clearcoatRoughnessTransform1);
    let clearcoatNormalUv = applyTextureTransform(in.uv, in.uv1, material.clearcoatNormalTransform0, material.clearcoatNormalTransform1);
    let specularUv = applyTextureTransform(in.uv, in.uv1, material.specularTransform0, material.specularTransform1);
    let specularColorUv = applyTextureTransform(in.uv, in.uv1, material.specularColorTransform0, material.specularColorTransform1);
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
    let N = applyNormalMap(in.normal, in.tangent, in.worldPos, normalUv, normalSample, material.params.z);
    let occlSample = textureSample(occlusionTex, occlusionSampler, occlusionUv).r;
    let ao = 1.0 + material.params.w * (occlSample - 1.0);
    let emissiveSample = textureSample(emissiveTex, emissiveSampler, emissiveUv).rgb;
    let emissive = emissiveSample * material.emissive.rgb * material.emissive.a * material.extensionParams.y;
    let clearcoat = clamp(material.clearcoatParams.x * textureSample(clearcoatTex, clearcoatSampler, clearcoatUv).r, 0.0, 1.0);
    let clearcoatRoughness = clamp(material.clearcoatParams.y * textureSample(clearcoatRoughnessTex, clearcoatRoughnessSampler, clearcoatRoughnessUv).g, 0.04, 1.0);
    let clearcoatNormalSample = textureSample(clearcoatNormalTex, clearcoatNormalSampler, clearcoatNormalUv).xyz;
    let clearcoatNormal = applyNormalMap(in.normal, in.tangent, in.worldPos, clearcoatNormalUv, clearcoatNormalSample, material.clearcoatParams.z);
    let specularStrength = clamp(material.specularParams.x * textureSample(specularTex, specularSampler, specularUv).a, 0.0, 1.0);
    let specularColor = material.specularParams.yzw * textureSample(specularColorTex, specularColorSampler, specularColorUv).rgb;
    let albedo = baseColor.rgb;
    let V = normalize(camera.position - in.worldPos);
    let dielectricF0 = dielectricF0FromIor(material.extensionParams.x);
    let dielectricF0Color = min(vec3f(dielectricF0) * specularColor, vec3f(1.0)) * specularStrength;
    let F0 = mix(dielectricF0Color, albedo, metallic);
    let F90 = mix(vec3f(specularStrength), vec3f(1.0), metallic);
    let clearcoatViewFresnel = clamp(clearcoat * (0.04 + 0.96 * pow(1.0 - abs(dot(V, clearcoatNormal)), 5.0)), 0.0, 1.0);
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
        let F = fresnelSchlick(max(dot(H, V), 0.0), F0, F90);
        let numerator = NDF * G * F;
        let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
        let specularBrdf = numerator / denominator;
        let kD = vec3f((1.0 - maxComponent(F)) * (1.0 - metallic));
        let NdotL = max(dot(N, L), 0.0);
        let baseContribution = (kD * albedo / PI + specularBrdf) * radiance * NdotL;
        let clearcoatNdotL = max(dot(clearcoatNormal, L), 0.0);
        let clearcoatNdotV = max(dot(clearcoatNormal, V), 0.0);
        let clearcoatNDF = distributionGGX(clearcoatNormal, H, clearcoatRoughness);
        let clearcoatG = geometrySmith(clearcoatNormal, V, L, clearcoatRoughness);
        let clearcoatBrdf = clearcoatNDF * clearcoatG / (4.0 * clearcoatNdotV * clearcoatNdotL + 0.0001);
        let clearcoatContribution = vec3f(clearcoatBrdf) * radiance * clearcoatNdotL;
        Lo += mix(baseContribution, clearcoatContribution, clearcoatViewFresnel);
    }
    Lo += emissive * (1.0 - clearcoatViewFresnel);
    Lo = Lo / (Lo + vec3f(1.0));
    Lo = pow(Lo, vec3f(1.0 / 2.2));
    return vec4f(Lo, baseColor.a);
}
