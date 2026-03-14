/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

fn scale_is_nan(v: f32) -> bool {
    let u = bitcast<u32>(v);
    return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) != 0u;
}

fn scale_is_inf(v: f32) -> bool {
    let u = bitcast<u32>(v);
    return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) == 0u;
}

fn scale_is_finite(v: f32) -> bool {
    return !scale_is_nan(v) && !scale_is_inf(v);
}

fn scale_clamp01(x: f32) -> f32 {
    return clamp(x, 0.0, 1.0);
}

fn scale_log_base(x: f32, base: f32) -> f32 {
    let b = max(base, 1.000001);
    return log(x) / log(b);
}

fn scale_apply_mode(x: f32, modeId: u32, linthresh: f32, base: f32) -> f32 {
    if (modeId == 0u) {
        return x;
    }
    if (modeId == 1u) {
        return scale_log_base(max(x, 1e-20), base);
    }
    let lt = max(linthresh, 1e-20);
    let s = select(-1.0, 1.0, x >= 0.0);
    let y = scale_log_base(1.0 + abs(x) / lt, base);
    return s * y;
}

fn scale_select_value(v: vec4f, componentCountIn: u32, componentIndexIn: u32, valueMode: u32) -> f32 {
    let componentCount = max(1u, min(4u, componentCountIn));
    let componentIndex = min(3u, componentIndexIn);
    if (valueMode == 1u) {
        if (componentCount == 1u) { return abs(v.x); }
        if (componentCount == 2u) { return length(v.xy); }
        if (componentCount == 3u) { return length(v.xyz); }
        return length(v);
    }
    if (componentIndex == 0u) { return v.x; }
    if (componentIndex == 1u) { return v.y; }
    if (componentIndex == 2u) { return v.z; }
    return v.w;
}

fn scale_apply_transform(rawValue: f32, domain: vec4f, clampConfig: vec4f, params: vec4f, flags: vec4f) -> f32 {
    if (!scale_is_finite(rawValue)) {
        return 0.0;
    }
    var v = rawValue;
    let clampMode = u32(domain.w + 0.5);
    let clampMin = clampConfig.x;
    let clampMax = clampConfig.y;
    if (clampMode != 0u && clampMax > clampMin) {
        v = clamp(v, clampMin, clampMax);
    }
    var d0 = domain.x;
    var d1 = domain.y;
    if (d1 <= d0 && clampMax > clampMin) {
        d0 = clampMin;
        d1 = clampMax;
    }
    let modeId = u32(params.x + 0.5);
    let base = params.y;
    let linthresh = params.z;
    let gamma = max(params.w, 1e-6);
    let a = scale_apply_mode(d0, modeId, linthresh, base);
    let b = scale_apply_mode(d1, modeId, linthresh, base);
    let x = scale_apply_mode(v, modeId, linthresh, base);
    let denom = max(1e-20, b - a);
    var t = scale_clamp01((x - a) / denom);
    t = pow(t, gamma);
    if (flags.x > 0.5) {
        t = 1.0 - t;
    }
    return scale_clamp01(t);
}

struct Params {
    count: u32,
    binCount: u32,
    minValue: f32,
    maxValue: f32
};

@group(0) @binding(0) var<storage, read> values: array<f32>;
@group(0) @binding(1) var<storage, read_write> bins: array<atomic<u32>>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    if (i >= params.count) { return; }
    if (params.binCount == 0u) { return; }
    let minValue = params.minValue;
    let maxValue = params.maxValue;
    if (!(maxValue > minValue)) { return; }
    let v = values[i];
    if (!scale_is_finite(v)) { return; }
    let t = clamp((v - minValue) / (maxValue - minValue), 0.0, 0.99999994);
    let b = min(params.binCount - 1u, u32(t * f32(params.binCount)));
    atomicAdd(&bins[b], 1u);
}
