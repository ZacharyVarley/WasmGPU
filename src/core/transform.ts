import { wasm, quatf, vec3f, transformf, WasmPtr } from "../math";

const NO_PARENT = 0xFFFFFFFF;

class TransformStore {
    private static _global: TransformStore | null = null;
    static global(): TransformStore {
        if (!TransformStore._global) TransformStore._global = new TransformStore(16384);
        return TransformStore._global;
    }
    cap: number;
    count: number = 0;
    posPtr: WasmPtr = 0;
    rotPtr: WasmPtr = 0;
    sclPtr: WasmPtr = 0;
    localPtr: WasmPtr = 0;
    worldPtr: WasmPtr = 0;
    parentPtr: WasmPtr = 0;
    orderPtr: WasmPtr = 0;
    tmpAxisPtr: WasmPtr = 0;
    tmpQuatPtr: WasmPtr = 0;
    private _buf: ArrayBuffer | null = null;
    private _f32: Float32Array<ArrayBuffer> | null = null;
    private _u32: Uint32Array<ArrayBuffer> | null = null;
    private _dirty: boolean = true;
    private _orderDirty: boolean = true;
    private _nodes: (Transform | null)[] = [];
    private _freeList: number[] = [];
    private _visited: Uint8Array = new Uint8Array(0);
    private _stack: number[] = [];

    constructor(initialCap: number) {
        this.cap = Math.max(1, initialCap | 0);
        this.allocateArrays(this.cap);
    }

    private allocateArrays(cap: number): void {
        this.posPtr = wasm.allocF32(cap * 3);
        this.rotPtr = wasm.allocF32(cap * 4);
        this.sclPtr = wasm.allocF32(cap * 3);
        this.localPtr = wasm.allocF32(cap * 16);
        this.worldPtr = wasm.allocF32(cap * 16);
        this.parentPtr = wasm.allocF32(cap);
        this.orderPtr = wasm.allocF32(cap); 
        this.tmpAxisPtr = wasm.allocF32(4);
        this.tmpQuatPtr = wasm.allocF32(4);
        this.ensureViews();
        const u32 = this.u32();
        const parentBase = this.parentPtr >>> 2;
        for (let i = 0; i < cap; i++) u32[parentBase + i] = NO_PARENT;
    }

    private ensureViews(): void {
        const buf = wasm.memory().buffer as unknown as ArrayBuffer;
        if (this._buf !== buf) {
            this._buf = buf;
            this._f32 = new Float32Array<ArrayBuffer>(buf);
            this._u32 = new Uint32Array<ArrayBuffer>(buf);
        }
    }

    f32(): Float32Array<ArrayBuffer> {
        this.ensureViews();
        return this._f32!;
    }

    u32(): Uint32Array<ArrayBuffer> {
        this.ensureViews();
        return this._u32!;
    }

    markDirty(): void {
        this._dirty = true;
    }

    markOrderDirty(): void {
        this._orderDirty = true;
        this._dirty = true;
    }

    alloc(node: Transform): number {
        let index: number;
        if (this._freeList.length > 0) {
            index = this._freeList.pop()!;
            if (index < 0) throw new Error("TransformStore.alloc: corrupted free list (negative index).");
            if (index >= this.count) this.count = index + 1;
            if (this._nodes[index] !== null && this._nodes[index] !== undefined) throw new Error(`TransformStore.alloc: free list returned an in-use slot ${index}.`);
        } else {
            if (this.count >= this.cap) this.growTo(this.cap * 2);
            index = this.count++;
        }
        this._nodes[index] = node;
        this.initDefaults(index);
        this._orderDirty = true;
        this._dirty = true;
        return index;
    }

    private initDefaults(index: number): void {
        this.ensureViews();
        const f32 = this.f32();
        const u32 = this.u32();
        let p = (this.posPtr >>> 2) + index * 3;
        f32[p + 0] = 0;
        f32[p + 1] = 0;
        f32[p + 2] = 0;
        let r = (this.rotPtr >>> 2) + index * 4;
        f32[r + 0] = 0;
        f32[r + 1] = 0;
        f32[r + 2] = 0;
        f32[r + 3] = 1;
        let s = (this.sclPtr >>> 2) + index * 3;
        f32[s + 0] = 1;
        f32[s + 1] = 1;
        f32[s + 2] = 1;
        u32[(this.parentPtr >>> 2) + index] = NO_PARENT;
    }

    setParent(childIndex: number, parentIndex: number | null): void {
        this.ensureViews();
        const u32 = this.u32();
        u32[(this.parentPtr >>> 2) + childIndex] = parentIndex === null ? NO_PARENT : (parentIndex >>> 0);
        this._orderDirty = true;
        this._dirty = true;
    }

    free(index: number): void {
        if (index < 0 || index >= this.count) throw new Error(`TransformStore.free: index out of range: ${index} (count=${this.count})`);
        const node = this._nodes[index];
        if (!node) throw new Error(`TransformStore.free: double free or invalid slot: ${index}`);
        this._nodes[index] = null;
        this.ensureViews();
        const f32 = this.f32();
        const u32 = this.u32();
        let p = (this.posPtr >>> 2) + index * 3;
        f32[p + 0] = 0;
        f32[p + 1] = 0;
        f32[p + 2] = 0;
        let r = (this.rotPtr >>> 2) + index * 4;
        f32[r + 0] = 0;
        f32[r + 1] = 0;
        f32[r + 2] = 0;
        f32[r + 3] = 1;
        let s = (this.sclPtr >>> 2) + index * 3;
        f32[s + 0] = 1;
        f32[s + 1] = 1;
        f32[s + 2] = 1;
        u32[(this.parentPtr >>> 2) + index] = NO_PARENT;
        const localBase = (this.localPtr >>> 2) + index * 16;
        const worldBase = (this.worldPtr >>> 2) + index * 16;
        for (let i = 0; i < 16; i++) {
            f32[localBase + i] = 0;
            f32[worldBase + i] = 0;
        }
        f32[localBase + 0] = 1;
        f32[localBase + 5] = 1;
        f32[localBase + 10] = 1;
        f32[localBase + 15] = 1;
        f32[worldBase + 0] = 1;
        f32[worldBase + 5] = 1;
        f32[worldBase + 10] = 1;
        f32[worldBase + 15] = 1;
        this._freeList.push(index);
        this._orderDirty = true;
        this._dirty = true;
        while (this.count > 0) {
            const last = this.count - 1;
            if (this._nodes[last]) break;
            this.count--;
        }
    }

    updateIfNeeded(): void {
        if (!this._dirty) return;
        this.update();
    }

    update(): void {
        if (this.count === 0) {
            this._dirty = false;
            return;
        }
        if (this._orderDirty) this.buildOrder();
        transformf.composeLocalMany(this.localPtr, this.posPtr, this.rotPtr, this.sclPtr, this.count);
        transformf.updateWorldOrdered(this.worldPtr, this.localPtr, this.parentPtr, this.orderPtr, this.count);
        this._dirty = false;
    }

    private buildOrder(): void {
        const count = this.count;
        if (this._visited.length < count) this._visited = new Uint8Array(count);
        this._visited.fill(0, 0, count);
        const u32 = this.u32();
        const parentBase = this.parentPtr >>> 2;
        const orderBase = this.orderPtr >>> 2;
        let out = 0;
        const stack = this._stack;
        stack.length = 0;
        for (let i = 0; i < count; i++) {
            if (this._visited[i]) continue;
            if (u32[parentBase + i] !== NO_PARENT) continue;
            stack.push(i);
            while (stack.length) {
                const idx = stack.pop()!;
                if (this._visited[idx]) continue;
                this._visited[idx] = 1;
                u32[orderBase + out++] = idx >>> 0;
                const node = this._nodes[idx];
                const children = node?.children ?? [];
                for (let c = children.length - 1; c >= 0; c--) stack.push(children[c].index);
            }
        }
        for (let i = 0; i < count; i++) {
            if (this._visited[i]) continue;
            this._visited[i] = 1;
            u32[orderBase + out++] = i >>> 0;
        }
        this._orderDirty = false;
    }

    private growTo(minCap: number): void {
        let newCap = this.cap;
        while (newCap < minCap) newCap *= 2;
        const oldCount = this.count;
        const oldPosPtr = this.posPtr;
        const oldRotPtr = this.rotPtr;
        const oldSclPtr = this.sclPtr;
        const oldLocalPtr = this.localPtr;
        const oldWorldPtr = this.worldPtr;
        const oldParentPtr = this.parentPtr;
        const oldOrderPtr = this.orderPtr;
        this.cap = newCap;
        this.allocateArrays(newCap);
        this.ensureViews();
        const f32 = this.f32();
        const u32 = this.u32();
        f32.set(f32.subarray(oldPosPtr >>> 2, (oldPosPtr >>> 2) + oldCount * 3), this.posPtr >>> 2);
        f32.set(f32.subarray(oldRotPtr >>> 2, (oldRotPtr >>> 2) + oldCount * 4), this.rotPtr >>> 2);
        f32.set(f32.subarray(oldSclPtr >>> 2, (oldSclPtr >>> 2) + oldCount * 3), this.sclPtr >>> 2);
        f32.set(f32.subarray(oldLocalPtr >>> 2, (oldLocalPtr >>> 2) + oldCount * 16), this.localPtr >>> 2);
        f32.set(f32.subarray(oldWorldPtr >>> 2, (oldWorldPtr >>> 2) + oldCount * 16), this.worldPtr >>> 2);
        u32.set(u32.subarray(oldParentPtr >>> 2, (oldParentPtr >>> 2) + oldCount), this.parentPtr >>> 2);
        u32.set(u32.subarray(oldOrderPtr >>> 2, (oldOrderPtr >>> 2) + oldCount), this.orderPtr >>> 2);
        this._orderDirty = true;
        this._dirty = true;
    }
}

export class Transform {
    readonly index: number;
    private _parent: Transform | null = null;
    private _children: Transform[] = [];
    private _position: number[] = [0, 0, 0];
    private _rotation: number[] = [0, 0, 0, 1];
    private _scale: number[] = [1, 1, 1];
    private _localMatrix: number[] = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
    private _worldMatrix: number[] = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
    private _disposed: boolean = false;

    constructor() {
        const store = TransformStore.global();
        this.index = store.alloc(this);
    }

    static updateAll(): void {
        TransformStore.global().updateIfNeeded();
    }

    private assertAlive(): void {
        if (this._disposed) throw new Error("Transform is disposed (use-after-dispose).");
    }

    get disposed(): boolean {
        return this._disposed;
    }

    get parent(): Transform | null {
        return this._parent;
    }

    get children(): readonly Transform[] {
        return this._children;
    }

    get root(): Transform {
        let t: Transform = this;
        while (t._parent) t = t._parent;
        return t;
    }

    traverse(callback: (t: Transform) => void): void {
        callback(this);
        for (const child of this._children) child.traverse(callback);
    }

    private readVec3FromStore(ptrBaseF32: number, out: number[]): void {
        const store = TransformStore.global();
        const f32 = store.f32();
        out[0] = f32[ptrBaseF32 + 0];
        out[1] = f32[ptrBaseF32 + 1];
        out[2] = f32[ptrBaseF32 + 2];
    }

    private readQuatFromStore(ptrBaseF32: number, out: number[]): void {
        const store = TransformStore.global();
        const f32 = store.f32();
        out[0] = f32[ptrBaseF32 + 0];
        out[1] = f32[ptrBaseF32 + 1];
        out[2] = f32[ptrBaseF32 + 2];
        out[3] = f32[ptrBaseF32 + 3];
    }

    private readMat4FromStore(ptrBaseF32: number, out: number[]): void {
        const store = TransformStore.global();
        const f32 = store.f32();
        for (let i = 0; i < 16; i++) out[i] = f32[ptrBaseF32 + i];
    }

    get positionPtr(): WasmPtr {
        this.assertAlive();
        const T = TransformStore.global();
        return (T.posPtr + (this.index * 3 * 4)) >>> 0;
    }

    get rotationPtr(): WasmPtr {
        this.assertAlive();
        const T = TransformStore.global();
        return (T.rotPtr + (this.index * 4 * 4)) >>> 0;
    }

    get scalePtr(): WasmPtr {
        this.assertAlive();
        const T = TransformStore.global();
        return (T.sclPtr + (this.index * 3 * 4)) >>> 0;
    }

    get localMatrixPtr(): WasmPtr {
        this.assertAlive();
        const T = TransformStore.global();
        return (T.localPtr + (this.index * 16 * 4)) >>> 0;
    }

    get worldMatrixPtr(): WasmPtr {
        this.assertAlive();
        const T = TransformStore.global();
        return (T.worldPtr + (this.index * 16 * 4)) >>> 0;
    }

    get position(): number[] {
        return this._position;
    }

    setPosition(x: number, y: number, z: number): this {
        this.assertAlive();
        const T = TransformStore.global();
        const f32 = T.f32();
        const base = (T.posPtr >>> 2) + this.index * 3;
        f32[base + 0] = x;
        f32[base + 1] = y;
        f32[base + 2] = z;
        this._position[0] = x;
        this._position[1] = y;
        this._position[2] = z;
        T.markDirty();
        return this;
    }

    translate(x: number, y: number, z: number): this {
        this.assertAlive();
        return this.setPosition(this._position[0] + x, this._position[1] + y, this._position[2] + z);
    }

    get rotation(): number[] {
        return this._rotation;
    }

    setRotation(x: number, y: number, z: number, w: number): this {
        this.assertAlive();
        const T = TransformStore.global();
        const rotPtr = this.rotationPtr;
        quatf.init(rotPtr, x, y, z, w);
        quatf.normalize(rotPtr, rotPtr);
        const base = (T.rotPtr >>> 2) + this.index * 4;
        this.readQuatFromStore(base, this._rotation);
        T.markDirty();
        return this;
    }

    setRotationFromAxisAngle(axis: number[], angle: number): this {
        this.assertAlive();
        const T = TransformStore.global();
        const f32 = T.f32();
        const a = T.tmpAxisPtr >>> 2;
        f32[a + 0] = axis[0];
        f32[a + 1] = axis[1];
        f32[a + 2] = axis[2];
        vec3f.normalize(T.tmpAxisPtr, T.tmpAxisPtr);
        const rotPtr = this.rotationPtr;
        quatf.fromAxisAngle(rotPtr, T.tmpAxisPtr, angle);
        quatf.normalize(rotPtr, rotPtr);
        const base = (T.rotPtr >>> 2) + this.index * 4;
        this.readQuatFromStore(base, this._rotation);
        T.markDirty();
        return this;
    }

    setRotationFromEuler(x: number, y: number, z: number): this {
        this.assertAlive();
        const hx = x * 0.5;
        const hy = y * 0.5;
        const hz = z * 0.5;
        const sx = Math.sin(hx);
        const cx = Math.cos(hx);
        const sy = Math.sin(hy);
        const cy = Math.cos(hy);
        const sz = Math.sin(hz);
        const cz = Math.cos(hz);
        const qx = sx * cy * cz + cx * sy * sz;
        const qy = cx * sy * cz - sx * cy * sz;
        const qz = cx * cy * sz + sx * sy * cz;
        const qw = cx * cy * cz - sx * sy * sz;
        return this.setRotation(qx, qy, qz, qw);
    }

    rotateOnAxis(axis: number[], angle: number): this {
        this.assertAlive();
        const T = TransformStore.global();
        const f32 = T.f32();
        const a = T.tmpAxisPtr >>> 2;
        f32[a + 0] = axis[0];
        f32[a + 1] = axis[1];
        f32[a + 2] = axis[2];
        vec3f.normalize(T.tmpAxisPtr, T.tmpAxisPtr);
        quatf.fromAxisAngle(T.tmpQuatPtr, T.tmpAxisPtr, angle);
        const rotPtr = this.rotationPtr;
        quatf.mul(rotPtr, rotPtr, T.tmpQuatPtr);
        quatf.normalize(rotPtr, rotPtr);
        const base = (T.rotPtr >>> 2) + this.index * 4;
        this.readQuatFromStore(base, this._rotation);
        T.markDirty();
        return this;
    }

    rotateX(angle: number): this {
        this.assertAlive();
        const T = TransformStore.global();
        const f32 = T.f32();
        const a = T.tmpAxisPtr >>> 2;
        f32[a + 0] = 1;
        f32[a + 1] = 0;
        f32[a + 2] = 0;
        vec3f.normalize(T.tmpAxisPtr, T.tmpAxisPtr);
        quatf.fromAxisAngle(T.tmpQuatPtr, T.tmpAxisPtr, angle);
        const rotPtr = this.rotationPtr;
        quatf.mul(rotPtr, rotPtr, T.tmpQuatPtr);
        quatf.normalize(rotPtr, rotPtr);
        const base = (T.rotPtr >>> 2) + this.index * 4;
        this.readQuatFromStore(base, this._rotation);
        T.markDirty();
        return this;
    }

    rotateY(angle: number): this {
        this.assertAlive();
        const T = TransformStore.global();
        const f32 = T.f32();
        const a = T.tmpAxisPtr >>> 2;
        f32[a + 0] = 0;
        f32[a + 1] = 1;
        f32[a + 2] = 0;
        vec3f.normalize(T.tmpAxisPtr, T.tmpAxisPtr);
        quatf.fromAxisAngle(T.tmpQuatPtr, T.tmpAxisPtr, angle);
        const rotPtr = this.rotationPtr;
        quatf.mul(rotPtr, rotPtr, T.tmpQuatPtr);
        quatf.normalize(rotPtr, rotPtr);
        const base = (T.rotPtr >>> 2) + this.index * 4;
        this.readQuatFromStore(base, this._rotation);
        T.markDirty();
        return this;
    }

    rotateZ(angle: number): this {
        this.assertAlive();
        const T = TransformStore.global();
        const f32 = T.f32();
        const a = T.tmpAxisPtr >>> 2;
        f32[a + 0] = 0;
        f32[a + 1] = 0;
        f32[a + 2] = 1;
        vec3f.normalize(T.tmpAxisPtr, T.tmpAxisPtr);
        quatf.fromAxisAngle(T.tmpQuatPtr, T.tmpAxisPtr, angle);
        const rotPtr = this.rotationPtr;
        quatf.mul(rotPtr, rotPtr, T.tmpQuatPtr);
        quatf.normalize(rotPtr, rotPtr);
        const base = (T.rotPtr >>> 2) + this.index * 4;
        this.readQuatFromStore(base, this._rotation);
        T.markDirty();
        return this;
    }

    get scale(): number[] {
        return this._scale;
    }

    setScale(x: number, y: number, z: number): this {
        this.assertAlive();
        const T = TransformStore.global();
        const f32 = T.f32();
        const base = (T.sclPtr >>> 2) + this.index * 3;
        f32[base + 0] = x;
        f32[base + 1] = y;
        f32[base + 2] = z;
        this._scale[0] = x;
        this._scale[1] = y;
        this._scale[2] = z;
        T.markDirty();
        return this;
    }

    setUniformScale(scalar: number): this {
        this.assertAlive();
        return this.setScale(scalar, scalar, scalar);
    }

    get localMatrix(): number[] {
        this.assertAlive();
        const T = TransformStore.global();
        T.updateIfNeeded();
        const base = (T.localPtr >>> 2) + this.index * 16;
        this.readMat4FromStore(base, this._localMatrix);
        return this._localMatrix;
    }

    get worldMatrix(): number[] {
        this.assertAlive();
        const T = TransformStore.global();
        T.updateIfNeeded();
        const base = (T.worldPtr >>> 2) + this.index * 16;
        this.readMat4FromStore(base, this._worldMatrix);
        return this._worldMatrix;
    }

    get worldPosition(): number[] {
        this.assertAlive();
        const T = TransformStore.global();
        T.updateIfNeeded();
        const base = (T.worldPtr >>> 2) + this.index * 16;
        const f32 = T.f32();
        return [f32[base + 12], f32[base + 13], f32[base + 14]];
    }

    setParent(parent: Transform | null): this {
        this.assertAlive();
        if (parent === this._parent) return this;
        if (parent === this) throw new Error("Transform cannot be parented to itself.");
        for (let p = parent; p; p = p._parent) if (p === this) throw new Error("Transform parenting would create a cycle.");
        this.removeFromParent();
        this._parent = parent;
        if (parent) {
            parent._children.push(this);
            TransformStore.global().setParent(this.index, parent.index);
        } else {
            TransformStore.global().setParent(this.index, null);
        }
        return this;
    }

    addChild(child: Transform): this {
        this.assertAlive();
        child.setParent(this);
        return this;
    }

    removeChild(child: Transform): this {
        this.assertAlive();
        if (child._parent !== this) return this;
        child.setParent(null);
        return this;
    }

    removeFromParent(): this {
        this.assertAlive();
        if (!this._parent) return this;
        const p = this._parent;
        const i = p._children.indexOf(this);
        if (i >= 0) p._children.splice(i, 1);
        this._parent = null;
        TransformStore.global().setParent(this.index, null);
        return this;
    }

    reset(): this {
        this.assertAlive();
        this._parent = null;
        this._children.length = 0;
        TransformStore.global().setParent(this.index, null);
        this.setPosition(0, 0, 0);
        this.setRotation(0, 0, 0, 1);
        this.setScale(1, 1, 1);
        return this;
    }

    copyFrom(other: Transform): this {
        this.assertAlive();
        this.setPosition(other._position[0], other._position[1], other._position[2]);
        this.setRotation(other._rotation[0], other._rotation[1], other._rotation[2], other._rotation[3]);
        this.setScale(other._scale[0], other._scale[1], other._scale[2]);
        return this;
    }

    clone(): Transform {
        this.assertAlive();
        const T = new Transform();
        T.copyFrom(this);
        return T;
    }

    dispose(): void {
        if (this._disposed) return;
        const children = this._children.slice();
        for (const child of children) child.setParent(null);
        this._children.length = 0;
        this.removeFromParent();
        TransformStore.global().free(this.index);
        this._disposed = true;
    }
}
