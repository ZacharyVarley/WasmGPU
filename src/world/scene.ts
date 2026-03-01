import { Mesh } from "./mesh";
import { PointCloud } from "./pointcloud";
import { GlyphField } from "./glyphfield";
import { Color } from "../graphics/material";
import { Light, AmbientLight } from "./light";

export type SceneDescriptor = {
    background?: Color;
};

export class Scene {
    private _meshes: Mesh[] = [];
    private _pointClouds: PointCloud[] = [];
    private _glyphFields: GlyphField[] = [];
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

    get pointClouds(): readonly PointCloud[] {
        return this._pointClouds;
    }

    get glyphFields(): readonly GlyphField[] {
        return this._glyphFields;
    }

    add(mesh: Mesh): this;
    add(pointCloud: PointCloud): this;
    add(glyphField: GlyphField): this;
    add(obj: Mesh | PointCloud | GlyphField): this {
        if (obj instanceof Mesh) {
            if (!this._meshes.includes(obj)) this._meshes.push(obj);
        } else if (obj instanceof PointCloud) {
            if (!this._pointClouds.includes(obj)) this._pointClouds.push(obj);
        } else {
            if (!this._glyphFields.includes(obj)) this._glyphFields.push(obj);
        }
        return this;
    }

    remove(mesh: Mesh): this;
    remove(pointCloud: PointCloud): this;
    remove(glyphField: GlyphField): this;
    remove(obj: Mesh | PointCloud | GlyphField): this {
        if (obj instanceof Mesh) {
            const idx = this._meshes.indexOf(obj);
            if (idx !== -1) this._meshes.splice(idx, 1);
        } else if (obj instanceof PointCloud) {
            const idx = this._pointClouds.indexOf(obj);
            if (idx !== -1) this._pointClouds.splice(idx, 1);
        } else {
            const idx = this._glyphFields.indexOf(obj);
            if (idx !== -1) this._glyphFields.splice(idx, 1);
        }
        return this;
    }

    clear(): this {
        this._meshes = [];
        this._pointClouds = [];
        this._glyphFields = [];
        return this;
    }

    clearPointClouds(): this {
        this._pointClouds = [];
        return this;
    }

    clearGlyphFields(): this {
        this._glyphFields = [];
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

    findPointCloudByName(name: string): PointCloud | undefined {
        return this._pointClouds.find(p => p.name === name);
    }

    findAllPointCloudsByName(name: string): PointCloud[] {
        return this._pointClouds.filter(p => p.name === name);
    }

    findGlyphFieldByName(name: string): GlyphField | undefined {
        return this._glyphFields.find(g => g.name === name);
    }

    findAllGlyphFieldsByName(name: string): GlyphField[] {
        return this._glyphFields.filter(g => g.name === name);
    }

    get visibleMeshes(): Mesh[] {
        return this._meshes.filter(m => m.visible);
    }

    get visiblePointClouds(): PointCloud[] {
        return this._pointClouds.filter(p => p.visible);
    }

    get visibleGlyphFields(): GlyphField[] {
        return this._glyphFields.filter(g => g.visible);
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

    traversePointClouds(callback: (pc: PointCloud) => void): void {
        for (const pc of this._pointClouds) callback(pc);
    }

    traverseVisiblePointClouds(callback: (pc: PointCloud) => void): void {
        for (const pc of this._pointClouds) if (pc.visible) callback(pc);
    }

    traverseGlyphFields(callback: (g: GlyphField) => void): void {
        for (const g of this._glyphFields) callback(g);
    }

    traverseVisibleGlyphFields(callback: (g: GlyphField) => void): void {
        for (const g of this._glyphFields) if (g.visible) callback(g);
    }

    destroy(): void {
        for (const mesh of this._meshes) mesh.destroy();
        for (const pc of this._pointClouds) pc.destroy();
        for (const g of this._glyphFields) g.destroy();
        this._meshes = [];
        this._pointClouds = [];
        this._glyphFields = [];
        this._lights = [];
    }
}
