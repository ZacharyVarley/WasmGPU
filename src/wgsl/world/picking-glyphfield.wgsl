/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

@group(1) @binding(0) var<storage, read> positions: array<vec4<f32>>;
@group(1) @binding(1) var<storage, read> rotations: array<vec4<f32>>;
@group(1) @binding(2) var<storage, read> scales: array<vec4<f32>>;

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

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(2) @binding(0) var<uniform> pick: PickUniforms;

struct VertexInput {
    @location(0) position: vec3<f32>
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) @interpolate(flat) instanceIndex: u32
};

struct FragmentOutput {
    @location(0) id: vec2<u32>,
    @location(1) depth: f32
};

fn rotateByQuat(v: vec3<f32>, q: vec4<f32>) -> vec3<f32> {
    let u = q.xyz;
    let s = q.w;
    let t = 2.0 * cross(u, v);
    return v + s * t + cross(u, t);
}

@vertex
fn vs_main(in: VertexInput, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    let p4 = positions[instanceIndex];
    let q = rotations[instanceIndex];
    let s4 = scales[instanceIndex];
    let localPos = rotateByQuat(in.position * s4.xyz, q) + p4.xyz;
    let worldPos = model.model * vec4<f32>(localPos, 1.0);
    var out: VertexOutput;
    out.position = camera.viewProj * worldPos;
    out.instanceIndex = instanceIndex;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> FragmentOutput {
    var out: FragmentOutput;
    out.id = vec2<u32>(pick.objectId, pick.elementBase + in.instanceIndex);
    out.depth = in.position.z;
    return out;
}
