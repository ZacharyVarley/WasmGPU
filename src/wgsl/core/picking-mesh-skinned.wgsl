struct CameraUniforms {
    viewProj: mat4x4<f32>,
    position: vec3<f32>,
    _pad0: f32
};

struct ModelUniforms {
    model: mat4x4<f32>,
    normal: mat4x4<f32>
};

struct PickUniforms {
    objectId: u32,
    elementBase: u32,
    _pad0: u32,
    _pad1: u32
};

struct SkinBuffer {
    joints: array<mat4x4<f32>>
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(1) @binding(0) var<uniform> pick: PickUniforms;
@group(2) @binding(0) var<storage, read> skin: SkinBuffer;

struct VertexOutput {
    @builtin(position) position: vec4<f32>
};

struct FragmentOutput {
    @location(0) id: vec2<u32>,
    @location(1) depth: f32
};

@vertex
fn vs_main(@location(0) position: vec3<f32>, @location(3) joints: vec4<u32>, @location(4) weights: vec4<f32> ) -> VertexOutput {
    var out: VertexOutput;
    let m = skin.joints[joints.x] * weights.x
        + skin.joints[joints.y] * weights.y
        + skin.joints[joints.z] * weights.z
        + skin.joints[joints.w] * weights.w;
    let localPos = m * vec4<f32>(position, 1.0);
    out.position = camera.viewProj * model.model * localPos;
    return out;
}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>, @builtin(primitive_index) primitiveIndex: u32) -> FragmentOutput {
    var out: FragmentOutput;
    out.id = vec2<u32>(pick.objectId, pick.elementBase + primitiveIndex);
    out.depth = fragCoord.z;
    return out;
}
