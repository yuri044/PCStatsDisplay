// Per-process .exe icon extraction, exposed as a lazily-invoked, cached
// Tauri command — NOT bundled into get_process_list's 3s-polled payload,
// since GDI icon extraction is too expensive to redo for 200+ processes
// every poll. The frontend calls this once per unique exe_path and caches
// the result client-side too (see src/lib/processIconCache.ts).

use std::collections::HashMap;
use std::sync::Mutex;

use tauri::{command, State};

/// Shared cache: exe_path -> PNG data URI (None if extraction failed/unavailable).
/// Keyed by exe_path since many processes (svchost.exe, etc.) share one exe.
pub type IconCache = Mutex<HashMap<String, Option<String>>>;

pub fn new_cache() -> IconCache {
    Mutex::new(HashMap::new())
}

/// Return the process's icon as a `data:image/png;base64,...` string, or
/// None if it has no accessible exe_path or extraction failed.
/// Invoked from React via: invoke<string | null>('get_process_icon', { exePath })
#[command]
pub fn get_process_icon(exe_path: String, cache: State<'_, IconCache>) -> Option<String> {
    if exe_path.is_empty() {
        return None;
    }

    let mut cache = cache.lock().expect("icon cache lock poisoned");
    if let Some(cached) = cache.get(&exe_path) {
        return cached.clone();
    }

    let icon = extract_icon_data_uri(&exe_path);
    cache.insert(exe_path, icon.clone());
    icon
}

#[cfg(windows)]
fn extract_icon_data_uri(exe_path: &str) -> Option<String> {
    let (rgba, width, height) = win::extract_exe_icon_rgba(exe_path)?;

    let img = image::RgbaImage::from_raw(width, height, rgba)?;
    let mut png_bytes: Vec<u8> = Vec::new();
    image::DynamicImage::ImageRgba8(img)
        .write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png)
        .ok()?;

    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&png_bytes);
    Some(format!("data:image/png;base64,{}", b64))
}

#[cfg(not(windows))]
fn extract_icon_data_uri(_exe_path: &str) -> Option<String> {
    None
}

#[cfg(windows)]
mod win {
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Gdi::{
        CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits, ReleaseDC, BITMAPINFO,
        BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HBITMAP, HGDIOBJ,
    };
    use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;
    use windows::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
    use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, HICON, ICONINFO};

    /// Extract the large icon (typically 32x32) associated with an .exe.
    /// Returns tightly-packed, row-major, top-down RGBA bytes.
    ///
    /// Per SHGetFileInfoW's own docs this can invoke shell extensions and
    /// block, so callers should not run it on a UI thread — this codebase
    /// dispatches Tauri commands off the WebView thread already, matching
    /// the existing synchronous get_process_list command.
    pub fn extract_exe_icon_rgba(exe_path: &str) -> Option<(Vec<u8>, u32, u32)> {
        let wide: Vec<u16> = exe_path.encode_utf16().chain(std::iter::once(0)).collect();

        let mut shfi = SHFILEINFOW::default();
        let flags = SHGFI_ICON | SHGFI_LARGEICON;

        // SAFETY: `wide` is NUL-terminated and outlives this call.
        let result = unsafe {
            SHGetFileInfoW(
                PCWSTR(wide.as_ptr()),
                FILE_FLAGS_AND_ATTRIBUTES(0),
                Some(&mut shfi),
                std::mem::size_of::<SHFILEINFOW>() as u32,
                flags,
            )
        };
        if result == 0 || shfi.hIcon.is_invalid() {
            return None;
        }

        let hicon = shfi.hIcon;
        let out = hicon_to_rgba(hicon);
        // Always free the icon handle SHGetFileInfoW handed us.
        unsafe {
            let _ = DestroyIcon(hicon);
        }
        out
    }

    /// RAII guard so a mid-conversion failure (e.g. GetDIBits erroring) can't
    /// leak the HBITMAPs GetIconInfo allocates on every single call.
    struct BitmapGuard(HBITMAP);
    impl Drop for BitmapGuard {
        fn drop(&mut self) {
            if !self.0.is_invalid() {
                unsafe {
                    let _ = DeleteObject(HGDIOBJ(self.0 .0));
                }
            }
        }
    }

    fn hicon_to_rgba(hicon: HICON) -> Option<(Vec<u8>, u32, u32)> {
        let mut info = ICONINFO::default();
        unsafe { GetIconInfo(hicon, &mut info) }.ok()?;

        let color_guard = BitmapGuard(info.hbmColor);
        let _mask_guard = BitmapGuard(info.hbmMask);

        if info.hbmColor.is_invalid() {
            // Monochrome (1bpp) icon with no color plane — rare for modern exe icons.
            return None;
        }

        let screen_dc = unsafe { GetDC(HWND(std::ptr::null_mut())) };
        if screen_dc.is_invalid() {
            return None;
        }
        let mem_dc = unsafe { CreateCompatibleDC(screen_dc) };

        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                ..Default::default()
            },
            ..Default::default()
        };

        // First call (lpvBits = None) just fills in width/height/bpp.
        let probe = unsafe { GetDIBits(mem_dc, color_guard.0, 0, 0, None, &mut bmi, DIB_RGB_COLORS) };
        if probe == 0 {
            unsafe {
                let _ = DeleteDC(mem_dc);
                let _ = ReleaseDC(HWND(std::ptr::null_mut()), screen_dc);
            }
            return None;
        }

        let width = bmi.bmiHeader.biWidth;
        let height = bmi.bmiHeader.biHeight.abs();

        // Force a top-down (negative height), 32bpp BGRA request.
        bmi.bmiHeader.biHeight = -height;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB.0 as u32;
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biSizeImage = 0;

        let row_bytes = width as usize * 4;
        let mut buf = vec![0u8; row_bytes * height as usize];

        let copied = unsafe {
            GetDIBits(
                mem_dc,
                color_guard.0,
                0,
                height as u32,
                Some(buf.as_mut_ptr() as *mut _),
                &mut bmi,
                DIB_RGB_COLORS,
            )
        };

        unsafe {
            let _ = DeleteDC(mem_dc);
            let _ = ReleaseDC(HWND(std::ptr::null_mut()), screen_dc);
        }

        if copied == 0 {
            return None;
        }

        // Windows returns BGRA. Icons whose original color depth was below
        // 32bpp report alpha = 0 for every pixel here (GetDIBits doesn't
        // synthesize a real alpha channel in that case) — treat that as
        // fully opaque rather than fully transparent.
        let has_real_alpha = buf.chunks_exact(4).any(|px| px[3] != 0);
        for px in buf.chunks_exact_mut(4) {
            let (b, g, r, a) = (px[0], px[1], px[2], px[3]);
            px[0] = r;
            px[1] = g;
            px[2] = b;
            px[3] = if has_real_alpha { a } else { 255 };
        }

        Some((buf, width as u32, height as u32))
    }
}
