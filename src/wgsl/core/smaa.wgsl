struct Params {
    rtMetrics: vec4f,
    threshold: f32,
    _pad0: f32,
    _pad1: f32,
    _pad2: f32
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var sampLinear: sampler;
@group(0) @binding(2) var sampPoint: sampler;
@group(0) @binding(3) var sceneTex: texture_2d<f32>;
@group(0) @binding(4) var edgesTex: texture_2d<f32>;
@group(0) @binding(5) var blendTex: texture_2d<f32>;

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f
};

@vertex
fn vs_fullscreen(@builtin(vertex_index) vi: u32) -> VertexOutput {
    var positions = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f(3.0, -1.0),
        vec2f(-1.0, 3.0)
    );
    var uvs = array<vec2f, 3>(
        vec2f(0.0, 1.0),
        vec2f(2.0, 1.0),
        vec2f(0.0, -1.0)
    );
    var out: VertexOutput;
    out.pos = vec4f(positions[vi], 0.0, 1.0);
    out.uv = uvs[vi];
    return out;
}

fn luma(rgb: vec3f) -> f32 {
    return dot(rgb, vec3f(0.2126, 0.7152, 0.0722));
}

@fragment
fn fs_smaa_edges(in: VertexOutput) -> @location(0) vec4f {
    let t = params.rtMetrics.xy;
    let c = textureSampleLevel(sceneTex, sampPoint, in.uv, 0.0).rgb;
    let l = luma(c);
    let lLeft = luma(textureSampleLevel(sceneTex, sampPoint, in.uv + vec2f(-t.x, 0.0), 0.0).rgb);
    let lTop  = luma(textureSampleLevel(sceneTex, sampPoint, in.uv + vec2f(0.0, -t.y), 0.0).rgb);
    let dLeft = abs(l - lLeft);
    let dTop  = abs(l - lTop);
    let eV = select(0.0, 1.0, dLeft >= params.threshold);
    let eH = select(0.0, 1.0, dTop  >= params.threshold);
    return vec4f(eV, eH, 0.0, 0.0);
}

fn edgeV(uv: vec2f) -> bool {
    return textureSampleLevel(edgesTex, sampPoint, uv, 0.0).r > 0.5;
}

fn edgeH(uv: vec2f) -> bool {
    return textureSampleLevel(edgesTex, sampPoint, uv, 0.0).g > 0.5;
}

@fragment
fn fs_smaa_weights(in: VertexOutput) -> @location(0) vec4f {
    let t = params.rtMetrics.xy;
    let e = textureSampleLevel(edgesTex, sampPoint, in.uv, 0.0);
    var wLeft: f32 = 0.0;
    var wTop: f32 = 0.0;
    if (e.r > 0.5) {
        var up: i32 = 0;
        var down: i32 = 0;
        for (var s: i32 = 1; s <= 8; s = s + 1) {
            if (!edgeV(in.uv + vec2f(0.0, -t.y * f32(s)))) {
                break;
            }
            up = up + 1;
        }
        for (var s: i32 = 1; s <= 8; s = s + 1) {
            if (!edgeV(in.uv + vec2f(0.0, t.y * f32(s)))) {
                break;
            }
            down = down + 1;
        }
        let len = f32(up + down + 1);
        wLeft = clamp(len / 17.0, 0.0, 1.0) * 0.5;
    }
    if (e.g > 0.5) {
        var left: i32 = 0;
        var right: i32 = 0;
        for (var s: i32 = 1; s <= 8; s = s + 1) {
            if (!edgeH(in.uv + vec2f(-t.x * f32(s), 0.0))) {
                break;
            }
            left = left + 1;
        }
        for (var s: i32 = 1; s <= 8; s = s + 1) {
            if (!edgeH(in.uv + vec2f(t.x * f32(s), 0.0))) {
                break;
            }
            right = right + 1;
        }
        let len = f32(left + right + 1);
        wTop = clamp(len / 17.0, 0.0, 1.0) * 0.5;
    }
    return vec4f(wLeft, wTop, 0.0, 0.0);
}

@fragment
fn fs_smaa_neighborhood(in: VertexOutput) -> @location(0) vec4f {
    let t = params.rtMetrics.xy;
    let c = textureSampleLevel(sceneTex, sampLinear, in.uv, 0.0);
    let w = textureSampleLevel(blendTex, sampPoint, in.uv, 0.0);
    let wL = w.r;
    let wT = w.g;
    let wR = textureSampleLevel(blendTex, sampPoint, in.uv + vec2f(t.x, 0.0), 0.0).r;
    let wB = textureSampleLevel(blendTex, sampPoint, in.uv + vec2f(0.0, t.y), 0.0).g;
    var bestW: f32 = 0.0;
    var dir: i32 = -1;
    if (wL > bestW) {
        bestW = wL; dir = 0;
    }
    if (wR > bestW) {
        bestW = wR; dir = 1;
    }
    if (wT > bestW) {
        bestW = wT; dir = 2;
    }
    if (wB > bestW) {
        bestW = wB; dir = 3;
    }
    if (bestW <= 0.0) {
        return c;
    }
    var n: vec4f = c;
    if (dir == 0) {
        n = textureSampleLevel(sceneTex, sampLinear, in.uv + vec2f(-t.x, 0.0), 0.0);
    } else if (dir == 1) {
        n = textureSampleLevel(sceneTex, sampLinear, in.uv + vec2f(t.x, 0.0), 0.0);
    } else if (dir == 2) {
        n = textureSampleLevel(sceneTex, sampLinear, in.uv + vec2f(0.0, -t.y), 0.0);
    } else {
        n = textureSampleLevel(sceneTex, sampLinear, in.uv + vec2f(0.0, t.y), 0.0);
    }
    return mix(c, n, bestW);
}
