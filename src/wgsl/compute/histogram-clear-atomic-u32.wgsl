@group(0) @binding(0) var<storage, read_write> bins: array<atomic<u32>>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    if (i < arrayLength(&bins)) {
        atomicStore(&bins[i], 0u);
    }
}
