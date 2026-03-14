/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const assert: (cond: unknown, msg: string) => asserts cond = (cond, msg) => {
    if (!cond) throw new Error(msg);
}

export const alignTo = (n: number, alignment: number): number => {
    return Math.ceil(n / alignment) * alignment;
}

export const createBuffer = (device: GPUDevice, data: ArrayBufferView, usage: GPUBufferUsageFlags): GPUBuffer => {
    const buffer = device.createBuffer({ size: alignTo(data.byteLength, 4), usage, mappedAtCreation: true });
    new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    buffer.unmap();
    return buffer;
}

export const createDepthTexture = (device: GPUDevice, width: number, height: number, sampleCount: number = 1): GPUTexture => {
    return device.createTexture({
        size: { width, height, depthOrArrayLayers: 1 },
        format: "depth24plus",
        sampleCount,
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
}

