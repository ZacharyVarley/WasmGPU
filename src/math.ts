declare const __WASMGPU_BASE_URL__: string;

type MathModule = typeof import("../build/math.js");

let modPromise: Promise<MathModule> | null = null;
let mod: MathModule | null = null;

const IIFE_SCRIPT_URL: string | null = (() => {
	if (typeof document === "undefined") return null;
	const cs = document.currentScript as HTMLScriptElement | null;
	const src = cs?.src;
	return (src && src.length > 0) ? src : null;
})();

const defaultBaseURL = (): string => {
	if (__WASMGPU_BASE_URL__ !== "__CURRENT_SCRIPT__") {
		return new URL(".", __WASMGPU_BASE_URL__).toString();
	}
	const base = IIFE_SCRIPT_URL ?? location.href;
	return new URL(".", base).toString();
}

export const initMath = async (baseURL?: string): Promise<void> => {
	if (mod) return;

	const base = baseURL ?? defaultBaseURL();
	const mathURL = new URL("math.js", base).toString();

	modPromise ??= import(mathURL) as Promise<MathModule>;
	mod = await modPromise;
}

const ensure = (): MathModule => {
	if (!mod) {
		throw new Error("Math module not initialized. Call await initMath() first.");
	}
	return mod;
}

const mat4 = {
    abs: (matr: number[]): number[] => ensure().mat4abs(matr),
    add: (matr1: number[], matr2: number[]): number[] => ensure().mat4add(matr1, matr2),
    copy: (matr: number[]): number[] => ensure().mat4copy(matr),
    det: (matr: number[]): number => ensure().mat4det(matr),
    identity: (): number[] => ensure().mat4identity(),
    init: (
        m0: number, m1: number, m2: number, m3: number,
        m4: number, m5: number, m6: number, m7: number,
        m8: number, m9: number, m10: number, m11: number,
        m12: number, m13: number, m14: number, m15: number
    ): number[] => ensure().mat4init(m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15),
    invert: (matr: number[]): number[] => ensure().mat4invert(matr),
    isEqual: (matr1: number[], matr2: number[]): boolean => ensure().mat4isEqual(matr1, matr2),
    isIdentity: (matr: number[]): boolean => ensure().mat4isIdentity(matr),
    isInverse: (matr1: number[], matr2: number[]): boolean => ensure().mat4isInverse(matr1, matr2),
    isZero: (matr: number[]): boolean => ensure().mat4isZero(matr),
    lookAt: (eye: number[], center: number[], up: number[]): number[] => ensure().mat4lookAt(eye, center, up),
    mul: (matr1: number[], matr2ORvect: number[]): number[] => ensure().mat4mul(matr1, matr2ORvect),
    neg: (matr: number[]): number[] => ensure().mat4neg(matr),
    norm: (matr: number[]): number => ensure().mat4norm(matr),
    normalize: (matr: number[]): number[] => ensure().mat4normalize(matr),
    normsq: (matr: number[]): number => ensure().mat4normsq(matr),
    perspective: (fovY: number, aspect: number, near: number, far: number): number[] => ensure().mat4perspective(fovY, aspect, near, far),
    print: (matr: number[]): void => ensure().mat4print(matr),
    random: (min: number, max: number): number[] => ensure().mat4random(min, max),
    rotateX: (matr: number[], angle: number): number[] => ensure().mat4rotateX(matr, angle),
    rotateY: (matr: number[], angle: number): number[] => ensure().mat4rotateY(matr, angle),
    rotateZ: (matr: number[], angle: number): number[] => ensure().mat4rotateZ(matr, angle),
    round: (matr: number[]): number[] => ensure().mat4round(matr),
    scl: (matr: number[], scalar: number): number[] => ensure().mat4scl(matr, scalar),
    sub: (matr1: number[], matr2: number[]): number[] => ensure().mat4sub(matr1, matr2),
    trace: (matr: number[]): number => ensure().mat4trace(matr),
    translate: (matr: number[], vect: number[]): number[] => ensure().mat4translate(matr, vect),
    transpose: (matr: number[]): number[] => ensure().mat4transpose(matr)
};

const quat = {
    abs: (quat: number[]): number[] => ensure().quatabs(quat),
    add: (quat1: number[], quat2: number[]): number[] => ensure().quatadd(quat1, quat2),
    copy: (quat: number[]): number[] => ensure().quatcopy(quat),
    dist: (quat1: number[], quat2: number[]): number => ensure().quatdist(quat1, quat2),
    distsq: (quat1: number[], quat2: number[]): number => ensure().quatdistsq(quat1, quat2),
    fromAxisAngle: (axis: number[], angle: number): number[] => ensure().quatfromAxisAngle(axis, angle),
    init: (a: number, b: number, c: number, d: number): number[] => ensure().quatinit(a, b, c, d),
    invert: (quat: number[]): number[] => ensure().quatinvert(quat),
    isEqual: (quat1: number[], quat2: number[]): boolean => ensure().quatisEqual(quat1, quat2),
    isNormalized: (quat: number[]): boolean => ensure().quatisNormalized(quat),
    isZero: (quat: number[]): boolean => ensure().quatisZero(quat),
    mul: (quat1: number[], quat2: number[]): number[] => ensure().quatmul(quat1, quat2),
    neg: (quat: number[]): number[] => ensure().quatneg(quat),
    norm: (quat: number[]): number => ensure().quatnorm(quat),
    normalize: (quat: number[]): number[] => ensure().quatnormalize(quat),
    normscl: (quat: number[], scalar: number): number[] => ensure().quatnormscl(quat, scalar),
    normsq: (quat: number[]): number => ensure().quatnormsq(quat),
    print: (quat: number[]): void => ensure().quatprint(quat),
    random: (min: number, max: number): number[] => ensure().quatrandom(min, max),
    round: (quat: number[]): number[] => ensure().quatround(quat),
    scl: (quat: number[], scalar: number): number[] => ensure().quatscl(quat, scalar),
    slerp: (quat1: number[], quat2: number[], t: number): number[] => ensure().quatslerp(quat1, quat2, t),
    sub: (quat1: number[], quat2: number[]): number[] => ensure().quatsub(quat1, quat2),
    toRotation: (quat: number[], vect: number[]): number[] => ensure().quattoRotation(quat, vect)
};

const vec3 = {
    abs: (vect: number[]): number[] => ensure().vec3abs(vect),
    add: (vect1: number[], vect2: number[]): number[] => ensure().vec3add(vect1, vect2),
    ang: (vect: number[]): number[] => ensure().vec3ang(vect),
    angBetween: (vect1: number[], vect2: number[]): number => ensure().vec3angBetween(vect1, vect2),
    copy: (vect: number[]): number[] => ensure().vec3copy(vect),
    cross: (vect1: number[], vect2: number[]): number[] => ensure().vec3cross(vect1, vect2),
    dist: (vect1: number[], vect2: number[]): number => ensure().vec3dist(vect1, vect2),
    distsq: (vect1: number[], vect2: number[]): number => ensure().vec3distsq(vect1, vect2),
    dot: (vect1: number[], vect2: number[]): number => ensure().vec3dot(vect1, vect2),
    init: (x: number, y: number, z: number): number[] => ensure().vec3init(x, y, z),
    interp: (vect: number[], a: number, b: number, c: number): number[] => ensure().vec3interp(vect, a, b, c),
    isEqual: (vect1: number[], vect2: number[]): boolean => ensure().vec3isEqual(vect1, vect2),
    isNormalized: (vect: number[]): boolean => ensure().vec3isNormalized(vect),
    isOrthogonal: (vect1: number[], vect2: number[]): boolean => ensure().vec3isOrthogonal(vect1, vect2),
    isParallel: (vect1: number[], vect2: number[]): boolean => ensure().vec3isParallel(vect1, vect2),
    isZero: (vect: number[]): boolean => ensure().vec3isZero(vect),
    neg: (vect: number[]): number[] => ensure().vec3neg(vect),
    norm: (vect: number[]): number => ensure().vec3norm(vect),
    normalize: (vect: number[]): number[] => ensure().vec3normalize(vect),
    normscl: (vect: number[], scalar: number): number[] => ensure().vec3normscl(vect, scalar),
    normsq: (vect: number[]): number => ensure().vec3normsq(vect),
    oproj: (vect1: number[], vect2: number[]): number[] => ensure().vec3oproj(vect1, vect2),
    print: (vect: number[]): void => ensure().vec3print(vect),
    proj: (vect1: number[], vect2: number[]): number[] => ensure().vec3proj(vect1, vect2),
    random: (min: number, max: number): number[] => ensure().vec3random(min, max),
    reflect: (vect1: number[], vect2: number[]): number[] => ensure().vec3reflect(vect1, vect2),
    refract: (vect1: number[], vect2: number[], refractiveIndex: number): number[] => ensure().vec3refract(vect1, vect2, refractiveIndex),
    round: (vect: number[]): number[] => ensure().vec3round(vect),
    scl: (vect: number[], scalar: number): number[] => ensure().vec3scl(vect, scalar),
    sub: (vect1: number[], vect2: number[]): number[] => ensure().vec3sub(vect1, vect2)
};

export { mat4, quat, vec3 };
