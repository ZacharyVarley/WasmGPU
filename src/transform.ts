import { mat4, quat, vec3 } from "../math";

export class Transform {
    private _position: number[] = [0, 0, 0];
    private _rotation: number[] = [0, 0, 0, 1];
    private _scale: number[] = [1, 1, 1];
    private _localMatrix: number[] | null = null;
    private _worldMatrix: number[] | null = null;
    private _localDirty: boolean = true;
    private _worldDirty: boolean = true;
    private _parent: Transform | null = null;
    private _children: Transform[] = [];

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
            if (idx !== -1) {
                this._parent._children.splice(idx, 1);
            }
        }
        this._parent = parent;
        if (parent) {
            parent._children.push(this);
        }
        this.markWorldDirty();
        return this;
    }

    addChild(child: Transform): this {
        child.setParent(this);
        return this;
    }

    removeChild(child: Transform): this {
        if (child._parent === this) {
            child.setParent(null);
        }
        return this;
    }

    removeFromParent(): this {
        this.setParent(null);
        return this;
    }

    traverse(callback: (transform: Transform) => void): void {
        callback(this);
        for (const child of this._children) {
            child.traverse(callback);
        }
    }

    get root(): Transform {
        let current: Transform = this;
        while (current._parent) {
            current = current._parent;
        }
        return current;
    }

    get position(): number[] {
        return this._position;
    }

    setPosition(x: number, y: number, z: number): this {
        this._position = [x, y, z];
        this.markLocalDirty();
        return this;
    }

    translate(x: number, y: number, z: number): this {
        this._position = vec3.add(this._position, [x, y, z]);
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
        this._rotation = quat.normalize([qx, qy, qz, qw]);
        this.markLocalDirty();
        return this;
    }

    setRotationFromAxisAngle(axis: number[], angle: number): this {
        this._rotation = quat.fromAxisAngle(vec3.normalize(axis), angle);
        this.markLocalDirty();
        return this;
    }

    setRotationFromEuler(x: number, y: number, z: number): this {
        const qx = quat.fromAxisAngle([1, 0, 0], x);
        const qy = quat.fromAxisAngle([0, 1, 0], y);
        const qz = quat.fromAxisAngle([0, 0, 1], z);
        this._rotation = quat.mul(quat.mul(qz, qy), qx);
        this.markLocalDirty();
        return this;
    }

    rotateX(angle: number): this {
        const q = quat.fromAxisAngle([1, 0, 0], angle);
        this._rotation = quat.normalize(quat.mul(this._rotation, q));
        this.markLocalDirty();
        return this;
    }

    rotateY(angle: number): this {
        const q = quat.fromAxisAngle([0, 1, 0], angle);
        this._rotation = quat.normalize(quat.mul(this._rotation, q));
        this.markLocalDirty();
        return this;
    }

    rotateZ(angle: number): this {
        const q = quat.fromAxisAngle([0, 0, 1], angle);
        this._rotation = quat.normalize(quat.mul(this._rotation, q));
        this.markLocalDirty();
        return this;
    }

    rotateOnAxis(axis: number[], angle: number): this {
        const q = quat.fromAxisAngle(vec3.normalize(axis), angle);
        this._rotation = quat.normalize(quat.mul(this._rotation, q));
        this.markLocalDirty();
        return this;
    }

    get scale(): number[] {
        return this._scale;
    }

    setScale(x: number, y: number, z: number): this {
        this._scale = [x, y, z];
        this.markLocalDirty();
        return this;
    }

    setUniformScale(s: number): this {
        this._scale = [s, s, s];
        this.markLocalDirty();
        return this;
    }

    get localMatrix(): number[] {
        if (this._localDirty || !this._localMatrix) {
            this._localMatrix = this.computeLocalMatrix();
            this._localDirty = false;
        }
        return this._localMatrix;
    }

    get worldMatrix(): number[] {
        if (this._worldDirty || !this._worldMatrix) {
            this._worldMatrix = this.computeWorldMatrix();
            this._worldDirty = false;
        }
        return this._worldMatrix;
    }

    private computeLocalMatrix(): number[] {
        const [px, py, pz] = this._position;
        const [qx, qy, qz, qw] = this._rotation;
        const [sx, sy, sz] = this._scale;
        const xx = qx * qx, yy = qy * qy, zz = qz * qz;
        const xy = qx * qy, xz = qx * qz, yz = qy * qz;
        const wx = qw * qx, wy = qw * qy, wz = qw * qz;
        return [
            (1 - 2 * (yy + zz)) * sx, (2 * (xy + wz)) * sx, (2 * (xz - wy)) * sx, 0,
            (2 * (xy - wz)) * sy, (1 - 2 * (xx + zz)) * sy, (2 * (yz + wx)) * sy, 0,
            (2 * (xz + wy)) * sz, (2 * (yz - wx)) * sz, (1 - 2 * (xx + yy)) * sz, 0,
            px, py, pz, 1
        ];
    }

    private computeWorldMatrix(): number[] {
        const local = this.localMatrix;
        if (this._parent) {
            return mat4.mul(this._parent.worldMatrix, local);
        }
        return local;
    }

    private markLocalDirty(): void {
        this._localDirty = true;
        this.markWorldDirty();
    }

    private markWorldDirty(): void {
        if (this._worldDirty) return;
        this._worldDirty = true;
        for (const child of this._children) {
            child.markWorldDirty();
        }
    }

    reset(): this {
        this._position = [0, 0, 0];
        this._rotation = [0, 0, 0, 1];
        this._scale = [1, 1, 1];
        this.markLocalDirty();
        return this;
    }

    copyFrom(other: Transform): this {
        this._position = [...other._position];
        this._rotation = [...other._rotation];
        this._scale = [...other._scale];
        this.markLocalDirty();
        return this;
    }

    clone(): Transform {
        const t = new Transform();
        t.copyFrom(this);
        return t;
    }
}
