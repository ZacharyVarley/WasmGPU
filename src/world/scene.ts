import { Mesh } from "./mesh";
import { Color } from "../graphics/material";
import { Light, AmbientLight } from "./light";

export type SceneDescriptor = {
    background?: Color;
};

export class Scene {
    private _meshes: Mesh[] = [];
    private _lights: Light[] = [];
    private _background: Color;
    static readonly MAX_LIGHTS = 8;

    constructor(descriptor: SceneDescriptor = {}) {
        this._background = descriptor.background ?? [0, 0, 0];
    }

    get background(): Color {
        return this._background;
    }

    set background(value: Color) {
        this._background = value;
    }

    get meshes(): readonly Mesh[] {
        return this._meshes;
    }

    add(mesh: Mesh): this {
        if (!this._meshes.includes(mesh)) this._meshes.push(mesh);
        return this;
    }

    remove(mesh: Mesh): this {
        const idx = this._meshes.indexOf(mesh);
        if (idx !== -1) this._meshes.splice(idx, 1);
        return this;
    }

    clear(): this {
        this._meshes = [];
        return this;
    }

    get lights(): readonly Light[] {
        return this._lights;
    }

    addLight(light: Light): this {
        if (!this._lights.includes(light)) {
            if (this._lights.length >= Scene.MAX_LIGHTS && light.type !== "ambient") console.warn(`Scene: Maximum of ${Scene.MAX_LIGHTS} non-ambient lights supported.`);
            this._lights.push(light);
        }
        return this;
    }

    removeLight(light: Light): this {
        const idx = this._lights.indexOf(light);
        if (idx !== -1) this._lights.splice(idx, 1);
        return this;
    }

    clearLights(): this {
        this._lights = [];
        return this;
    }

    findByName(name: string): Mesh | undefined {
        return this._meshes.find(m => m.name === name);
    }

    findAllByName(name: string): Mesh[] {
        return this._meshes.filter(m => m.name === name);
    }

    get visibleMeshes(): Mesh[] {
        return this._meshes.filter(m => m.visible);
    }

    get enabledLights(): Light[] {
        return this._lights.filter(l => l.enabled);
    }

    getAmbientColor(): Color {
        const ambient = this._lights.find((l): l is AmbientLight => l.type === "ambient" && l.enabled);
        if (ambient) {
            return [
                ambient.color[0] * ambient.intensity,
                ambient.color[1] * ambient.intensity,
                ambient.color[2] * ambient.intensity
            ];
        }
        return [0, 0, 0];
    }

    getLightingData(): { ambient: Color; lights: Light[] } {
        const ambient = this.getAmbientColor();
        const lights = this.enabledLights.filter(l => l.type !== "ambient").slice(0, Scene.MAX_LIGHTS);
        return { ambient, lights };
    }

    traverse(callback: (mesh: Mesh) => void): void {
        for (const mesh of this._meshes) callback(mesh);
    }

    traverseVisible(callback: (mesh: Mesh) => void): void {
        for (const mesh of this._meshes) if (mesh.visible) callback(mesh);
    }

    destroy(): void {
        for (const mesh of this._meshes) mesh.destroy();
        this._meshes = [];
        this._lights = [];
    }
}
