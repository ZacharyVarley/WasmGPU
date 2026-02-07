#![allow(non_snake_case)]
#![allow(clippy::identity_op)]
#![allow(clippy::too_many_arguments)]

use core::mem;

#[inline(always)]
unsafe fn f32_slice(ptr: u32, len: usize) -> &'static [f32] {
    core::slice::from_raw_parts(ptr as *const f32, len)
}

#[inline(always)]
unsafe fn f32_slice_mut(ptr: u32, len: usize) -> &'static mut [f32] {
    core::slice::from_raw_parts_mut(ptr as *mut f32, len)
}

#[inline(always)]
unsafe fn u32_slice(ptr: u32, len: usize) -> &'static [u32] {
    core::slice::from_raw_parts(ptr as *const u32, len)
}

#[inline(always)]
fn align_up(x: usize, align: usize) -> usize {
    (x + (align - 1)) & !(align - 1)
}

extern "C" {
    static mut __heap_base: u8;
}

static mut HEAP_PTR: usize = usize::MAX;

#[cfg(target_arch = "wasm32")]
#[inline(always)]
unsafe fn ensure_memory(end: usize) -> bool {
    use core::arch::wasm32;
    const PAGE: usize = 65536;

    let cur_pages: usize = wasm32::memory_size::<0>();
    let cur_bytes: usize = cur_pages * PAGE;

    if end <= cur_bytes {
        return true;
    }

    let needed = end - cur_bytes;
    let add_pages: usize = (needed + (PAGE - 1)) / PAGE;

    let prev: usize = wasm32::memory_grow::<0>(add_pages);
    prev != usize::MAX
}

#[cfg(not(target_arch = "wasm32"))]
#[inline(always)]
unsafe fn ensure_memory(_end: usize) -> bool {
    true
}

#[inline(always)]
unsafe fn alloc_raw(bytes: usize, align: usize) -> u32 {
    if align == 0 || (align & (align - 1)) != 0 {
        return 0;
    }
    if HEAP_PTR == usize::MAX {
        HEAP_PTR = (&raw mut __heap_base as *mut u8) as usize;
    }
    let ptr = align_up(HEAP_PTR, align);
    let end = match ptr.checked_add(bytes) {
        Some(v) => v,
        None => return 0,
    };
    if !ensure_memory(end) {
        return 0;
    }
    HEAP_PTR = end;
    ptr as u32
}

#[no_mangle]
pub extern "C" fn wasmgpu_alloc(bytes: u32) -> u32 {
    unsafe { alloc_raw(bytes as usize, 8) }
}

#[no_mangle]
pub extern "C" fn wasmgpu_free(_ptr: u32, _bytes: u32) {
    // bump allocator: no-op free
}

#[no_mangle]
pub extern "C" fn wasmgpu_alloc_f32(len: u32) -> u32 {
    unsafe { alloc_raw((len as usize) * mem::size_of::<f32>(), mem::align_of::<f32>()) }
}

#[no_mangle]
pub extern "C" fn wasmgpu_free_f32(_ptr: u32, _len: u32) {
    // bump allocator: no-op free
}

static mut FRAME_ARENA_BASE: usize = 0;
static mut FRAME_ARENA_CAP: usize = 0;
static mut FRAME_ARENA_HEAD: usize = 0;

#[no_mangle]
pub extern "C" fn wasmgpu_frame_arena_init(cap_bytes: u32) -> u32 {
    unsafe {
        if FRAME_ARENA_BASE != 0 {
            return FRAME_ARENA_BASE as u32;
        }
        if cap_bytes == 0 {
            return 0;
        }

        let base = alloc_raw(cap_bytes as usize, 16);
        if base == 0 {
            return 0;
        }

        FRAME_ARENA_BASE = base as usize;
        FRAME_ARENA_CAP = cap_bytes as usize;
        FRAME_ARENA_HEAD = 0;

        base
    }
}

#[no_mangle]
pub extern "C" fn wasmgpu_frame_arena_reset() {
    unsafe {
        FRAME_ARENA_HEAD = 0;
    }
}

#[no_mangle]
pub extern "C" fn wasmgpu_frame_arena_used() -> u32 {
    unsafe { FRAME_ARENA_HEAD as u32 }
}

#[no_mangle]
pub extern "C" fn wasmgpu_frame_arena_cap() -> u32 {
    unsafe { FRAME_ARENA_CAP as u32 }
}

#[no_mangle]
pub extern "C" fn wasmgpu_frame_alloc(bytes: u32, align: u32) -> u32 {
    unsafe {
        if FRAME_ARENA_BASE == 0 || FRAME_ARENA_CAP == 0 {
            return 0;
        }

        let align = align as usize;
        if align == 0 || (align & (align - 1)) != 0 {
            return 0;
        }

        let base = FRAME_ARENA_BASE;
        let head = FRAME_ARENA_HEAD;
        let cap = FRAME_ARENA_CAP;

        let start = align_up(base + head, align);
        let end = match start.checked_add(bytes as usize) {
            Some(v) => v,
            None => return 0,
        };

        if end - base > cap {
            return 0;
        }

        FRAME_ARENA_HEAD = end - base;
        start as u32
    }
}

#[no_mangle]
pub extern "C" fn wasmgpu_frame_alloc_f32(len: u32) -> u32 {
    let bytes = match len.checked_mul(mem::size_of::<f32>() as u32) {
        Some(v) => v,
        None => return 0,
    };
    wasmgpu_frame_alloc(bytes, 16)
}

static mut RNG_STATE: u32 = 0x1234_5678;

#[no_mangle]
pub extern "C" fn wasmgpu_seed(seed: u32) {
    unsafe {
        RNG_STATE = if seed == 0 { 0x1234_5678 } else { seed };
    }
}

#[inline(always)]
fn rand_u32() -> u32 {
    unsafe {
        let mut x = RNG_STATE;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        RNG_STATE = x;
        x
    }
}

#[inline(always)]
fn rand_f32_01() -> f32 {
    const INV: f32 = 1.0 / 4294967296.0;
    (rand_u32() as f32) * INV
}

#[inline(always)]
fn rand_range(a: f32, b: f32) -> f32 {
    rand_f32_01() * (b - a) + a
}

#[inline(always)]
fn round_js(x: f32) -> f32 {
    (x + 0.5).floor()
}

#[inline(always)]
fn mat4_det_from(m: &[f32; 16]) -> f32 {
    let a0: f32 = m[0] * m[5] - m[1] * m[4];
    let a1: f32 = m[0] * m[6] - m[2] * m[4];
    let a2: f32 = m[0] * m[7] - m[3] * m[4];
    let a3: f32 = m[1] * m[6] - m[2] * m[5];
    let a4: f32 = m[1] * m[7] - m[3] * m[5];
    let a5: f32 = m[2] * m[7] - m[3] * m[6];
    let b0: f32 = m[8] * m[13] - m[9] * m[12];
    let b1: f32 = m[8] * m[14] - m[10] * m[12];
    let b2: f32 = m[8] * m[15] - m[11] * m[12];
    let b3: f32 = m[9] * m[14] - m[10] * m[13];
    let b4: f32 = m[9] * m[15] - m[11] * m[13];
    let b5: f32 = m[10] * m[15] - m[11] * m[14];
    a0 * b5 - a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1 + a5 * b0
}

#[inline(always)]
fn mat4_identity_arr() -> [f32; 16] {
    [
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]
}

#[inline(always)]
fn mat4_invert_from(m: &[f32; 16]) -> [f32; 16] {
    let det: f32 = mat4_det_from(m);
    if det == 0.0 {
        return mat4_identity_arr();
    }
    let idet: f32 = 1.0 / det;
    [
        (m[5] * (m[10] * m[15] - m[11] * m[14]) - m[9] * (m[6] * m[15] - m[7] * m[14])
            + m[13] * (m[6] * m[11] - m[7] * m[10]))
            * idet,
        (-m[1] * (m[10] * m[15] - m[11] * m[14]) + m[9] * (m[2] * m[15] - m[3] * m[14])
            - m[13] * (m[2] * m[11] - m[3] * m[10]))
            * idet,
        (m[1] * (m[6] * m[15] - m[7] * m[14]) - m[5] * (m[2] * m[15] - m[3] * m[14])
            + m[13] * (m[2] * m[7] - m[3] * m[6]))
            * idet,
        (-m[1] * (m[6] * m[11] - m[7] * m[10]) + m[5] * (m[2] * m[11] - m[3] * m[10])
            - m[9] * (m[2] * m[7] - m[3] * m[6]))
            * idet,
        (-m[4] * (m[10] * m[15] - m[11] * m[14]) + m[8] * (m[6] * m[15] - m[7] * m[14])
            - m[12] * (m[6] * m[11] - m[7] * m[10]))
            * idet,
        (m[0] * (m[10] * m[15] - m[11] * m[14]) - m[8] * (m[2] * m[15] - m[3] * m[14])
            + m[12] * (m[2] * m[11] - m[3] * m[10]))
            * idet,
        (-m[0] * (m[6] * m[15] - m[7] * m[14]) + m[4] * (m[2] * m[15] - m[3] * m[14])
            - m[12] * (m[2] * m[7] - m[3] * m[6]))
            * idet,
        (m[0] * (m[6] * m[11] - m[7] * m[10]) - m[4] * (m[2] * m[11] - m[3] * m[10])
            + m[8] * (m[2] * m[7] - m[3] * m[6]))
            * idet,
        (m[4] * (m[9] * m[15] - m[11] * m[13]) - m[8] * (m[5] * m[15] - m[7] * m[13])
            + m[12] * (m[5] * m[11] - m[7] * m[9]))
            * idet,
        (-m[0] * (m[9] * m[15] - m[11] * m[13]) + m[8] * (m[1] * m[15] - m[3] * m[13])
            - m[12] * (m[1] * m[11] - m[3] * m[9]))
            * idet,
        (m[0] * (m[5] * m[15] - m[7] * m[13]) - m[4] * (m[1] * m[15] - m[3] * m[13])
            + m[12] * (m[1] * m[7] - m[3] * m[5]))
            * idet,
        (-m[0] * (m[5] * m[11] - m[7] * m[9]) + m[4] * (m[1] * m[11] - m[3] * m[9])
            - m[8] * (m[1] * m[7] - m[3] * m[5]))
            * idet,
        (-m[4] * (m[9] * m[14] - m[10] * m[13]) + m[8] * (m[5] * m[14] - m[6] * m[13])
            - m[12] * (m[5] * m[10] - m[6] * m[9]))
            * idet,
        (m[0] * (m[9] * m[14] - m[10] * m[13]) - m[8] * (m[1] * m[14] - m[2] * m[13])
            + m[12] * (m[1] * m[10] - m[2] * m[9]))
            * idet,
        (-m[0] * (m[5] * m[14] - m[6] * m[13]) + m[4] * (m[1] * m[14] - m[2] * m[13])
            - m[12] * (m[1] * m[6] - m[2] * m[5]))
            * idet,
        (m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9])
            + m[8] * (m[1] * m[6] - m[2] * m[5]))
            * idet,
    ]
}

#[inline(always)]
fn vec3_norm_from(v: &[f32; 3]) -> f32 {
    (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt()
}

#[inline(always)]
fn vec3_normsq_from(v: &[f32; 3]) -> f32 {
    v[0] * v[0] + v[1] * v[1] + v[2] * v[2]
}

#[inline(always)]
fn vec3_dot_from(a: &[f32; 3], b: &[f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

#[inline(always)]
fn vec3_cross_from(a: &[f32; 3], b: &[f32; 3]) -> [f32; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

#[inline(always)]
fn quat_norm_from(q: &[f32; 4]) -> f32 {
    (q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]).sqrt()
}

#[inline(always)]
fn quat_normalize_arr(q: &[f32; 4]) -> [f32; 4] {
    let n = quat_norm_from(q);
    if n == 0.0 {
        return [0.0, 0.0, 0.0, 0.0];
    }
    let inorm = 1.0 / n;
    [q[0] * inorm, q[1] * inorm, q[2] * inorm, q[3] * inorm]
}

#[no_mangle]
pub extern "C" fn mat4_abs(out: u32, m: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        let a = f32_slice(m, 16);
        for i in 0..16 {
            o[i] = a[i].abs();
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_add(out: u32, m1: u32, m2: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        let a = f32_slice(m1, 16);
        let b = f32_slice(m2, 16);
        for i in 0..16 {
            o[i] = a[i] + b[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_copy(out: u32, m: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        let a = f32_slice(m, 16);
        for i in 0..16 {
            o[i] = a[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_det(m: u32) -> f32 {
    unsafe {
        let a = f32_slice(m, 16);
        let mut mm = [0.0f32; 16];
        mm.copy_from_slice(a);
        mat4_det_from(&mm)
    }
}

#[no_mangle]
pub extern "C" fn mat4_identity(out: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        o[0] = 1.0;
        o[1] = 0.0;
        o[2] = 0.0;
        o[3] = 0.0;
        o[4] = 0.0;
        o[5] = 1.0;
        o[6] = 0.0;
        o[7] = 0.0;
        o[8] = 0.0;
        o[9] = 0.0;
        o[10] = 1.0;
        o[11] = 0.0;
        o[12] = 0.0;
        o[13] = 0.0;
        o[14] = 0.0;
        o[15] = 1.0;
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_init(
    out: u32,
    m0: f32,
    m1: f32,
    m2: f32,
    m3: f32,
    m4: f32,
    m5: f32,
    m6: f32,
    m7: f32,
    m8: f32,
    m9: f32,
    m10: f32,
    m11: f32,
    m12: f32,
    m13: f32,
    m14: f32,
    m15: f32,
) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        o[0] = m0;
        o[1] = m1;
        o[2] = m2;
        o[3] = m3;
        o[4] = m4;
        o[5] = m5;
        o[6] = m6;
        o[7] = m7;
        o[8] = m8;
        o[9] = m9;
        o[10] = m10;
        o[11] = m11;
        o[12] = m12;
        o[13] = m13;
        o[14] = m14;
        o[15] = m15;
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_invert(out: u32, m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let mut mm = [0.0f32; 16];
        mm.copy_from_slice(a);
        let inv = mat4_invert_from(&mm);
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = inv[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_isEqual(m1: u32, m2: u32) -> u32 {
    unsafe {
        let a = f32_slice(m1, 16);
        let b = f32_slice(m2, 16);
        for i in 0..16 {
            if a[i] != b[i] {
                return 0;
            }
        }
    }
    1
}

#[no_mangle]
pub extern "C" fn mat4_isIdentity(m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        if a[0] == 1.0
            && a[1] == 0.0
            && a[2] == 0.0
            && a[3] == 0.0
            && a[4] == 0.0
            && a[5] == 1.0
            && a[6] == 0.0
            && a[7] == 0.0
            && a[8] == 0.0
            && a[9] == 0.0
            && a[10] == 1.0
            && a[11] == 0.0
            && a[12] == 0.0
            && a[13] == 0.0
            && a[14] == 0.0
            && a[15] == 1.0
        {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_isInverse(m1: u32, m2: u32) -> u32 {
    unsafe {
        let a = f32_slice(m1, 16);
        let b = f32_slice(m2, 16);
        let mut mm = [0.0f32; 16];
        mm.copy_from_slice(a);
        let inv = mat4_invert_from(&mm);
        for i in 0..16 {
            if inv[i] != b[i] {
                return 0;
            }
        }
    }
    1
}

#[no_mangle]
pub extern "C" fn mat4_isZero(m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        for i in 0..16 {
            if a[i] != 0.0 {
                return 0;
            }
        }
    }
    1
}

#[no_mangle]
pub extern "C" fn mat4_lookAt(out: u32, eye: u32, center: u32, up: u32) -> u32 {
    unsafe {
        let eye = f32_slice(eye, 3);
        let center = f32_slice(center, 3);
        let up = f32_slice(up, 3);

        let mut f = [center[0] - eye[0], center[1] - eye[1], center[2] - eye[2]];
        let fnorm = (f[0] * f[0] + f[1] * f[1] + f[2] * f[2]).sqrt();
        f[0] /= fnorm;
        f[1] /= fnorm;
        f[2] /= fnorm;

        let mut s = [
            f[1] * up[2] - f[2] * up[1],
            f[2] * up[0] - f[0] * up[2],
            f[0] * up[1] - f[1] * up[0],
        ];
        let snorm = (s[0] * s[0] + s[1] * s[1] + s[2] * s[2]).sqrt();
        s[0] /= snorm;
        s[1] /= snorm;
        s[2] /= snorm;

        let u = [
            s[1] * f[2] - s[2] * f[1],
            s[2] * f[0] - s[0] * f[2],
            s[0] * f[1] - s[1] * f[0],
        ];

        let o = f32_slice_mut(out, 16);
        o[0] = s[0];
        o[1] = u[0];
        o[2] = -f[0];
        o[3] = 0.0;
        o[4] = s[1];
        o[5] = u[1];
        o[6] = -f[1];
        o[7] = 0.0;
        o[8] = s[2];
        o[9] = u[2];
        o[10] = -f[2];
        o[11] = 0.0;

        o[12] = -(s[0] * eye[0] + s[1] * eye[1] + s[2] * eye[2]);
        o[13] = -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]);
        o[14] = f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2];
        o[15] = 1.0;
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_mul(out: u32, m1: u32, m2: u32) -> u32 {
    unsafe {
        let a = f32_slice(m1, 16);
        let b = f32_slice(m2, 16);
        let mut t = [0.0f32; 16];

        t[0] = a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3];
        t[1] = a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3];
        t[2] = a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3];
        t[3] = a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3];

        t[4] = a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7];
        t[5] = a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7];
        t[6] = a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7];
        t[7] = a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7];

        t[8] = a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11];
        t[9] = a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11];
        t[10] = a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11];
        t[11] = a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11];

        t[12] = a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15];
        t[13] = a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15];
        t[14] = a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15];
        t[15] = a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15];

        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = t[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_mul_vec4(out: u32, m: u32, v4: u32) -> u32 {
    unsafe {
        let m = f32_slice(m, 16);
        let v = f32_slice(v4, 4);
        let o = f32_slice_mut(out, 4);

        o[0] = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3];
        o[1] = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3];
        o[2] = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3];
        o[3] = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3];
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_neg(out: u32, m: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        let a = f32_slice(m, 16);
        for i in 0..16 {
            o[i] = -a[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_norm(m: u32) -> f32 {
    unsafe {
        let a = f32_slice(m, 16);
        let mut s = 0.0f32;
        for i in 0..16 {
            s += a[i] * a[i];
        }
        s.sqrt()
    }
}

#[no_mangle]
pub extern "C" fn mat4_normalize(out: u32, m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let mut s = 0.0f32;
        for i in 0..16 {
            s += a[i] * a[i];
        }
        let n = s.sqrt();
        let o = f32_slice_mut(out, 16);
        if n == 0.0 {
            let id = mat4_identity_arr();
            for i in 0..16 {
                o[i] = id[i];
            }
            return 0;
        }
        let inorm = 1.0 / n;
        for i in 0..16 {
            o[i] = a[i] * inorm;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_normsq(m: u32) -> f32 {
    unsafe {
        let a = f32_slice(m, 16);
        let mut s = 0.0f32;
        for i in 0..16 {
            s += a[i] * a[i];
        }
        s
    }
}

#[no_mangle]
pub extern "C" fn mat4_perspective(out: u32, fov_y: f32, aspect: f32, near: f32, far: f32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        let f: f32 = 1.0 / (fov_y * 0.5).tan();
        let range_inv: f32 = 1.0 / (near - far);
        o[0] = f / aspect;
        o[1] = 0.0;
        o[2] = 0.0;
        o[3] = 0.0;
        o[4] = 0.0;
        o[5] = f;
        o[6] = 0.0;
        o[7] = 0.0;
        o[8] = 0.0;
        o[9] = 0.0;
        o[10] = far * range_inv;
        o[11] = -1.0;
        o[12] = 0.0;
        o[13] = 0.0;
        o[14] = near * far * range_inv;
        o[15] = 0.0;
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_random(out: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = rand_f32_01();
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_random_range(out: u32, a: f32, b: f32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = rand_range(a, b);
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_rotateX(out: u32, m: u32, angle: f32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let c: f32 = angle.cos();
        let s: f32 = angle.sin();
        let mut t = [0.0f32; 16];

        t[0] = a[0];
        t[1] = a[1];
        t[2] = a[2];
        t[3] = a[3];

        t[4] = a[4] * c + a[8] * s;
        t[5] = a[5] * c + a[9] * s;
        t[6] = a[6] * c + a[10] * s;
        t[7] = a[7] * c + a[11] * s;

        t[8] = a[8] * c - a[4] * s;
        t[9] = a[9] * c - a[5] * s;
        t[10] = a[10] * c - a[6] * s;
        t[11] = a[11] * c - a[7] * s;

        t[12] = a[12];
        t[13] = a[13];
        t[14] = a[14];
        t[15] = a[15];

        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = t[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_rotateY(out: u32, m: u32, angle: f32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let c: f32 = angle.cos();
        let s: f32 = angle.sin();
        let mut t = [0.0f32; 16];

        t[0] = a[0] * c - a[8] * s;
        t[1] = a[1] * c - a[9] * s;
        t[2] = a[2] * c - a[10] * s;
        t[3] = a[3] * c - a[11] * s;

        t[4] = a[4];
        t[5] = a[5];
        t[6] = a[6];
        t[7] = a[7];

        t[8] = a[0] * s + a[8] * c;
        t[9] = a[1] * s + a[9] * c;
        t[10] = a[2] * s + a[10] * c;
        t[11] = a[3] * s + a[11] * c;

        t[12] = a[12];
        t[13] = a[13];
        t[14] = a[14];
        t[15] = a[15];

        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = t[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_rotateZ(out: u32, m: u32, angle: f32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let c: f32 = angle.cos();
        let s: f32 = angle.sin();
        let mut t = [0.0f32; 16];

        t[0] = a[0] * c + a[4] * s;
        t[1] = a[1] * c + a[5] * s;
        t[2] = a[2] * c + a[6] * s;
        t[3] = a[3] * c + a[7] * s;

        t[4] = a[4] * c - a[0] * s;
        t[5] = a[5] * c - a[1] * s;
        t[6] = a[6] * c - a[2] * s;
        t[7] = a[7] * c - a[3] * s;

        t[8] = a[8];
        t[9] = a[9];
        t[10] = a[10];
        t[11] = a[11];

        t[12] = a[12];
        t[13] = a[13];
        t[14] = a[14];
        t[15] = a[15];

        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = t[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_round(out: u32, m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = round_js(a[i]);
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_scl(out: u32, m: u32, n: f32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = a[i] * n;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_sub(out: u32, m1: u32, m2: u32) -> u32 {
    unsafe {
        let a = f32_slice(m1, 16);
        let b = f32_slice(m2, 16);
        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = a[i] - b[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_trace(m: u32) -> f32 {
    unsafe {
        let a = f32_slice(m, 16);
        a[0] + a[5] + a[10] + a[15]
    }
}

#[no_mangle]
pub extern "C" fn mat4_translate(out: u32, m: u32, v: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let v = f32_slice(v, 3);
        let o = f32_slice_mut(out, 16);

        o[0] = a[0];
        o[1] = a[1];
        o[2] = a[2];
        o[3] = a[3];
        o[4] = a[4];
        o[5] = a[5];
        o[6] = a[6];
        o[7] = a[7];
        o[8] = a[8];
        o[9] = a[9];
        o[10] = a[10];
        o[11] = a[11];

        o[12] = a[12] + v[0];
        o[13] = a[13] + v[1];
        o[14] = a[14] + v[2];
        o[15] = a[15];
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_transpose(out: u32, m: u32) -> u32 {
    unsafe {
        let a = f32_slice(m, 16);
        let mut t = [0.0f32; 16];

        t[0] = a[0];
        t[1] = a[4];
        t[2] = a[8];
        t[3] = a[12];
        t[4] = a[1];
        t[5] = a[5];
        t[6] = a[9];
        t[7] = a[13];
        t[8] = a[2];
        t[9] = a[6];
        t[10] = a[10];
        t[11] = a[14];
        t[12] = a[3];
        t[13] = a[7];
        t[14] = a[11];
        t[15] = a[15];

        let o = f32_slice_mut(out, 16);
        for i in 0..16 {
            o[i] = t[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn mat4_print(_m: u32) {
    // Printing is handled in JavaScript.
}

#[no_mangle]
pub extern "C" fn quat_abs(out: u32, q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let o = f32_slice_mut(out, 4);
        o[0] = a[0].abs();
        o[1] = a[1].abs();
        o[2] = a[2].abs();
        o[3] = a[3].abs();
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_add(out: u32, q1: u32, q2: u32) -> u32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        let o = f32_slice_mut(out, 4);
        o[0] = a[0] + b[0];
        o[1] = a[1] + b[1];
        o[2] = a[2] + b[2];
        o[3] = a[3] + b[3];
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_copy(out: u32, q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = a[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_dist(q1: u32, q2: u32) -> f32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        let dw = a[3] - b[3];
        (dx * dx + dy * dy + dz * dz + dw * dw).sqrt()
    }
}

#[no_mangle]
pub extern "C" fn quat_distsq(q1: u32, q2: u32) -> f32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        let dw = a[3] - b[3];
        dx * dx + dy * dy + dz * dz + dw * dw
    }
}

#[no_mangle]
pub extern "C" fn quat_fromAxisAngle(out: u32, axis: u32, angle: f32) -> u32 {
    unsafe {
        let a = f32_slice(axis, 3);
        let half_angle: f32 = angle * 0.5;
        let s: f32 = half_angle.sin();
        let c: f32 = half_angle.cos();
        let o = f32_slice_mut(out, 4);
        o[0] = a[0] * s;
        o[1] = a[1] * s;
        o[2] = a[2] * s;
        o[3] = c;
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_init(out: u32, a: f32, b: f32, c: f32, d: f32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 4);
        o[0] = a;
        o[1] = b;
        o[2] = c;
        o[3] = d;
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_invert(out: u32, q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let n2: f32 = a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3];
        let o = f32_slice_mut(out, 4);
        if n2 == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            o[3] = 1.0;
            return 0;
        }
        let inv = 1.0 / n2;
        o[0] = -a[0] * inv;
        o[1] = -a[1] * inv;
        o[2] = -a[2] * inv;
        o[3] = a[3] * inv;
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_isEqual(q1: u32, q2: u32) -> u32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        if a[0] == b[0] && a[1] == b[1] && a[2] == b[2] && a[3] == b[3] {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_isNormalized(q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        if a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] == 1.0 {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_isZero(q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        if a[0] == 0.0 && a[1] == 0.0 && a[2] == 0.0 && a[3] == 0.0 {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_mul(out: u32, q1: u32, q2: u32) -> u32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        let mut t = [0.0f32; 4];

        t[0] = a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1];
        t[1] = a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0];
        t[2] = a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3];
        t[3] = a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2];

        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = t[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_neg(out: u32, q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let o = f32_slice_mut(out, 4);
        o[0] = -a[0];
        o[1] = -a[1];
        o[2] = -a[2];
        o[3] = -a[3];
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_norm(q: u32) -> f32 {
    unsafe {
        let a = f32_slice(q, 4);
        (a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]).sqrt()
    }
}

#[no_mangle]
pub extern "C" fn quat_normalize(out: u32, q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let qarr = [a[0], a[1], a[2], a[3]];
        let n = quat_norm_from(&qarr);
        let o = f32_slice_mut(out, 4);
        if n == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            o[3] = 0.0;
            return 0;
        }
        let inv = 1.0 / n;
        o[0] = qarr[0] * inv;
        o[1] = qarr[1] * inv;
        o[2] = qarr[2] * inv;
        o[3] = qarr[3] * inv;
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_normscl(out: u32, q: u32, n: f32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let qarr = [a[0], a[1], a[2], a[3]];
        let qn = quat_normalize_arr(&qarr);
        let o = f32_slice_mut(out, 4);
        o[0] = qn[0] * n;
        o[1] = qn[1] * n;
        o[2] = qn[2] * n;
        o[3] = qn[3] * n;
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_normsq(q: u32) -> f32 {
    unsafe {
        let a = f32_slice(q, 4);
        a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]
    }
}

#[no_mangle]
pub extern "C" fn quat_random(out: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = rand_f32_01();
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_random_range(out: u32, a: f32, b: f32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = rand_range(a, b);
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_round(out: u32, q: u32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = round_js(a[i]);
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_scl(out: u32, q: u32, n: f32) -> u32 {
    unsafe {
        let a = f32_slice(q, 4);
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = a[i] * n;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_slerp(out: u32, q1: u32, q2: u32, t: f32) -> u32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        let q1v = [a[0], a[1], a[2], a[3]];
        let mut q2v = [b[0], b[1], b[2], b[3]];

        let mut dot: f32 = q1v[0] * q2v[0] + q1v[1] * q2v[1] + q1v[2] * q2v[2] + q1v[3] * q2v[3];

        if dot < 0.0 {
            q2v[0] = -q2v[0];
            q2v[1] = -q2v[1];
            q2v[2] = -q2v[2];
            q2v[3] = -q2v[3];
            dot = -dot;
        }

        let res: [f32; 4] = if dot > 0.9995 {
            let q = [
                q1v[0] + t * (q2v[0] - q1v[0]),
                q1v[1] + t * (q2v[1] - q1v[1]),
                q1v[2] + t * (q2v[2] - q1v[2]),
                q1v[3] + t * (q2v[3] - q1v[3]),
            ];
            quat_normalize_arr(&q)
        } else {
            let theta0: f32 = dot.acos();
            let theta: f32 = theta0 * t;
            let sin_theta: f32 = theta.sin();
            let sin_theta0: f32 = theta0.sin();
            let s0: f32 = theta.cos() - dot * sin_theta / sin_theta0;
            let s1: f32 = sin_theta / sin_theta0;
            [
                s0 * q1v[0] + s1 * q2v[0],
                s0 * q1v[1] + s1 * q2v[1],
                s0 * q1v[2] + s1 * q2v[2],
                s0 * q1v[3] + s1 * q2v[3],
            ]
        };

        let o = f32_slice_mut(out, 4);
        o[0] = res[0];
        o[1] = res[1];
        o[2] = res[2];
        o[3] = res[3];
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_sub(out: u32, q1: u32, q2: u32) -> u32 {
    unsafe {
        let a = f32_slice(q1, 4);
        let b = f32_slice(q2, 4);
        let o = f32_slice_mut(out, 4);
        for i in 0..4 {
            o[i] = a[i] - b[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_toRotation(out: u32, q: u32, v: u32) -> u32 {
    unsafe {
        let q = f32_slice(q, 4);
        let v = f32_slice(v, 3);

        let tx: f32 = 2.0 * (q[1] * v[2] - q[2] * v[1]);
        let ty: f32 = 2.0 * (q[2] * v[0] - q[0] * v[2]);
        let tz: f32 = 2.0 * (q[0] * v[1] - q[1] * v[0]);

        let o = f32_slice_mut(out, 3);
        o[0] = v[0] + q[3] * tx + q[1] * tz - q[2] * ty;
        o[1] = v[1] + q[3] * ty + q[2] * tx - q[0] * tz;
        o[2] = v[2] + q[3] * tz + q[0] * ty - q[1] * tx;
    }
    0
}

#[no_mangle]
pub extern "C" fn quat_print(_q: u32) {
    // Printing is handled in JavaScript.
}

#[no_mangle]
pub extern "C" fn vec3_abs(out: u32, v: u32) -> u32 {
    unsafe {
        let a = f32_slice(v, 3);
        let o = f32_slice_mut(out, 3);
        o[0] = a[0].abs();
        o[1] = a[1].abs();
        o[2] = a[2].abs();
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_add(out: u32, v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);
        let o = f32_slice_mut(out, 3);
        o[0] = a[0] + b[0];
        o[1] = a[1] + b[1];
        o[2] = a[2] + b[2];
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_ang(out: u32, v: u32) -> u32 {
    unsafe {
        let a = f32_slice(v, 3);
        let vv = [a[0], a[1], a[2]];
        let n: f32 = vec3_norm_from(&vv);
        let o = f32_slice_mut(out, 3);
        o[0] = (vv[0] / n).acos();
        o[1] = (vv[1] / n).acos();
        o[2] = (vv[2] / n).acos();
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_angBetween(v1: u32, v2: u32) -> f32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);
        let va = [a[0], a[1], a[2]];
        let vb = [b[0], b[1], b[2]];
        let n1: f32 = vec3_norm_from(&va);
        let n2: f32 = vec3_norm_from(&vb);
        if n1 == 0.0 || n2 == 0.0 {
            return 0.0;
        }
        let dot = vec3_dot_from(&va, &vb);
        (dot / (n1 * n2)).acos()
    }
}

#[no_mangle]
pub extern "C" fn vec3_copy(out: u32, v: u32) -> u32 {
    unsafe {
        let a = f32_slice(v, 3);
        let o = f32_slice_mut(out, 3);
        for i in 0..3 {
            o[i] = a[i];
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_cross(out: u32, v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);
        let va = [a[0], a[1], a[2]];
        let vb = [b[0], b[1], b[2]];
        let c = vec3_cross_from(&va, &vb);
        let o = f32_slice_mut(out, 3);
        o[0] = c[0];
        o[1] = c[1];
        o[2] = c[2];
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_dist(v1: u32, v2: u32) -> f32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        (dx * dx + dy * dy + dz * dz).sqrt()
    }
}

#[no_mangle]
pub extern "C" fn vec3_distsq(v1: u32, v2: u32) -> f32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        dx * dx + dy * dy + dz * dz
    }
}

#[no_mangle]
pub extern "C" fn vec3_dot(v1: u32, v2: u32) -> f32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);
        a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    }
}

#[no_mangle]
pub extern "C" fn vec3_init(out: u32, x: f32, y: f32, z: f32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 3);
        o[0] = x;
        o[1] = y;
        o[2] = z;
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_interp(out: u32, v: u32, a: f32, b: f32, c: f32) -> u32 {
    unsafe {
        let v = f32_slice(v, 3);
        let denom = a + b + c;
        let s = (a * v[0] + b * v[1] + c * v[2]) / denom;
        let o = f32_slice_mut(out, 3);
        o[0] = s;
        o[1] = s;
        o[2] = s;
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_isEqual(v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);
        if a[0] == b[0] && a[1] == b[1] && a[2] == b[2] {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_isNormalized(v: u32) -> u32 {
    unsafe {
        let a = f32_slice(v, 3);
        if a[0] * a[0] + a[1] * a[1] + a[2] * a[2] == 1.0 {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_isOrthogonal(v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);
        if a[0] * b[0] + a[1] * b[1] + a[2] * b[2] == 0.0 {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_isParallel(v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);
        let va = [a[0], a[1], a[2]];
        let vb = [b[0], b[1], b[2]];
        let n1 = vec3_norm_from(&va);
        let n2 = vec3_norm_from(&vb);
        let dot = vec3_dot_from(&va, &vb);
        if dot == n1 * n2 {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_isZero(v: u32) -> u32 {
    unsafe {
        let a = f32_slice(v, 3);
        if a[0] == 0.0 && a[1] == 0.0 && a[2] == 0.0 {
            return 1;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_neg(out: u32, v: u32) -> u32 {
    unsafe {
        let a = f32_slice(v, 3);
        let o = f32_slice_mut(out, 3);
        o[0] = -a[0];
        o[1] = -a[1];
        o[2] = -a[2];
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_norm(v: u32) -> f32 {
    unsafe {
        let a = f32_slice(v, 3);
        (a[0] * a[0] + a[1] * a[1] + a[2] * a[2]).sqrt()
    }
}

#[no_mangle]
pub extern "C" fn vec3_normalize(out: u32, v: u32) -> u32 {
    unsafe {
        let a = f32_slice(v, 3);
        let vv = [a[0], a[1], a[2]];
        let n = vec3_norm_from(&vv);
        let o = f32_slice_mut(out, 3);
        if n == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            return 0;
        }
        o[0] = vv[0] / n;
        o[1] = vv[1] / n;
        o[2] = vv[2] / n;
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_normscl(out: u32, v: u32, n: f32) -> u32 {
    unsafe {
        let a = f32_slice(v, 3);
        let vv = [a[0], a[1], a[2]];
        let norm = vec3_norm_from(&vv);
        let o = f32_slice_mut(out, 3);
        if norm == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            return 0;
        }
        let inv = 1.0 / norm;
        o[0] = vv[0] * inv * n;
        o[1] = vv[1] * inv * n;
        o[2] = vv[2] * inv * n;
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_normsq(v: u32) -> f32 {
    unsafe {
        let a = f32_slice(v, 3);
        a[0] * a[0] + a[1] * a[1] + a[2] * a[2]
    }
}

#[no_mangle]
pub extern "C" fn vec3_oproj(out: u32, v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);
        let vb = [b[0], b[1], b[2]];
        let n2 = vec3_normsq_from(&vb);

        let mut p = [0.0f32; 3];
        if n2 != 0.0 {
            let va = [a[0], a[1], a[2]];
            let d = vec3_dot_from(&va, &vb) / n2;
            p[0] = vb[0] * d;
            p[1] = vb[1] * d;
            p[2] = vb[2] * d;
        }

        let o = f32_slice_mut(out, 3);
        o[0] = a[0] - p[0];
        o[1] = a[1] - p[1];
        o[2] = a[2] - p[2];
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_proj(out: u32, v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);
        let vb = [b[0], b[1], b[2]];
        let n2: f32 = vec3_normsq_from(&vb);

        let o = f32_slice_mut(out, 3);
        if n2 == 0.0 {
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            return 0;
        }

        let va = [a[0], a[1], a[2]];
        let d = vec3_dot_from(&va, &vb) / n2;
        o[0] = vb[0] * d;
        o[1] = vb[1] * d;
        o[2] = vb[2] * d;
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_random(out: u32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 3);
        o[0] = rand_f32_01();
        o[1] = rand_f32_01();
        o[2] = rand_f32_01();
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_random_range(out: u32, a: f32, b: f32) -> u32 {
    unsafe {
        let o = f32_slice_mut(out, 3);
        o[0] = rand_range(a, b);
        o[1] = rand_range(a, b);
        o[2] = rand_range(a, b);
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_reflect(out: u32, v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);

        let vb = [b[0], b[1], b[2]];
        let n = vec3_norm_from(&vb);
        let vn = if n == 0.0 {
            [0.0, 0.0, 0.0]
        } else {
            [vb[0] / n, vb[1] / n, vb[2] / n]
        };

        let va = [a[0], a[1], a[2]];
        let d: f32 = vec3_dot_from(&va, &vn);

        let vd = [vn[0] * (2.0 * d), vn[1] * (2.0 * d), vn[2] * (2.0 * d)];

        let o = f32_slice_mut(out, 3);
        o[0] = va[0] - vd[0];
        o[1] = va[1] - vd[1];
        o[2] = va[2] - vd[2];
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_refract(out: u32, v1: u32, v2: u32, n: f32) -> u32 {
    unsafe {
        if n <= 0.0 {
            let o = f32_slice_mut(out, 3);
            o[0] = 0.0;
            o[1] = 0.0;
            o[2] = 0.0;
            return 0;
        }

        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);

        let vb = [b[0], b[1], b[2]];
        let nb = vec3_norm_from(&vb);
        let vn = if nb == 0.0 {
            [0.0, 0.0, 0.0]
        } else {
            [vb[0] / nb, vb[1] / nb, vb[2] / nb]
        };

        let va = [a[0], a[1], a[2]];
        let d = vec3_dot_from(&va, &vn);

        let t = -(1.0 - n * n * (1.0 - d * d)).sqrt();

        let perp = [(va[0] - vn[0] * d) * n, (va[1] - vn[1] * d) * n, (va[2] - vn[2] * d) * n];
        let parr = [vn[0] * t, vn[1] * t, vn[2] * t];

        let o = f32_slice_mut(out, 3);
        o[0] = perp[0] + parr[0];
        o[1] = perp[1] + parr[1];
        o[2] = perp[2] + parr[2];
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_round(out: u32, v: u32) -> u32 {
    unsafe {
        let a = f32_slice(v, 3);
        let o = f32_slice_mut(out, 3);
        o[0] = round_js(a[0]);
        o[1] = round_js(a[1]);
        o[2] = round_js(a[2]);
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_scl(out: u32, v: u32, n: f32) -> u32 {
    unsafe {
        let a = f32_slice(v, 3);
        let o = f32_slice_mut(out, 3);
        o[0] = a[0] * n;
        o[1] = a[1] * n;
        o[2] = a[2] * n;
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_sub(out: u32, v1: u32, v2: u32) -> u32 {
    unsafe {
        let a = f32_slice(v1, 3);
        let b = f32_slice(v2, 3);
        let o = f32_slice_mut(out, 3);
        o[0] = a[0] - b[0];
        o[1] = a[1] - b[1];
        o[2] = a[2] - b[2];
    }
    0
}

#[no_mangle]
pub extern "C" fn vec3_print(_v: u32) {
    // Printing is handled in JavaScript.
}

#[no_mangle]
pub extern "C" fn transform_compose_local_many(out_local: u32, pos: u32, rot: u32, scl: u32, count: u32) -> u32 {
    unsafe {
        let n = count as usize;
        let p = f32_slice(pos, n * 3);
        let r = f32_slice(rot, n * 4);
        let s = f32_slice(scl, n * 3);
        let o = f32_slice_mut(out_local, n * 16);

        for i in 0..n {
            let pi = i * 3;
            let ri = i * 4;
            let si = i * 3;
            let mi = i * 16;

            let px = p[pi + 0];
            let py = p[pi + 1];
            let pz = p[pi + 2];

            let x = r[ri + 0];
            let y = r[ri + 1];
            let z = r[ri + 2];
            let w = r[ri + 3];

            let sx = s[si + 0];
            let sy = s[si + 1];
            let sz = s[si + 2];

            let xx = x * x;
            let yy = y * y;
            let zz = z * z;
            let xy = x * y;
            let xz = x * z;
            let yz = y * z;
            let wx = w * x;
            let wy = w * y;
            let wz = w * z;

            o[mi + 0] = (1.0 - 2.0 * (yy + zz)) * sx;
            o[mi + 1] = (2.0 * (xy + wz)) * sx;
            o[mi + 2] = (2.0 * (xz - wy)) * sx;
            o[mi + 3] = 0.0;

            o[mi + 4] = (2.0 * (xy - wz)) * sy;
            o[mi + 5] = (1.0 - 2.0 * (xx + zz)) * sy;
            o[mi + 6] = (2.0 * (yz + wx)) * sy;
            o[mi + 7] = 0.0;

            o[mi + 8] = (2.0 * (xz + wy)) * sz;
            o[mi + 9] = (2.0 * (yz - wx)) * sz;
            o[mi + 10] = (1.0 - 2.0 * (xx + yy)) * sz;
            o[mi + 11] = 0.0;

            o[mi + 12] = px;
            o[mi + 13] = py;
            o[mi + 14] = pz;
            o[mi + 15] = 1.0;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn transform_update_world_ordered(out_world: u32, local: u32, parent_u32: u32, order_u32: u32, count: u32) -> u32 {
    unsafe {
        let n = count as usize;
        let l = f32_slice(local, n * 16);
        let w = f32_slice_mut(out_world, n * 16);
        let parents = u32_slice(parent_u32, n);
        let order = u32_slice(order_u32, n);

        for k in 0..n {
            let idx = order[k] as usize;
            if idx >= n {
                continue;
            }

            let p = parents[idx];
            let dst = idx * 16;
            let src = idx * 16;

            if p == u32::MAX || (p as usize) >= n {
                for j in 0..16 {
                    w[dst + j] = l[src + j];
                }
                continue;
            }

            let parent_idx = p as usize;
            let a = parent_idx * 16;
            let b = src;

            let mut t = [0.0f32; 16];

            t[0]  = w[a + 0]  * l[b + 0]  + w[a + 4]  * l[b + 1]  + w[a + 8]  * l[b + 2]  + w[a + 12] * l[b + 3];
            t[1]  = w[a + 1]  * l[b + 0]  + w[a + 5]  * l[b + 1]  + w[a + 9]  * l[b + 2]  + w[a + 13] * l[b + 3];
            t[2]  = w[a + 2]  * l[b + 0]  + w[a + 6]  * l[b + 1]  + w[a + 10] * l[b + 2]  + w[a + 14] * l[b + 3];
            t[3]  = w[a + 3]  * l[b + 0]  + w[a + 7]  * l[b + 1]  + w[a + 11] * l[b + 2]  + w[a + 15] * l[b + 3];

            t[4]  = w[a + 0]  * l[b + 4]  + w[a + 4]  * l[b + 5]  + w[a + 8]  * l[b + 6]  + w[a + 12] * l[b + 7];
            t[5]  = w[a + 1]  * l[b + 4]  + w[a + 5]  * l[b + 5]  + w[a + 9]  * l[b + 6]  + w[a + 13] * l[b + 7];
            t[6]  = w[a + 2]  * l[b + 4]  + w[a + 6]  * l[b + 5]  + w[a + 10] * l[b + 6]  + w[a + 14] * l[b + 7];
            t[7]  = w[a + 3]  * l[b + 4]  + w[a + 7]  * l[b + 5]  + w[a + 11] * l[b + 6]  + w[a + 15] * l[b + 7];

            t[8]  = w[a + 0]  * l[b + 8]  + w[a + 4]  * l[b + 9]  + w[a + 8]  * l[b + 10] + w[a + 12] * l[b + 11];
            t[9]  = w[a + 1]  * l[b + 8]  + w[a + 5]  * l[b + 9]  + w[a + 9]  * l[b + 10] + w[a + 13] * l[b + 11];
            t[10] = w[a + 2]  * l[b + 8]  + w[a + 6]  * l[b + 9]  + w[a + 10] * l[b + 10] + w[a + 14] * l[b + 11];
            t[11] = w[a + 3]  * l[b + 8]  + w[a + 7]  * l[b + 9]  + w[a + 11] * l[b + 10] + w[a + 15] * l[b + 11];

            t[12] = w[a + 0]  * l[b + 12] + w[a + 4]  * l[b + 13] + w[a + 8]  * l[b + 14] + w[a + 12] * l[b + 15];
            t[13] = w[a + 1]  * l[b + 12] + w[a + 5]  * l[b + 13] + w[a + 9]  * l[b + 14] + w[a + 13] * l[b + 15];
            t[14] = w[a + 2]  * l[b + 12] + w[a + 6]  * l[b + 13] + w[a + 10] * l[b + 14] + w[a + 14] * l[b + 15];
            t[15] = w[a + 3]  * l[b + 12] + w[a + 7]  * l[b + 13] + w[a + 11] * l[b + 14] + w[a + 15] * l[b + 15];

            for j in 0..16 {
                w[dst + j] = t[j];
            }
        }
    }
    0
}
