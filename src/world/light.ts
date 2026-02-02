import { Color } from "../graphics/material";

export type LightType = "directional" | "point" | "ambient";

export abstract class Light {
    readonly type: LightType;
    protected _color: Color = [1, 1, 1];
    protected _intensity: number = 1;
    protected _enabled: boolean = true;

    constructor(type: LightType) {
        this.type = type;
    }

    get color(): Color {
        return this._color;
    }

    set color(value: Color) {
        this._color = value;
    }

    get intensity(): number {
        return this._intensity;
    }

    set intensity(value: number) {
        this._intensity = value;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        this._enabled = value;
    }
}

export type AmbientLightDescriptor = {
    color?: Color;
    intensity?: number;
};

export class AmbientLight extends Light {
    constructor(descriptor: AmbientLightDescriptor = {}) {
        super("ambient");
        this._color = descriptor.color ?? [1, 1, 1];
        this._intensity = descriptor.intensity ?? 0.1;
    }
}

export type DirectionalLightDescriptor = {
    direction?: [number, number, number];
    color?: Color;
    intensity?: number;
};

export class DirectionalLight extends Light {
    private _direction: [number, number, number];

    constructor(descriptor: DirectionalLightDescriptor = {}) {
        super("directional");
        this._direction = descriptor.direction ?? [0, -1, 0];
        this._color = descriptor.color ?? [1, 1, 1];
        this._intensity = descriptor.intensity ?? 1;
    }

    get direction(): [number, number, number] {
        return this._direction;
    }

    set direction(value: [number, number, number]) {
        const len = Math.sqrt(value[0] ** 2 + value[1] ** 2 + value[2] ** 2);
        if (len > 0) {
            this._direction = [value[0] / len, value[1] / len, value[2] / len];
        }
    }
}

export type PointLightDescriptor = {
    position?: [number, number, number];
    color?: Color;
    intensity?: number;
    range?: number;
};

export class PointLight extends Light {
    private _position: [number, number, number];
    private _range: number;

    constructor(descriptor: PointLightDescriptor = {}) {
        super("point");
        this._position = descriptor.position ?? [0, 0, 0];
        this._color = descriptor.color ?? [1, 1, 1];
        this._intensity = descriptor.intensity ?? 1;
        this._range = descriptor.range ?? 10;
    }

    get position(): [number, number, number] {
        return this._position;
    }

    set position(value: [number, number, number]) {
        this._position = value;
    }

    get range(): number {
        return this._range;
    }

    set range(value: number) {
        this._range = value;
    }
}
