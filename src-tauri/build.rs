use std::panic;

fn main() {
    #[cfg(windows)]
    {
        extern "system" {
            fn SetConsoleOutputCP(wCodePageID: u32) -> i32;
            fn SetConsoleCP(wCodePageID: u32) -> i32;
        }
        unsafe {
            SetConsoleOutputCP(65001);
            SetConsoleCP(65001);
        }
    }

    let result = panic::catch_unwind(|| {
        tauri_build::build()
    });

    if result.is_err() {
        println!("cargo:warning=tauri_build::build() panicked, likely due to non-English Windows locale. Continuing build...");
    }
}
