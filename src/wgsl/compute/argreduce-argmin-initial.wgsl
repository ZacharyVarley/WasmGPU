/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const WORKGROUP_SIZE: u32 = 256u;
const ELEMENTS_PER_WORKGROUP: u32 = 512u;

struct Pair {
    value: f32,
    index: u32
};

@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<Pair>;

var<workgroup> share: array<Pair, 256>;

fn isNan(val: f32) -> bool {
    let u = bitcast<u32>(val);
    return (u & 0x7F800000u) == 0x7F800000u && (u & 0x007FFFFFu) != 0u;
}

fn invalidPair() -> Pair {
    return Pair(0x1.fffffep+127f, 0xFFFFFFFFu);
}

fn better(a: Pair, b: Pair) -> Pair {
    let aNan = isNan(a.value);
    let bNan = isNan(b.value);
    if (aNan && bNan) {
        if (a.index <= b.index) { return a; }
        return b;
    }
    if (aNan) { return b; }
    if (bNan) { return a; }
    if (a.value < b.value) { return a; }
    if (b.value < a.value) { return b; }
    if (a.index <= b.index) { return a; }
    return b;
}

@compute @workgroup_size(256)
fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
    let tid = lid.x;
    let n = arrayLength(&input);
    let base = wid.x * ELEMENTS_PER_WORKGROUP;
    let i0 = base + tid;
    let i1 = i0 + WORKGROUP_SIZE;
    var a = invalidPair();
    var b = invalidPair();
    if (i0 < n) {
        a = Pair(input[i0], i0);
    }
    if (i1 < n) {
        b = Pair(input[i1], i1);
    }
    share[tid] = better(a, b);
    workgroupBarrier();
    var stride = WORKGROUP_SIZE / 2u;
    loop {
        if (stride == 0u) { break; }
        if (tid < stride) {
            share[tid] = better(share[tid], share[tid + stride]);
        }
        workgroupBarrier();
        stride = stride / 2u;
    }
    if (tid == 0u) {
        output[wid.x] = share[0];
    }
}
