@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var tex: texture_2d<f32>;

struct VSOut {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f
};

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VSOut {
    var positions = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f( 3.0, -1.0),
        vec2f(-1.0,  3.0)
    );
    var uvs = array<vec2f, 3>(
        vec2f(0.0, 0.0),
        vec2f(2.0, 0.0),
        vec2f(0.0, 2.0)
    );
    var o: VSOut;
    o.pos = vec4f(positions[idx], 0.0, 1.0);
    o.uv = uvs[idx];
    return o;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4f {
    return textureSample(tex, samp, in.uv);
}
