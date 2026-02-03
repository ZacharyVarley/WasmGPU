import { initMath } from "../math";
import { Renderer, RendererDescriptor } from "./renderer";
import { Scene } from "../world/scene";
import { Camera, PerspectiveCamera, OrthographicCamera } from "../world/camera";
import { Mesh } from "../world/mesh";
import { Geometry } from "../graphics/geometry";
import { Material, UnlitMaterial, StandardMaterial, CustomMaterial, Color } from "../graphics/material";
import { AmbientLight, DirectionalLight, PointLight } from "../world/light";

export type WasmGPUDescriptor = RendererDescriptor & {
    // Future options: physics, audio, etc.
};

export type FrameCallback = (dt: number, time: number, wgpu: WasmGPU) => void;

export class WasmGPU {
    private renderer: Renderer;
    private _isRunning: boolean = false;
    private _lastTime: number = 0;
    private _frameCallback: FrameCallback | null = null;
    private _animationFrameId: number | null = null;

    private constructor(renderer: Renderer) {
        this.renderer = renderer;
    }

    static async create(canvas: HTMLCanvasElement, descriptor: WasmGPUDescriptor = {}): Promise<WasmGPU> {
        await initMath();
        const renderer = await Renderer.create(canvas, descriptor);
        return new WasmGPU(renderer);
    }

    run(callback: FrameCallback): void {
        if (this._isRunning) return;
        this._isRunning = true;
        this._frameCallback = callback;
        this._lastTime = performance.now();
        const loop = (now: number) => {
            if (!this._isRunning) return;
            const dt = (now - this._lastTime) / 1000;
            this._lastTime = now;
            this._frameCallback?.(dt, now / 1000, this);
            this._animationFrameId = requestAnimationFrame(loop);
        };
        this._animationFrameId = requestAnimationFrame(loop);
    }

    stop(): void {
        this._isRunning = false;
        if (this._animationFrameId !== null) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
    }

    get isRunning(): boolean {
        return this._isRunning;
    }

    render(scene: Scene, camera: Camera): void {
        this.renderer.render(scene, camera);
    }

    createScene(background?: Color): Scene {
        return new Scene({ background });
    }

    readonly createCamera = {
        perspective: (options?: { fov?: number; aspect?: number; near?: number; far?: number; }): PerspectiveCamera => {
            return new PerspectiveCamera(options);
        },
        orthographic: (options?: { left?: number; right?: number; top?: number; bottom?: number; near?: number; far?: number; }): OrthographicCamera => {
            return new OrthographicCamera(options);
        }
    };

    readonly geometry = {
        box: (width?: number, height?: number, depth?: number): Geometry => {
            return Geometry.box(width, height, depth);
        },
        sphere: (radius?: number, widthSegments?: number, heightSegments?: number): Geometry => {
            return Geometry.sphere(radius, widthSegments, heightSegments);
        },
        plane: (width?: number, height?: number, widthSegments?: number, heightSegments?: number): Geometry => {
            return Geometry.plane(width, height, widthSegments, heightSegments);
        },
        cylinder: (radiusTop?: number, radiusBottom?: number, height?: number, radialSegments?: number, heightSegments?: number, openEnded?: boolean): Geometry => {
            return Geometry.cylinder(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded);
        },
        pyramid: (baseWidth?: number, baseDepth?: number, height?: number): Geometry => {
            return Geometry.pyramid(baseWidth, baseDepth, height);
        },
        torus: (radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number): Geometry => {
            return Geometry.torus(radius, tube, radialSegments, tubularSegments);
        },
        prism: (radius?: number, height?: number, sides?: number): Geometry => {
            return Geometry.prism(radius, height, sides);
        },
        custom: (descriptor: { positions: Float32Array; normals?: Float32Array; uvs?: Float32Array; indices?: Uint32Array; }): Geometry => {
            return new Geometry(descriptor);
        }
    };

    readonly material = {
        unlit: (options?: { color?: Color; opacity?: number; }): UnlitMaterial => {
            return new UnlitMaterial(options);
        },
        standard: (options?: { color?: Color; opacity?: number; metallic?: number; roughness?: number; emissive?: Color; emissiveIntensity?: number; }): StandardMaterial => {
            return new StandardMaterial(options);
        },
        custom: (options: { vertexShader?: string; fragmentShader: string; uniforms?: Record<string, { type: "f32" | "vec2f" | "vec3f" | "vec4f" | "mat4x4f"; value: number | number[] }>; }): CustomMaterial => {
            return new CustomMaterial(options);
        }
    };

    createMesh(geometry: Geometry, material: Material): Mesh {
        return new Mesh(geometry, material);
    }

    readonly createLight = {
        ambient: (options?: { color?: Color; intensity?: number; }): AmbientLight => {
            return new AmbientLight(options);
        },
        directional: (options?: { direction?: [number, number, number]; color?: Color; intensity?: number; }): DirectionalLight => {
            return new DirectionalLight(options);
        },
        point: (options?: { position?: [number, number, number]; color?: Color; intensity?: number; range?: number; }): PointLight => {
            return new PointLight(options);
        }
    };

    get gpu(): { device: GPUDevice; queue: GPUQueue; format: GPUTextureFormat } {
        return this.renderer.gpu;
    }

    destroy(): void {
        this.stop();
        this.renderer.destroy();
    }
}
