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
@group(1) @binding(1) var baseColorSampler: sampler;
@group(1) @binding(2) var baseColorTexture: texture_2d<f32>;

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
    @location(0) uv: vec2f,
    @location(1) uv1: vec2f
};

struct CameraUniforms {
    viewProjection: mat4x4f,
    position: vec4f
};

struct ModelUniforms {
    model: mat4x4f,
    normalMatrix: mat4x4f
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;

struct SkinBuffer {
    joints: array<mat4x4f>,
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
    let localPos = m * vec4f(in.position, 1.0);
    out.position = camera.viewProjection * model.model * localPos;
    out.uv = in.uv;
    out.uv1 = in.uv1;
    return out;
}

fn linearToSrgb(c: vec3f) -> vec3f {
    return pow(c, vec3f(1.0 / 2.2));
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
    let baseColorSample = textureSample(baseColorTexture, baseColorSampler, baseUv);
    var outColor = material.color * baseColorSample;
    let alphaCutoff = material.params.x;
    if (alphaCutoff > 0.0 && outColor.a < alphaCutoff) {
        discard;
    }
    return vec4f(linearToSrgb(outColor.rgb), outColor.a);
}
