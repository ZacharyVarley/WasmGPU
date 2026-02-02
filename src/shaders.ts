export const WGSL = {
    cube: {
        uniforms: /* wgsl */ `
struct Uniforms {
    mvp : mat4x4<f32>
};
@group(0) @binding(0) var<uniform> u : Uniforms;
`,
        vertex: /* wgsl */ `
struct VSIn {
    @location(0) pos : vec3<f32>,
    @location(1) col : vec3<f32>,
};

struct VSOut {
    @builtin(position) Position : vec4<f32>,
    @location(0) col : vec3<f32>,
};

@vertex
fn vsMain(input : VSIn) -> VSOut {
    var out : VSOut;
    out.Position = u.mvp * vec4<f32>(input.pos, 1.0);
    out.col = input.col;
    return out;
}
`,
        fragment: /* wgsl */ `
@fragment
fn fsMain(input : VSOut) -> @location(0) vec4<f32> {
    return vec4<f32>(input.col, 1.0);
}
`,
        code(): string {
            return this.uniforms + this.vertex + this.fragment;
        }
    }
} as const;
