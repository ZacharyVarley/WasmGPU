#[inline(always)]
pub(crate) unsafe fn f32_slice(ptr: u32, len: usize) -> &'static [f32] {
    core::slice::from_raw_parts(ptr as *const f32, len)
}

#[inline(always)]
pub(crate) unsafe fn f32_slice_mut(ptr: u32, len: usize) -> &'static mut [f32] {
    core::slice::from_raw_parts_mut(ptr as *mut f32, len)
}

#[inline(always)]
pub(crate) unsafe fn u32_slice(ptr: u32, len: usize) -> &'static [u32] {
    core::slice::from_raw_parts(ptr as *const u32, len)
}

#[inline(always)]
pub(crate) unsafe fn u32_slice_mut(ptr: u32, len: usize) -> &'static mut [u32] {
    core::slice::from_raw_parts_mut(ptr as *mut u32, len)
}

#[inline(always)]
pub(crate) unsafe fn i32_slice(ptr: u32, len: usize) -> &'static [i32] {
    core::slice::from_raw_parts(ptr as *const i32, len)
}

#[inline(always)]
pub(crate) unsafe fn i32_slice_mut(ptr: u32, len: usize) -> &'static mut [i32] {
    core::slice::from_raw_parts_mut(ptr as *mut i32, len)
}

#[inline(always)]
pub(crate) fn align_up(x: usize, align: usize) -> usize {
    (x + (align - 1)) & !(align - 1)
}
