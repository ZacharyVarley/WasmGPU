/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "assert";
import * as WasmGPU from "../dist/WasmGPU.js";

const view = (vp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], view = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], type = "perspective") => ({
    type,
    get viewProjectionMatrix() { return vp; },
    get viewMatrix() { return view; },
    setViewProjection(next) { vp = next; }
});

const mockDOM = () => {
    const original = {
        document: globalThis.document,
        window: globalThis.window,
        ResizeObserver: globalThis.ResizeObserver,
        getComputedStyle: globalThis.getComputedStyle,
        requestAnimationFrame: globalThis.requestAnimationFrame,
        cancelAnimationFrame: globalThis.cancelAnimationFrame
    };

    class MockElement {
        constructor(tagName) {
            this.tagName = tagName;
            this.style = {};
            this.children = [];
            this.parentElement = null;
            this.textContent = "";
            this.className = "";
            this.clientWidth = 0;
            this.clientHeight = 0;
            this.scrollLeft = 0;
            this.scrollTop = 0;
            this._listeners = new Map();
            this._rect = { left: 0, top: 0, width: 0, height: 0 };
        }
        appendChild(child) {
            child.parentElement = this;
            this.children.push(child);
            return child;
        }
        removeChild(child) {
            const index = this.children.indexOf(child);
            if (index >= 0) this.children.splice(index, 1);
            child.parentElement = null;
        }
        remove() {
            if (!this.parentElement) return;
            this.parentElement.removeChild(this);
        }
        addEventListener(type, handler) {
            this._listeners.set(type, handler);
        }
        removeEventListener(type, handler) {
            if (this._listeners.get(type) === handler) this._listeners.delete(type);
        }
        setRect(left, top, width, height) {
            this._rect = { left, top, width, height };
            this.clientWidth = width;
            this.clientHeight = height;
        }
        getBoundingClientRect() {
            const r = this._rect;
            return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.left + r.width, bottom: r.top + r.height };
        }
    }

    class MockCanvas2DContext {
        constructor() {
            this.lastImageData = null;
        }
        createImageData(width, height) {
            return { width, height, data: new Uint8ClampedArray(width * height * 4) };
        }
        putImageData(imageData) {
            this.lastImageData = imageData;
        }
    }

    class MockCanvas extends MockElement {
        constructor() {
            super("canvas");
            this.width = 1;
            this.height = 1;
            this._ctx2d = new MockCanvas2DContext();
        }
        getContext(kind) {
            if (kind === "2d") return this._ctx2d;
            return null;
        }
    }

    const body = new MockElement("body");
    body.style.position = "relative";
    body.setRect(0, 0, 1280, 720);
    const documentElement = new MockElement("html");
    documentElement.setRect(0, 0, 1280, 720);
    documentElement.appendChild(body);

    globalThis.document = {
        body,
        documentElement,
        createElement(tag) {
            if (tag === "canvas") return new MockCanvas();
            return new MockElement(tag);
        }
    };

    globalThis.window = {
        devicePixelRatio: 1,
        addEventListener() {},
        removeEventListener() {}
    };

    globalThis.ResizeObserver = class {
        constructor() {}
        observe() {}
        disconnect() {}
    };

    globalThis.getComputedStyle = (el) => ({ position: el?.style?.position ?? "static" });
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    const countNodes = (node) => {
        let total = 1;
        for (let i = 0; i < (node.children?.length ?? 0); i++) total += countNodes(node.children[i]);
        return total;
    };

    const countVisibleLines = (node) => {
        let total = 0;
        const stack = [node];
        while (stack.length > 0) {
            const cur = stack.pop();
            for (let i = 0; i < (cur.children?.length ?? 0); i++) stack.push(cur.children[i]);
            if (typeof cur?.style?.width === "string" && cur.style.width.endsWith("px") && cur.style.display !== "none") total++;
        }
        return total;
    };

    const countVisibleLabels = (node) => {
        let total = 0;
        const stack = [node];
        while (stack.length > 0) {
            const cur = stack.pop();
            for (let i = 0; i < (cur.children?.length ?? 0); i++) stack.push(cur.children[i]);
            if (typeof cur?.textContent === "string" && cur.textContent.length > 0 && cur.style?.display !== "none") total++;
        }
        return total;
    };

    const getFirstCanvas = (node) => {
        const stack = [node];
        while (stack.length > 0) {
            const cur = stack.pop();
            if (cur.tagName === "canvas") return cur;
            for (let i = 0; i < (cur.children?.length ?? 0); i++) stack.push(cur.children[i]);
        }
        return null;
    };

    return {
        createCanvas(width = 800, height = 600) {
            const canvas = globalThis.document.createElement("canvas");
            canvas.setRect(0, 0, width, height);
            canvas.width = width;
            canvas.height = height;
            return canvas;
        },
        countNodes,
        countVisibleLines,
        countVisibleLabels,
        getFirstCanvas,
        restore() {
            if (original.document === undefined) delete globalThis.document;
            else globalThis.document = original.document;
            if (original.window === undefined) delete globalThis.window;
            else globalThis.window = original.window;
            if (original.ResizeObserver === undefined) delete globalThis.ResizeObserver;
            else globalThis.ResizeObserver = original.ResizeObserver;
            if (original.getComputedStyle === undefined) delete globalThis.getComputedStyle;
            else globalThis.getComputedStyle = original.getComputedStyle;
            if (original.requestAnimationFrame === undefined) delete globalThis.requestAnimationFrame;
            else globalThis.requestAnimationFrame = original.requestAnimationFrame;
            if (original.cancelAnimationFrame === undefined) delete globalThis.cancelAnimationFrame;
            else globalThis.cancelAnimationFrame = original.cancelAnimationFrame;
        }
    };
};

await WasmGPU.initWebAssembly(new URL("../dist/", import.meta.url).toString());

const dom = mockDOM();
const { OverlaySystem, AxisTriadLayer, GridLayer, LegendLayer, PointCloud } = WasmGPU;
assert.ok(OverlaySystem, "Missing export: OverlaySystem");
assert.ok(AxisTriadLayer, "Missing export: AxisTriadLayer");
assert.ok(GridLayer, "Missing export: GridLayer");
assert.ok(LegendLayer, "Missing export: LegendLayer");

// OverlaySystem + pooled DOM nodes should stay bounded across updates.
{
    const canvas = dom.createCanvas(900, 600);
    const overlay = new OverlaySystem({ canvas, autoUpdate: false });
    const grid = new GridLayer({
        extentMode: "fixed",
        fixedUMin: -8,
        fixedUMax: 8,
        fixedVMin: -8,
        fixedVMax: 8,
        maxLines: 40,
        maxLabels: 12
    });
    overlay.addLayer(grid);
    overlay.setView(view(), null);
    assert.strictEqual(overlay.update({ force: true }), true, "Expected first overlay update to run");
    const nodesA = dom.countNodes(overlay.root);
    const linesA = dom.countVisibleLines(overlay.root);
    const labelsA = dom.countVisibleLabels(overlay.root);
    assert.ok(linesA <= 40, `Expected line budget <= 40, got ${linesA}`);
    assert.ok(labelsA <= 12, `Expected label budget <= 12, got ${labelsA}`);
    assert.strictEqual(overlay.update({ force: true }), true, "Forced update should run");
    const nodesB = dom.countNodes(overlay.root);
    assert.strictEqual(nodesA, nodesB, "Overlay DOM node count should remain stable");
    overlay.destroy();
}

// World-anchored triad should hide when clip-W goes behind camera.
{
    const canvas = dom.createCanvas(800, 600);
    const overlay = new OverlaySystem({ canvas, autoUpdate: false });
    const triad = new AxisTriadLayer({ anchor: { kind: "world", position: [0, 0, 0] }, lengthWorld: 1 });
    const camera = view([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], "perspective");
    overlay.addLayer(triad);
    overlay.setView(camera, null);
    overlay.update({ force: true });
    const visibleFront = dom.countVisibleLines(overlay.root);
    assert.ok(visibleFront >= 3, "Expected visible triad lines when in front");
    camera.setViewProjection([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1]);
    overlay.invalidate("camera");
    overlay.update({ force: true });
    const visibleBack = dom.countVisibleLines(overlay.root);
    assert.ok(visibleBack < visibleFront, "Expected fewer visible lines when anchor is behind");
    overlay.destroy();
}

// Legend should render a gradient canvas from a valid source.
{
    const canvas = dom.createCanvas(700, 420);
    const overlay = new OverlaySystem({ canvas, autoUpdate: false });
    const source = new PointCloud({
        data: new Float32Array([
            0, 0, 0, 0.1,
            1, 0, 0, 0.5,
            0, 1, 0, 0.9
        ]),
        keepCPUData: true,
        scaleTransform: { componentCount: 4, componentIndex: 3, stride: 4, offset: 0 }
    });
    const legend = new LegendLayer({
        id: "legend-test",
        title: "Legend",
        source,
        widthPx: 20,
        heightPx: 120,
        tickCount: 5
    });
    overlay.addLayer(legend);
    overlay.setView(view(), null);
    overlay.update({ force: true });
    const legendCanvas = dom.getFirstCanvas(overlay.root);
    assert.ok(legendCanvas, "Legend should create a canvas");
    const ctx = legendCanvas.getContext("2d");
    assert.ok(ctx && ctx.lastImageData, "Legend should render gradient image data");
    source.setScaleTransform({ componentCount: 4, componentIndex: 3, stride: 4, offset: 0, mode: "log", clampMode: "none", domainMin: 0.01, domainMax: 1.0, logBase: 10 });
    overlay.invalidate("scale");
    assert.strictEqual(overlay.update({ force: true }), true, "Legend update should run after source scale change");
    overlay.destroy();
}

dom.restore();
