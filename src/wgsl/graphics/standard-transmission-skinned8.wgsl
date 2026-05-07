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
    specularColorTransform1: vec4f,
    sheenParams: vec4f,
    iridescenceParams: vec4f,
    anisotropyParams: vec4f,
    sheenColorTransform0: vec4f,
    sheenColorTransform1: vec4f,
    sheenRoughnessTransform0: vec4f,
    sheenRoughnessTransform1: vec4f,
    iridescenceTransform0: vec4f,
    iridescenceTransform1: vec4f,
    iridescenceThicknessTransform0: vec4f,
    iridescenceThicknessTransform1: vec4f,
    anisotropyTransform0: vec4f,
    anisotropyTransform1: vec4f,
    transmissionParams: vec4f,
    diffuseTransmissionColor: vec4f,
    volumeAttenuation: vec4f,
    transmissionTransform0: vec4f,
    transmissionTransform1: vec4f,
    volumeThicknessTransform0: vec4f,
    volumeThicknessTransform1: vec4f,
    diffuseTransmissionTransform0: vec4f,
    diffuseTransmissionTransform1: vec4f,
    diffuseTransmissionColorTransform0: vec4f,
    diffuseTransmissionColorTransform1: vec4f
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
@group(1) @binding(21) var transmissionSampler: sampler;
@group(1) @binding(22) var transmissionTex: texture_2d<f32>;
@group(1) @binding(23) var volumeThicknessSampler: sampler;
@group(1) @binding(24) var volumeThicknessTex: texture_2d<f32>;
@group(1) @binding(25) var diffuseTransmissionSampler: sampler;
@group(1) @binding(26) var diffuseTransmissionTex: texture_2d<f32>;
@group(1) @binding(27) var diffuseTransmissionColorSampler: sampler;
@group(1) @binding(28) var diffuseTransmissionColorTex: texture_2d<f32>;
@group(1) @binding(29) var transmissionSourceSampler: sampler;
@group(1) @binding(30) var transmissionSourceTex: texture_2d<f32>;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(11) uv1: vec2f,
    @location(12) tangent: vec4f,
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
    @location(3) uv1: vec2f,
    @location(4) tangent: vec4f,
    @location(5) modelScale: vec3f
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
    let localTangent = (skinMatrix * vec4f(in.tangent.xyz, 0.0)).xyz;
    let worldPos4 = model.model * localPos;
    out.position = camera.viewProjection * worldPos4;
    out.worldPos = worldPos4.xyz;
    out.normal = normalize((model.normalMatrix * vec4f(localNormal, 0.0)).xyz);
    out.tangent = vec4f((model.normalMatrix * vec4f(localTangent, 0.0)).xyz, in.tangent.w);
    out.modelScale = vec3f(length(model.model[0].xyz), length(model.model[1].xyz), length(model.model[2].xyz));
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
    let oneMinusCos = 1.0 - clamp(cosTheta, 0.0, 1.0);
    return F0 + (F90 - F0) * pow(oneMinusCos, 5.0);
}

fn maxComponent(v: vec3f) -> f32 {
    return max(max(v.x, v.y), v.z);
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

struct TangentFrame {
    t: vec3f,
    b: vec3f,
    n: vec3f
};

fn fallbackTangentFrame(N: vec3f) -> TangentFrame {
    let n = normalize(N);
    let axis = select(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), abs(n.x) < 0.9);
    let t = normalize(cross(axis, n));
    let b = cross(n, t);
    return TangentFrame(t, b, n);
}

fn derivativeTangentFrame(N: vec3f, worldPos: vec3f, uv: vec2f) -> TangentFrame {
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
        return fallbackTangentFrame(n);
    }
    let frameScale = 1.0 / sqrt(frameLength2);
    return TangentFrame(T * frameScale, B * frameScale, n);
}

fn buildTangentFrame(N: vec3f, tangent: vec4f, worldPos: vec3f, uv: vec2f) -> TangentFrame {
    let n = normalize(N);
    let derivativeFrame = derivativeTangentFrame(n, worldPos, uv);
    var t = tangent.xyz - n * dot(n, tangent.xyz);
    let tLen2 = dot(t, t);
    if (tLen2 <= 1e-20) {
        return derivativeFrame;
    }
    t = t * inverseSqrt(tLen2);
    let b = normalize(cross(n, t)) * select(-1.0, 1.0, tangent.w >= 0.0);
    return TangentFrame(t, b, n);
}

fn applyNormalMap(N: vec3f, tangent: vec4f, worldPos: vec3f, uv: vec2f, normalSample: vec3f, normalScale: f32) -> vec3f {
    if (normalScale == 0.0) {
        return normalize(N);
    }
    let frame = buildTangentFrame(N, tangent, worldPos, uv);
    var ns = normalSample * 2.0 - vec3f(1.0);
    ns = vec3f(ns.x * normalScale, ns.y * normalScale, ns.z);
    return normalize(frame.t * ns.x + frame.b * ns.y + frame.n * ns.z);
}

fn sqr(v: f32) -> f32 {
    return v * v;
}

fn iorToFresnel0(transmittedIor: f32, incidentIor: f32) -> f32 {
    let r = (transmittedIor - incidentIor) / (transmittedIor + incidentIor);
    return r * r;
}

fn iorToFresnel0Vec(transmittedIor: vec3f, incidentIor: f32) -> vec3f {
    let r = (transmittedIor - vec3f(incidentIor)) / (transmittedIor + vec3f(incidentIor));
    return r * r;
}

fn fresnel0ToIor(F0: vec3f) -> vec3f {
    let sqrtF0 = sqrt(clamp(F0, vec3f(0.0), vec3f(0.9999)));
    return (vec3f(1.0) + sqrtF0) / max(vec3f(1.0) - sqrtF0, vec3f(1e-4));
}

fn fresnelSchlickScalar(cosTheta: f32, F0: f32) -> f32 {
    let oneMinusCos = 1.0 - clamp(cosTheta, 0.0, 1.0);
    return F0 + (1.0 - F0) * pow(oneMinusCos, 5.0);
}

fn sanitizeReflectance(value: vec3f, fallback: vec3f) -> vec3f {
    var result = clamp(fallback, vec3f(0.0), vec3f(1.0));
    if (value.x == value.x && abs(value.x) < 1.0e6) {
        result.x = clamp(value.x, 0.0, 1.0);
    }
    if (value.y == value.y && abs(value.y) < 1.0e6) {
        result.y = clamp(value.y, 0.0, 1.0);
    }
    if (value.z == value.z && abs(value.z) < 1.0e6) {
        result.z = clamp(value.z, 0.0, 1.0);
    }
    return result;
}

fn evalIridescenceSensitivity(OPD: f32, shift: vec3f) -> vec3f {
    let phase = 2.0 * PI * OPD * 1.0e-9;
    let phase2 = phase * phase;
    let val = vec3f(5.4856e-13, 4.4201e-13, 5.2481e-13);
    let pos = vec3f(1.6810e+06, 1.7953e+06, 2.2084e+06);
    let variance = vec3f(4.3278e+09, 9.3046e+09, 6.6121e+09);
    var xyz = val * sqrt(2.0 * PI * variance) * cos(pos * phase + shift) * exp(-phase2 * variance);
    xyz.x += 9.7470e-14 * sqrt(2.0 * PI * 4.5282e+09) * cos(2.2399e+06 * phase + shift.x) * exp(-4.5282e+09 * phase2);
    xyz /= 1.0685e-7;
    return vec3f(
        3.2404542 * xyz.x - 1.5371385 * xyz.y - 0.4985314 * xyz.z,
        -0.9692660 * xyz.x + 1.8760108 * xyz.y + 0.0415560 * xyz.z,
        0.0556434 * xyz.x - 0.2040259 * xyz.y + 1.0572252 * xyz.z
    );
}

fn iridescentFresnel(outsideIor: f32, iridescenceIor: f32, baseF0: vec3f, thickness: f32, cosTheta1: f32) -> vec3f {
    let safeCosTheta1 = clamp(cosTheta1, 0.0, 1.0);
    let thinFilmIor = mix(outsideIor, iridescenceIor, smoothstep(0.0, 0.03, thickness));
    let R0 = iorToFresnel0(thinFilmIor, outsideIor);
    let R12 = fresnelSchlickScalar(safeCosTheta1, R0);
    let T121 = 1.0 - R12;
    let baseIor = fresnel0ToIor(baseF0);
    let R1 = iorToFresnel0Vec(baseIor, thinFilmIor);
    let eta = outsideIor / thinFilmIor;
    let sinTheta2Sq = eta * eta * (1.0 - safeCosTheta1 * safeCosTheta1);
    let cosTheta2Sq = 1.0 - sinTheta2Sq;
    if (cosTheta2Sq < 0.0) {
        return vec3f(1.0);
    }
    let cosTheta2 = sqrt(cosTheta2Sq);
    let R23 = fresnelSchlick(cosTheta2, R1, vec3f(1.0));
    let phi12 = select(0.0, PI, thinFilmIor < outsideIor);
    let phi21 = PI - phi12;
    let phi23 = vec3f(
        select(0.0, PI, baseIor.x < thinFilmIor),
        select(0.0, PI, baseIor.y < thinFilmIor),
        select(0.0, PI, baseIor.z < thinFilmIor)
    );
    let phi = vec3f(phi21) + phi23;
    let OPD = 2.0 * thinFilmIor * thickness * cosTheta2;
    let R123 = clamp(vec3f(R12) * R23, vec3f(1e-5), vec3f(0.9999));
    let r123 = sqrt(R123);
    let Rs = sqr(T121) * R23 / (vec3f(1.0) - R123);
    var I = vec3f(R12) + Rs;
    var Cm = Rs - vec3f(T121);
    Cm *= r123;
    I += Cm * 2.0 * evalIridescenceSensitivity(OPD, phi);
    Cm *= r123;
    I += Cm * 2.0 * evalIridescenceSensitivity(2.0 * OPD, 2.0 * phi);
    return sanitizeReflectance(I, baseF0);
}

fn distributionGGXAnisotropic(NdotH: f32, TdotH: f32, BdotH: f32, at: f32, ab: f32) -> f32 {
    let a2 = at * ab;
    let f = vec3f(ab * TdotH, at * BdotH, a2 * NdotH);
    let w2 = a2 / max(dot(f, f), 1e-8);
    return a2 * w2 * w2 / PI;
}

fn visibilityGGXAnisotropic(NdotL: f32, NdotV: f32, BdotV: f32, TdotV: f32, TdotL: f32, BdotL: f32, at: f32, ab: f32) -> f32 {
    let GGXV = NdotL * length(vec3f(at * TdotV, ab * BdotV, NdotV));
    let GGXL = NdotV * length(vec3f(at * TdotL, ab * BdotL, NdotL));
    return clamp(0.5 / max(GGXV + GGXL, 1e-8), 0.0, 1.0);
}

fn sheenDistribution(NdotH: f32, sheenRoughness: f32) -> f32 {
    let alphaG = max(sheenRoughness * sheenRoughness, 1e-4);
    let invR = 1.0 / alphaG;
    let sin2h = max(1.0 - NdotH * NdotH, 0.0);
    return (2.0 + invR) * pow(sin2h, invR * 0.5) / (2.0 * PI);
}

fn sheenL(cosTheta: f32, alphaG: f32) -> f32 {
    let oneMinusAlphaSq = sqr(1.0 - alphaG);
    let a = mix(21.5473, 25.3245, oneMinusAlphaSq);
    let b = mix(3.82987, 3.32435, oneMinusAlphaSq);
    let c = mix(0.19823, 0.16801, oneMinusAlphaSq);
    let d = mix(-1.97760, -1.27393, oneMinusAlphaSq);
    let e = mix(-4.32054, -4.85967, oneMinusAlphaSq);
    return a / (1.0 + b * pow(cosTheta, c)) + d * cosTheta + e;
}

fn sheenLambda(cosTheta: f32, alphaG: f32) -> f32 {
    let safeCosTheta = clamp(cosTheta, 1e-4, 1.0);
    if (safeCosTheta < 0.5) {
        return exp(sheenL(safeCosTheta, alphaG));
    }
    return exp(2.0 * sheenL(0.5, alphaG) - sheenL(1.0 - safeCosTheta, alphaG));
}

fn sheenVisibility(NdotL: f32, NdotV: f32, sheenRoughness: f32) -> f32 {
    let alphaG = max(sheenRoughness * sheenRoughness, 1e-4);
    let visibility = 1.0 + sheenLambda(NdotV, alphaG) + sheenLambda(NdotL, alphaG);
    return clamp(1.0 / max(visibility * 4.0 * NdotV * NdotL, 1e-6), 0.0, 1.0);
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

fn screenUvFromFragment(position: vec4f) -> vec2f {
    let dims = vec2f(textureDimensions(transmissionSourceTex, 0));
    return clamp(position.xy / max(dims, vec2f(1.0)), vec2f(0.0), vec2f(1.0));
}

fn projectWorldToScreenUv(worldPos: vec3f) -> vec2f {
    let clip = camera.viewProjection * vec4f(worldPos, 1.0);
    let invW = 1.0 / max(abs(clip.w), 1e-5);
    let ndc = clip.xy * invW * select(-1.0, 1.0, clip.w >= 0.0);
    return clamp(vec2f(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5), vec2f(0.0), vec2f(1.0));
}

fn transmissionScreenUv(position: vec4f, worldPos: vec3f, N: vec3f, V: vec3f, ior: f32, thickness: f32, modelScale: vec3f) -> vec2f {
    let baseUv = screenUvFromFragment(position);
    if (thickness <= 1e-5) {
        return baseUv;
    }
    let eta = 1.0 / max(ior, 1.0001);
    var ray = refract(-V, N, eta);
    let rayLength2 = dot(ray, ray);
    if (rayLength2 <= 1e-8) {
        ray = -V;
    } else {
        ray = ray * inverseSqrt(rayLength2);
    }
    let transmissionRay = ray * max(thickness, 0.0) * max(modelScale, vec3f(1e-4));
    return projectWorldToScreenUv(worldPos + transmissionRay);
}

fn transmissionSourceToLinear(color: vec3f) -> vec3f {
    return pow(clamp(color, vec3f(0.0), vec3f(1.0)), vec3f(2.2));
}

fn sampleTransmissionSourceAt(uv: vec2f) -> vec3f {
    let sourceColor = textureSampleLevel(transmissionSourceTex, transmissionSourceSampler, clamp(uv, vec2f(0.0), vec2f(1.0)), 0.0).rgb;
    return transmissionSourceToLinear(sourceColor);
}

fn dispersionIors(ior: f32, dispersion: f32) -> vec3f {
    let halfSpread = max(ior - 1.0, 0.0) * 0.025 * max(dispersion, 0.0);
    return max(vec3f(ior - halfSpread, ior, ior + halfSpread), vec3f(1.0));
}

fn sampleTransmissionSource(position: vec4f, worldPos: vec3f, N: vec3f, V: vec3f, ior: f32, dispersion: f32, thickness: f32, modelScale: vec3f) -> vec3f {
    if (dispersion <= 1e-5 || thickness <= 1e-5) {
        return sampleTransmissionSourceAt(transmissionScreenUv(position, worldPos, N, V, ior, thickness, modelScale));
    }
    let iors = dispersionIors(ior, dispersion);
    let r = sampleTransmissionSourceAt(transmissionScreenUv(position, worldPos, N, V, iors.r, thickness, modelScale)).r;
    let g = sampleTransmissionSourceAt(transmissionScreenUv(position, worldPos, N, V, iors.g, thickness, modelScale)).g;
    let b = sampleTransmissionSourceAt(transmissionScreenUv(position, worldPos, N, V, iors.b, thickness, modelScale)).b;
    return vec3f(r, g, b);
}

fn volumeTransmissionAttenuation(thickness: f32, attenuationDistance: f32, attenuationColor: vec3f) -> vec3f {
    if (thickness <= 1e-5 || attenuationDistance <= 1e-5) {
        return vec3f(1.0);
    }
    return pow(max(attenuationColor, vec3f(1e-4)), vec3f(thickness / attenuationDistance));
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
    let sheenColorUv = applyTextureTransform(in.uv, in.uv1, material.sheenColorTransform0, material.sheenColorTransform1);
    let sheenRoughnessUv = applyTextureTransform(in.uv, in.uv1, material.sheenRoughnessTransform0, material.sheenRoughnessTransform1);
    let iridescenceUv = applyTextureTransform(in.uv, in.uv1, material.iridescenceTransform0, material.iridescenceTransform1);
    let iridescenceThicknessUv = applyTextureTransform(in.uv, in.uv1, material.iridescenceThicknessTransform0, material.iridescenceThicknessTransform1);
    let anisotropyUv = applyTextureTransform(in.uv, in.uv1, material.anisotropyTransform0, material.anisotropyTransform1);
    let transmissionUv = applyTextureTransform(in.uv, in.uv1, material.transmissionTransform0, material.transmissionTransform1);
    let volumeThicknessUv = applyTextureTransform(in.uv, in.uv1, material.volumeThicknessTransform0, material.volumeThicknessTransform1);
    let diffuseTransmissionUv = applyTextureTransform(in.uv, in.uv1, material.diffuseTransmissionTransform0, material.diffuseTransmissionTransform1);
    let diffuseTransmissionColorUv = applyTextureTransform(in.uv, in.uv1, material.diffuseTransmissionColorTransform0, material.diffuseTransmissionColorTransform1);
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
    let sheenColor = material.sheenParams.rgb;
    let sheenRoughness = clamp(material.sheenParams.w, 0.0, 1.0);
    let iridescence = clamp(material.iridescenceParams.x, 0.0, 1.0);
    let iridescenceThickness = material.iridescenceParams.w;
    let anisotropySample = vec3f(1.0, 0.5, 1.0);
    let transmission = clamp(material.transmissionParams.x * textureSample(transmissionTex, transmissionSampler, transmissionUv).r, 0.0, 1.0);
    let diffuseTransmission = clamp(material.transmissionParams.y * textureSample(diffuseTransmissionTex, diffuseTransmissionSampler, diffuseTransmissionUv).a, 0.0, 1.0);
    let volumeThickness = max(material.transmissionParams.z * textureSample(volumeThicknessTex, volumeThicknessSampler, volumeThicknessUv).g, 0.0);
    let dispersion = max(material.transmissionParams.w, 0.0);
    let diffuseTransmissionColor = material.diffuseTransmissionColor.rgb * textureSample(diffuseTransmissionColorTex, diffuseTransmissionColorSampler, diffuseTransmissionColorUv).rgb;
    let volumeAttenuation = volumeTransmissionAttenuation(volumeThickness, material.diffuseTransmissionColor.w, material.volumeAttenuation.rgb);
    let anisotropyStrength = clamp(material.anisotropyParams.x * anisotropySample.b, 0.0, 1.0);
    var anisotropyDirection = anisotropySample.rg * 2.0 - vec2f(1.0);
    let anisotropyDirectionLength2 = dot(anisotropyDirection, anisotropyDirection);
    anisotropyDirection = select(vec2f(1.0, 0.0), anisotropyDirection * inverseSqrt(max(anisotropyDirectionLength2, 1e-8)), anisotropyDirectionLength2 > 1e-8);
    anisotropyDirection = vec2f(
        material.anisotropyParams.y * anisotropyDirection.x - material.anisotropyParams.z * anisotropyDirection.y,
        material.anisotropyParams.z * anisotropyDirection.x + material.anisotropyParams.y * anisotropyDirection.y
    );
    let albedo = baseColor.rgb;
    let V = normalize(camera.position - in.worldPos);
    let dielectricF0 = dielectricF0FromIor(material.extensionParams.x);
    let dielectricF0Color = min(vec3f(dielectricF0) * specularColor, vec3f(1.0)) * specularStrength;
    let F0 = mix(dielectricF0Color, albedo, metallic);
    let F90 = mix(vec3f(specularStrength), vec3f(1.0), metallic);
    let viewNdotV = max(dot(N, V), 0.0);
    var iridescenceFresnelColor = F0;
    if (iridescence > 1e-5 && iridescenceThickness > 0.0) {
        iridescenceFresnelColor = iridescentFresnel(1.0, material.iridescenceParams.y, F0, iridescenceThickness, viewNdotV);
    }
    var viewFresnel = fresnelSchlick(viewNdotV, F0, F90);
    if (iridescence > 1e-5) {
        viewFresnel = mix(viewFresnel, iridescenceFresnelColor, iridescence);
    }
    let transmissionWeight = transmission * (1.0 - metallic) * max(1.0 - maxComponent(viewFresnel), 0.0);
    let geometricN = normalize(in.normal);
    let anisotropyFrame = buildTangentFrame(geometricN, in.tangent, in.worldPos, anisotropyUv);
    let clearcoatViewFresnel = clamp(clearcoat * fresnelSchlickScalar(abs(dot(V, clearcoatNormal)), 0.04), 0.0, 1.0);
    var Lo = lighting.ambient.rgb * albedo * ao * (1.0 - transmission);
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
        let NdotL = max(dot(N, L), 0.0);
        let NdotV = viewNdotV;
        let NdotH = max(dot(N, H), 0.0);
        let VdotH = max(dot(V, H), 0.0);
        let baseF = fresnelSchlick(VdotH, F0, F90);
        var F = baseF;
        if (iridescence > 1e-5) {
            F = mix(baseF, iridescenceFresnelColor, iridescence);
        }
        var specularBrdf: vec3f;
        if (anisotropyStrength > 1e-5) {
            let anisotropicT = normalize(anisotropyFrame.t * anisotropyDirection.x + anisotropyFrame.b * anisotropyDirection.y);
            let anisotropicB = normalize(cross(geometricN, anisotropicT));
            let TdotV = dot(anisotropicT, V);
            let BdotV = dot(anisotropicB, V);
            let TdotL = dot(anisotropicT, L);
            let BdotL = dot(anisotropicB, L);
            let TdotH = dot(anisotropicT, H);
            let BdotH = dot(anisotropicB, H);
            let alphaRoughness = max(roughness * roughness, 0.001);
            let at = mix(alphaRoughness, 1.0, anisotropyStrength * anisotropyStrength);
            let ab = alphaRoughness;
            let D = distributionGGXAnisotropic(NdotH, TdotH, BdotH, at, ab);
            let Vg = visibilityGGXAnisotropic(NdotL, NdotV, BdotV, TdotV, TdotL, BdotL, at, ab);
            specularBrdf = F * D * Vg;
        } else {
            let NDF = distributionGGX(N, H, roughness);
            let G = geometrySmith(N, V, L, roughness);
            let numerator = NDF * G * F;
            let denominator = 4.0 * NdotV * NdotL + 0.0001;
            specularBrdf = numerator / denominator;
        }
        let sheenD = sheenDistribution(NdotH, sheenRoughness);
        let sheenV = sheenVisibility(NdotL, NdotV, sheenRoughness);
        let sheenBrdf = sheenColor * sheenD * sheenV;
        let diffuseEnergy = max(1.0 - maxComponent(F), 0.0);
        let kD = vec3f(diffuseEnergy) * (1.0 - metallic);
        let frontDiffuse = (1.0 - diffuseTransmission) * kD * albedo * radiance * NdotL / PI;
        let backDiffuse = diffuseTransmission * kD * diffuseTransmissionColor * radiance * max(dot(-N, L), 0.0) / PI;
        let diffuseContribution = (frontDiffuse + backDiffuse) * (1.0 - transmission);
        let specularContribution = (specularBrdf + sheenBrdf) * radiance * NdotL;
        let baseContribution = diffuseContribution + specularContribution;
        let clearcoatNdotL = max(dot(clearcoatNormal, L), 0.0);
        let clearcoatNdotV = max(dot(clearcoatNormal, V), 0.0);
        let clearcoatNDF = distributionGGX(clearcoatNormal, H, clearcoatRoughness);
        let clearcoatG = geometrySmith(clearcoatNormal, V, L, clearcoatRoughness);
        let clearcoatBrdf = clearcoatNDF * clearcoatG / (4.0 * clearcoatNdotV * clearcoatNdotL + 0.0001);
        let clearcoatContribution = vec3f(clearcoatBrdf) * radiance * clearcoatNdotL;
        Lo += mix(baseContribution, clearcoatContribution, clearcoatViewFresnel);
    }
    if (transmissionWeight > 1e-5) {
        let transmittedSource = sampleTransmissionSource(in.position, in.worldPos, N, V, material.extensionParams.x, dispersion, volumeThickness, in.modelScale);
        Lo += transmittedSource * albedo * volumeAttenuation * transmissionWeight * (1.0 - clearcoatViewFresnel);
    }
    Lo += emissive * (1.0 - clearcoatViewFresnel);
    Lo = Lo / (Lo + vec3f(1.0));
    Lo = pow(Lo, vec3f(1.0 / 2.2));
    return vec4f(Lo, baseColor.a);
}
