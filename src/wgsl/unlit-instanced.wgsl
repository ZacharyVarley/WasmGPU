struct MaterialUniforms {
    color: vec4f
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
    @location(0) normal: vec3f,
    @location(1) uv: vec2f
};

struct CameraUniforms {
    viewProjection: mat4x4f,
    position: vec3f
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let modelM = mat4x4f(in.m0, in.m1, in.m2, in.m3);
    let normalM = mat4x4f(in.n0, in.n1, in.n2, in.n3);
    out.position = camera.viewProjection * modelM * vec4f(in.position, 1.0);
    out.normal = (normalM * vec4f(in.normal, 0.0)).xyz;
    out.uv = in.uv;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    return material.color;
}
