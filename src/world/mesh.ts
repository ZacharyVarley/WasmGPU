/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Geometry, computeGeometryBounds, computeGeometryVertexNormals } from "../graphics/geometry";
import { Material } from "../graphics/material";
import { SkinInstance } from "../graphics/animation";
import { Transform } from "../core/transform";
import { Bounds3, boundsFromBoxAndSphere, transformBounds } from "./bounds";
import { createBuffer } from "../utils";

type MeshBoundsSource = {
    boundsMin: readonly [number, number, number];
    boundsMax: readonly [number, number, number];
    boundsCenter: readonly [number, number, number];
    boundsRadius: number;
};

type MeshMorphRuntime = MeshBoundsSource & {
    targetCount: number;
    weights: Float32Array;
    positions: Float32Array;
    normals: Float32Array;
    device: GPUDevice | null;
    positionBuffer: GPUBuffer | null;
    normalBuffer: GPUBuffer | null;
    dirty: boolean;
    gpuDirty: boolean;
    hasNormalTargets: boolean;
    recomputeNormals: boolean;
};

type MeshVertexBuffers = {
    positionBuffer: GPUBuffer;
    normalBuffer: GPUBuffer;
};

const meshMorphRuntimes = new WeakMap<Mesh, MeshMorphRuntime>();

const resolveWeights = (weights: ArrayLike<number> | null | undefined, targetCount: number): Float32Array => {
    const out = new Float32Array(targetCount);
    if (!weights) return out;
    const count = Math.min(targetCount, weights.length | 0);
    for (let i = 0; i < count; i++) out[i] = Number(weights[i] ?? 0) || 0;
    return out;
};

const updateMeshMorphCpuState = (runtime: MeshMorphRuntime, geometry: Geometry): boolean => {
    if (!runtime.dirty) return false;
    runtime.positions.set(geometry.positions);
    for (let i = 0; i < runtime.targetCount; i++) {
        const weight = runtime.weights[i] ?? 0;
        if (weight === 0) continue;
        const target = geometry.morphTargets[i];
        const pos = target?.positions;
        if (pos) for (let j = 0; j < pos.length; j++) runtime.positions[j] += pos[j] * weight;
    }
    if (runtime.recomputeNormals) runtime.normals.set(computeGeometryVertexNormals(runtime.positions, geometry.indices));
    else if (runtime.hasNormalTargets) {
        runtime.normals.set(geometry.normals);
        for (let i = 0; i < runtime.targetCount; i++) {
            const weight = runtime.weights[i] ?? 0;
            if (weight === 0) continue;
            const target = geometry.morphTargets[i];
            const normals = target?.normals;
            if (!normals) continue;
            for (let j = 0; j < normals.length; j++) runtime.normals[j] += normals[j] * weight;
        }
    } else runtime.normals.set(geometry.normals);
    const bounds = computeGeometryBounds(runtime.positions);
    runtime.boundsMin = bounds.boxMin;
    runtime.boundsMax = bounds.boxMax;
    runtime.boundsCenter = bounds.sphereCenter;
    runtime.boundsRadius = bounds.sphereRadius;
    runtime.dirty = false;
    runtime.gpuDirty = true;
    return true;
};

const destroyMeshMorphBuffers = (runtime: MeshMorphRuntime): void => {
    runtime.positionBuffer?.destroy();
    runtime.normalBuffer?.destroy();
    runtime.positionBuffer = null;
    runtime.normalBuffer = null;
    runtime.device = null;
};

export const initializeMeshMorphRuntime = (mesh: Mesh, weights: ArrayLike<number> | null | undefined): void => {
    const targetCount = mesh.geometry.morphTargets.length | 0;
    if (targetCount <= 0) return;
    const runtime: MeshMorphRuntime = {
        targetCount,
        weights: resolveWeights(weights, targetCount),
        positions: new Float32Array(mesh.geometry.positions),
        normals: new Float32Array(mesh.geometry.normals),
        device: null,
        positionBuffer: null,
        normalBuffer: null,
        dirty: true,
        gpuDirty: true,
        hasNormalTargets: mesh.geometry.morphTargets.some((target) => !!target.normals),
        recomputeNormals: !mesh.geometry.authoredNormals,
        boundsMin: mesh.geometry.boundsMin,
        boundsMax: mesh.geometry.boundsMax,
        boundsCenter: mesh.geometry.boundsCenter,
        boundsRadius: mesh.geometry.boundsRadius
    };
    meshMorphRuntimes.set(mesh, runtime);
};

export const copyMeshMorphRuntime = (source: Mesh, target: Mesh): void => {
    const runtime = meshMorphRuntimes.get(source);
    if (!runtime) return;
    initializeMeshMorphRuntime(target, runtime.weights);
};

export const destroyMeshMorphRuntime = (mesh: Mesh): void => {
    const runtime = meshMorphRuntimes.get(mesh);
    if (!runtime) return;
    destroyMeshMorphBuffers(runtime);
    meshMorphRuntimes.delete(mesh);
};

export const hasMeshMorphRuntime = (mesh: Mesh): boolean => {
    return meshMorphRuntimes.has(mesh);
};

export const setMeshMorphWeights = (mesh: Mesh, weights: ArrayLike<number>): void => {
    const runtime = meshMorphRuntimes.get(mesh);
    if (!runtime) return;
    const next = resolveWeights(weights, runtime.targetCount);
    let changed = false;
    for (let i = 0; i < runtime.targetCount; i++) if (runtime.weights[i] !== next[i]) { changed = true; break; }
    if (!changed) return;
    runtime.weights.set(next);
    runtime.dirty = true;
};

export const getMeshMorphWeights = (mesh: Mesh): Float32Array | null => {
    const runtime = meshMorphRuntimes.get(mesh);
    if (!runtime) return null;
    return new Float32Array(runtime.weights);
};

export const getMeshLocalBoundsSource = (mesh: Mesh): MeshBoundsSource => {
    const runtime = meshMorphRuntimes.get(mesh);
    if (!runtime) return mesh.geometry;
    updateMeshMorphCpuState(runtime, mesh.geometry);
    return runtime;
};

export const getMeshVertexSource = (mesh: Mesh): object => {
    return meshMorphRuntimes.has(mesh) ? mesh : mesh.geometry;
};

export const getMeshVertexBuffers = (mesh: Mesh, device: GPUDevice, queue: GPUQueue): MeshVertexBuffers => {
    const runtime = meshMorphRuntimes.get(mesh);
    if (!runtime) {
        mesh.geometry.upload(device);
        return { positionBuffer: mesh.geometry.positionBuffer, normalBuffer: mesh.geometry.normalBuffer };
    }
    const updated = updateMeshMorphCpuState(runtime, mesh.geometry);
    if (runtime.device !== device || !runtime.positionBuffer || !runtime.normalBuffer) {
        destroyMeshMorphBuffers(runtime);
        runtime.positionBuffer = createBuffer(device, runtime.positions, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
        runtime.normalBuffer = createBuffer(device, runtime.normals, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
        runtime.device = device;
        runtime.gpuDirty = false;
    } else if (updated || runtime.gpuDirty) {
        queue.writeBuffer(runtime.positionBuffer, 0, runtime.positions.buffer, runtime.positions.byteOffset, runtime.positions.byteLength);
        queue.writeBuffer(runtime.normalBuffer, 0, runtime.normals.buffer, runtime.normals.byteOffset, runtime.normals.byteLength);
        runtime.gpuDirty = false;
    }
    return { positionBuffer: runtime.positionBuffer, normalBuffer: runtime.normalBuffer };
};

export class Mesh {
    readonly geometry: Geometry;
    readonly material: Material;
    readonly transform: Transform;
    private _visible: boolean = true;
    private _castShadow: boolean = true;
    private _receiveShadow: boolean = true;
    name: string = "";
    userData: Record<string, unknown> = {};
    skin: SkinInstance | null = null;

    constructor(geometry: Geometry, material: Material) {
        this.geometry = geometry;
        this.material = material;
        this.transform = new Transform();
    }

    get visible(): boolean {
        return this._visible;
    }

    set visible(value: boolean) {
        this._visible = value;
    }

    get castShadow(): boolean {
        return this._castShadow;
    }

    set castShadow(value: boolean) {
        this._castShadow = value;
    }

    get receiveShadow(): boolean {
        return this._receiveShadow;
    }

    set receiveShadow(value: boolean) {
        this._receiveShadow = value;
    }

    setParent(parent: Mesh | null): this {
        this.transform.setParent(parent?.transform ?? null);
        return this;
    }

    addChild(child: Mesh): this {
        this.transform.addChild(child.transform);
        return this;
    }

    removeChild(child: Mesh): this {
        this.transform.removeChild(child.transform);
        return this;
    }

    get worldMatrix(): number[] {
        return this.transform.worldMatrix;
    }

    getLocalBounds(): Bounds3 {
        const bounds = this.getLocalBoundsSource();
        return boundsFromBoxAndSphere(bounds.boundsMin, bounds.boundsMax, bounds.boundsCenter, bounds.boundsRadius);
    }

    getWorldBounds(): Bounds3 {
        return transformBounds(this.getLocalBounds(), this.transform.worldMatrix);
    }

    getBounds(): Bounds3 {
        return this.getWorldBounds();
    }

    destroy(): void {
        destroyMeshMorphRuntime(this);
        this.skin?.dispose();
        this.skin = null;
        this.transform.dispose();
        this.geometry.destroy();
        this.material.destroy();
    }

    clone(): Mesh {
        const mesh = new Mesh(this.geometry, this.material);
        mesh.transform.copyFrom(this.transform);
        mesh.name = this.name;
        mesh.visible = this.visible;
        mesh.castShadow = this.castShadow;
        mesh.receiveShadow = this.receiveShadow;
        copyMeshMorphRuntime(this, mesh);
        return mesh;
    }

    cloneWithMaterial(material: Material): Mesh {
        const mesh = new Mesh(this.geometry, material);
        mesh.transform.copyFrom(this.transform);
        mesh.name = this.name;
        mesh.visible = this.visible;
        mesh.castShadow = this.castShadow;
        mesh.receiveShadow = this.receiveShadow;
        copyMeshMorphRuntime(this, mesh);
        return mesh;
    }

    private getLocalBoundsSource(): MeshBoundsSource {
        return getMeshLocalBoundsSource(this);
    }
}
