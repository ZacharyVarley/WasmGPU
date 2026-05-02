/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct MaterialUniforms {
    color: vec4f,
    params: vec4f,
    baseColorTransform0: vec4f,
    baseColorTransform1: vec4f
};

@group(1) @binding(0) var<uniform> material: MaterialUniforms;
@group(1) @binding(1) var baseSampler: sampler;
@group(1) @binding(2) var baseTex: texture_2d<f32>;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(11) uv1: vec2f,
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
    @location(1) uv: vec2f,
    @location(2) uv1: vec2f
};

struct CameraUniforms {
    viewProjection: mat4x4f,
    position: vec3f
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;

fn linearToSrgb(c: vec3f) -> vec3f {
    return pow(c, vec3f(1.0 / 2.2));
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let modelM = mat4x4f(in.m0, in.m1, in.m2, in.m3);
    let normalM = mat4x4f(in.n0, in.n1, in.n2, in.n3);
    out.position = camera.viewProjection * modelM * vec4f(in.position, 1.0);
    out.normal = (normalM * vec4f(in.normal, 0.0)).xyz;
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

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    let baseUv = applyTextureTransform(in.uv, in.uv1, material.baseColorTransform0, material.baseColorTransform1);
    let texColor = textureSample(baseTex, baseSampler, baseUv);
    var outColor = material.color * texColor;
    let alphaCutoff = material.params.x;
    if (alphaCutoff > 0.0 && outColor.a < alphaCutoff) {
        discard;
    }
    return vec4f(linearToSrgb(outColor.rgb), outColor.a);
}
