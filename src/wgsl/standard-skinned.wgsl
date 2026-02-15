struct MaterialUniforms {
    color: vec4<f32>
};

@group(1) @binding(0) var<uniform> material: MaterialUniforms;
@group(1) @binding(1) var baseColorTexture: texture_2d<f32>;
@group(1) @binding(2) var baseColorSampler: sampler;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) joints: vec4<u32>,
    @location(4) weights: vec4<f32>
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) worldPos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>
};

struct CameraUniforms {
    viewProjection: mat4x4<f32>,
    position: vec4<f32>
};

struct ModelUniforms {
    model: mat4x4<f32>,
    normalMatrix: mat4x4<f32>
};

struct LightingUniforms {
    direction: vec4<f32>,
    color: vec4<f32>,
    ambient: vec4<f32>
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(0) @binding(2) var<uniform> lighting: LightingUniforms;

struct SkinBuffer {
    joints: array<mat4x4<f32>>
};

@group(2) @binding(0) var<storage, read> skin: SkinBuffer;

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let j = in.joints;
    let w = in.weights;
    let m = skin.joints[j.x] * w.x + skin.joints[j.y] * w.y + skin.joints[j.z] * w.z + skin.joints[j.w] * w.w;
    let localPos = m * vec4<f32>(in.position, 1.0);
    let localNormal = (m * vec4<f32>(in.normal, 0.0)).xyz;
    let worldPos = model.model * localPos;
    out.position = camera.viewProjection * worldPos;
    out.worldPos = worldPos.xyz;
    out.normal = normalize((model.normalMatrix * vec4<f32>(localNormal, 0.0)).xyz);
    out.uv = in.uv;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let baseColorSample = textureSample(baseColorTexture, baseColorSampler, in.uv);
    let baseColor = material.color * baseColorSample;
    let n = normalize(in.normal);
    let lightDir = normalize(-lighting.direction.xyz);
    let diff = max(dot(n, lightDir), 0.0);
    let lit = baseColor.xyz * (lighting.ambient.xyz + diff * lighting.color.xyz);
    return vec4<f32>(lit, baseColor.w);
}
