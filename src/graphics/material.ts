export type Color = [number, number, number];
export type Color4 = [number, number, number, number];

export enum BlendMode {
    Opaque = "opaque",
    Transparent = "transparent",
    Additive = "additive"
}

export enum CullMode {
    None = "none",
    Back = "back",
    Front = "front"
}

export type MaterialDescriptor = {
    blendMode?: BlendMode;
    cullMode?: CullMode;
    depthWrite?: boolean;
    depthTest?: boolean;
};

export abstract class Material {
    readonly blendMode: BlendMode;
    readonly cullMode: CullMode;
    readonly depthWrite: boolean;
    readonly depthTest: boolean;
    pipeline: GPURenderPipeline | null = null;
    bindGroup: GPUBindGroup | null = null;
    uniformBuffer: GPUBuffer | null = null;
    protected _dirty: boolean = true;

    constructor(descriptor: MaterialDescriptor = {}) {
        this.blendMode = descriptor.blendMode ?? BlendMode.Opaque;
        this.cullMode = descriptor.cullMode ?? CullMode.Back;
        this.depthWrite = descriptor.depthWrite ?? true;
        this.depthTest = descriptor.depthTest ?? true;
    }

    get dirty(): boolean {
        return this._dirty;
    }

    markClean(): void {
        this._dirty = false;
    }

    abstract getUniformData(): Float32Array;
    abstract getShaderCode(): string;
    abstract getUniformBufferSize(): number;
    abstract createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout;

    destroy(): void {
        this.uniformBuffer?.destroy();
        this.uniformBuffer = null;
        this.bindGroup = null;
        this.pipeline = null;
    }
}

export type UnlitMaterialDescriptor = MaterialDescriptor & {
    color?: Color;
    opacity?: number;
};

export class UnlitMaterial extends Material {
    private _color: Color;
    private _opacity: number;

    constructor(descriptor: UnlitMaterialDescriptor = {}) {
        super({
            ...descriptor,
            blendMode: descriptor.opacity !== undefined && descriptor.opacity < 1 
                ? BlendMode.Transparent 
                : descriptor.blendMode
        });
        this._color = descriptor.color ?? [1, 1, 1];
        this._opacity = descriptor.opacity ?? 1;
    }

    get color(): Color {
        return this._color;
    }

    set color(value: Color) {
        this._color = value;
        this._dirty = true;
    }

    get opacity(): number {
        return this._opacity;
    }

    set opacity(value: number) {
        this._opacity = value;
        this._dirty = true;
    }

    getUniformBufferSize(): number {
        return 32;
    }

    getUniformData(): Float32Array {
        return new Float32Array([
            this._color[0], this._color[1], this._color[2], this._opacity,
            0, 0, 0, 0
        ]);
    }

    createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        return device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" }
                }
            ]
        });
    }

    getShaderCode(): string {
        return /* wgsl */ `
            struct MaterialUniforms {
                color: vec4f
            };
            @group(1) @binding(0) var<uniform> material: MaterialUniforms;
            struct VertexInput {
                @location(0) position: vec3f,
                @location(1) normal: vec3f,
                @location(2) uv: vec2f
            };
            struct VertexOutput {
                @builtin(position) position: vec4f,
                @location(0) normal: vec3f,
                @location(1) uv: vec2f
            };
            struct CameraUniforms {
                viewProjection: mat4x4f,
                position: vec3f
            };
            struct ModelUniforms {
                model: mat4x4f,
                normalMatrix: mat4x4f
            };
            @group(0) @binding(0) var<uniform> camera: CameraUniforms;
            @group(0) @binding(1) var<uniform> model: ModelUniforms;
            @vertex
            fn vs_main(in: VertexInput) -> VertexOutput {
                var out: VertexOutput;
                out.position = camera.viewProjection * model.model * vec4f(in.position, 1.0);
                out.normal = (model.normalMatrix * vec4f(in.normal, 0.0)).xyz;
                out.uv = in.uv;
                return out;
            }
            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4f {
                return material.color;
            }
        `;
    }
}

export type StandardMaterialDescriptor = MaterialDescriptor & {
    color?: Color;
    opacity?: number;
    metallic?: number;
    roughness?: number;
    emissive?: Color;
    emissiveIntensity?: number;
};

export class StandardMaterial extends Material {
    private _color: Color;
    private _opacity: number;
    private _metallic: number;
    private _roughness: number;
    private _emissive: Color;
    private _emissiveIntensity: number;

    constructor(descriptor: StandardMaterialDescriptor = {}) {
        super({
            ...descriptor,
            blendMode: descriptor.opacity !== undefined && descriptor.opacity < 1
                ? BlendMode.Transparent
                : descriptor.blendMode
        });
        this._color = descriptor.color ?? [1, 1, 1];
        this._opacity = descriptor.opacity ?? 1;
        this._metallic = descriptor.metallic ?? 0;
        this._roughness = descriptor.roughness ?? 0.5;
        this._emissive = descriptor.emissive ?? [0, 0, 0];
        this._emissiveIntensity = descriptor.emissiveIntensity ?? 1;
    }

    get color(): Color {
        return this._color;
    }

    set color(value: Color) {
        this._color = value;
        this._dirty = true;
    }

    get opacity(): number {
        return this._opacity;
    }

    set opacity(value: number) {
        this._opacity = value;
        this._dirty = true;
    }

    get metallic(): number {
        return this._metallic;
    }

    set metallic(value: number) {
        this._metallic = Math.max(0, Math.min(1, value));
        this._dirty = true;
    }

    get roughness(): number {
        return this._roughness;
    }

    set roughness(value: number) {
        this._roughness = Math.max(0, Math.min(1, value));
        this._dirty = true;
    }

    get emissive(): Color {
        return this._emissive;
    }

    set emissive(value: Color) {
        this._emissive = value;
        this._dirty = true;
    }

    get emissiveIntensity(): number {
        return this._emissiveIntensity;
    }

    set emissiveIntensity(value: number) {
        this._emissiveIntensity = value;
        this._dirty = true;
    }

    getUniformBufferSize(): number {
        return 48;
    }

    getUniformData(): Float32Array {
        return new Float32Array([
            this._color[0], this._color[1], this._color[2], this._opacity,
            this._emissive[0], this._emissive[1], this._emissive[2], 0,
            this._metallic, this._roughness, this._emissiveIntensity, 0
        ]);
    }

    createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        return device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" }
                }
            ]
        });
    }

    getShaderCode(): string {
        return /* wgsl */ `
            struct MaterialUniforms {
                color: vec4f,
                emissive: vec4f,
                params: vec4f  // x: metallic, y: roughness, z: emissiveIntensity
            };
            @group(1) @binding(0) var<uniform> material: MaterialUniforms;
            struct VertexInput {
                @location(0) position: vec3f,
                @location(1) normal: vec3f,
                @location(2) uv: vec2f
            };
            struct VertexOutput {
                @builtin(position) position: vec4f,
                @location(0) worldPos: vec3f,
                @location(1) normal: vec3f,
                @location(2) uv: vec2f
            };
            struct CameraUniforms {
                viewProjection: mat4x4f,
                position: vec3f
            };
            struct ModelUniforms {
                model: mat4x4f,
                normalMatrix: mat4x4f
            };
            struct Light {
                position: vec4f,
                color: vec4f,
                params: vec4f
            };
            struct LightingUniforms {
                ambient: vec4f,
                lightCount: u32,
                _pad0: u32,
                _pad1: u32,
                _pad2: u32,
                lights: array<Light, 8>
            };
            @group(0) @binding(0) var<uniform> camera: CameraUniforms;
            @group(0) @binding(1) var<uniform> model: ModelUniforms;
            @group(0) @binding(2) var<uniform> lighting: LightingUniforms;
            const PI: f32 = 3.14159265359;
            @vertex
            fn vs_main(in: VertexInput) -> VertexOutput {
                var out: VertexOutput;
                let worldPos = model.model * vec4f(in.position, 1.0);
                out.position = camera.viewProjection * worldPos;
                out.worldPos = worldPos.xyz;
                out.normal = normalize((model.normalMatrix * vec4f(in.normal, 0.0)).xyz);
                out.uv = in.uv;
                return out;
            }
            fn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f {
                return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
            }
            fn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 {
                let a = roughness * roughness;
                let a2 = a * a;
                let NdotH = max(dot(N, H), 0.0);
                let NdotH2 = NdotH * NdotH;
                let denom = NdotH2 * (a2 - 1.0) + 1.0;
                return a2 / (PI * denom * denom);
            }
            fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
                let r = roughness + 1.0;
                let k = (r * r) / 8.0;
                return NdotV / (NdotV * (1.0 - k) + k);
            }
            fn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 {
                let NdotV = max(dot(N, V), 0.0);
                let NdotL = max(dot(N, L), 0.0);
                return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
            }
            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4f {
                let albedo = material.color.rgb;
                let metallic = material.params.x;
                let roughness = material.params.y;
                let emissiveIntensity = material.params.z;
                let N = normalize(in.normal);
                let V = normalize(camera.position - in.worldPos);
                let F0 = mix(vec3f(0.04), albedo, metallic);
                var Lo = lighting.ambient.rgb * albedo;
                for (var i = 0u; i < lighting.lightCount; i++) {
                    let light = lighting.lights[i];
                    var L: vec3f;
                    var attenuation: f32 = 1.0;
                    if (light.position.w == 0.0) {
                        L = normalize(-light.position.xyz);
                    } else {
                        let lightDir = light.position.xyz - in.worldPos;
                        let distance = length(lightDir);
                        L = normalize(lightDir);
                        attenuation = 1.0 / (distance * distance);
                    }
                    let H = normalize(V + L);
                    let radiance = light.color.rgb * light.color.a * attenuation;
                    let NDF = distributionGGX(N, H, roughness);
                    let G = geometrySmith(N, V, L, roughness);
                    let F = fresnelSchlick(max(dot(H, V), 0.0), F0);
                    let numerator = NDF * G * F;
                    let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
                    let specular = numerator / denominator;
                    let kS = F;
                    let kD = (1.0 - kS) * (1.0 - metallic);
                    let NdotL = max(dot(N, L), 0.0);
                    Lo += (kD * albedo / PI + specular) * radiance * NdotL;
                }
                Lo += material.emissive.rgb * emissiveIntensity;
                Lo = Lo / (Lo + vec3f(1.0));
                Lo = pow(Lo, vec3f(1.0 / 2.2));
                return vec4f(Lo, material.color.a);
            }
        `;
    }
}

export type UniformType = "f32" | "vec2f" | "vec3f" | "vec4f" | "mat4x4f";

export type UniformDefinition = {
    type: UniformType;
    value: number | number[];
};

export type CustomMaterialDescriptor = MaterialDescriptor & {
    vertexShader?: string;
    fragmentShader: string;
    uniforms?: Record<string, UniformDefinition>;
};

export class CustomMaterial extends Material {
    private _vertexShader: string;
    private _fragmentShader: string;
    private _uniforms: Record<string, UniformDefinition>;

    constructor(descriptor: CustomMaterialDescriptor) {
        super(descriptor);
        this._vertexShader = descriptor.vertexShader ?? this.defaultVertexShader();
        this._fragmentShader = descriptor.fragmentShader;
        this._uniforms = descriptor.uniforms ?? {};
    }

    setUniform(name: string, value: number | number[]): void {
        if (this._uniforms[name]) {
            this._uniforms[name].value = value;
            this._dirty = true;
        }
    }

    getUniform(name: string): number | number[] | undefined {
        return this._uniforms[name]?.value;
    }

    private getUniformSize(type: UniformType): number {
        switch (type) {
            case "f32": return 4;
            case "vec2f": return 8;
            case "vec3f": return 12;
            case "vec4f": return 16;
            case "mat4x4f": return 64;
        }
    }

    getUniformBufferSize(): number {
        let size = 0;
        for (const uniform of Object.values(this._uniforms)) size += this.getUniformSize(uniform.type);
        return Math.ceil(size / 16) * 16 || 16;
    }

    getUniformData(): Float32Array {
        const data: number[] = [];
        for (const uniform of Object.values(this._uniforms)) {
            if (typeof uniform.value === "number") data.push(uniform.value);
            else data.push(...uniform.value);
        }
        const floatCount = this.getUniformBufferSize() / 4;
        while (data.length < floatCount) data.push(0);
        return new Float32Array(data);
    }

    createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        return device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" }
                }
            ]
        });
    }

    private defaultVertexShader(): string {
        return /* wgsl */ `
            struct VertexInput {
                @location(0) position: vec3f,
                @location(1) normal: vec3f,
                @location(2) uv: vec2f
            };
            struct VertexOutput {
                @builtin(position) position: vec4f,
                @location(0) worldPos: vec3f,
                @location(1) normal: vec3f,
                @location(2) uv: vec2f
            };
            struct CameraUniforms {
                viewProjection: mat4x4f,
                position: vec3f
            };
            struct ModelUniforms {
                model: mat4x4f,
                normalMatrix: mat4x4f
            };
            @group(0) @binding(0) var<uniform> camera: CameraUniforms;
            @group(0) @binding(1) var<uniform> model: ModelUniforms;
            @vertex
            fn vs_main(in: VertexInput) -> VertexOutput {
                var out: VertexOutput;
                let worldPos = model.model * vec4f(in.position, 1.0);
                out.position = camera.viewProjection * worldPos;
                out.worldPos = worldPos.xyz;
                out.normal = normalize((model.normalMatrix * vec4f(in.normal, 0.0)).xyz);
                out.uv = in.uv;
                return out;
            }
        `;
    }

    getShaderCode(): string {
        let uniformStruct = "struct CustomUniforms {\n";
        for (const [name, def] of Object.entries(this._uniforms)) uniformStruct += `    ${name}: ${def.type},\n`;
        uniformStruct += "};\n\n@group(1) @binding(0) var<uniform> custom: CustomUniforms;\n\n";
        return this._vertexShader + "\n" + uniformStruct + this._fragmentShader;
    }
}
