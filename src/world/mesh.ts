import { Geometry } from "../graphics/geometry";
import { Material } from "../graphics/material";
import { SkinInstance } from "../graphics/animation";
import { Transform } from "../core/transform";

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

    destroy(): void {
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
        return mesh;
    }

    cloneWithMaterial(material: Material): Mesh {
        const mesh = new Mesh(this.geometry, material);
        mesh.transform.copyFrom(this.transform);
        mesh.name = this.name;
        mesh.visible = this.visible;
        mesh.castShadow = this.castShadow;
        mesh.receiveShadow = this.receiveShadow;
        return mesh;
    }
}
