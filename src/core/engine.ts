import { Renderer, RendererDescriptor } from "./renderer";
import { PerformanceStats, type PerformanceStatsDescriptor } from "./stats";
import { Compute } from "../compute";
import { loadGltf, type LoadGltfOptions } from "../gltf/loader";
import { importGltf, type ImportGltfOptions, type GltfImportResult } from "../gltf/import";
import { Geometry } from "../graphics/geometry";
import { Material, UnlitMaterial, StandardMaterial, CustomMaterial, Color } from "../graphics/material";
import { frameArena, initWebAssembly } from "../wasm";
import { Camera, PerspectiveCamera, OrthographicCamera } from "../world/camera";
import { OrbitControls, type OrbitControlsDescriptor } from "../world/controls";
import { AmbientLight, DirectionalLight, PointLight } from "../world/light";
import { Mesh } from "../world/mesh";
import { Scene } from "../world/scene";

export type WasmGPUDescriptor = RendererDescriptor & {
    // Future options: physics, audio, etc.
};

export type FrameCallback = (dt: number, time: number, wgpu: WasmGPU) => void;

export type GltfOptions = {
    load?: LoadGltfOptions;
    import?: ImportGltfOptions;
};

export class WasmGPU {
    private renderer: Renderer;
    readonly compute: Compute;
    private _performanceStats: PerformanceStats | null = null;
    private _isRunning: boolean = false;
    private _lastTime: number = 0;
    private _frameCallback: FrameCallback | null = null;
    private _animationFrameId: number | null = null;

    private constructor(renderer: Renderer) {
        this.renderer = renderer;
        const gpu = renderer.gpu;
        this.compute = new Compute(gpu.device, gpu.queue);
    }

    static async create(canvas: HTMLCanvasElement, descriptor: WasmGPUDescriptor = {}): Promise<WasmGPU> {
        await initWebAssembly();
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
            frameArena.reset();
            const dt = (now - this._lastTime) / 1000;
            this._lastTime = now;
            const cpuStart = performance.now();
            this._frameCallback?.(dt, now / 1000, this);
            const cpuMs = performance.now() - cpuStart;
            this._performanceStats?.update(dt, cpuMs);
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

    get gpu(): { device: GPUDevice; queue: GPUQueue; format: GPUTextureFormat } {
        return this.renderer.gpu;
    }

    get isRunning(): boolean {
        return this._isRunning;
    }

    get cullingStats(): { tested: number; visible: number } {
        return this.renderer.cullingStats;
    }

    createPerformanceStats(desc: PerformanceStatsDescriptor = {}): PerformanceStats {
        this._performanceStats?.destroy();
        this.renderer.enableGpuTiming(desc.showGpuTime ?? true);
        const stats = new PerformanceStats({
            getGpuTimeNs: () => this.renderer.gpuTimeNs,
            getCullingStats: () => this.renderer.cullingStats
        }, {
            canvas: this.renderer.canvas,
            ...desc
        });
        this._performanceStats = stats;
        return stats;
    }

    get performanceStats(): PerformanceStats | null {
        return this._performanceStats;
    }

    destroyPerformanceStats(): void {
        this._performanceStats?.destroy();
        this._performanceStats = null;
        this.renderer.enableGpuTiming(false);
    }

    render(scene: Scene, camera: Camera): void {
        if (!this._isRunning) frameArena.reset();
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

    readonly createControls = {
        orbit: (camera: Camera, domElement: HTMLCanvasElement, options?: OrbitControlsDescriptor): OrbitControls => {
            return new OrbitControls(camera, domElement, options);
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

    async loadGLTF(source: string | ArrayBuffer, options: GltfOptions = {}): Promise<GltfImportResult> {
        const doc = await loadGltf(source, options.load);
        return importGltf(doc, options.import);
    }

    destroy(): void {
        this.stop();
        this.destroyPerformanceStats();
        this.compute.destroy();
        this.renderer.destroy();
    }
}
