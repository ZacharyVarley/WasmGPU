import { Camera, PerspectiveCamera, OrthographicCamera } from "./camera";

export type OrbitControlsMouseButtons = {
    rotate?: number;
    pan?: number;
    zoom?: number;
};

export type OrbitControlsDescriptor = {
    target?: [number, number, number];
    enabled?: boolean;
    enableRotate?: boolean;
    enablePan?: boolean;
    enableZoom?: boolean;
    rotateSpeed?: number;
    panSpeed?: number;
    zoomSpeed?: number;
    zoomOnCursor?: boolean;
    enableDamping?: boolean;
    dampingFactor?: number;
    minDistance?: number;
    maxDistance?: number;
    minZoom?: number;
    maxZoom?: number;
    minPolarAngle?: number;
    maxPolarAngle?: number;
    minAzimuthAngle?: number;
    maxAzimuthAngle?: number;
    mouseButtons?: OrbitControlsMouseButtons;
};

export class OrbitControls {
    readonly camera: Camera;
    readonly domElement: HTMLCanvasElement;
    target: [number, number, number];
    enabled: boolean = true;
    enableRotate: boolean = true;
    enablePan: boolean = true;
    enableZoom: boolean = true;
    rotateSpeed: number = 1.0;
    panSpeed: number = 1.0;
    zoomSpeed: number = 1.0;
    zoomOnCursor: boolean = false;
    enableDamping: boolean = false;
    dampingFactor: number = 0.1;
    minDistance: number = 0.0;
    maxDistance: number = Infinity;
    minZoom: number = 0.01;
    maxZoom: number = Infinity;
    minPolarAngle: number = 0.0;
    maxPolarAngle: number = Math.PI;
    minAzimuthAngle: number = -Infinity;
    maxAzimuthAngle: number = Infinity;
    mouseButtons: Required<OrbitControlsMouseButtons> = { rotate: 0, zoom: 1, pan: 2 };
    private _state: "none" | "rotate" | "pan" | "zoom" = "none";
    private _pointerId: number | null = null;
    private _pointerX: number = 0;
    private _pointerY: number = 0;
    private _theta: number = 0;
    private _phi: number = Math.PI * 0.5;
    private _radius: number = 1.0;
    private _zoom: number = 1.0;
    private _zoomCursorClientX: number = 0;
    private _zoomCursorClientY: number = 0;
    private _zoomCursorValid: boolean = false;
    private _thetaDelta: number = 0;
    private _phiDelta: number = 0;
    private _dollyDelta: number = 0;
    private _panOffsetX: number = 0;
    private _panOffsetY: number = 0;
    private _panOffsetZ: number = 0;
    private _orthoBaseLeft: number = -1;
    private _orthoBaseRight: number = 1;
    private _orthoBaseTop: number = 1;
    private _orthoBaseBottom: number = -1;
    private _savedTarget: [number, number, number] = [0, 0, 0];
    private _savedTheta: number = 0;
    private _savedPhi: number = Math.PI * 0.5;
    private _savedRadius: number = 1.0;
    private _savedZoom: number = 1.0;

    private readonly _wheelListenerOptions: AddEventListenerOptions = { passive: false };

    constructor(camera: Camera, domElement: HTMLCanvasElement, desc: OrbitControlsDescriptor = {}) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = desc.target ? [desc.target[0], desc.target[1], desc.target[2]] : [0, 0, 0];
        if (desc.enabled !== undefined) this.enabled = desc.enabled;
        if (desc.enableRotate !== undefined) this.enableRotate = desc.enableRotate;
        if (desc.enablePan !== undefined) this.enablePan = desc.enablePan;
        if (desc.enableZoom !== undefined) this.enableZoom = desc.enableZoom;
        if (desc.rotateSpeed !== undefined) this.rotateSpeed = desc.rotateSpeed;
        if (desc.panSpeed !== undefined) this.panSpeed = desc.panSpeed;
        if (desc.zoomSpeed !== undefined) this.zoomSpeed = desc.zoomSpeed;
        if (desc.zoomOnCursor !== undefined) this.zoomOnCursor = desc.zoomOnCursor;
        if (desc.enableDamping !== undefined) this.enableDamping = desc.enableDamping;
        if (desc.dampingFactor !== undefined) this.dampingFactor = desc.dampingFactor;
        if (desc.minDistance !== undefined) this.minDistance = desc.minDistance;
        if (desc.maxDistance !== undefined) this.maxDistance = desc.maxDistance;
        if (desc.minZoom !== undefined) this.minZoom = desc.minZoom;
        if (desc.maxZoom !== undefined) this.maxZoom = desc.maxZoom;
        if (desc.minPolarAngle !== undefined) this.minPolarAngle = desc.minPolarAngle;
        if (desc.maxPolarAngle !== undefined) this.maxPolarAngle = desc.maxPolarAngle;
        if (desc.minAzimuthAngle !== undefined) this.minAzimuthAngle = desc.minAzimuthAngle;
        if (desc.maxAzimuthAngle !== undefined) this.maxAzimuthAngle = desc.maxAzimuthAngle;
        if (desc.mouseButtons) {
            if (desc.mouseButtons.rotate !== undefined) this.mouseButtons.rotate = desc.mouseButtons.rotate;
            if (desc.mouseButtons.zoom !== undefined) this.mouseButtons.zoom = desc.mouseButtons.zoom;
            if (desc.mouseButtons.pan !== undefined) this.mouseButtons.pan = desc.mouseButtons.pan;
        }
        this.domElement.style.touchAction = "none";
        this.syncFromCamera();
        this.saveState();
        this.domElement.addEventListener("pointerdown", this.onPointerDown);
        this.domElement.addEventListener("pointermove", this.onPointerMove);
        this.domElement.addEventListener("pointerup", this.onPointerUp);
        this.domElement.addEventListener("pointercancel", this.onPointerUp);
        this.domElement.addEventListener("wheel", this.onWheel, this._wheelListenerOptions);
        this.domElement.addEventListener("contextmenu", this.onContextMenu);
    }

    dispose(): void {
        this.domElement.removeEventListener("pointerdown", this.onPointerDown);
        this.domElement.removeEventListener("pointermove", this.onPointerMove);
        this.domElement.removeEventListener("pointerup", this.onPointerUp);
        this.domElement.removeEventListener("pointercancel", this.onPointerUp);
        this.domElement.removeEventListener("wheel", this.onWheel, this._wheelListenerOptions);
        this.domElement.removeEventListener("contextmenu", this.onContextMenu);
    }

    syncFromCamera(): void {
        const p = this.camera.transform.position;
        const ox = p[0] - this.target[0];
        const oy = p[1] - this.target[1];
        const oz = p[2] - this.target[2];
        const r = Math.sqrt(ox * ox + oy * oy + oz * oz);
        this._radius = Math.max(1e-9, r);
        this._theta = Math.atan2(ox, oz);
        const y = oy / this._radius;
        this._phi = Math.acos(this.clamp(y, -1, 1));
        this._thetaDelta = 0;
        this._phiDelta = 0;
        this._dollyDelta = 0;
        this._panOffsetX = 0;
        this._panOffsetY = 0;
        this._panOffsetZ = 0;
        if (this.camera.type === "orthographic") {
            const c = this.camera as OrthographicCamera;
            this._orthoBaseLeft = c.left;
            this._orthoBaseRight = c.right;
            this._orthoBaseTop = c.top;
            this._orthoBaseBottom = c.bottom;
            this._zoom = 1.0;
        }
    }

    saveState(): void {
        this._savedTarget = [this.target[0], this.target[1], this.target[2]];
        this._savedTheta = this._theta;
        this._savedPhi = this._phi;
        this._savedRadius = this._radius;
        this._savedZoom = this._zoom;
    }

    reset(): void {
        this.target[0] = this._savedTarget[0];
        this.target[1] = this._savedTarget[1];
        this.target[2] = this._savedTarget[2];
        this._theta = this._savedTheta;
        this._phi = this._savedPhi;
        this._radius = this._savedRadius;
        this._zoom = this._savedZoom;
        this._thetaDelta = 0;
        this._phiDelta = 0;
        this._dollyDelta = 0;
        this._panOffsetX = 0;
        this._panOffsetY = 0;
        this._panOffsetZ = 0;
    }

    get azimuthAngle(): number {
        return this._theta;
    }

    set azimuthAngle(value: number) {
        this._theta = value;
    }

    get polarAngle(): number {
        return this._phi;
    }

    set polarAngle(value: number) {
        this._phi = value;
    }

    get distance(): number {
        return this._radius;
    }

    set distance(value: number) {
        this._radius = value;
    }

    get zoom(): number {
        return this._zoom;
    }

    set zoom(value: number) {
        this._zoom = value;
    }

    setTarget(x: number, y: number, z: number): this;
    setTarget(target: [number, number, number]): this;
    setTarget(xOrTarget: number | [number, number, number], y?: number, z?: number): this {
        if (typeof xOrTarget === "number") {
            this.target[0] = xOrTarget;
            this.target[1] = y!;
            this.target[2] = z!;
        } else {
            this.target[0] = xOrTarget[0];
            this.target[1] = xOrTarget[1];
            this.target[2] = xOrTarget[2];
        }
        return this;
    }

    update(dtSeconds: number = 0): void {
        if (!this.enabled) return;
        const dt = (dtSeconds > 0) ? dtSeconds : (1 / 60);
        const damping = this.enableDamping ? (1 - Math.pow(1 - this.clamp(this.dampingFactor, 0, 1), dt * 60)) : 1;
        if (this.enableRotate) {
            this._theta += this._thetaDelta * damping;
            this._phi += this._phiDelta * damping;
            this._thetaDelta *= (1 - damping);
            this._phiDelta *= (1 - damping);
        } else {
            this._thetaDelta = 0;
            this._phiDelta = 0;
        }
        this._phi = this.clamp(this._phi, this.minPolarAngle, this.maxPolarAngle);
        this._theta = this.clamp(this._theta, this.minAzimuthAngle, this.maxAzimuthAngle);
        if (this.enableZoom) {
            const dolly = this._dollyDelta * damping;
            if (dolly !== 0) {
                const prevRadius = this._radius;
                const prevZoom = this._zoom;
                if (this.camera.type === "orthographic") {
                    this._zoom *= Math.exp(-dolly);
                    this._zoom = this.clamp(this._zoom, this.minZoom, this.maxZoom);
                } else {
                    this._radius *= Math.exp(dolly);
                    this._radius = this.clamp(this._radius, this.minDistance, this.maxDistance);
                }
                if (this.zoomOnCursor && this._zoomCursorValid) {
                    this.applyZoomOnCursor(prevRadius, prevZoom);
                }
                this._dollyDelta *= (1 - damping);
            }
        } else {
            this._dollyDelta = 0;
        }
        if (this.enablePan) {
            this.target[0] += this._panOffsetX * damping;
            this.target[1] += this._panOffsetY * damping;
            this.target[2] += this._panOffsetZ * damping;
            this._panOffsetX *= (1 - damping);
            this._panOffsetY *= (1 - damping);
            this._panOffsetZ *= (1 - damping);
        } else {
            this._panOffsetX = 0;
            this._panOffsetY = 0;
            this._panOffsetZ = 0;
        }
        this._radius = this.clamp(this._radius, this.minDistance, this.maxDistance);
        this._radius = Math.max(1e-6, this._radius);
        const sinPhi = Math.sin(this._phi);
        const cosPhi = Math.cos(this._phi);
        const sinTheta = Math.sin(this._theta);
        const cosTheta = Math.cos(this._theta);
        const px = this.target[0] + this._radius * sinPhi * sinTheta;
        const py = this.target[1] + this._radius * cosPhi;
        const pz = this.target[2] + this._radius * sinPhi * cosTheta;
        this.camera.transform.setPosition(px, py, pz);
        this.setCameraRotationLookAt(px, py, pz, this.target[0], this.target[1], this.target[2]);
        if (this.camera.type === "orthographic") this.applyOrthographicZoom();
    }

    private applyZoomOnCursor(prevRadius: number, prevZoom: number): void {
        const rect = this.domElement.getBoundingClientRect();
        const rw = Math.max(1, rect.width);
        const rh = Math.max(1, rect.height);
        const x01 = (this._zoomCursorClientX - rect.left) / rw;
        const y01 = (this._zoomCursorClientY - rect.top) / rh;
        const ndcX = (x01 * 2) - 1;
        const ndcY = 1 - (y01 * 2);
        const sinPhi = Math.sin(this._phi);
        const cosPhi = Math.cos(this._phi);
        const sinTheta = Math.sin(this._theta);
        const cosTheta = Math.cos(this._theta);
        let fx = -sinPhi * sinTheta;
        let fy = -cosPhi;
        let fz = -sinPhi * cosTheta;
        let upx = 0;
        let upy = 1;
        let upz = 0;
        const dotFU = fx * upx + fy * upy + fz * upz;
        if (Math.abs(dotFU) > 0.999) {
            upx = 0;
            upy = 0;
            upz = 1;
        }
        let rx = fy * upz - fz * upy;
        let ry = fz * upx - fx * upz;
        let rz = fx * upy - fy * upx;
        const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (rl <= 0) return;
        rx /= rl;
        ry /= rl;
        rz /= rl;
        const ux = ry * fz - rz * fy;
        const uy = rz * fx - rx * fz;
        const uz = rx * fy - ry * fx;
        if (this.camera.type === "orthographic") {
            const baseW = this._orthoBaseRight - this._orthoBaseLeft;
            const baseH = this._orthoBaseTop - this._orthoBaseBottom;
            const oldHalfW = (baseW / Math.max(1e-9, prevZoom)) * 0.5;
            const newHalfW = (baseW / Math.max(1e-9, this._zoom)) * 0.5;
            const oldHalfH = (baseH / Math.max(1e-9, prevZoom)) * 0.5;
            const newHalfH = (baseH / Math.max(1e-9, this._zoom)) * 0.5;
            const dx = ndcX * (oldHalfW - newHalfW);
            const dy = ndcY * (oldHalfH - newHalfH);
            this.target[0] += (rx * dx) + (ux * dy);
            this.target[1] += (ry * dx) + (uy * dy);
            this.target[2] += (rz * dx) + (uz * dy);
            return;
        }
        const cam = this.camera as PerspectiveCamera;
        const fovRad = (cam.fov * Math.PI) / 180;
        const aspect = rw / rh;
        const tanHalfFov = Math.tan(fovRad * 0.5);
        const oldHalfH = prevRadius * tanHalfFov;
        const newHalfH = this._radius * tanHalfFov;
        const oldHalfW = oldHalfH * aspect;
        const newHalfW = newHalfH * aspect;
        const dx = ndcX * (oldHalfW - newHalfW);
        const dy = ndcY * (oldHalfH - newHalfH);
        this.target[0] += (rx * dx) + (ux * dy);
        this.target[1] += (ry * dx) + (uy * dy);
        this.target[2] += (rz * dx) + (uz * dy);
    }

    private applyOrthographicZoom(): void {
        const cam = this.camera as OrthographicCamera;
        const baseW = this._orthoBaseRight - this._orthoBaseLeft;
        const baseH = this._orthoBaseTop - this._orthoBaseBottom;
        const cx = (this._orthoBaseLeft + this._orthoBaseRight) * 0.5;
        const cy = (this._orthoBaseBottom + this._orthoBaseTop) * 0.5;
        const w = baseW / this._zoom;
        const h = baseH / this._zoom;
        cam.left = cx - w * 0.5;
        cam.right = cx + w * 0.5;
        cam.bottom = cy - h * 0.5;
        cam.top = cy + h * 0.5;
    }

    private onPointerDown = (event: PointerEvent): void => {
        if (!this.enabled) return;
        if (this._pointerId !== null) return;
        this._pointerId = event.pointerId;
        this.domElement.setPointerCapture(this._pointerId);
        this._pointerX = event.clientX;
        this._pointerY = event.clientY;
        this._zoomCursorClientX = event.clientX;
        this._zoomCursorClientY = event.clientY;
        this._zoomCursorValid = true;
        if (event.button === this.mouseButtons.rotate) this._state = "rotate";
        else if (event.button === this.mouseButtons.pan) this._state = "pan";
        else if (event.button === this.mouseButtons.zoom) this._state = "zoom";
        else this._state = "none";
        event.preventDefault();
    };

    private onPointerMove = (event: PointerEvent): void => {
        if (!this.enabled) return;
        if (this._pointerId === null) return;
        if (event.pointerId !== this._pointerId) return;
        const dx = event.clientX - this._pointerX;
        const dy = event.clientY - this._pointerY;
        this._pointerX = event.clientX;
        this._pointerY = event.clientY;
        this._zoomCursorClientX = event.clientX;
        this._zoomCursorClientY = event.clientY;
        this._zoomCursorValid = true;
        if (dx === 0 && dy === 0) return;
        const h = Math.max(1, this.domElement.clientHeight);
        if (this._state === "rotate" && this.enableRotate) {
            const s = (2 * Math.PI) / h;
            this._thetaDelta += (-dx * s) * this.rotateSpeed;
            this._phiDelta += (-dy * s) * this.rotateSpeed;
        } else if (this._state === "pan" && this.enablePan) {
            this.pan(dx, dy);
        } else if (this._state === "zoom" && this.enableZoom) {
            this._dollyDelta += dy * this.zoomSpeed * 0.002;
        }
        event.preventDefault();
    };

    private onPointerUp = (event: PointerEvent): void => {
        if (this._pointerId === null) return;
        if (event.pointerId !== this._pointerId) return;
        this.domElement.releasePointerCapture(this._pointerId);
        this._pointerId = null;
        this._state = "none";
        event.preventDefault();
    };

    private onWheel = (event: WheelEvent): void => {
        if (!this.enabled) return;
        if (!this.enableZoom) return;
        this._dollyDelta += event.deltaY * this.zoomSpeed * 0.001;
        this._zoomCursorClientX = event.clientX;
        this._zoomCursorClientY = event.clientY;
        this._zoomCursorValid = true;
        event.preventDefault();
        event.stopPropagation();
    };

    private onContextMenu = (event: MouseEvent): void => {
        event.preventDefault();
    };

    private pan(deltaX: number, deltaY: number): void {
        const w = Math.max(1, this.domElement.clientWidth);
        const h = Math.max(1, this.domElement.clientHeight);
        const sinPhi = Math.sin(this._phi);
        const cosPhi = Math.cos(this._phi);
        const sinTheta = Math.sin(this._theta);
        const cosTheta = Math.cos(this._theta);
        const px = this.target[0] + this._radius * sinPhi * sinTheta;
        const py = this.target[1] + this._radius * cosPhi;
        const pz = this.target[2] + this._radius * sinPhi * cosTheta;
        let fx = this.target[0] - px;
        let fy = this.target[1] - py;
        let fz = this.target[2] - pz;
        const fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
        if (fl > 0) {
            fx /= fl;
            fy /= fl;
            fz /= fl;
        }
        let upx = 0;
        let upy = 1;
        let upz = 0;
        const dotFU = fx * upx + fy * upy + fz * upz;
        if (Math.abs(dotFU) > 0.999) {
            upx = 0;
            upy = 0;
            upz = 1;
        }
        let rx = fy * upz - fz * upy;
        let ry = fz * upx - fx * upz;
        let rz = fx * upy - fy * upx;
        const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (rl > 0) {
            rx /= rl;
            ry /= rl;
            rz /= rl;
        }
        const ux = ry * fz - rz * fy;
        const uy = rz * fx - rx * fz;
        const uz = rx * fy - ry * fx;
        let panX = 0;
        let panY = 0;
        if (this.camera.type === "orthographic") {
            const baseW = this._orthoBaseRight - this._orthoBaseLeft;
            const baseH = this._orthoBaseTop - this._orthoBaseBottom;
            const viewW = baseW / this._zoom;
            const viewH = baseH / this._zoom;
            panX = (deltaX * viewW / w) * this.panSpeed;
            panY = (deltaY * viewH / h) * this.panSpeed;
        } else {
            const cam = this.camera as PerspectiveCamera;
            const fovRad = (cam.fov * Math.PI) / 180;
            const targetDistance = this._radius * Math.tan(fovRad * 0.5);
            panX = (2 * deltaX * targetDistance / h) * this.panSpeed;
            panY = (2 * deltaY * targetDistance / h) * this.panSpeed;
        }
        this._panOffsetX += (rx * -panX) + (ux * panY);
        this._panOffsetY += (ry * -panX) + (uy * panY);
        this._panOffsetZ += (rz * -panX) + (uz * panY);
    }

    private setCameraRotationLookAt(px: number, py: number, pz: number, tx: number, ty: number, tz: number): void {
        let fx = tx - px;
        let fy = ty - py;
        let fz = tz - pz;
        const fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
        if (fl <= 0) return;
        fx /= fl;
        fy /= fl;
        fz /= fl;
        let upx = 0;
        let upy = 1;
        let upz = 0;
        const dotFU = fx * upx + fy * upy + fz * upz;
        if (Math.abs(dotFU) > 0.999) {
            upx = 0;
            upy = 0;
            upz = 1;
        }
        let rx = fy * upz - fz * upy;
        let ry = fz * upx - fx * upz;
        let rz = fx * upy - fy * upx;
        const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (rl <= 0) return;
        rx /= rl;
        ry /= rl;
        rz /= rl;
        const ux = ry * fz - rz * fy;
        const uy = rz * fx - rx * fz;
        const uz = rx * fy - ry * fx;
        const m00 = rx;
        const m10 = ry;
        const m20 = rz;
        const m01 = ux;
        const m11 = uy;
        const m21 = uz;
        const m02 = -fx;
        const m12 = -fy;
        const m22 = -fz;
        const trace = m00 + m11 + m22;
        let qw: number;
        let qx: number;
        let qy: number;
        let qz: number;
        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            qw = 0.25 / s;
            qx = (m21 - m12) * s;
            qy = (m02 - m20) * s;
            qz = (m10 - m01) * s;
        } else if (m00 > m11 && m00 > m22) {
            const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
            qw = (m21 - m12) / s;
            qx = 0.25 * s;
            qy = (m01 + m10) / s;
            qz = (m02 + m20) / s;
        } else if (m11 > m22) {
            const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
            qw = (m02 - m20) / s;
            qx = (m01 + m10) / s;
            qy = 0.25 * s;
            qz = (m12 + m21) / s;
        } else {
            const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
            qw = (m10 - m01) / s;
            qx = (m02 + m20) / s;
            qy = (m12 + m21) / s;
            qz = 0.25 * s;
        }
        this.camera.transform.setRotation(qx, qy, qz, qw);
    }

    private clamp(x: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, x));
    }
}

export type TrackballControlsMouseButtons = {
    rotate?: number;
    pan?: number;
    zoom?: number;
};

export type TrackballControlsDescriptor = {
    target?: [number, number, number];
    enabled?: boolean;
    enableRotate?: boolean;
    enablePan?: boolean;
    enableZoom?: boolean;
    rotateSpeed?: number;
    panSpeed?: number;
    zoomSpeed?: number;
    zoomOnCursor?: boolean;
    enableDamping?: boolean;
    dampingFactor?: number;
    minDistance?: number;
    maxDistance?: number;
    minZoom?: number;
    maxZoom?: number;
    mouseButtons?: TrackballControlsMouseButtons;
};

export class TrackballControls {
    readonly camera: Camera;
    readonly domElement: HTMLCanvasElement;
    target: [number, number, number];
    enabled: boolean = true;
    enableRotate: boolean = true;
    enablePan: boolean = true;
    enableZoom: boolean = true;
    rotateSpeed: number = 1.0;
    panSpeed: number = 1.0;
    zoomSpeed: number = 1.0;
    zoomOnCursor: boolean = false;
    enableDamping: boolean = false;
    dampingFactor: number = 0.1;
    minDistance: number = 0.0;
    maxDistance: number = Infinity;
    minZoom: number = 0.01;
    maxZoom: number = Infinity;
    mouseButtons: Required<TrackballControlsMouseButtons> = { rotate: 0, zoom: 1, pan: 2 };
    private _state: "none" | "rotate" | "pan" | "zoom" = "none";
    private _pointerId: number | null = null;
    private _pointerX: number = 0;
    private _pointerY: number = 0;
    private _rotateStartX: number = 0;
    private _rotateStartY: number = 0;
    private _rotateStartZ: number = 1;
    private _rotationDeltaX: number = 0;
    private _rotationDeltaY: number = 0;
    private _rotationDeltaZ: number = 0;
    private _rotationDeltaW: number = 1;
    private _dollyDelta: number = 0;
    private _panOffsetX: number = 0;
    private _panOffsetY: number = 0;
    private _panOffsetZ: number = 0;
    private _eyeX: number = 0;
    private _eyeY: number = 0;
    private _eyeZ: number = 1;
    private _radius: number = 1.0;
    private _zoom: number = 1.0;
    private _upX: number = 0;
    private _upY: number = 1;
    private _upZ: number = 0;
    private _zoomCursorClientX: number = 0;
    private _zoomCursorClientY: number = 0;
    private _zoomCursorValid: boolean = false;
    private _orthoBaseLeft: number = -1;
    private _orthoBaseRight: number = 1;
    private _orthoBaseTop: number = 1;
    private _orthoBaseBottom: number = -1;
    private _savedTarget: [number, number, number] = [0, 0, 0];
    private _savedEye: [number, number, number] = [0, 0, 1];
    private _savedUp: [number, number, number] = [0, 1, 0];
    private _savedZoom: number = 1.0;
    private readonly _wheelListenerOptions: AddEventListenerOptions = { passive: false };

    constructor(camera: Camera, domElement: HTMLCanvasElement, desc: TrackballControlsDescriptor = {}) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = desc.target ? [desc.target[0], desc.target[1], desc.target[2]] : [0, 0, 0];
        if (desc.enabled !== undefined) this.enabled = desc.enabled;
        if (desc.enableRotate !== undefined) this.enableRotate = desc.enableRotate;
        if (desc.enablePan !== undefined) this.enablePan = desc.enablePan;
        if (desc.enableZoom !== undefined) this.enableZoom = desc.enableZoom;
        if (desc.rotateSpeed !== undefined) this.rotateSpeed = desc.rotateSpeed;
        if (desc.panSpeed !== undefined) this.panSpeed = desc.panSpeed;
        if (desc.zoomSpeed !== undefined) this.zoomSpeed = desc.zoomSpeed;
        if (desc.zoomOnCursor !== undefined) this.zoomOnCursor = desc.zoomOnCursor;
        if (desc.enableDamping !== undefined) this.enableDamping = desc.enableDamping;
        if (desc.dampingFactor !== undefined) this.dampingFactor = desc.dampingFactor;
        if (desc.minDistance !== undefined) this.minDistance = desc.minDistance;
        if (desc.maxDistance !== undefined) this.maxDistance = desc.maxDistance;
        if (desc.minZoom !== undefined) this.minZoom = desc.minZoom;
        if (desc.maxZoom !== undefined) this.maxZoom = desc.maxZoom;
        if (desc.mouseButtons) {
            if (desc.mouseButtons.rotate !== undefined) this.mouseButtons.rotate = desc.mouseButtons.rotate;
            if (desc.mouseButtons.zoom !== undefined) this.mouseButtons.zoom = desc.mouseButtons.zoom;
            if (desc.mouseButtons.pan !== undefined) this.mouseButtons.pan = desc.mouseButtons.pan;
        }
        this.domElement.style.touchAction = "none";
        this.syncFromCamera();
        this.saveState();
        this.domElement.addEventListener("pointerdown", this.onPointerDown);
        this.domElement.addEventListener("pointermove", this.onPointerMove);
        this.domElement.addEventListener("pointerup", this.onPointerUp);
        this.domElement.addEventListener("pointercancel", this.onPointerUp);
        this.domElement.addEventListener("wheel", this.onWheel, this._wheelListenerOptions);
        this.domElement.addEventListener("contextmenu", this.onContextMenu);
    }

    dispose(): void {
        this.domElement.removeEventListener("pointerdown", this.onPointerDown);
        this.domElement.removeEventListener("pointermove", this.onPointerMove);
        this.domElement.removeEventListener("pointerup", this.onPointerUp);
        this.domElement.removeEventListener("pointercancel", this.onPointerUp);
        this.domElement.removeEventListener("wheel", this.onWheel, this._wheelListenerOptions);
        this.domElement.removeEventListener("contextmenu", this.onContextMenu);
    }

    syncFromCamera(): void {
        const p = this.camera.transform.position;
        const ex = p[0] - this.target[0];
        const ey = p[1] - this.target[1];
        const ez = p[2] - this.target[2];
        const r = Math.sqrt(ex * ex + ey * ey + ez * ez);
        this._radius = Math.max(1e-9, r);
        this._eyeX = ex;
        this._eyeY = ey;
        this._eyeZ = ez;
        if (r <= 1e-9) {
            this._eyeX = 0;
            this._eyeY = 0;
            this._eyeZ = this._radius;
        }
        const m = this.camera.transform.worldMatrix;
        const upx = m[4];
        const upy = m[5];
        const upz = m[6];
        const ul = Math.sqrt(upx * upx + upy * upy + upz * upz);
        if (ul > 0) {
            this._upX = upx / ul;
            this._upY = upy / ul;
            this._upZ = upz / ul;
        } else {
            this._upX = 0;
            this._upY = 1;
            this._upZ = 0;
        }
        this._rotateStartX = 0;
        this._rotateStartY = 0;
        this._rotateStartZ = 1;
        this._rotationDeltaX = 0;
        this._rotationDeltaY = 0;
        this._rotationDeltaZ = 0;
        this._rotationDeltaW = 1;
        this._dollyDelta = 0;
        this._panOffsetX = 0;
        this._panOffsetY = 0;
        this._panOffsetZ = 0;
        if (this.camera.type === "orthographic") {
            const c = this.camera as OrthographicCamera;
            this._orthoBaseLeft = c.left;
            this._orthoBaseRight = c.right;
            this._orthoBaseTop = c.top;
            this._orthoBaseBottom = c.bottom;
            this._zoom = 1.0;
        }
    }

    saveState(): void {
        this._savedTarget = [this.target[0], this.target[1], this.target[2]];
        this._savedEye = [this._eyeX, this._eyeY, this._eyeZ];
        this._savedUp = [this._upX, this._upY, this._upZ];
        this._savedZoom = this._zoom;
    }

    reset(): void {
        this.target[0] = this._savedTarget[0];
        this.target[1] = this._savedTarget[1];
        this.target[2] = this._savedTarget[2];
        this._eyeX = this._savedEye[0];
        this._eyeY = this._savedEye[1];
        this._eyeZ = this._savedEye[2];
        this._upX = this._savedUp[0];
        this._upY = this._savedUp[1];
        this._upZ = this._savedUp[2];
        this._zoom = this._savedZoom;
        const r = Math.sqrt(this._eyeX * this._eyeX + this._eyeY * this._eyeY + this._eyeZ * this._eyeZ);
        this._radius = Math.max(1e-9, r);
        this._rotationDeltaX = 0;
        this._rotationDeltaY = 0;
        this._rotationDeltaZ = 0;
        this._rotationDeltaW = 1;
        this._dollyDelta = 0;
        this._panOffsetX = 0;
        this._panOffsetY = 0;
        this._panOffsetZ = 0;
    }

    get distance(): number {
        return this._radius;
    }

    set distance(value: number) {
        const next = Math.max(1e-9, value);
        const r = Math.sqrt(this._eyeX * this._eyeX + this._eyeY * this._eyeY + this._eyeZ * this._eyeZ);
        if (r > 0) {
            const s = next / r;
            this._eyeX *= s;
            this._eyeY *= s;
            this._eyeZ *= s;
        } else {
            this._eyeX = 0;
            this._eyeY = 0;
            this._eyeZ = next;
        }
        this._radius = next;
    }

    get zoom(): number {
        return this._zoom;
    }

    set zoom(value: number) {
        this._zoom = value;
    }

    setTarget(x: number, y: number, z: number): this;
    setTarget(target: [number, number, number]): this;
    setTarget(xOrTarget: number | [number, number, number], y?: number, z?: number): this {
        if (typeof xOrTarget === "number") {
            this.target[0] = xOrTarget;
            this.target[1] = y!;
            this.target[2] = z!;
        } else {
            this.target[0] = xOrTarget[0];
            this.target[1] = xOrTarget[1];
            this.target[2] = xOrTarget[2];
        }
        return this;
    }

    update(dtSeconds: number = 0): void {
        if (!this.enabled) return;
        const dt = (dtSeconds > 0) ? dtSeconds : (1 / 60);
        const damping = this.enableDamping ? (1 - Math.pow(1 - this.clamp(this.dampingFactor, 0, 1), dt * 60)) : 1;
        if (this.enableRotate) {
            if (!this.isIdentityQuat(this._rotationDeltaX, this._rotationDeltaY, this._rotationDeltaZ, this._rotationDeltaW)) {
                const step = this.slerpIdentityToQuat(this._rotationDeltaX, this._rotationDeltaY, this._rotationDeltaZ, this._rotationDeltaW, damping);
                this.applyRotation(step[0], step[1], step[2], step[3]);
                const inv = this.quatInvert(step[0], step[1], step[2], step[3]);
                const rem = this.quatMul(this._rotationDeltaX, this._rotationDeltaY, this._rotationDeltaZ, this._rotationDeltaW, inv[0], inv[1], inv[2], inv[3]);
                this._rotationDeltaX = rem[0];
                this._rotationDeltaY = rem[1];
                this._rotationDeltaZ = rem[2];
                this._rotationDeltaW = rem[3];
                this.normalizeQuatInPlace();
            }
        } else {
            this._rotationDeltaX = 0;
            this._rotationDeltaY = 0;
            this._rotationDeltaZ = 0;
            this._rotationDeltaW = 1;
        }
        if (this.enableZoom) {
            const dolly = this._dollyDelta * damping;
            if (dolly !== 0) {
                const prevRadius = this._radius;
                const prevZoom = this._zoom;
                if (this.camera.type === "orthographic") {
                    this._zoom *= Math.exp(-dolly);
                    this._zoom = this.clamp(this._zoom, this.minZoom, this.maxZoom);
                } else {
                    const oldR = Math.max(1e-9, this._radius);
                    const targetR = oldR * Math.exp(dolly);
                    const newR = this.clamp(targetR, this.minDistance, this.maxDistance);
                    const s = newR / oldR;
                    this._eyeX *= s;
                    this._eyeY *= s;
                    this._eyeZ *= s;
                    this._radius = newR;
                }
                if (this.zoomOnCursor && this._zoomCursorValid) {
                    this.applyZoomOnCursor(prevRadius, prevZoom);
                }
                this._dollyDelta *= (1 - damping);
            }
        } else {
            this._dollyDelta = 0;
        }
        if (this.enablePan) {
            this.target[0] += this._panOffsetX * damping;
            this.target[1] += this._panOffsetY * damping;
            this.target[2] += this._panOffsetZ * damping;
            this._panOffsetX *= (1 - damping);
            this._panOffsetY *= (1 - damping);
            this._panOffsetZ *= (1 - damping);
        } else {
            this._panOffsetX = 0;
            this._panOffsetY = 0;
            this._panOffsetZ = 0;
        }
        const r = Math.sqrt(this._eyeX * this._eyeX + this._eyeY * this._eyeY + this._eyeZ * this._eyeZ);
        this._radius = Math.max(1e-6, this.clamp(r, this.minDistance, this.maxDistance));
        if (r > 0) {
            const s = this._radius / r;
            this._eyeX *= s;
            this._eyeY *= s;
            this._eyeZ *= s;
        } else {
            this._eyeX = 0;
            this._eyeY = 0;
            this._eyeZ = this._radius;
        }
        const px = this.target[0] + this._eyeX;
        const py = this.target[1] + this._eyeY;
        const pz = this.target[2] + this._eyeZ;
        this.camera.transform.setPosition(px, py, pz);
        this.setCameraRotationLookAtUp(px, py, pz, this.target[0], this.target[1], this.target[2], this._upX, this._upY, this._upZ);
        if (this.camera.type === "orthographic") this.applyOrthographicZoom();
    }

    private applyRotation(qx: number, qy: number, qz: number, qw: number): void {
        const e = this.rotateVectorByQuat(this._eyeX, this._eyeY, this._eyeZ, qx, qy, qz, qw);
        this._eyeX = e[0];
        this._eyeY = e[1];
        this._eyeZ = e[2];
        const u = this.rotateVectorByQuat(this._upX, this._upY, this._upZ, qx, qy, qz, qw);
        const ul = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
        if (ul > 0) {
            this._upX = u[0] / ul;
            this._upY = u[1] / ul;
            this._upZ = u[2] / ul;
        }
    }

    private applyZoomOnCursor(prevRadius: number, prevZoom: number): void {
        const rect = this.domElement.getBoundingClientRect();
        const rw = Math.max(1, rect.width);
        const rh = Math.max(1, rect.height);
        const x01 = (this._zoomCursorClientX - rect.left) / rw;
        const y01 = (this._zoomCursorClientY - rect.top) / rh;
        const ndcX = (x01 * 2) - 1;
        const ndcY = 1 - (y01 * 2);
        const basis = this.computeBasis();
        const rx = basis[0];
        const ry = basis[1];
        const rz = basis[2];
        const ux = basis[3];
        const uy = basis[4];
        const uz = basis[5];
        if (this.camera.type === "orthographic") {
            const baseW = this._orthoBaseRight - this._orthoBaseLeft;
            const baseH = this._orthoBaseTop - this._orthoBaseBottom;
            const oldHalfW = (baseW / Math.max(1e-9, prevZoom)) * 0.5;
            const newHalfW = (baseW / Math.max(1e-9, this._zoom)) * 0.5;
            const oldHalfH = (baseH / Math.max(1e-9, prevZoom)) * 0.5;
            const newHalfH = (baseH / Math.max(1e-9, this._zoom)) * 0.5;
            const dx = ndcX * (oldHalfW - newHalfW);
            const dy = ndcY * (oldHalfH - newHalfH);
            this.target[0] += (rx * dx) + (ux * dy);
            this.target[1] += (ry * dx) + (uy * dy);
            this.target[2] += (rz * dx) + (uz * dy);
            return;
        }
        const cam = this.camera as PerspectiveCamera;
        const fovRad = (cam.fov * Math.PI) / 180;
        const aspect = rw / rh;
        const tanHalfFov = Math.tan(fovRad * 0.5);
        const oldHalfH = prevRadius * tanHalfFov;
        const newHalfH = this._radius * tanHalfFov;
        const oldHalfW = oldHalfH * aspect;
        const newHalfW = newHalfH * aspect;
        const dx = ndcX * (oldHalfW - newHalfW);
        const dy = ndcY * (oldHalfH - newHalfH);
        this.target[0] += (rx * dx) + (ux * dy);
        this.target[1] += (ry * dx) + (uy * dy);
        this.target[2] += (rz * dx) + (uz * dy);
    }

    private applyOrthographicZoom(): void {
        const cam = this.camera as OrthographicCamera;
        const baseW = this._orthoBaseRight - this._orthoBaseLeft;
        const baseH = this._orthoBaseTop - this._orthoBaseBottom;
        const cx = (this._orthoBaseLeft + this._orthoBaseRight) * 0.5;
        const cy = (this._orthoBaseBottom + this._orthoBaseTop) * 0.5;
        const w = baseW / this._zoom;
        const h = baseH / this._zoom;
        cam.left = cx - w * 0.5;
        cam.right = cx + w * 0.5;
        cam.bottom = cy - h * 0.5;
        cam.top = cy + h * 0.5;
    }

    private onPointerDown = (event: PointerEvent): void => {
        if (!this.enabled) return;
        if (this._pointerId !== null) return;
        this._pointerId = event.pointerId;
        this.domElement.setPointerCapture(this._pointerId);
        this._pointerX = event.clientX;
        this._pointerY = event.clientY;
        this._zoomCursorClientX = event.clientX;
        this._zoomCursorClientY = event.clientY;
        this._zoomCursorValid = true;
        if (event.button === this.mouseButtons.rotate) this._state = "rotate";
        else if (event.button === this.mouseButtons.pan) this._state = "pan";
        else if (event.button === this.mouseButtons.zoom) this._state = "zoom";
        else this._state = "none";
        if (this._state === "rotate" && this.enableRotate) {
            const v = this.getTrackballVector(event.clientX, event.clientY);
            this._rotateStartX = v[0];
            this._rotateStartY = v[1];
            this._rotateStartZ = v[2];
        }
        event.preventDefault();
    };

    private onPointerMove = (event: PointerEvent): void => {
        if (!this.enabled) return;
        if (this._pointerId === null) return;
        if (event.pointerId !== this._pointerId) return;
        const dx = event.clientX - this._pointerX;
        const dy = event.clientY - this._pointerY;
        this._pointerX = event.clientX;
        this._pointerY = event.clientY;
        this._zoomCursorClientX = event.clientX;
        this._zoomCursorClientY = event.clientY;
        this._zoomCursorValid = true;
        if (dx === 0 && dy === 0) return;
        if (this._state === "rotate" && this.enableRotate) {
            const v = this.getTrackballVector(event.clientX, event.clientY);
            const q = this.rotationFromTrackballDrag(this._rotateStartX, this._rotateStartY, this._rotateStartZ, v[0], v[1], v[2]);
            if (q) {
                const out = this.quatMul(q[0], q[1], q[2], q[3], this._rotationDeltaX, this._rotationDeltaY, this._rotationDeltaZ, this._rotationDeltaW);
                this._rotationDeltaX = out[0];
                this._rotationDeltaY = out[1];
                this._rotationDeltaZ = out[2];
                this._rotationDeltaW = out[3];
                this.normalizeQuatInPlace();
            }
            this._rotateStartX = v[0];
            this._rotateStartY = v[1];
            this._rotateStartZ = v[2];
        } else if (this._state === "pan" && this.enablePan) {
            this.pan(dx, dy);
        } else if (this._state === "zoom" && this.enableZoom) {
            this._dollyDelta += dy * this.zoomSpeed * 0.002;
        }
        event.preventDefault();
    };

    private onPointerUp = (event: PointerEvent): void => {
        if (this._pointerId === null) return;
        if (event.pointerId !== this._pointerId) return;
        this.domElement.releasePointerCapture(this._pointerId);
        this._pointerId = null;
        this._state = "none";
        event.preventDefault();
    };

    private onWheel = (event: WheelEvent): void => {
        if (!this.enabled) return;
        if (!this.enableZoom) return;
        this._dollyDelta += event.deltaY * this.zoomSpeed * 0.001;
        this._zoomCursorClientX = event.clientX;
        this._zoomCursorClientY = event.clientY;
        this._zoomCursorValid = true;
        event.preventDefault();
        event.stopPropagation();
    };

    private onContextMenu = (event: MouseEvent): void => {
        event.preventDefault();
    };

    private getTrackballVector(clientX: number, clientY: number): [number, number, number] {
        const rect = this.domElement.getBoundingClientRect();
        const rw = Math.max(1, rect.width);
        const rh = Math.max(1, rect.height);
        const x = (((clientX - rect.left) / rw) * 2) - 1;
        const y = 1 - (((clientY - rect.top) / rh) * 2);
        const len2 = x * x + y * y;
        if (len2 <= 1) {
            const z = Math.sqrt(1 - len2);
            return [x, y, z];
        }
        const inv = 1.0 / Math.sqrt(len2);
        return [x * inv, y * inv, 0];
    }

    private rotationFromTrackballDrag(sx: number, sy: number, sz: number, ex: number, ey: number, ez: number): [number, number, number, number] | null {
        const dot = this.clamp((sx * ex) + (sy * ey) + (sz * ez), -1, 1);
        let angle = Math.acos(dot);
        if (angle <= 1e-9) return null;
        angle *= this.rotateSpeed;
        let ax = (sy * ez) - (sz * ey);
        let ay = (sz * ex) - (sx * ez);
        let az = (sx * ey) - (sy * ex);
        const al = Math.sqrt(ax * ax + ay * ay + az * az);
        if (al <= 1e-9) return null;
        ax /= al;
        ay /= al;
        az /= al;
        const basis = this.computeBasis();
        const rx = basis[0];
        const ry = basis[1];
        const rz = basis[2];
        const ux = basis[3];
        const uy = basis[4];
        const uz = basis[5];
        const bx = basis[6];
        const by = basis[7];
        const bz = basis[8];
        let wx = (rx * ax) + (ux * ay) + (bx * az);
        let wy = (ry * ax) + (uy * ay) + (by * az);
        let wz = (rz * ax) + (uz * ay) + (bz * az);
        const wl = Math.sqrt(wx * wx + wy * wy + wz * wz);
        if (wl <= 1e-9) return null;
        wx /= wl;
        wy /= wl;
        wz /= wl;
        const half = angle * 0.5;
        const s = Math.sin(half);
        const qw = Math.cos(half);
        const qx = wx * s;
        const qy = wy * s;
        const qz = wz * s;
        return [qx, qy, qz, qw];
    }

    private pan(deltaX: number, deltaY: number): void {
        const w = Math.max(1, this.domElement.clientWidth);
        const h = Math.max(1, this.domElement.clientHeight);
        const basis = this.computeBasis();
        const rx = basis[0];
        const ry = basis[1];
        const rz = basis[2];
        const ux = basis[3];
        const uy = basis[4];
        const uz = basis[5];
        let panX = 0;
        let panY = 0;
        if (this.camera.type === "orthographic") {
            const baseW = this._orthoBaseRight - this._orthoBaseLeft;
            const baseH = this._orthoBaseTop - this._orthoBaseBottom;
            const viewW = baseW / this._zoom;
            const viewH = baseH / this._zoom;
            panX = (deltaX * viewW / w) * this.panSpeed;
            panY = (deltaY * viewH / h) * this.panSpeed;
        } else {
            const cam = this.camera as PerspectiveCamera;
            const fovRad = (cam.fov * Math.PI) / 180;
            const targetDistance = this._radius * Math.tan(fovRad * 0.5);
            panX = (2 * deltaX * targetDistance / h) * this.panSpeed;
            panY = (2 * deltaY * targetDistance / h) * this.panSpeed;
        }
        this._panOffsetX += (rx * -panX) + (ux * panY);
        this._panOffsetY += (ry * -panX) + (uy * panY);
        this._panOffsetZ += (rz * -panX) + (uz * panY);
    }

    private computeBasis(): [number, number, number, number, number, number, number, number, number] {
        let bx = this._eyeX;
        let by = this._eyeY;
        let bz = this._eyeZ;
        const bl = Math.sqrt(bx * bx + by * by + bz * bz);
        if (bl > 0) {
            bx /= bl;
            by /= bl;
            bz /= bl;
        } else {
            bx = 0;
            by = 0;
            bz = 1;
        }
        let upx = this._upX;
        let upy = this._upY;
        let upz = this._upZ;
        const ul = Math.sqrt(upx * upx + upy * upy + upz * upz);
        if (ul > 0) {
            upx /= ul;
            upy /= ul;
            upz /= ul;
        } else {
            upx = 0;
            upy = 1;
            upz = 0;
        }
        const dotBU = (bx * upx) + (by * upy) + (bz * upz);
        if (Math.abs(dotBU) > 0.999) {
            if (Math.abs(by) < 0.9) {
                upx = 0;
                upy = 1;
                upz = 0;
            } else {
                upx = 1;
                upy = 0;
                upz = 0;
            }
        }
        let rx = (upy * bz) - (upz * by);
        let ry = (upz * bx) - (upx * bz);
        let rz = (upx * by) - (upy * bx);
        const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (rl > 0) {
            rx /= rl;
            ry /= rl;
            rz /= rl;
        } else {
            rx = 1;
            ry = 0;
            rz = 0;
        }
        const ux = (by * rz) - (bz * ry);
        const uy = (bz * rx) - (bx * rz);
        const uz = (bx * ry) - (by * rx);
        this._upX = ux;
        this._upY = uy;
        this._upZ = uz;
        return [rx, ry, rz, ux, uy, uz, bx, by, bz];
    }

    private setCameraRotationLookAtUp(px: number, py: number, pz: number, tx: number, ty: number, tz: number, upxIn: number, upyIn: number, upzIn: number): void {
        let fx = tx - px;
        let fy = ty - py;
        let fz = tz - pz;
        const fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
        if (fl <= 0) return;
        fx /= fl;
        fy /= fl;
        fz /= fl;
        let upx = upxIn;
        let upy = upyIn;
        let upz = upzIn;
        const ul = Math.sqrt(upx * upx + upy * upy + upz * upz);
        if (ul > 0) {
            upx /= ul;
            upy /= ul;
            upz /= ul;
        } else {
            upx = 0;
            upy = 1;
            upz = 0;
        }
        const dotFU = (fx * upx) + (fy * upy) + (fz * upz);
        if (Math.abs(dotFU) > 0.999) {
            if (Math.abs(fy) < 0.9) {
                upx = 0;
                upy = 1;
                upz = 0;
            } else {
                upx = 1;
                upy = 0;
                upz = 0;
            }
        }
        let rx = (fy * upz) - (fz * upy);
        let ry = (fz * upx) - (fx * upz);
        let rz = (fx * upy) - (fy * upx);
        const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (rl <= 0) return;
        rx /= rl;
        ry /= rl;
        rz /= rl;
        const ux = (ry * fz) - (rz * fy);
        const uy = (rz * fx) - (rx * fz);
        const uz = (rx * fy) - (ry * fx);
        const m00 = rx;
        const m10 = ry;
        const m20 = rz;
        const m01 = ux;
        const m11 = uy;
        const m21 = uz;
        const m02 = -fx;
        const m12 = -fy;
        const m22 = -fz;
        const trace = m00 + m11 + m22;
        let qw: number;
        let qx: number;
        let qy: number;
        let qz: number;
        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            qw = 0.25 / s;
            qx = (m21 - m12) * s;
            qy = (m02 - m20) * s;
            qz = (m10 - m01) * s;
        } else if (m00 > m11 && m00 > m22) {
            const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
            qw = (m21 - m12) / s;
            qx = 0.25 * s;
            qy = (m01 + m10) / s;
            qz = (m02 + m20) / s;
        } else if (m11 > m22) {
            const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
            qw = (m02 - m20) / s;
            qx = (m01 + m10) / s;
            qy = 0.25 * s;
            qz = (m12 + m21) / s;
        } else {
            const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
            qw = (m10 - m01) / s;
            qx = (m02 + m20) / s;
            qy = (m12 + m21) / s;
            qz = 0.25 * s;
        }
        this.camera.transform.setRotation(qx, qy, qz, qw);
        this._upX = ux;
        this._upY = uy;
        this._upZ = uz;
    }

    private rotateVectorByQuat(vx: number, vy: number, vz: number, qx: number, qy: number, qz: number, qw: number): [number, number, number] {
        const tx = 2 * ((qy * vz) - (qz * vy));
        const ty = 2 * ((qz * vx) - (qx * vz));
        const tz = 2 * ((qx * vy) - (qy * vx));
        const outX = vx + (qw * tx) + ((qy * tz) - (qz * ty));
        const outY = vy + (qw * ty) + ((qz * tx) - (qx * tz));
        const outZ = vz + (qw * tz) + ((qx * ty) - (qy * tx));
        return [outX, outY, outZ];
    }

    private quatMul(ax: number, ay: number, az: number, aw: number, bx: number, by: number, bz: number, bw: number): [number, number, number, number] {
        const x = (aw * bx) + (ax * bw) + (ay * bz) - (az * by);
        const y = (aw * by) - (ax * bz) + (ay * bw) + (az * bx);
        const z = (aw * bz) + (ax * by) - (ay * bx) + (az * bw);
        const w = (aw * bw) - (ax * bx) - (ay * by) - (az * bz);
        return [x, y, z, w];
    }

    private quatInvert(x: number, y: number, z: number, w: number): [number, number, number, number] {
        return [-x, -y, -z, w];
    }

    private normalizeQuatInPlace(): void {
        const l = Math.sqrt((this._rotationDeltaX * this._rotationDeltaX) + (this._rotationDeltaY * this._rotationDeltaY) + (this._rotationDeltaZ * this._rotationDeltaZ) + (this._rotationDeltaW * this._rotationDeltaW));
        if (l > 0) {
            const inv = 1.0 / l;
            this._rotationDeltaX *= inv;
            this._rotationDeltaY *= inv;
            this._rotationDeltaZ *= inv;
            this._rotationDeltaW *= inv;
        } else {
            this._rotationDeltaX = 0;
            this._rotationDeltaY = 0;
            this._rotationDeltaZ = 0;
            this._rotationDeltaW = 1;
        }
    }

    private isIdentityQuat(x: number, y: number, z: number, w: number): boolean {
        return (Math.abs(x) < 1e-9) && (Math.abs(y) < 1e-9) && (Math.abs(z) < 1e-9) && (Math.abs(1 - w) < 1e-9);
    }

    private slerpIdentityToQuat(x: number, y: number, z: number, w: number, t: number): [number, number, number, number] {
        const tt = this.clamp(t, 0, 1);
        let cosHalfTheta = this.clamp(w, -1, 1);
        let qx = x;
        let qy = y;
        let qz = z;
        let qw = w;
        if (cosHalfTheta < 0) {
            cosHalfTheta = -cosHalfTheta;
            qx = -qx;
            qy = -qy;
            qz = -qz;
            qw = -qw;
        }
        if (cosHalfTheta >= 0.9995) {
            const ox = qx * tt;
            const oy = qy * tt;
            const oz = qz * tt;
            const ow = (1 - tt) + (qw * tt);
            const l = Math.sqrt(ox * ox + oy * oy + oz * oz + ow * ow);
            if (l > 0) {
                const inv = 1.0 / l;
                return [ox * inv, oy * inv, oz * inv, ow * inv];
            }
            return [0, 0, 0, 1];
        }
        const halfTheta = Math.acos(cosHalfTheta);
        const sinHalfTheta = Math.sqrt(1 - (cosHalfTheta * cosHalfTheta));
        if (sinHalfTheta <= 1e-9) return [0, 0, 0, 1];
        const a = Math.sin((1 - tt) * halfTheta) / sinHalfTheta;
        const b = Math.sin(tt * halfTheta) / sinHalfTheta;
        const ox = qx * b;
        const oy = qy * b;
        const oz = qz * b;
        const ow = a + (qw * b);
        return [ox, oy, oz, ow];
    }

    private clamp(x: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, x));
    }
}
