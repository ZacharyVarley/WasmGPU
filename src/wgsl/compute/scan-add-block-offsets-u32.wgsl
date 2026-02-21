const ELEMENTS_PER_WORKGROUP: u32 = 512u;

@group(0) @binding(0) var<storage, read_write> data: array<u32>;
@group(0) @binding(1) var<storage, read> blockOffsets: array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let n = arrayLength(&data);
    if (i >= n) { return; }
    let block = i / ELEMENTS_PER_WORKGROUP;
    let off = blockOffsets[block];
    data[i] = data[i] + off;
}
