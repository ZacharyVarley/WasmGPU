import { Renderer, RendererDescriptor } from "./renderer";
import { PerformanceStats } from "./stats";
import type { PerformanceStatsDescriptor } from "./stats";
import { Transform } from "./transform";
import { Compute} from "../compute";
import type { ComputeDescriptor } from "../compute";
import { loadGltf, importGltf, parseGLB, readAccessor, readAccessorAsFloat32, readAccessorAsUint16, readIndicesAsUint32 } from "../gltf";
import type { GltfDocument, LoadGltfOptions, ImportGltfOptions, GltfImportResult, ParsedGLB, AccessorView } from "../gltf";
import { AnimationClip, AnimationPlayer, Skin } from "../graphics/animation";
import type { AnimationClipDescriptor } from "../graphics/animation";
import { Colormap } from "../graphics/colormap";
import type { BuiltinColormapName, ColormapDescriptor, ColormapStop } from "../graphics/colormap";
import { Geometry } from "../graphics/geometry";
import { Material, UnlitMaterial, StandardMaterial, DataMaterial, CustomMaterial, Color } from "../graphics/material";
import type { UnlitMaterialDescriptor, StandardMaterialDescriptor, DataMaterialDescriptor, CustomMaterialDescriptor } from "../graphics/material";
import { Texture2D } from "../graphics/texture";
import type { Texture2DDescriptor } from "../graphics/texture";
import { pythonInterop } from "../python";
import { mat4, vec3, quat, frameArena, initWebAssembly, wasmInterop, WasmHeapArena } from "../wasm";
import { Camera, PerspectiveCamera, OrthographicCamera } from "../world/camera";
import { OrbitControls, TrackballControls } from "../world/controls";
import type { OrbitControlsDescriptor, TrackballControlsDescriptor } from "../world/controls";
import { AmbientLight, DirectionalLight, PointLight } from "../world/light";
import { Mesh } from "../world/mesh";
import { PointCloud } from "../world/pointcloud";
import type { PointCloudDescriptor } from "../world/pointcloud";
import { GlyphField } from "../world/glyphfield";
import type { GlyphFieldDescriptor } from "../world/glyphfield";
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

    private constructor(renderer: Renderer, desc: WasmGPUDescriptor | ComputeDescriptor) {
        this.renderer = renderer;
        const gpu = renderer.gpu;
        this.compute = new Compute(gpu.device, gpu.queue, desc as ComputeDescriptor);
    }

    static async create(canvas: HTMLCanvasElement, descriptor: WasmGPUDescriptor = {}): Promise<WasmGPU> {
        await initWebAssembly();
        const renderer = await Renderer.create(canvas, descriptor);
        return new WasmGPU(renderer, descriptor);
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

    static get interop() {
        return wasmInterop;
    }

    get interop() {
        return wasmInterop;
    }

    static get python() {
        return pythonInterop;
    }

    get python() {
        return pythonInterop;
    }

    static get math() {
        return { mat4, quat, vec3 };
    }

    get math() {
        return { mat4, quat, vec3 };
    }

    static createHeapArena(capBytes: number, align: number = 16): WasmHeapArena {
        return wasmInterop.createHeapArena(capBytes, align);
    }

    createHeapArena(capBytes: number, align: number = 16): WasmHeapArena {
        return wasmInterop.createHeapArena(capBytes, align);
    }

    static get frameArena() {
        return frameArena;
    }

    get frameArena() {
        return frameArena;
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
        },
        trackball: (camera: Camera, domElement: HTMLCanvasElement, options?: TrackballControlsDescriptor): TrackballControls => {
            return new TrackballControls(camera, domElement, options);
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
        unlit: (options?: UnlitMaterialDescriptor): UnlitMaterial => {
            return new UnlitMaterial(options);
        },
        standard: (options?: StandardMaterialDescriptor): StandardMaterial => {
            return new StandardMaterial(options);
        },
        data: (options?: DataMaterialDescriptor): DataMaterial => {
            return new DataMaterial(options);
        },
        custom: (options: CustomMaterialDescriptor): CustomMaterial => {
            return new CustomMaterial(options);
        }
    };

    readonly texture = {
        create2D: (descriptor: Texture2DDescriptor): Texture2D => {
            return Texture2D.createFrom(descriptor);
        }
    };

    createTransform(): Transform {
        return new Transform();
    }

    createMesh(geometry: Geometry, material: Material): Mesh {
        return new Mesh(geometry, material);
    }

    createPointCloud(descriptor: PointCloudDescriptor = {}): PointCloud {
        return new PointCloud(descriptor);
    }

    createGlyphField(descriptor: GlyphFieldDescriptor = {}): GlyphField {
        return new GlyphField(descriptor);
    }

    readonly colormap = {
        builtin: (name: BuiltinColormapName): Colormap => {
            return Colormap.builtin(name);
        },
        grayscale: (): Colormap => {
            return Colormap.builtin("grayscale");
        },
        turbo: (): Colormap => {
            return Colormap.builtin("turbo");
        },
        viridis: (): Colormap => {
            return Colormap.builtin("viridis");
        },
        magma: (): Colormap => {
            return Colormap.builtin("magma");
        },
        plasma: (): Colormap => {
            return Colormap.builtin("plasma");
        },
        inferno: (): Colormap => {
            return Colormap.builtin("inferno");
        },
        fromStops: (stops: ReadonlyArray<ColormapStop>, desc: ColormapDescriptor = {}): Colormap => {
            return Colormap.fromStops(stops, desc);
        },
        fromPalette: (colors: ReadonlyArray<[number, number, number, number]>, desc: ColormapDescriptor = {}): Colormap => {
            return Colormap.fromPalette(colors, desc);
        }
    };

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

    readonly gltf = {
        load: async (source: string | ArrayBuffer, options?: LoadGltfOptions) => {
            return loadGltf(source, options);
        },
        import: async (doc: GltfDocument, options?: ImportGltfOptions): Promise<GltfImportResult> => {
            return importGltf(doc, options);
        },
        loadAndImport: async (source: string | ArrayBuffer, options: GltfOptions = {}): Promise<GltfImportResult> => {
            const doc = await loadGltf(source, options.load);
            return importGltf(doc, options.import);
        },
        parseGLB: (glb: ArrayBuffer): ParsedGLB => {
            return parseGLB(glb);
        },
        readAccessor: (doc: GltfDocument, accessorIndex: number): AccessorView => {
            return readAccessor(doc, accessorIndex);
        },
        readAccessorAsFloat32: (doc: GltfDocument, accessorIndex: number): Float32Array => {
            return readAccessorAsFloat32(doc, accessorIndex);
        },
        readAccessorAsUint16: (doc: GltfDocument, accessorIndex: number): Uint16Array => {
            return readAccessorAsUint16(doc, accessorIndex);
        },
        readIndicesAsUint32: (doc: GltfDocument, accessorIndex: number): Uint32Array => {
            return readIndicesAsUint32(doc, accessorIndex);
        }
    };

    readonly animation = {
        createClip: (descriptor: AnimationClipDescriptor): AnimationClip => {
            return new AnimationClip(descriptor);
        },
        createPlayer: (clip: AnimationClip, options?: Partial<Pick<AnimationPlayer, "speed" | "loop" | "playing">>): AnimationPlayer => {
            return new AnimationPlayer(clip, options);
        },
        createSkin: (name: string, joints: Transform[], inverseBindMatrices: Float32Array | null): Skin => {
            return new Skin(name, joints, inverseBindMatrices);
        }
    };

    destroy(): void {
        this.stop();
        this.destroyPerformanceStats();
        this.compute.destroy();
        this.renderer.destroy();
    }
}
