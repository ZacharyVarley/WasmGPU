/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

struct Params {
    p0 : vec4f,
    p1 : vec4f
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> pixels: array<u32>;

fn unpackRGBA8(x: u32) -> vec4f {
    let r = f32(x & 255u) / 255.0;
    let g = f32((x >> 8u) & 255u) / 255.0;
    let b = f32((x >> 16u) & 255u) / 255.0;
    let a = f32((x >> 24u) & 255u) / 255.0;
    return vec4f(r, g, b, a);
}

struct VSOut {
    @builtin(position) position: vec4f
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
    var pos = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f( 3.0, -1.0),
        vec2f(-1.0,  3.0)
    );
    var out: VSOut;
    out.position = vec4f(pos[vid], 0.0, 1.0);
    return out;
}

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let displayW = max(1.0, params.p0.x);
    let displayH = max(1.0, params.p0.y);
    let outW = max(1.0, params.p0.z);
    let outH = max(1.0, params.p0.w);
    let flipY = params.p1.x > 0.5;
    let xOut = clamp(i32(floor(pos.x * outW / displayW)), 0, i32(outW) - 1);
    var yOut = clamp(i32(floor(pos.y * outH / displayH)), 0, i32(outH) - 1);
    if (flipY) {
        yOut = i32(outH) - 1 - yOut;
    }
    let idx = u32(yOut) * u32(outW) + u32(xOut);
    return unpackRGBA8(pixels[idx]);
}
