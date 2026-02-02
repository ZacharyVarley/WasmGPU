import { Transform } from "../core/transform";
import { mat4, vec3 } from "../math";

export type CameraType = "perspective" | "orthographic";

export abstract class Camera {
    readonly transform: Transform;
    readonly type: CameraType;
    protected _projectionMatrix: number[] | null = null;
    protected _viewMatrix: number[] | null = null;
    protected _viewProjectionMatrix: number[] | null = null;
    protected _projectionDirty: boolean = true;

    constructor(type: CameraType) {
        this.type = type;
        this.transform = new Transform();
    }

    abstract getProjectionMatrix(): number[];

    get viewMatrix(): number[] {
        const world = this.transform.worldMatrix;
        this._viewMatrix = mat4.invert(world);
        return this._viewMatrix;
    }

    get viewProjectionMatrix(): number[] {
        const proj = this.getProjectionMatrix();
        const view = this.viewMatrix;
        this._viewProjectionMatrix = mat4.mul(proj, view);
        return this._viewProjectionMatrix;
    }

    get position(): number[] {
        return this.transform.worldPosition;
    }

    lookAt(x: number, y: number, z: number): this;
    lookAt(target: number[]): this;
    lookAt(xOrTarget: number | number[], y?: number, z?: number): this {
        const target = typeof xOrTarget === "number" ? [xOrTarget, y!, z!] : xOrTarget;
        const eye = this.transform.worldPosition;
        const up = [0, 1, 0];
        const forward = vec3.normalize(vec3.sub(target, eye));
        let upVec = up;
        if (Math.abs(vec3.dot(forward, up)) > 0.999) upVec = [0, 0, 1];
        const right = vec3.normalize(vec3.cross(forward, upVec));
        const correctedUp = vec3.cross(right, forward);
        const lookMatrix = [
            right[0], right[1], right[2], 0,
            correctedUp[0], correctedUp[1], correctedUp[2], 0,
            -forward[0], -forward[1], -forward[2], 0,
            0, 0, 0, 1
        ];
        const quat = this.matrixToQuaternion(lookMatrix);
        this.transform.setRotation(quat[0], quat[1], quat[2], quat[3]);
        return this;
    }

    private matrixToQuaternion(m: number[]): number[] {
        const trace = m[0] + m[5] + m[10];
        let qw: number, qx: number, qy: number, qz: number;
        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            qw = 0.25 / s;
            qx = (m[6] - m[9]) * s;
            qy = (m[8] - m[2]) * s;
            qz = (m[1] - m[4]) * s;
        } else if (m[0] > m[5] && m[0] > m[10]) {
            const s = 2.0 * Math.sqrt(1.0 + m[0] - m[5] - m[10]);
            qw = (m[6] - m[9]) / s;
            qx = 0.25 * s;
            qy = (m[4] + m[1]) / s;
            qz = (m[8] + m[2]) / s;
        } else if (m[5] > m[10]) {
            const s = 2.0 * Math.sqrt(1.0 + m[5] - m[0] - m[10]);
            qw = (m[8] - m[2]) / s;
            qx = (m[4] + m[1]) / s;
            qy = 0.25 * s;
            qz = (m[9] + m[6]) / s;
        } else {
            const s = 2.0 * Math.sqrt(1.0 + m[10] - m[0] - m[5]);
            qw = (m[1] - m[4]) / s;
            qx = (m[8] + m[2]) / s;
            qy = (m[9] + m[6]) / s;
            qz = 0.25 * s;
        }
        return [qx, qy, qz, qw];
    }

    protected markProjectionDirty(): void {
        this._projectionDirty = true;
    }
}

export type PerspectiveCameraDescriptor = {
    fov?: number;
    aspect?: number;
    near?: number;
    far?: number;
};

export class PerspectiveCamera extends Camera {
    private _fov: number;
    private _aspect: number;
    private _near: number;
    private _far: number;

    constructor(descriptor: PerspectiveCameraDescriptor = {}) {
        super("perspective");
        this._fov = descriptor.fov ?? 60;
        this._aspect = descriptor.aspect ?? 16 / 9;
        this._near = descriptor.near ?? 0.1;
        this._far = descriptor.far ?? 1000;
    }

    get fov(): number {
        return this._fov;
    }

    set fov(value: number) {
        this._fov = value;
        this.markProjectionDirty();
    }

    get aspect(): number {
        return this._aspect;
    }

    set aspect(value: number) {
        this._aspect = value;
        this.markProjectionDirty();
    }

    get near(): number {
        return this._near;
    }

    set near(value: number) {
        this._near = value;
        this.markProjectionDirty();
    }

    get far(): number {
        return this._far;
    }

    set far(value: number) {
        this._far = value;
        this.markProjectionDirty();
    }

    updateAspect(width: number, height: number): this {
        this._aspect = width / height;
        this.markProjectionDirty();
        return this;
    }

    getProjectionMatrix(): number[] {
        if (this._projectionDirty || !this._projectionMatrix) {
            const fovRad = (this._fov * Math.PI) / 180;
            this._projectionMatrix = mat4.perspective(fovRad, this._aspect, this._near, this._far);
            this._projectionDirty = false;
        }
        return this._projectionMatrix;
    }
}

export type OrthographicCameraDescriptor = {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    near?: number;
    far?: number;
};

export class OrthographicCamera extends Camera {
    private _left: number;
    private _right: number;
    private _top: number;
    private _bottom: number;
    private _near: number;
    private _far: number;

    constructor(descriptor: OrthographicCameraDescriptor = {}) {
        super("orthographic");
        this._left = descriptor.left ?? -10;
        this._right = descriptor.right ?? 10;
        this._top = descriptor.top ?? 10;
        this._bottom = descriptor.bottom ?? -10;
        this._near = descriptor.near ?? 0.1;
        this._far = descriptor.far ?? 1000;
    }

    get left(): number {
        return this._left;
    }

    set left(value: number) {
        this._left = value;
        this.markProjectionDirty();
    }

    get right(): number {
        return this._right;
    }

    set right(value: number) {
        this._right = value;
        this.markProjectionDirty();
    }

    get top(): number {
        return this._top;
    }

    set top(value: number) {
        this._top = value;
        this.markProjectionDirty();
    }

    get bottom(): number {
        return this._bottom;
    }

    set bottom(value: number) {
        this._bottom = value;
        this.markProjectionDirty();
    }

    get near(): number {
        return this._near;
    }

    set near(value: number) {
        this._near = value;
        this.markProjectionDirty();
    }

    get far(): number {
        return this._far;
    }

    set far(value: number) {
        this._far = value;
        this.markProjectionDirty();
    }

    updateFromCanvas(width: number, height: number, zoom: number = 1): this {
        const halfWidth = (width / 2) / zoom;
        const halfHeight = (height / 2) / zoom;
        this._left = -halfWidth;
        this._right = halfWidth;
        this._top = halfHeight;
        this._bottom = -halfHeight;
        this.markProjectionDirty();
        return this;
    }

    getProjectionMatrix(): number[] {
        if (this._projectionDirty || !this._projectionMatrix) {
            this._projectionMatrix = this.computeOrthographicMatrix();
            this._projectionDirty = false;
        }
        return this._projectionMatrix;
    }

    private computeOrthographicMatrix(): number[] {
        const lr = 1 / (this._left - this._right);
        const bt = 1 / (this._bottom - this._top);
        const nf = 1 / (this._near - this._far);
        return [
            -2 * lr, 0, 0, 0,
            0, -2 * bt, 0, 0,
            0, 0, nf, 0,
            (this._left + this._right) * lr, (this._top + this._bottom) * bt, this._near * nf, 1
        ];
    }
}
