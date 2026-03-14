/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct MaterialUniforms {
    color: vec4<f32>
};

@group(1) @binding(0) var<uniform> material: MaterialUniforms;
@group(1) @binding(1) var baseColorSampler: sampler;
@group(1) @binding(2) var baseColorTexture: texture_2d<f32>;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) joints0: vec4<u32>,
    @location(4) weights0: vec4<f32>,
    @location(5) joints1: vec4<u32>,
    @location(6) weights1: vec4<f32>
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>
};

struct CameraUniforms {
    viewProjection: mat4x4<f32>,
    position: vec4<f32>
};

struct ModelUniforms {
    model: mat4x4<f32>,
    normalMatrix: mat4x4<f32>
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;

struct SkinBuffer {
    joints: array<mat4x4<f32>>,
};

@group(2) @binding(0) var<storage, read> skin: SkinBuffer;

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let j0 = in.joints0;
    let w0 = in.weights0;
    let j1 = in.joints1;
    let w1 = in.weights1;
    let m = skin.joints[j0.x] * w0.x + skin.joints[j0.y] * w0.y + skin.joints[j0.z] * w0.z + skin.joints[j0.w] * w0.w +
            skin.joints[j1.x] * w1.x + skin.joints[j1.y] * w1.y + skin.joints[j1.z] * w1.z + skin.joints[j1.w] * w1.w;
    let localPos = m * vec4<f32>(in.position, 1.0);
    out.position = camera.viewProjection * model.model * localPos;
    out.uv = in.uv;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let baseColorSample = textureSample(baseColorTexture, baseColorSampler, in.uv);
    return material.color * baseColorSample;
}
