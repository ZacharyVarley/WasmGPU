export function mat4abs (m: f32[]): f32[] {
    return [
        Mathf.abs(m[0]), Mathf.abs(m[1]), Mathf.abs(m[2]), Mathf.abs(m[3]),
        Mathf.abs(m[4]), Mathf.abs(m[5]), Mathf.abs(m[6]), Mathf.abs(m[7]),
        Mathf.abs(m[8]), Mathf.abs(m[9]), Mathf.abs(m[10]), Mathf.abs(m[11]),
        Mathf.abs(m[12]), Mathf.abs(m[13]), Mathf.abs(m[14]), Mathf.abs(m[15])
    ];
}

export function mat4add (m1: f32[], m2: f32[]): f32[] {
    return [
        m1[0] + m2[0], m1[1] + m2[1], m1[2] + m2[2], m1[3] + m2[3],
        m1[4] + m2[4], m1[5] + m2[5], m1[6] + m2[6], m1[7] + m2[7],
        m1[8] + m2[8], m1[9] + m2[9], m1[10] + m2[10], m1[11] + m2[11],
        m1[12] + m2[12], m1[13] + m2[13], m1[14] + m2[14], m1[15] + m2[15]
    ];
}

export function mat4copy (m: f32[]): f32[] {
    return [
        m[0], m[1], m[2], m[3],
        m[4], m[5], m[6], m[7],
        m[8], m[9], m[10], m[11],
        m[12], m[13], m[14], m[15]
    ];
}

export function mat4det (m: f32[]): f32 {
    const a0: f32 = m[0] * m[5] - m[1] * m[4];
    const a1: f32 = m[0] * m[6] - m[2] * m[4];
    const a2: f32 = m[0] * m[7] - m[3] * m[4];
    const a3: f32 = m[1] * m[6] - m[2] * m[5];
    const a4: f32 = m[1] * m[7] - m[3] * m[5];
    const a5: f32 = m[2] * m[7] - m[3] * m[6];
    const b0: f32 = m[8] * m[13] - m[9] * m[12];
    const b1: f32 = m[8] * m[14] - m[10] * m[12];
    const b2: f32 = m[8] * m[15] - m[11] * m[12];
    const b3: f32 = m[9] * m[14] - m[10] * m[13];
    const b4: f32 = m[9] * m[15] - m[11] * m[13];
    const b5: f32 = m[10] * m[15] - m[11] * m[14];
    return a0 * b5 - a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1 + a5 * b0;
}

export function mat4identity (): f32[] {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}

export function mat4init (
    m0: f32, m1: f32, m2: f32, m3: f32,
    m4: f32, m5: f32, m6: f32, m7: f32,
    m8: f32, m9: f32, m10: f32, m11: f32,
    m12: f32, m13: f32, m14: f32, m15: f32
): f32[] {
    return [
        m0, m1, m2, m3,
        m4, m5, m6, m7,
        m8, m9, m10, m11,
        m12, m13, m14, m15
    ];
}

export function mat4invert (m: f32[]): f32[] {
    const det: f32 = mat4det(m);
    if (det == 0) return mat4identity();
    const idet: f32 = 1 / det;
    return [
        (m[5] * (m[10] * m[15] - m[11] * m[14]) - m[9] * (m[6] * m[15] - m[7] * m[14]) + m[13] * (m[6] * m[11] - m[7] * m[10])) * idet,
        (-m[1] * (m[10] * m[15] - m[11] * m[14]) + m[9] * (m[2] * m[15] - m[3] * m[14]) - m[13] * (m[2] * m[11] - m[3] * m[10])) * idet,
        (m[1] * (m[6] * m[15] - m[7] * m[14]) - m[5] * (m[2] * m[15] - m[3] * m[14]) + m[13] * (m[2] * m[7] - m[3] * m[6])) * idet,
        (-m[1] * (m[6] * m[11] - m[7] * m[10]) + m[5] * (m[2] * m[11] - m[3] * m[10]) - m[9] * (m[2] * m[7] - m[3] * m[6])) * idet,
        (-m[4] * (m[10] * m[15] - m[11] * m[14]) + m[8] * (m[6] * m[15] - m[7] * m[14]) - m[12] * (m[6] * m[11] - m[7] * m[10])) * idet,
        (m[0] * (m[10] * m[15] - m[11] * m[14]) - m[8] * (m[2] * m[15] - m[3] * m[14]) + m[12] * (m[2] * m[11] - m[3] * m[10])) * idet,
        (-m[0] * (m[6] * m[15] - m[7] * m[14]) + m[4] * (m[2] * m[15] - m[3] * m[14]) - m[12] * (m[2] * m[7] - m[3] * m[6])) * idet,
        (m[0] * (m[6] * m[11] - m[7] * m[10]) - m[4] * (m[2] * m[11] - m[3] * m[10]) + m[8] * (m[2] * m[7] - m[3] * m[6])) * idet,
        (m[4] * (m[9] * m[15] - m[11] * m[13]) - m[8] * (m[5] * m[15] - m[7] * m[13]) + m[12] * (m[5] * m[11] - m[7] * m[9])) * idet,
        (-m[0] * (m[9] * m[15] - m[11] * m[13]) + m[8] * (m[1] * m[15] - m[3] * m[13]) - m[12] * (m[1] * m[11] - m[3] * m[9])) * idet,
        (m[0] * (m[5] * m[15] - m[7] * m[13]) - m[4] * (m[1] * m[15] - m[3] * m[13]) + m[12] * (m[1] * m[7] - m[3] * m[5])) * idet,
        (-m[0] * (m[5] * m[11] - m[7] * m[9]) + m[4] * (m[1] * m[11] - m[3] * m[9]) - m[8] * (m[1] * m[7] - m[3] * m[5])) * idet,
        (-m[4] * (m[9] * m[14] - m[10] * m[13]) + m[8] * (m[5] * m[14] - m[6] * m[13]) - m[12] * (m[5] * m[10] - m[6] * m[9])) * idet,
        (m[0] * (m[9] * m[14] - m[10] * m[13]) - m[8] * (m[1] * m[14] - m[2] * m[13]) + m[12] * (m[1] * m[10] - m[2] * m[9])) * idet,
        (-m[0] * (m[5] * m[14] - m[6] * m[13]) + m[4] * (m[1] * m[14] - m[2] * m[13]) - m[12] * (m[1] * m[6] - m[2] * m[5])) * idet,
        (m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5])) * idet
    ];
}

export function mat4isEqual (m1: f32[], m2: f32[]): bool {
    return (
        m1[0] == m2[0] && m1[1] == m2[1] && m1[2] == m2[2] && m1[3] == m2[3] &&
        m1[4] == m2[4] && m1[5] == m2[5] && m1[6] == m2[6] && m1[7] == m2[7] &&
        m1[8] == m2[8] && m1[9] == m2[9] && m1[10] == m2[10] && m1[11] == m2[11] &&
        m1[12] == m2[12] && m1[13] == m2[13] && m1[14] == m2[14] && m1[15] == m2[15]
    );
}

export function mat4isIdentity (m: f32[]): bool {
    return (
        m[0] == 1 && m[1] == 0 && m[2] == 0 && m[3] == 0 &&
        m[4] == 0 && m[5] == 1 && m[6] == 0 && m[7] == 0 &&
        m[8] == 0 && m[9] == 0 && m[10] == 1 && m[11] == 0 &&
        m[12] == 0 && m[13] == 0 && m[14] == 0 && m[15] == 1
    );
}

export function mat4isInverse (m1: f32[], m2: f32[]): bool {
    const inverse: f32[] = mat4invert(m1);
    return mat4isEqual(inverse, m2);
}

export function mat4isZero (m: f32[]): bool {
    return (
        m[0] == 0 && m[1] == 0 && m[2] == 0 && m[3] == 0 &&
        m[4] == 0 && m[5] == 0 && m[6] == 0 && m[7] == 0 &&
        m[8] == 0 && m[9] == 0 && m[10] == 0 && m[11] == 0 &&
        m[12] == 0 && m[13] == 0 && m[14] == 0 && m[15] == 0
    );
}

export function mat4lookAt (eye: f32[], center: f32[], up: f32[]): f32[] {
    const f: f32[] = [
        center[0] - eye[0],
        center[1] - eye[1],
        center[2] - eye[2]
    ];
    const fnorm: f32 = Mathf.sqrt(f[0] * f[0] + f[1] * f[1] + f[2] * f[2]);
    f[0] /= fnorm;
    f[1] /= fnorm;
    f[2] /= fnorm;
    const s: f32[] = [
        f[1] * up[2] - f[2] * up[1],
        f[2] * up[0] - f[0] * up[2],
        f[0] * up[1] - f[1] * up[0]
    ];
    const snorm: f32 = Mathf.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
    s[0] /= snorm;
    s[1] /= snorm;
    s[2] /= snorm;
    const u: f32[] = [
        s[1] * f[2] - s[2] * f[1],
        s[2] * f[0] - s[0] * f[2],
        s[0] * f[1] - s[1] * f[0]
    ];
    return [
        s[0], u[0], -f[0], 0,
        s[1], u[1], -f[1], 0,
        s[2], u[2], -f[2], 0,
        -(s[0]*eye[0] + s[1]*eye[1] + s[2]*eye[2]),
        -(u[0]*eye[0] + u[1]*eye[1] + u[2]*eye[2]),
        (f[0]*eye[0] + f[1]*eye[1] + f[2]*eye[2]),
        1
    ];
}

export function mat4mul (m1: f32[], m2: f32[]): f32[] {
    if (m2.length == 4) {
        return [
            m1[0] * m2[0] + m1[4] * m2[1] + m1[8] * m2[2] + m1[12] * m2[3],
            m1[1] * m2[0] + m1[5] * m2[1] + m1[9] * m2[2] + m1[13] * m2[3],
            m1[2] * m2[0] + m1[6] * m2[1] + m1[10] * m2[2] + m1[14] * m2[3],
            m1[3] * m2[0] + m1[7] * m2[1] + m1[11] * m2[2] + m1[15] * m2[3]
        ];
    }
    return [
        m1[0] * m2[0] + m1[4] * m2[1] + m1[8] * m2[2] + m1[12] * m2[3],
        m1[1] * m2[0] + m1[5] * m2[1] + m1[9] * m2[2] + m1[13] * m2[3],
        m1[2] * m2[0] + m1[6] * m2[1] + m1[10] * m2[2] + m1[14] * m2[3],
        m1[3] * m2[0] + m1[7] * m2[1] + m1[11] * m2[2] + m1[15] * m2[3],
        m1[0] * m2[4] + m1[4] * m2[5] + m1[8] * m2[6] + m1[12] * m2[7],
        m1[1] * m2[4] + m1[5] * m2[5] + m1[9] * m2[6] + m1[13] * m2[7],
        m1[2] * m2[4] + m1[6] * m2[5] + m1[10] * m2[6] + m1[14] * m2[7],
        m1[3] * m2[4] + m1[7] * m2[5] + m1[11] * m2[6] + m1[15] * m2[7],
        m1[0] * m2[8] + m1[4] * m2[9] + m1[8] * m2[10] + m1[12] * m2[11],
        m1[1] * m2[8] + m1[5] * m2[9] + m1[9] * m2[10] + m1[13] * m2[11],
        m1[2] * m2[8] + m1[6] * m2[9] + m1[10] * m2[10] + m1[14] * m2[11],
        m1[3] * m2[8] + m1[7] * m2[9] + m1[11] * m2[10] + m1[15] * m2[11],
        m1[0] * m2[12] + m1[4] * m2[13] + m1[8] * m2[14] + m1[12] * m2[15],
        m1[1] * m2[12] + m1[5] * m2[13] + m1[9] * m2[14] + m1[13] * m2[15],
        m1[2] * m2[12] + m1[6] * m2[13] + m1[10] * m2[14] + m1[14] * m2[15],
        m1[3] * m2[12] + m1[7] * m2[13] + m1[11] * m2[14] + m1[15] * m2[15]
    ];
}

export function mat4neg (m: f32[]): f32[] {
    return [
        -m[0], -m[1], -m[2], -m[3],
        -m[4], -m[5], -m[6], -m[7],
        -m[8], -m[9], -m[10], -m[11],
        -m[12], -m[13], -m[14], -m[15]
    ];
}

export function mat4norm (m: f32[]): f32 {
    return Mathf.sqrt(
        m[0] * m[0] + m[1] * m[1] + m[2] * m[2] + m[3] * m[3] +
        m[4] * m[4] + m[5] * m[5] + m[6] * m[6] + m[7] * m[7] +
        m[8] * m[8] + m[9] * m[9] + m[10] * m[10] + m[11] * m[11] +
        m[12] * m[12] + m[13] * m[13] + m[14] * m[14] + m[15] * m[15]
    );
}

export function mat4normalize (m: f32[]): f32[] {
    const n: f32 = mat4norm(m);
    if (n == 0) return mat4identity();
    const inorm: f32 = 1 / n;
    return [
        m[0] * inorm, m[1] * inorm, m[2] * inorm, m[3] * inorm,
        m[4] * inorm, m[5] * inorm, m[6] * inorm, m[7] * inorm,
        m[8] * inorm, m[9] * inorm, m[10] * inorm, m[11] * inorm,
        m[12] * inorm, m[13] * inorm, m[14] * inorm, m[15] * inorm
    ];
}

export function mat4normsq (m: f32[]): f32 {
    return (
        m[0] * m[0] + m[1] * m[1] + m[2] * m[2] + m[3] * m[3] +
        m[4] * m[4] + m[5] * m[5] + m[6] * m[6] + m[7] * m[7] +
        m[8] * m[8] + m[9] * m[9] + m[10] * m[10] + m[11] * m[11] +
        m[12] * m[12] + m[13] * m[13] + m[14] * m[14] + m[15] * m[15]
    );
}

export function mat4perspective(fovY: f32, aspect: f32, near: f32, far: f32): f32[] {
    const f: f32 = 1 / Mathf.tan(fovY / 2);
    const rangeInv: f32 = 1 / (near - far);
    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, far * rangeInv, -1,
        0, 0, near * far * rangeInv, 0
    ];
}

export function mat4print (m: f32[]): void {
    console.log(
        `[ ${m[0]} ${m[1]} ${m[2]} ${m[3]} ]\n` +
        `[ ${m[4]} ${m[5]} ${m[6]} ${m[7]} ]\n` +
        `[ ${m[8]} ${m[9]} ${m[10]} ${m[11]} ]\n` +
        `[ ${m[12]} ${m[13]} ${m[14]} ${m[15]} ]`
    );
}

export function mat4random (a: f32, b: f32): f32[] {
    return [
        Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a,
        Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a,
        Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a,
        Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a
    ];
}

export function mat4rotateX (m: f32[], angle: f32): f32[] {
    const c: f32 = Mathf.cos(angle);
    const s: f32 = Mathf.sin(angle);
    return [
        m[0], m[1], m[2], m[3],
        m[4] * c + m[8] * s, m[5] * c + m[9] * s, m[6] * c + m[10] * s, m[7] * c + m[11] * s,
        m[8] * c - m[4] * s, m[9] * c - m[5] * s, m[10] * c - m[6] * s, m[11] * c - m[7] * s,
        m[12], m[13], m[14], m[15]
    ];
}

export function mat4rotateY (m: f32[], angle: f32): f32[] {
    const c: f32 = Mathf.cos(angle);
    const s: f32 = Mathf.sin(angle);
    return [
        m[0] * c - m[8] * s, m[1] * c - m[9] * s, m[2] * c - m[10] * s, m[3] * c - m[11] * s,
        m[4], m[5], m[6], m[7],
        m[0] * s + m[8] * c, m[1] * s + m[9] * c, m[2] * s + m[10] * c, m[3] * s + m[11] * c,
        m[12], m[13], m[14], m[15]
    ];
}

export function mat4rotateZ (m: f32[], angle: f32): f32[] {
    const c: f32 = Mathf.cos(angle);
    const s: f32 = Mathf.sin(angle);
    return [
        m[0] * c + m[4] * s, m[1] * c + m[5] * s, m[2] * c + m[6] * s, m[3] * c + m[7] * s,
        m[4] * c - m[0] * s, m[5] * c - m[1] * s, m[6] * c - m[2] * s, m[7] * c - m[3] * s,
        m[8], m[9], m[10], m[11],
        m[12], m[13], m[14], m[15]
    ];
}

export function mat4round (m: f32[]): f32[] {
    return [
        Mathf.round(m[0]), Mathf.round(m[1]), Mathf.round(m[2]), Mathf.round(m[3]),
        Mathf.round(m[4]), Mathf.round(m[5]), Mathf.round(m[6]), Mathf.round(m[7]),
        Mathf.round(m[8]), Mathf.round(m[9]), Mathf.round(m[10]), Mathf.round(m[11]),
        Mathf.round(m[12]), Mathf.round(m[13]), Mathf.round(m[14]), Mathf.round(m[15])
    ];
}

export function mat4scl (m: f32[], n: f32): f32[] {
    return [
        m[0] * n, m[1] * n, m[2] * n, m[3] * n,
        m[4] * n, m[5] * n, m[6] * n, m[7] * n,
        m[8] * n, m[9] * n, m[10] * n, m[11] * n,
        m[12] * n, m[13] * n, m[14] * n, m[15] * n
    ];
}

export function mat4sub (m1: f32[], m2: f32[]): f32[] {
    return [
        m1[0] - m2[0], m1[1] - m2[1], m1[2] - m2[2], m1[3] - m2[3],
        m1[4] - m2[4], m1[5] - m2[5], m1[6] - m2[6], m1[7] - m2[7],
        m1[8] - m2[8], m1[9] - m2[9], m1[10] - m2[10], m1[11] - m2[11],
        m1[12] - m2[12], m1[13] - m2[13], m1[14] - m2[14], m1[15] - m2[15]
    ];
}

export function mat4trace (m: f32[]): f32 {
    return m[0] + m[5] + m[10] + m[15];
}

export function mat4translate (m: f32[], v: f32[]): f32[] {
    return [
        m[0], m[1], m[2], m[3],
        m[4], m[5], m[6], m[7],
        m[8], m[9], m[10], m[11],
        m[12] + v[0], m[13] + v[1], m[14] + v[2], m[15]
    ];
}

export function mat4transpose (m: f32[]): f32[] {
    return [
        m[0], m[4], m[8], m[12],
        m[1], m[5], m[9], m[13],
        m[2], m[6], m[10], m[14],
        m[3], m[7], m[11], m[15]
    ];
}

export function quatabs (q: f32[]): f32[] {
    return [Mathf.abs(q[0]), Mathf.abs(q[1]), Mathf.abs(q[2]), Mathf.abs(q[3])];
}

export function quatadd (q1: f32[], q2: f32[]): f32[] {
    return [q1[0] + q2[0], q1[1] + q2[1], q1[2] + q2[2], q1[3] + q2[3]];
}

export function quatcopy (q: f32[]): f32[] {
    return [q[0], q[1], q[2], q[3]];
}

export function quatdist (q1: f32[], q2: f32[]): f32 {
    return Mathf.sqrt(
        (q1[0] - q2[0]) * (q1[0] - q2[0]) +
        (q1[1] - q2[1]) * (q1[1] - q2[1]) +
        (q1[2] - q2[2]) * (q1[2] - q2[2]) +
        (q1[3] - q2[3]) * (q1[3] - q2[3])
    );
}

export function quatdistsq (q1: f32[], q2: f32[]): f32 {
    return (q1[0] - q2[0]) * (q1[0] - q2[0]) +
        (q1[1] - q2[1]) * (q1[1] - q2[1]) +
        (q1[2] - q2[2]) * (q1[2] - q2[2]) +
        (q1[3] - q2[3]) * (q1[3] - q2[3]);
}

export function quatfromAxisAngle (axis: f32[], angle: f32): f32[] {
    const halfAngle: f32 = angle * 0.5;
    const s: f32 = Mathf.sin(halfAngle);
    const c: f32 = Mathf.cos(halfAngle);
    return [axis[0] * s, axis[1] * s, axis[2] * s, c];
}

export function quatinit (a: f32, b: f32, c: f32, d: f32): f32[] {
    return [a, b, c, d];
}

export function quatinvert (q: f32[]): f32[] {
    const n2: f32 = quatnormsq(q);
    if (n2 == 0) return [0, 0, 0, 1];
    const inorm2: f32 = 1 / n2;
    return [-q[0] * inorm2, -q[1] * inorm2, -q[2] * inorm2, q[3] * inorm2];
}

export function quatisEqual (q1: f32[], q2: f32[]): bool {
    return q1[0] == q2[0] && q1[1] == q2[1] && q1[2] == q2[2] && q1[3] == q2[3];
}

export function quatisNormalized (q: f32[]): bool {
    return q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3] == 1;
}

export function quatisZero (q: f32[]): bool {
    return q[0] == 0 && q[1] == 0 && q[2] == 0 && q[3] == 0;
}

export function quatmul (q1: f32[], q2: f32[]): f32[] {
    return [
        q1[3] * q2[0] + q1[0] * q2[3] + q1[1] * q2[2] - q1[2] * q2[1],
        q1[3] * q2[1] - q1[0] * q2[2] + q1[1] * q2[3] + q1[2] * q2[0],
        q1[3] * q2[2] + q1[0] * q2[1] - q1[1] * q2[0] + q1[2] * q2[3],
        q1[3] * q2[3] - q1[0] * q2[0] - q1[1] * q2[1] - q1[2] * q2[2]
    ];
}

export function quatneg (q: f32[]): f32[] {
    return [-q[0], -q[1], -q[2], -q[3]];
}

export function quatnorm (q: f32[]): f32 {
    return Mathf.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
}

export function quatnormalize (q: f32[]): f32[] {
    const n: f32 = quatnorm(q);
    if (n == 0) return [0, 0, 0, 0];
    const inorm: f32 = 1 / n;
    return [q[0] * inorm, q[1] * inorm, q[2] * inorm, q[3] * inorm];
}

export function quatnormscl (q: f32[], n: f32): f32[] {
    const qn: f32[] = quatnormalize(q);
    return [qn[0] * n, qn[1] * n, qn[2] * n, qn[3] * n];
}

export function quatnormsq (q: f32[]): f32 {
    return q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
}

export function quatprint (q: f32[]): void {
    console.log(`( ${q[0]} , ${q[1]} , ${q[2]} , ${q[3]} )`);
}

export function quatrandom (a: f32, b: f32): f32[] {
    return [Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a];
}

export function quatround (q: f32[]): f32[] {
    return [Mathf.round(q[0]), Mathf.round(q[1]), Mathf.round(q[2]), Mathf.round(q[3])];
}

export function quatscl (q: f32[], n: f32): f32[] {
    return [q[0] * n, q[1] * n, q[2] * n, q[3] * n];
}

export function quatslerp (q1: f32[], q2: f32[], t: f32): f32[] {
    let dot: f32 = q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];
    if (dot < 0) {
        q2[0] = -q2[0]; q2[1] = -q2[1]; q2[2] = -q2[2]; q2[3] = -q2[3];
        dot = -dot;
    }
    if (dot > 0.9995) {
        return quatnormalize([
            q1[0] + t * (q2[0] - q1[0]),
            q1[1] + t * (q2[1] - q1[1]),
            q1[2] + t * (q2[2] - q1[2]),
            q1[3] + t * (q2[3] - q1[3])
        ]);
    }
    const theta0: f32 = Mathf.acos(dot);
    const theta: f32 = theta0 * t;
    const sinTheta: f32 = Mathf.sin(theta);
    const sinTheta0: f32 = Mathf.sin(theta0);
    const s0: f32 = Mathf.cos(theta) - dot * sinTheta / sinTheta0;
    const s1: f32 = sinTheta / sinTheta0;
    return [
        s0 * q1[0] + s1 * q2[0],
        s0 * q1[1] + s1 * q2[1],
        s0 * q1[2] + s1 * q2[2],
        s0 * q1[3] + s1 * q2[3]
    ];
}

export function quatsub (q1: f32[], q2: f32[]): f32[] {
    return [q1[0] - q2[0], q1[1] - q2[1], q1[2] - q2[2], q1[3] - q2[3]];
}

export function quattoRotation (q: f32[], v: f32[]): f32[] {
    const tx: f32 = 2 * (q[1] * v[2] - q[2] * v[1]);
    const ty: f32 = 2 * (q[2] * v[0] - q[0] * v[2]);
    const tz: f32 = 2 * (q[0] * v[1] - q[1] * v[0]);
    return [
        v[0] + q[3] * tx + q[1] * tz - q[2] * ty,
        v[1] + q[3] * ty + q[2] * tx - q[0] * tz,
        v[2] + q[3] * tz + q[0] * ty - q[1] * tx
    ];
}

export function vec3abs (v: f32[]): f32[] {
    return [Mathf.abs(v[0]), Mathf.abs(v[1]), Mathf.abs(v[2])];
}

export function vec3add (v1: f32[], v2: f32[]): f32[] {
      return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

export function vec3ang (v: f32[]): f32[] {
      const n: f32 = vec3norm(v);
    return [Mathf.acos(v[0] / n), Mathf.acos(v[1] / n), Mathf.acos(v[2] / n)];
}

export function vec3angBetween (v1: f32[], v2: f32[]): f32 {
    const n1: f32 = vec3norm(v1);
    const n2: f32 = vec3norm(v2);
    if (n1 == 0 || n2 == 0) return 0;
    return Mathf.acos((v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (n1 * n2));
}

export function vec3copy (v: f32[]): f32[] {
      return [v[0], v[1], v[2]];
}

export function vec3cross (v1: f32[], v2: f32[]): f32[] {
      return [
        v1[1] * v2[2] - v1[2] * v2[1],
        v1[2] * v2[0] - v1[0] * v2[2],
        v1[0] * v2[1] - v1[1] * v2[0]
    ];
}

export function vec3dist (v1: f32[], v2: f32[]): f32 {
    return Mathf.sqrt(
        (v1[0] - v2[0]) * (v1[0] - v2[0]) +
        (v1[1] - v2[1]) * (v1[1] - v2[1]) +
        (v1[2] - v2[2]) * (v1[2] - v2[2])
    );
}

export function vec3distsq (v1: f32[], v2: f32[]): f32 {
    return (v1[0] - v2[0]) * (v1[0] - v2[0]) +
        (v1[1] - v2[1]) * (v1[1] - v2[1]) +
        (v1[2] - v2[2]) * (v1[2] - v2[2]);
}

export function vec3dot (v1: f32[], v2: f32[]): f32 {
      return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

export function vec3init (x: f32, y: f32, z: f32): f32[] {
    return [x, y, z];
}

export function vec3interp (v: f32[], a: f32, b: f32, c: f32): f32[] {
    return [
        (a * v[0] + b * v[1] + c * v[2]) / (a + b + c),
        (a * v[0] + b * v[1] + c * v[2]) / (a + b + c),
        (a * v[0] + b * v[1] + c * v[2]) / (a + b + c)
    ];
}

export function vec3isEqual (v1: f32[], v2: f32[]): bool {
    return v1[0] == v2[0] && v1[1] == v2[1] && v1[2] == v2[2];
}

export function vec3isNormalized (v: f32[]): bool {
      return v[0] * v[0] + v[1] * v[1] + v[2] * v[2] == 1;
}

export function vec3isOrthogonal (v1: f32[], v2: f32[]): bool {
      return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2] == 0;
}

export function vec3isParallel (v1: f32[], v2: f32[]): bool {
    const n1: f32 = vec3norm(v1);
    const n2: f32 = vec3norm(v2);
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2] == n1 * n2;
}

export function vec3isZero (v: f32[]): bool {
      return v[0] == 0 && v[1] == 0 && v[2] == 0;
}

export function vec3neg (v: f32[]): f32[] {
      return [-v[0], -v[1], -v[2]];
}

export function vec3norm (v: f32[]): f32 {
      return Mathf.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function vec3normalize (v: f32[]): f32[] {
      const n: f32 = vec3norm(v);
    if (n == 0) return [0, 0, 0];
      return [v[0] / n, v[1] / n, v[2] / n];
}

export function vec3normscl (v: f32[], n: f32): f32[] {
    const vn: f32[] = vec3normalize(v);
      return [vn[0] * n, vn[1] * n, vn[2] * n];
}

export function vec3normsq (v: f32[]): f32 {
      return v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
}

export function vec3oproj (v1: f32[], v2: f32[]): f32[] {
    const p: f32[] = vec3proj(v1, v2);
      return [v1[0] - p[0], v1[1] - p[1], v1[2] - p[2]];
}

export function vec3print (v: f32[]): void {
      console.log(`(${v[0]}, ${v[1]}, ${v[2]})`);
}

export function vec3proj (v1: f32[], v2: f32[]): f32[] {
    const n2: f32 = vec3normsq(v2);
    if (n2 == 0) return [0, 0, 0];
      const d = vec3dot(v1, v2) / n2;
      return [v2[0] * d, v2[1] * d, v2[2] * d];
}

export function vec3random (a: f32, b: f32): f32[] {
      return [Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a, Mathf.random() * (b - a) + a];
}

export function vec3reflect (v1: f32[], v2: f32[]): f32[] {
    v2 = vec3normalize(v2);
    const d: f32 = vec3dot(v1, v2);
    const vd: f32[] = vec3scl(v2, 2 * d);
      return [v1[0] - vd[0], v1[1] - vd[1], v1[2] - vd[2]];
}

export function vec3refract (v1: f32[], v2: f32[], n: f32): f32[] {
    if (n <= 0) return [0, 0, 0];
    v2 = vec3normalize(v2);
    const d = vec3dot(v1, v2);
    const t = -Mathf.sqrt(1 - n * n * (1 - d * d));
    const perp = [(v1[0] - v2[0] * d) * n, (v1[1] - v2[1] * d) * n, (v1[2] - v2[2] * d) * n];
    const parr = [v2[0] * t, v2[1] * t, v2[2] * t];
    return [perp[0] + parr[0], perp[1] + parr[1], perp[2] + parr[2]];
}

export function vec3round (v: f32[]): f32[] {
      return [Mathf.round(v[0]), Mathf.round(v[1]), Mathf.round(v[2])];
}

export function vec3scl (v: f32[], n: f32): f32[] {
      return [v[0] * n, v[1] * n, v[2] * n];
}

export function vec3sub (v1: f32[], v2: f32[]): f32[] {
      return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}
