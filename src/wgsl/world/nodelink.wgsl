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

struct CameraUniforms {
    viewProj: mat4x4f,
    position: vec3f,
    _pad0: f32
};

struct ModelUniforms {
    model: mat4x4f,
    normal: mat4x4f
};

struct Light {
    position: vec4f,
    color: vec4f,
    params: vec4f
};

struct LightingUniforms {
    ambient: vec4f,
    lightCount: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
    lights: array<Light, 8>
};

struct NodeLinkUniforms {
    global: vec4f,
    nodeScaleSource: vec4f,
    nodeScaleDomain: vec4f,
    nodeScaleClamp: vec4f,
    nodeScaleParams: vec4f,
    nodeScaleFlags: vec4f,
    nodeVisual: vec4f,
    edgeScaleSource: vec4f,
    edgeScaleDomain: vec4f,
    edgeScaleClamp: vec4f,
    edgeScaleParams: vec4f,
    edgeScaleFlags: vec4f,
    edgeVisual: vec4f,
    nodeSolid: vec4f,
    edgeSolid: vec4f,
    pointParams: vec4f,
    nodeStops: array<vec4f, 8>,
    edgeStops: array<vec4f, 8>
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> model: ModelUniforms;
@group(0) @binding(2) var<uniform> lighting: LightingUniforms;

@group(1) @binding(0) var<storage, read> nodePositions: array<vec4f>;
@group(1) @binding(1) var<storage, read> nodeScalars: array<f32>;
@group(1) @binding(2) var<storage, read> nodeColors: array<vec4f>;
@group(1) @binding(3) var<storage, read> nodeRadii: array<vec4f>;
@group(1) @binding(4) var<storage, read> edges: array<vec2u>;
@group(1) @binding(5) var<storage, read> edgeScalars: array<f32>;
@group(1) @binding(6) var<storage, read> edgeColors: array<vec4f>;
@group(1) @binding(7) var<uniform> nl: NodeLinkUniforms;
@group(1) @binding(8) var nodeColormapSampler: sampler;
@group(1) @binding(9) var nodeColormapTex: texture_1d<f32>;
@group(1) @binding(10) var edgeColormapSampler: sampler;
@group(1) @binding(11) var edgeColormapTex: texture_1d<f32>;

fn srgbFromLinear(linear: vec3f) -> vec3f {
    let a = 0.055;
    let lo = 12.92 * linear;
    let hi = (1.0 + a) * pow(linear, vec3f(1.0 / 2.4)) - vec3f(a);
    let useHi = linear > vec3f(0.0031308);
    return select(lo, hi, useHi);
}

fn sampleCustomStops(tIn: f32, stops: array<vec4f, 8>, stopCountIn: u32) -> vec4f {
    let n = min(8u, max(2u, stopCountIn));
    let x = scale_clamp01(tIn) * f32(n - 1u);
    let i = u32(floor(x));
    let f = x - f32(i);
    if (i >= n - 1u) {
        return stops[n - 1u];
    }
    return stops[i] + f * (stops[i + 1u] - stops[i]);
}

fn sampleNodeColormap(t: f32) -> vec4f {
    let stopCount = u32(nl.nodeVisual.y + 0.5);
    if (stopCount >= 2u) {
        return sampleCustomStops(t, nl.nodeStops, stopCount);
    }
    return textureSampleLevel(nodeColormapTex, nodeColormapSampler, scale_clamp01(t), 0.0);
}

fn sampleEdgeColormap(t: f32) -> vec4f {
    let stopCount = u32(nl.edgeVisual.y + 0.5);
    if (stopCount >= 2u) {
        return sampleCustomStops(t, nl.edgeStops, stopCount);
    }
    return textureSampleLevel(edgeColormapTex, edgeColormapSampler, scale_clamp01(t), 0.0);
}

fn nodeColor(index: u32) -> vec4f {
    let mode = u32(round(nl.nodeVisual.x));
    if (mode == 0u) {
        return nodeColors[index];
    }
    if (mode == 1u) {
        let rawValue = nodeScalars[index];
        if (!scale_is_finite(rawValue)) {
            return vec4f(0.0, 0.0, 0.0, 0.0);
        }
        let t = scale_apply_transform(rawValue, vec4f(nl.nodeScaleDomain.x, nl.nodeScaleDomain.y, 0.0, nl.nodeScaleDomain.w), nl.nodeScaleClamp, nl.nodeScaleParams, nl.nodeScaleFlags);
        return sampleNodeColormap(t);
    }
    return nl.nodeSolid;
}

fn edgeColor(index: u32) -> vec4f {
    let mode = u32(round(nl.edgeVisual.x));
    if (mode == 0u) {
        return edgeColors[index];
    }
    if (mode == 1u) {
        let rawValue = edgeScalars[index];
        if (!scale_is_finite(rawValue)) {
            return vec4f(0.0, 0.0, 0.0, 0.0);
        }
        let t = scale_apply_transform(rawValue, vec4f(nl.edgeScaleDomain.x, nl.edgeScaleDomain.y, 0.0, nl.edgeScaleDomain.w), nl.edgeScaleClamp, nl.edgeScaleParams, nl.edgeScaleFlags);
        return sampleEdgeColormap(t);
    }
    return nl.edgeSolid;
}

fn applyLighting(worldPos: vec3f, N: vec3f, baseColor: vec3f) -> vec3f {
    var Lo = lighting.ambient.rgb * baseColor;
    let lightCount = min(lighting.lightCount, 8u);
    for (var i = 0u; i < lightCount; i++) {
        let light = lighting.lights[i];
        var L: vec3f;
        var attenuation: f32 = 1.0;
        if (light.position.w == 0.0) {
            L = normalize(-light.position.xyz);
        } else {
            let lightDir = light.position.xyz - worldPos;
            let distance = length(lightDir);
            L = select(vec3f(0.0, 1.0, 0.0), lightDir / distance, distance > 1e-6);
            attenuation = 1.0 / max(distance * distance, 1e-6);
            let range = light.params.x;
            if (range > 0.0) {
                let f = scale_clamp01(1.0 - distance / range);
                attenuation *= f * f;
            }
        }
        let NdotL = max(dot(N, L), 0.0);
        let radiance = light.color.rgb * light.color.a * attenuation;
        Lo += baseColor * radiance * NdotL;
    }
    return Lo;
}

fn buildEdgeFrame(src: vec3f, dst: vec3f) -> mat3x3f {
    let yAxis = normalize(dst - src);
    var z = vec3f(0.0, 0.0, 1.0);
    if (abs(dot(z, yAxis)) > 0.99) {
        z = vec3f(1.0, 0.0, 0.0);
    }
    let xAxis = normalize(cross(z, yAxis));
    let zAxis = normalize(cross(yAxis, xAxis));
    return mat3x3f(xAxis, yAxis, zAxis);
}

struct NodeVertexOut {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) normal: vec3f,
    @location(2) @interpolate(flat) nodeIndex: u32,
    @location(3) pointCoord: vec2f,
    @location(4) @interpolate(flat) isPoint: f32
};

struct EdgeVertexOut {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) normal: vec3f,
    @location(2) @interpolate(flat) edgeIndex: u32,
    @location(3) @interpolate(flat) litEnabled: f32
};

@vertex
fn vs_node_points(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> NodeVertexOut {
    let p = nodePositions[instanceIndex].xyz;
    let worldPos4 = model.model * vec4f(p, 1.0);
    let clip = camera.viewProj * worldPos4;
    let baseSize = nl.global.x;
    let minSize = nl.pointParams.x;
    let maxSize = nl.pointParams.y;
    let atten = nl.pointParams.z;
    var sizePx = baseSize;
    if (atten > 0.0) {
        let dist = distance(camera.position, worldPos4.xyz);
        sizePx = baseSize * (atten / max(dist, 1e-6));
    }
    sizePx = clamp(sizePx, minSize, maxSize);
    let uv = vec2f(f32((vertexIndex + 2u) / 3u % 2u), f32((vertexIndex + 1u) / 3u % 2u));
    let row0 = vec3f(camera.viewProj[0][0], camera.viewProj[1][0], camera.viewProj[2][0]);
    let row1 = vec3f(camera.viewProj[0][1], camera.viewProj[1][1], camera.viewProj[2][1]);
    let aspect = length(row1) / max(length(row0), 1e-6);
    let ndcSize = (sizePx * 2.0) / max(camera._pad0, 1.0);
    let offsetX = (uv.x - 0.5) * ndcSize / aspect * clip.w;
    let offsetY = -(uv.y - 0.5) * ndcSize * clip.w;
    var out: NodeVertexOut;
    out.position = clip + vec4f(offsetX, offsetY, 0.0, 0.0);
    out.worldPos = worldPos4.xyz;
    out.normal = vec3f(0.0, 0.0, 1.0);
    out.nodeIndex = instanceIndex;
    out.pointCoord = uv * 2.0 - vec2f(1.0, 1.0);
    out.isPoint = 1.0;
    return out;
}

@vertex
fn vs_node_solid(@location(0) position: vec3f, @location(1) normal: vec3f, @builtin(instance_index) instanceIndex: u32) -> NodeVertexOut {
    let center = nodePositions[instanceIndex].xyz;
    let mode = u32(round(nl.nodeVisual.z));
    let useRadii = nl.nodeVisual.w > 0.5;
    var scaleVec = vec3f(max(nl.global.x, 1e-6));
    if (useRadii) {
        let rv = max(nodeRadii[instanceIndex].xyz, vec3f(1e-6));
        if (mode == 2u) {
            scaleVec = rv * max(nl.global.x, 1e-6);
        } else {
            scaleVec = vec3f(rv.x * max(nl.global.x, 1e-6));
        }
    }
    let objPos = center + (position * scaleVec);
    let worldPos4 = model.model * vec4f(objPos, 1.0);
    let localN = normalize(normal / scaleVec);
    let worldN = normalize((model.normal * vec4f(localN, 0.0)).xyz);
    var out: NodeVertexOut;
    out.position = camera.viewProj * worldPos4;
    out.worldPos = worldPos4.xyz;
    out.normal = worldN;
    out.nodeIndex = instanceIndex;
    out.pointCoord = vec2f(0.0, 0.0);
    out.isPoint = 0.0;
    return out;
}

@vertex
fn vs_edge_lines(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> EdgeVertexOut {
    let edge = edges[instanceIndex];
    let src = nodePositions[edge.x].xyz;
    let dst = nodePositions[edge.y].xyz;
    let objPos = select(src, dst, (vertexIndex & 1u) == 1u);
    let worldPos4 = model.model * vec4f(objPos, 1.0);
    var out: EdgeVertexOut;
    out.position = camera.viewProj * worldPos4;
    out.worldPos = worldPos4.xyz;
    out.normal = vec3f(0.0, 1.0, 0.0);
    out.edgeIndex = instanceIndex;
    out.litEnabled = 0.0;
    return out;
}

@vertex
fn vs_edge_cylinders(@location(0) position: vec3f, @location(1) normal: vec3f, @builtin(instance_index) instanceIndex: u32) -> EdgeVertexOut {
    let edge = edges[instanceIndex];
    let src = nodePositions[edge.x].xyz;
    let dst = nodePositions[edge.y].xyz;
    let seg = dst - src;
    let segLen = max(length(seg), 1e-6);
    let basis = buildEdgeFrame(src, dst);
    let radius = max(nl.global.y, 1e-6);
    let local = vec3f(position.x * radius, position.y * segLen, position.z * radius);
    let objPos = ((src + dst) * 0.5) + (basis * local);
    let worldPos4 = model.model * vec4f(objPos, 1.0);
    let localN = normalize(basis * vec3f(normal.x, 0.0, normal.z));
    let worldN = normalize((model.normal * vec4f(localN, 0.0)).xyz);
    var out: EdgeVertexOut;
    out.position = camera.viewProj * worldPos4;
    out.worldPos = worldPos4.xyz;
    out.normal = worldN;
    out.edgeIndex = instanceIndex;
    out.litEnabled = 1.0;
    return out;
}

@fragment
fn fs_node(in: NodeVertexOut) -> @location(0) vec4f {
    var c = nodeColor(in.nodeIndex);
    if (in.isPoint > 0.5) {
        let r2 = dot(in.pointCoord, in.pointCoord);
        if (r2 > 1.0) {
            discard;
        }
        let falloff = (1.0 - r2);
        c = vec4f(c.rgb, c.a * (falloff * falloff));
    } else if (nl.global.w > 0.5) {
        let litRgb = applyLighting(in.worldPos, normalize(in.normal), max(c.rgb, vec3f(0.0)));
        c = vec4f(litRgb, c.a);
    }
    c = vec4f(c.rgb, c.a * scale_clamp01(nl.global.z));
    return vec4f(srgbFromLinear(max(c.rgb, vec3f(0.0))), c.a);
}

@fragment
fn fs_edge(in: EdgeVertexOut) -> @location(0) vec4f {
    var c = edgeColor(in.edgeIndex);
    if (nl.global.w > 0.5 && in.litEnabled > 0.5) {
        let litRgb = applyLighting(in.worldPos, normalize(in.normal), max(c.rgb, vec3f(0.0)));
        c = vec4f(litRgb, c.a);
    }
    c = vec4f(c.rgb, c.a * scale_clamp01(nl.global.z));
    return vec4f(srgbFromLinear(max(c.rgb, vec3f(0.0))), c.a);
}
