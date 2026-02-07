import { mat4f, quatf, vec3f, wasm, WasmPtr } from "../math";

export class Transform {
    private static readonly _AXIS_X: ReadonlyArray<number> = [1, 0, 0];
    private static readonly _AXIS_Y: ReadonlyArray<number> = [0, 1, 0];
    private static readonly _AXIS_Z: ReadonlyArray<number> = [0, 0, 1];
    private _position: number[] = [0, 0, 0];
    private _rotation: number[] = [0, 0, 0, 1];
    private _scale: number[] = [1, 1, 1];
    private _localMatrix: number[] = new Array(16).fill(0);
    private _worldMatrix: number[] = new Array(16).fill(0);
    private _localDirty: boolean = true;
    private _worldDirty: boolean = true;
    private _parent: Transform | null = null;
    private _children: Transform[] = [];
    private _posPtr: WasmPtr = 0;
    private _rotPtr: WasmPtr = 0;
    private _sclPtr: WasmPtr = 0;
    private _localPtr: WasmPtr = 0;
    private _worldPtr: WasmPtr = 0;
    private static _wasmBuf: ArrayBuffer | null = null;
    private static _wasmF32: Float32Array<ArrayBuffer> | null = null;
    private static _axisXPtr: WasmPtr = 0;
    private static _axisYPtr: WasmPtr = 0;
    private static _axisZPtr: WasmPtr = 0;
    private static _tmpAxisPtr: WasmPtr = 0;
    private static _tmpQuat0: WasmPtr = 0;
    private static _tmpQuat1: WasmPtr = 0;

    private static ensureScratch(): void {
        if (Transform._axisXPtr !== 0) return;
        Transform._axisXPtr = wasm.allocF32(3);
        Transform._axisYPtr = wasm.allocF32(3);
        Transform._axisZPtr = wasm.allocF32(3);
        Transform._tmpAxisPtr = wasm.allocF32(3);
        Transform._tmpQuat0 = wasm.allocF32(4);
        Transform._tmpQuat1 = wasm.allocF32(4);
        wasm.writeF32(Transform._axisXPtr, 3, [1, 0, 0]);
        wasm.writeF32(Transform._axisYPtr, 3, [0, 1, 0]);
        wasm.writeF32(Transform._axisZPtr, 3, [0, 0, 1]);
    }

    private static f32(): Float32Array<ArrayBuffer> {
        const buf = wasm.memory().buffer as ArrayBuffer;
        if (Transform._wasmBuf !== buf) {
            Transform._wasmBuf = buf;
            Transform._wasmF32 = new Float32Array(buf) as unknown as Float32Array<ArrayBuffer>;
        }
        return Transform._wasmF32!;
    }

    private ensureBacking(): void {
        if (this._posPtr !== 0) return;
        this._posPtr = wasm.allocF32(3);
        this._rotPtr = wasm.allocF32(4);
        this._sclPtr = wasm.allocF32(3);
        this._localPtr = wasm.allocF32(16);
        this._worldPtr = wasm.allocF32(16);
        this.writePosToWasm();
        this.writeRotToWasm();
        this.writeSclToWasm();
        mat4f.identity(this._localPtr);
        mat4f.identity(this._worldPtr);
        this.writeIdentityToJs(this._localMatrix);
        this.writeIdentityToJs(this._worldMatrix);
        this._localDirty = true;
        this._worldDirty = true;
    }

    get positionPtr(): WasmPtr {
        this.ensureBacking(); return this._posPtr;
    }

    get rotationPtr(): WasmPtr {
        this.ensureBacking(); return this._rotPtr;
    }

    get scalePtr(): WasmPtr {
        this.ensureBacking(); return this._sclPtr;
    }

    get localMatrixPtr(): WasmPtr {
        this.ensureBacking(); return this._localPtr;
    }

    get worldMatrixPtr(): WasmPtr {
        this.ensureBacking(); return this._worldPtr;
    }

    get parent(): Transform | null {
        return this._parent;
    }

    get children(): readonly Transform[] {
        return this._children;
    }

    setParent(parent: Transform | null): this {
        if (this._parent === parent) return this;
        if (this._parent) {
            const idx = this._parent._children.indexOf(this);
            if (idx !== -1) this._parent._children.splice(idx, 1);
        }
        this._parent = parent;
        if (parent) parent._children.push(this);
        this.markWorldDirty();
        return this;
    }

    addChild(child: Transform): this {
        child.setParent(this);
        return this;
    }

    removeChild(child: Transform): this {
        if (child._parent === this) child.setParent(null);
        return this;
    }

    removeFromParent(): this {
        this.setParent(null);
        return this;
    }

    traverse(callback: (transform: Transform) => void): void {
        callback(this);
        for (const child of this._children) child.traverse(callback);
    }

    get root(): Transform {
        let current: Transform = this;
        while (current._parent) current = current._parent;
        return current;
    }

    get position(): number[] {
        return this._position;
    }

    setPosition(x: number, y: number, z: number): this {
        this.ensureBacking();
        this._position[0] = x;
        this._position[1] = y;
        this._position[2] = z;
        this.writePosToWasm();
        this.markLocalDirty();
        return this;
    }

    translate(x: number, y: number, z: number): this {
        this.ensureBacking();
        this._position[0] += x;
        this._position[1] += y;
        this._position[2] += z;
        this.writePosToWasm();
        this.markLocalDirty();
        return this;
    }

    get worldPosition(): number[] {
        const m = this.worldMatrix;
        return [m[12], m[13], m[14]];
    }

    get rotation(): number[] {
        return this._rotation;
    }

    setRotation(qx: number, qy: number, qz: number, qw: number): this {
        this.ensureBacking();
        Transform.ensureScratch();
        quatf.init(Transform._tmpQuat0, qx, qy, qz, qw);
        quatf.normalize(this._rotPtr, Transform._tmpQuat0);
        this.readRotFromWasm();
        this.markLocalDirty();
        return this;
    }

    setRotationFromAxisAngle(axis: ArrayLike<number>, angle: number): this {
        this.ensureBacking();
        Transform.ensureScratch();
        const ax = axis[0] as number;
        const ay = axis[1] as number;
        const az = axis[2] as number;
        const len = Math.hypot(ax, ay, az);
        if (len === 0) {
            quatf.init(this._rotPtr, 0, 0, 0, 1);
            this.readRotFromWasm();
            this.markLocalDirty();
            return this;
        }
        wasm.writeF32(Transform._tmpAxisPtr, 3, [ax, ay, az]);
        vec3f.normalize(Transform._tmpAxisPtr, Transform._tmpAxisPtr);
        quatf.fromAxisAngle(this._rotPtr, Transform._tmpAxisPtr, angle);
        quatf.normalize(this._rotPtr, this._rotPtr);
        this.readRotFromWasm();
        this.markLocalDirty();
        return this;
    }

    setRotationFromEuler(x: number, y: number, z: number): this {
        this.ensureBacking();
        Transform.ensureScratch();
        quatf.fromAxisAngle(Transform._tmpQuat0, Transform._axisXPtr, x);
        quatf.fromAxisAngle(Transform._tmpQuat1, Transform._axisYPtr, y);
        quatf.fromAxisAngle(this._rotPtr, Transform._axisZPtr, z);
        quatf.mul(Transform._tmpQuat1, this._rotPtr, Transform._tmpQuat1);
        quatf.mul(Transform._tmpQuat1, Transform._tmpQuat1, Transform._tmpQuat0);
        quatf.normalize(this._rotPtr, Transform._tmpQuat1);
        this.readRotFromWasm();
        this.markLocalDirty();
        return this;
    }

    rotateX(angle: number): this {
        this.ensureBacking();
        Transform.ensureScratch();
        quatf.fromAxisAngle(Transform._tmpQuat0, Transform._axisXPtr, angle);
        quatf.mul(Transform._tmpQuat1, this._rotPtr, Transform._tmpQuat0);
        quatf.normalize(this._rotPtr, Transform._tmpQuat1);
        this.readRotFromWasm();
        this.markLocalDirty();
        return this;
    }

    rotateY(angle: number): this {
        this.ensureBacking();
        Transform.ensureScratch();
        quatf.fromAxisAngle(Transform._tmpQuat0, Transform._axisYPtr, angle);
        quatf.mul(Transform._tmpQuat1, this._rotPtr, Transform._tmpQuat0);
        quatf.normalize(this._rotPtr, Transform._tmpQuat1);
        this.readRotFromWasm();
        this.markLocalDirty();
        return this;
    }

    rotateZ(angle: number): this {
        this.ensureBacking();
        Transform.ensureScratch();
        quatf.fromAxisAngle(Transform._tmpQuat0, Transform._axisZPtr, angle);
        quatf.mul(Transform._tmpQuat1, this._rotPtr, Transform._tmpQuat0);
        quatf.normalize(this._rotPtr, Transform._tmpQuat1);
        this.readRotFromWasm();
        this.markLocalDirty();
        return this;
    }

    rotateOnAxis(axis: ArrayLike<number>, angle: number): this {
        this.ensureBacking();
        Transform.ensureScratch();
        const ax = axis[0] as number;
        const ay = axis[1] as number;
        const az = axis[2] as number;
        const len = Math.hypot(ax, ay, az);
        if (len === 0) return this;
        wasm.writeF32(Transform._tmpAxisPtr, 3, [ax, ay, az]);
        vec3f.normalize(Transform._tmpAxisPtr, Transform._tmpAxisPtr);
        quatf.fromAxisAngle(Transform._tmpQuat0, Transform._tmpAxisPtr, angle);
        quatf.mul(Transform._tmpQuat1, this._rotPtr, Transform._tmpQuat0);
        quatf.normalize(this._rotPtr, Transform._tmpQuat1);
        this.readRotFromWasm();
        this.markLocalDirty();
        return this;
    }

    get scale(): number[] {
        return this._scale;
    }

    setScale(x: number, y: number, z: number): this {
        this.ensureBacking();
        this._scale[0] = x;
        this._scale[1] = y;
        this._scale[2] = z;
        this.writeSclToWasm();
        this.markLocalDirty();
        return this;
    }

    setUniformScale(s: number): this {
        return this.setScale(s, s, s);
    }

    get localMatrix(): number[] {
        if (this._localDirty) {
            this.computeLocalMatrix();
            this._localDirty = false;
        }
        return this._localMatrix;
    }

    get worldMatrix(): number[] {
        if (this._worldDirty) {
            this.computeWorldMatrix();
            this._worldDirty = false;
        }
        return this._worldMatrix;
    }

    private computeLocalMatrix(): void {
        this.ensureBacking();
        const [px, py, pz] = this._position;
        const [qx, qy, qz, qw] = this._rotation;
        const [sx, sy, sz] = this._scale;
        const xx = qx * qx, yy = qy * qy, zz = qz * qz;
        const xy = qx * qy, xz = qx * qz, yz = qy * qz;
        const wx = qw * qx, wy = qw * qy, wz = qw * qz;
        const m0  = (1 - 2 * (yy + zz)) * sx;
        const m1  = (2 * (xy + wz)) * sx;
        const m2  = (2 * (xz - wy)) * sx;
        const m3  = 0;
        const m4  = (2 * (xy - wz)) * sy;
        const m5  = (1 - 2 * (xx + zz)) * sy;
        const m6  = (2 * (yz + wx)) * sy;
        const m7  = 0;
        const m8  = (2 * (xz + wy)) * sz;
        const m9  = (2 * (yz - wx)) * sz;
        const m10 = (1 - 2 * (xx + yy)) * sz;
        const m11 = 0;
        const m12 = px;
        const m13 = py;
        const m14 = pz;
        const m15 = 1;
        const f32 = Transform.f32();
        const i = this._localPtr >>> 2;
        f32[i + 0]  = m0;  f32[i + 1]  = m1;  f32[i + 2]  = m2;  f32[i + 3]  = m3;
        f32[i + 4]  = m4;  f32[i + 5]  = m5;  f32[i + 6]  = m6;  f32[i + 7]  = m7;
        f32[i + 8]  = m8;  f32[i + 9]  = m9;  f32[i + 10] = m10; f32[i + 11] = m11;
        f32[i + 12] = m12; f32[i + 13] = m13; f32[i + 14] = m14; f32[i + 15] = m15;
        const dst = this._localMatrix;
        dst[0]  = m0;  dst[1]  = m1;  dst[2]  = m2;  dst[3]  = m3;
        dst[4]  = m4;  dst[5]  = m5;  dst[6]  = m6;  dst[7]  = m7;
        dst[8]  = m8;  dst[9]  = m9;  dst[10] = m10; dst[11] = m11;
        dst[12] = m12; dst[13] = m13; dst[14] = m14; dst[15] = m15;
    }

    private computeWorldMatrix(): void {
        this.ensureBacking();
        if (this._localDirty) {
            this.computeLocalMatrix();
            this._localDirty = false;
        }
        if (this._parent) {
            this._parent.ensureWorldComputed();
            mat4f.mul(this._worldPtr, this._parent._worldPtr, this._localPtr);
            this.copyMat16FromWasm(this._worldPtr, this._worldMatrix);
        } else {
            mat4f.copy(this._worldPtr, this._localPtr);
            const a = this._localMatrix;
            const b = this._worldMatrix;
            for (let k = 0; k < 16; k++) b[k] = a[k];
        }
    }

    private ensureWorldComputed(): void {
        if (this._worldDirty) {
            this.computeWorldMatrix();
            this._worldDirty = false;
        }
    }

    private writePosToWasm(): void {
        const f32 = Transform.f32();
        const i = this._posPtr >>> 2;
        f32[i + 0] = this._position[0];
        f32[i + 1] = this._position[1];
        f32[i + 2] = this._position[2];
    }

    private writeRotToWasm(): void {
        const f32 = Transform.f32();
        const i = this._rotPtr >>> 2;
        f32[i + 0] = this._rotation[0];
        f32[i + 1] = this._rotation[1];
        f32[i + 2] = this._rotation[2];
        f32[i + 3] = this._rotation[3];
    }

    private readRotFromWasm(): void {
        const f32 = Transform.f32();
        const i = this._rotPtr >>> 2;
        this._rotation[0] = f32[i + 0];
        this._rotation[1] = f32[i + 1];
        this._rotation[2] = f32[i + 2];
        this._rotation[3] = f32[i + 3];
    }

    private writeSclToWasm(): void {
        const f32 = Transform.f32();
        const i = this._sclPtr >>> 2;
        f32[i + 0] = this._scale[0];
        f32[i + 1] = this._scale[1];
        f32[i + 2] = this._scale[2];
    }

    private copyMat16FromWasm(ptr: WasmPtr, dst: number[]): void {
        const f32 = Transform.f32();
        const i = ptr >>> 2;
        for (let k = 0; k < 16; k++) dst[k] = f32[i + k];
    }

    private writeIdentityToJs(dst: number[]): void {
        for (let i = 0; i < 16; i++) dst[i] = 0;
        dst[0] = 1;
        dst[5] = 1;
        dst[10] = 1;
        dst[15] = 1;
    }

    private markLocalDirty(): void {
        this._localDirty = true;
        this.markWorldDirty();
    }

    private markWorldDirty(): void {
        if (this._worldDirty) return;
        this._worldDirty = true;
        for (const child of this._children) child.markWorldDirty();
    }

    reset(): this {
        this.ensureBacking();
        this._position[0] = 0;
        this._position[1] = 0;
        this._position[2] = 0;
        this._rotation[0] = 0;
        this._rotation[1] = 0;
        this._rotation[2] = 0;
        this._rotation[3] = 1;
        this._scale[0] = 1;
        this._scale[1] = 1;
        this._scale[2] = 1;
        this.writePosToWasm();
        this.writeRotToWasm();
        this.writeSclToWasm();
        this.markLocalDirty();
        return this;
    }

    copyFrom(other: Transform): this {
        this.ensureBacking();
        this._position[0] = other._position[0];
        this._position[1] = other._position[1];
        this._position[2] = other._position[2];
        this._rotation[0] = other._rotation[0];
        this._rotation[1] = other._rotation[1];
        this._rotation[2] = other._rotation[2];
        this._rotation[3] = other._rotation[3];
        this._scale[0] = other._scale[0];
        this._scale[1] = other._scale[1];
        this._scale[2] = other._scale[2];
        this.writePosToWasm();
        this.writeRotToWasm();
        this.writeSclToWasm();
        this.markLocalDirty();
        return this;
    }

    clone(): Transform {
        const t = new Transform();
        t.copyFrom(this);
        return t;
    }

    destroy(): void {
        this.removeFromParent();
        for (const child of this._children) child._parent = null;
        this._children.length = 0;
        if (this._posPtr) wasm.freeF32(this._posPtr, 3);
        if (this._rotPtr) wasm.freeF32(this._rotPtr, 4);
        if (this._sclPtr) wasm.freeF32(this._sclPtr, 3);
        if (this._localPtr) wasm.freeF32(this._localPtr, 16);
        if (this._worldPtr) wasm.freeF32(this._worldPtr, 16);
        this._posPtr = 0;
        this._rotPtr = 0;
        this._sclPtr = 0;
        this._localPtr = 0;
        this._worldPtr = 0;
    }
}
