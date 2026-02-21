override BIT: u32 = 0u;

@group(0) @binding(0) var<storage, read> keysIn: array<u32>;
@group(0) @binding(1) var<storage, read> prefix: array<u32>;
@group(0) @binding(2) var<storage, read> zerosCount: array<u32>;
@group(0) @binding(3) var<storage, read_write> keysOut: array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let n = arrayLength(&keysIn);
    if (i >= n) { return; }
    let k = keysIn[i];
    let isZero = ((k >> BIT) & 1u) == 0u;
    let zeroPos = prefix[i];
    let z = zerosCount[0];
    let onePos = z + (i - zeroPos);
    let dst = select(onePos, zeroPos, isZero);
    keysOut[dst] = k;
}
