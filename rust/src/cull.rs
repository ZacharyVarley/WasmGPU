/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{f32_slice, f32_slice_mut, u32_slice, u32_slice_mut};

#[no_mangle]
pub extern "C" fn cull_write_planes_from_view_projection(out_planes_ptr: u32, view_proj_ptr: u32) -> u32 {
    unsafe {
        if out_planes_ptr == 0 || view_proj_ptr == 0 {
            return 0;
        }

        let m = f32_slice(view_proj_ptr, 16);
        let out = f32_slice_mut(out_planes_ptr, 24);

        let r0x = m[0];
        let r0y = m[4];
        let r0z = m[8];
        let r0w = m[12];
        let r1x = m[1];
        let r1y = m[5];
        let r1z = m[9];
        let r1w = m[13];
        let r2x = m[2];
        let r2y = m[6];
        let r2z = m[10];
        let r2w = m[14];
        let r3x = m[3];
        let r3y = m[7];
        let r3z = m[11];
        let r3w = m[15];

        out[0] = r3x + r0x;
        out[1] = r3y + r0y;
        out[2] = r3z + r0z;
        out[3] = r3w + r0w;

        out[4] = r3x - r0x;
        out[5] = r3y - r0y;
        out[6] = r3z - r0z;
        out[7] = r3w - r0w;

        out[8] = r3x + r1x;
        out[9] = r3y + r1y;
        out[10] = r3z + r1z;
        out[11] = r3w + r1w;

        out[12] = r3x - r1x;
        out[13] = r3y - r1y;
        out[14] = r3z - r1z;
        out[15] = r3w - r1w;

        out[16] = r2x;
        out[17] = r2y;
        out[18] = r2z;
        out[19] = r2w;

        out[20] = r3x - r2x;
        out[21] = r3y - r2y;
        out[22] = r3z - r2z;
        out[23] = r3w - r2w;

        for p in 0..6 {
            let i = p * 4;
            let nx = out[i + 0];
            let ny = out[i + 1];
            let nz = out[i + 2];
            let len2 = nx * nx + ny * ny + nz * nz;
            if len2 > 0.0 {
                let inv = 1.0 / len2.sqrt();
                out[i + 0] = nx * inv;
                out[i + 1] = ny * inv;
                out[i + 2] = nz * inv;
                out[i + 3] *= inv;
            }
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn cull_prepare_world_spheres_from_ptrs(out_centers_ptr: u32, out_radii_ptr: u32, world_ptrs_u32_ptr: u32, local_centers_ptr: u32, local_radii_ptr: u32, count: u32) -> u32 {
    unsafe {
        if out_centers_ptr == 0
            || out_radii_ptr == 0
            || world_ptrs_u32_ptr == 0
            || local_centers_ptr == 0
            || local_radii_ptr == 0
        {
            return 0;
        }

        let n = count as usize;
        if n == 0 {
            return 0;
        }

        let out_centers = f32_slice_mut(out_centers_ptr, n * 3);
        let out_radii = f32_slice_mut(out_radii_ptr, n);
        let world_ptrs = u32_slice(world_ptrs_u32_ptr, n);
        let local_centers = f32_slice(local_centers_ptr, n * 3);
        let local_radii = f32_slice(local_radii_ptr, n);

        for i in 0..n {
            let wptr = world_ptrs[i];
            if wptr == 0 {
                out_centers[i * 3 + 0] = 0.0;
                out_centers[i * 3 + 1] = 0.0;
                out_centers[i * 3 + 2] = 0.0;
                out_radii[i] = -1.0;
                continue;
            }

            let w = f32_slice(wptr, 16);
            let lc0 = local_centers[i * 3 + 0];
            let lc1 = local_centers[i * 3 + 1];
            let lc2 = local_centers[i * 3 + 2];

            let cx = w[0] * lc0 + w[4] * lc1 + w[8] * lc2 + w[12];
            let cy = w[1] * lc0 + w[5] * lc1 + w[9] * lc2 + w[13];
            let cz = w[2] * lc0 + w[6] * lc1 + w[10] * lc2 + w[14];

            out_centers[i * 3 + 0] = cx;
            out_centers[i * 3 + 1] = cy;
            out_centers[i * 3 + 2] = cz;

            let sx = (w[0] * w[0] + w[1] * w[1] + w[2] * w[2]).sqrt();
            let sy = (w[4] * w[4] + w[5] * w[5] + w[6] * w[6]).sqrt();
            let sz = (w[8] * w[8] + w[9] * w[9] + w[10] * w[10]).sqrt();
            let smax = sx.max(sy).max(sz);
            out_radii[i] = local_radii[i] * smax;
        }
    }
    0
}

#[no_mangle]
pub extern "C" fn cull_spheres_frustum(out_indices_ptr: u32, centers_ptr: u32, radii_ptr: u32, count: u32, frustum_ptr: u32) -> u32 {
    unsafe {
        if out_indices_ptr == 0 || centers_ptr == 0 || radii_ptr == 0 || frustum_ptr == 0 {
            return 0;
        }

        let n = count as usize;
        if n == 0 {
            return 0;
        }

        let centers = f32_slice(centers_ptr, n * 3);
        let radii = f32_slice(radii_ptr, n);
        let fr = f32_slice(frustum_ptr, 24);
        let out = u32_slice_mut(out_indices_ptr, n);

        let mut planes = [0.0f32; 24];
        planes.copy_from_slice(fr);
        for p in 0..6 {
            let i = p * 4;
            let nx = planes[i + 0];
            let ny = planes[i + 1];
            let nz = planes[i + 2];
            let d = planes[i + 3];
            let len2 = nx * nx + ny * ny + nz * nz;
            if len2 > 0.0 {
                let inv = 1.0 / len2.sqrt();
                planes[i + 0] = nx * inv;
                planes[i + 1] = ny * inv;
                planes[i + 2] = nz * inv;
                planes[i + 3] = d * inv;
            }
        }

        let mut out_count: usize = 0;
        for i in 0..n {
            let r = radii[i];
            if r < 0.0 {
                continue;
            }

            let cx = centers[i * 3 + 0];
            let cy = centers[i * 3 + 1];
            let cz = centers[i * 3 + 2];

            let mut inside = true;
            for p in 0..6 {
                let j = p * 4;
                let dist =
                    planes[j + 0] * cx + planes[j + 1] * cy + planes[j + 2] * cz + planes[j + 3];
                if dist < -r {
                    inside = false;
                    break;
                }
            }

            if inside {
                out[out_count] = i as u32;
                out_count += 1;
            }
        }

        out_count as u32
    }
}
