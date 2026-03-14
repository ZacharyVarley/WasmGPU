/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export type DecodedDataUri = {
    mimeType: string | null;
    data: ArrayBuffer;
};

export const isDataUri = (uri: string): boolean => {
    return uri.startsWith("data:");
};

export const decodeDataUri = (uri: string): DecodedDataUri => {
    const m = uri.match(/^data:([^,]*),([\s\S]*)$/);
    if (!m) throw new Error(`Invalid data URI: ${uri.slice(0, 64)}...`);
    const meta = m[1] ?? "";
    const payload = m[2] ?? "";
    const parts = meta.split(";").filter((p) => p.length > 0);
    let mimeType: string | null = null;
    let isBase64 = false;
    for (const p of parts) {
        if (p === "base64") isBase64 = true;
        else mimeType = p;
    }
    if (isBase64) {
        const binStr = atob(payload);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i) & 0xff;
        return { mimeType, data: bytes.buffer };
    }
    const decoded = decodeURIComponent(payload);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i) & 0xff;
    return { mimeType, data: bytes.buffer };
};

export const dirnameUrl = (url: string): string => {
    const idx = url.lastIndexOf("/");
    if (idx < 0) return "";
    return url.slice(0, idx + 1);
};

export const resolveUri = (baseUrl: string, uri: string): string => {
    if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("blob:")) return uri;
    if (uri.startsWith("/")) return uri;
    if (!baseUrl) return uri;
    return baseUrl + uri;
};
