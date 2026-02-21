override BIT: u32 = 0u;

@group(0) @binding(0) var<storage, read> keys: array<u32>;
@group(0) @binding(1) var<storage, read_write> flags: array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let n = arrayLength(&keys);
    if (i >= n) { return; }
    let k = keys[i];
    let isZero = ((k >> BIT) & 1u) == 0u;
    flags[i] = select(0u, 1u, isZero);
}
