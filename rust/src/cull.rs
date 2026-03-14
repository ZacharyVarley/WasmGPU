/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

use crate::shared::{f32_slice, u32_slice_mut};

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
