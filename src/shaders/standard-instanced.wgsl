struct MaterialUniforms {
    color: vec4f,
    emissive: vec4f,
    params: vec4f
};

@group(1) @binding(0) var<uniform> material: MaterialUniforms;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
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
    @location(2) uv: vec2f
};

struct CameraUniforms {
    viewProjection: mat4x4f,
    position: vec3f
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
@group(0) @binding(2) var<uniform> lighting: LightingUniforms;

const PI: f32 = 3.14159265359;

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let modelM = mat4x4f(in.m0, in.m1, in.m2, in.m3);
    let normalM = mat4x4f(in.n0, in.n1, in.n2, in.n3);
    let worldPos = modelM * vec4f(in.position, 1.0);
    out.position = camera.viewProjection * worldPos;
    out.worldPos = worldPos.xyz;
    out.normal = normalize((normalM * vec4f(in.normal, 0.0)).xyz);
    out.uv = in.uv;
    return out;
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

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    let albedo = material.color.rgb;
    let metallic = material.params.x;
    let roughness = material.params.y;
    let emissiveIntensity = material.params.z;
    let N = normalize(in.normal);
    let V = normalize(camera.position - in.worldPos);
    let F0 = mix(vec3f(0.04), albedo, metallic);
    var Lo = lighting.ambient.rgb * albedo;
    for (var i = 0u; i < lighting.lightCount; i++) {
        let light = lighting.lights[i];
        var L: vec3f;
        var attenuation: f32 = 1.0;
        if (light.position.w == 0.0) {
            L = normalize(-light.position.xyz);
        } else {
            let lightDir = light.position.xyz - in.worldPos;
            let distance = length(lightDir);
            L = normalize(lightDir);
            attenuation = 1.0 / (distance * distance);
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
    Lo += material.emissive.rgb * emissiveIntensity;
    Lo = Lo / (Lo + vec3f(1.0));
    Lo = pow(Lo, vec3f(1.0 / 2.2));
    return vec4f(Lo, material.color.a);
}
