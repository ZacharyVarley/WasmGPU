/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { DOMNodePool } from "./pool";
import { projectWorldToScreen } from "./projection";
import type { GridLayerDescriptor, GridPlane, OverlayLayer, OverlayUpdateContext } from "./types";

type GridAxes = {
    u: [number, number, number];
    v: [number, number, number];
};

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

const formatTick = (value: number): string => {
    if (!Number.isFinite(value)) return "nan";
    const abs = Math.abs(value);
    if (abs >= 1e4 || (abs > 0 && abs < 1e-3)) return value.toExponential(2);
    const rounded = Math.round(value * 1000) / 1000;
    return `${rounded}`;
};

const niceStep = (target: number): number => {
    const x = Math.max(1e-9, Math.abs(target));
    const exponent = Math.floor(Math.log10(x));
    const base = Math.pow(10, exponent);
    const scaled = x / base;
    const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
    return nice * base;
};

const axesForPlane = (plane: GridPlane): GridAxes => {
    if (plane === "xy") return { u: [1, 0, 0], v: [0, 1, 0] };
    if (plane === "xz") return { u: [1, 0, 0], v: [0, 0, 1] };
    return { u: [0, 1, 0], v: [0, 0, 1] };
};

const uvFromBounds = (plane: GridPlane, bounds: { boxMin: [number, number, number]; boxMax: [number, number, number] }): { uMin: number; uMax: number; vMin: number; vMax: number; } => {
    if (plane === "xy") return { uMin: bounds.boxMin[0], uMax: bounds.boxMax[0], vMin: bounds.boxMin[1], vMax: bounds.boxMax[1] };
    if (plane === "xz") return { uMin: bounds.boxMin[0], uMax: bounds.boxMax[0], vMin: bounds.boxMin[2], vMax: bounds.boxMax[2] };
    return { uMin: bounds.boxMin[1], uMax: bounds.boxMax[1], vMin: bounds.boxMin[2], vMax: bounds.boxMax[2] };
};

const worldFromUV = (plane: GridPlane, origin: [number, number, number], u: number, v: number): [number, number, number] => {
    if (plane === "xy") return [origin[0] + u, origin[1] + v, origin[2]];
    if (plane === "xz") return [origin[0] + u, origin[1], origin[2] + v];
    return [origin[0], origin[1] + u, origin[2] + v];
};

const drawLine = (node: HTMLDivElement, x0: number, y0: number, x1: number, y1: number, color: string, widthPx: number): void => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (!Number.isFinite(len) || len <= 1e-5) {
        node.style.display = "none";
        return;
    }
    node.style.display = "";
    node.style.left = `${x0}px`;
    node.style.top = `${y0}px`;
    node.style.width = `${len}px`;
    node.style.height = `${Math.max(1, widthPx)}px`;
    node.style.background = color;
    node.style.transform = `translateY(${-0.5 * Math.max(1, widthPx)}px) rotate(${Math.atan2(dy, dx)}rad)`;
};

export class GridLayer implements OverlayLayer {
    readonly id: string;
    private readonly plane: GridPlane;
    private readonly origin: [number, number, number];
    private readonly extentMode: "scene-fit" | "fixed";
    private readonly fixedUMin: number;
    private readonly fixedUMax: number;
    private readonly fixedVMin: number;
    private readonly fixedVMax: number;
    private readonly targetMinorSpacingPx: number;
    private readonly majorStepFactor: number;
    private readonly minLabelSpacingPx: number;
    private readonly maxLines: number;
    private readonly maxLabels: number;
    private readonly minorColor: string;
    private readonly majorColor: string;
    private readonly axisColor: string;
    private readonly labelColor: string;
    private readonly lineWidthMinorPx: number;
    private readonly lineWidthMajorPx: number;
    private readonly font: string;
    private container: HTMLDivElement | null = null;
    private linePool: DOMNodePool<HTMLDivElement> | null = null;
    private labelPool: DOMNodePool<HTMLDivElement> | null = null;

    constructor(desc: GridLayerDescriptor = {}) {
        this.id = desc.id ?? "overlay-grid";
        this.plane = desc.plane ?? "xy";
        this.origin = desc.origin ?? [0, 0, 0];
        this.extentMode = desc.extentMode ?? "scene-fit";
        this.fixedUMin = desc.fixedUMin ?? -10;
        this.fixedUMax = desc.fixedUMax ?? 10;
        this.fixedVMin = desc.fixedVMin ?? -10;
        this.fixedVMax = desc.fixedVMax ?? 10;
        this.targetMinorSpacingPx = Math.max(6, desc.targetMinorSpacingPx ?? 30);
        this.majorStepFactor = Math.max(2, Math.round(desc.majorStepFactor ?? 5));
        this.minLabelSpacingPx = Math.max(8, desc.minLabelSpacingPx ?? 58);
        this.maxLines = Math.max(4, Math.round(desc.maxLines ?? 160));
        this.maxLabels = Math.max(2, Math.round(desc.maxLabels ?? 60));
        this.minorColor = desc.minorColor ?? "rgba(180, 210, 255, 0.17)";
        this.majorColor = desc.majorColor ?? "rgba(180, 210, 255, 0.36)";
        this.axisColor = desc.axisColor ?? "rgba(220, 235, 255, 0.8)";
        this.labelColor = desc.labelColor ?? "rgba(220, 235, 255, 0.9)";
        this.lineWidthMinorPx = Math.max(1, desc.lineWidthMinorPx ?? 1);
        this.lineWidthMajorPx = Math.max(1, desc.lineWidthMajorPx ?? 2);
        this.font = desc.font ?? "11px monospace";
    }

    attach(root: HTMLDivElement): void {
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.inset = "0";
        container.style.pointerEvents = "none";
        root.appendChild(container);
        this.container = container;
        this.linePool = new DOMNodePool(container, () => {
            const node = document.createElement("div");
            node.style.position = "absolute";
            node.style.transformOrigin = "0 50%";
            return node;
        }, this.maxLines);
        this.labelPool = new DOMNodePool(container, () => {
            const node = document.createElement("div");
            node.style.position = "absolute";
            node.style.color = this.labelColor;
            node.style.font = this.font;
            node.style.whiteSpace = "nowrap";
            return node;
        }, this.maxLabels);
    }

    detach(): void {
        this.linePool?.clear(true);
        this.labelPool?.clear(true);
        this.linePool = null;
        this.labelPool = null;
        this.container?.remove();
        this.container = null;
    }

    update(ctx: OverlayUpdateContext): void {
        if (!this.container || !this.linePool || !this.labelPool) return;
        const { uMin, uMax, vMin, vMax } = this.resolveExtent(ctx);
        const spanU = Math.max(1e-6, uMax - uMin);
        const spanV = Math.max(1e-6, vMax - vMin);
        const pxPerUnit = this.estimatePixelsPerUnit(ctx) || 1;
        let minorStep = niceStep(this.targetMinorSpacingPx / Math.max(1e-6, pxPerUnit));
        const approxCount = Math.ceil(spanU / minorStep) + Math.ceil(spanV / minorStep);
        if (approxCount > this.maxLines) {
            const factor = Math.ceil(approxCount / this.maxLines);
            minorStep *= factor;
        }
        const majorStep = minorStep * this.majorStepFactor;
        const majorSpacingPx = majorStep * pxPerUnit;
        const labelStride = Math.max(1, Math.ceil(this.minLabelSpacingPx / Math.max(1e-6, majorSpacingPx)));
        const eps = minorStep * 1e-6;
        this.linePool.beginFrame();
        this.labelPool.beginFrame();
        let uMajorIndex = 0;
        for (let u = Math.floor((uMin + eps) / minorStep) * minorStep; u <= uMax + eps; u += minorStep) {
            const p0 = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, worldFromUV(this.plane, this.origin, u, vMin));
            const p1 = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, worldFromUV(this.plane, this.origin, u, vMax));
            if (!p0 || !p1 || (!p0.inFront && !p1.inFront)) continue;
            const major = Math.abs((u / majorStep) - Math.round(u / majorStep)) < 1e-4;
            const axis = Math.abs(u) < eps;
            const line = this.linePool.acquire();
            drawLine(line, p0.x, p0.y, p1.x, p1.y, axis ? this.axisColor : (major ? this.majorColor : this.minorColor), major || axis ? this.lineWidthMajorPx : this.lineWidthMinorPx);
            if (major && (uMajorIndex % labelStride === 0)) {
                const label = this.labelPool.acquire();
                label.textContent = formatTick(u);
                label.style.left = `${p0.x + 4}px`;
                label.style.top = `${p0.y + 2}px`;
            }
            if (major) uMajorIndex++;
        }
        let vMajorIndex = 0;
        for (let v = Math.floor((vMin + eps) / minorStep) * minorStep; v <= vMax + eps; v += minorStep) {
            const p0 = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, worldFromUV(this.plane, this.origin, uMin, v));
            const p1 = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, worldFromUV(this.plane, this.origin, uMax, v));
            if (!p0 || !p1 || (!p0.inFront && !p1.inFront)) continue;
            const major = Math.abs((v / majorStep) - Math.round(v / majorStep)) < 1e-4;
            const axis = Math.abs(v) < eps;
            const line = this.linePool.acquire();
            drawLine(line, p0.x, p0.y, p1.x, p1.y, axis ? this.axisColor : (major ? this.majorColor : this.minorColor), major || axis ? this.lineWidthMajorPx : this.lineWidthMinorPx);
            if (major && (vMajorIndex % labelStride === 0)) {
                const label = this.labelPool.acquire();
                label.textContent = formatTick(v);
                label.style.left = `${p0.x + 4}px`;
                label.style.top = `${p0.y + 2}px`;
            }
            if (major) vMajorIndex++;
        }
        this.linePool.endFrame();
        this.labelPool.endFrame();
    }

    private resolveExtent(ctx: OverlayUpdateContext): { uMin: number; uMax: number; vMin: number; vMax: number; } {
        if (this.extentMode === "fixed") {
            return {
                uMin: Math.min(this.fixedUMin, this.fixedUMax), uMax: Math.max(this.fixedUMin, this.fixedUMax),
                vMin: Math.min(this.fixedVMin, this.fixedVMax), vMax: Math.max(this.fixedVMin, this.fixedVMax)
            };
        }
        const scene = ctx.scene;
        if (!scene) return { uMin: -10, uMax: 10, vMin: -10, vMax: 10 };
        const bounds = scene.getBounds();
        if (bounds.empty) return { uMin: -10, uMax: 10, vMin: -10, vMax: 10 };
        const uv = uvFromBounds(this.plane, bounds);
        const marginU = Math.max(1e-3, (uv.uMax - uv.uMin) * 0.1);
        const marginV = Math.max(1e-3, (uv.vMax - uv.vMin) * 0.1);
        return {
            uMin: uv.uMin - marginU, uMax: uv.uMax + marginU,
            vMin: uv.vMin - marginV, vMax: uv.vMax + marginV
        };
    }

    private estimatePixelsPerUnit(ctx: OverlayUpdateContext): number {
        const axes = axesForPlane(this.plane);
        const p0 = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, this.origin);
        const p1 = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, [this.origin[0] + axes.u[0], this.origin[1] + axes.u[1], this.origin[2] + axes.u[2]]);
        if (!p0 || !p1) return 1;
        const d = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        return clamp(d, 1e-6, 1e9);
    }
}
