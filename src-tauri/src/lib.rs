
use aes::cipher::{KeyInit, BlockDecrypt};

use base64::{Engine, engine::general_purpose};
use reqwest::header::{HeaderMap, HeaderValue, REFERER, ACCEPT, ACCEPT_LANGUAGE, ACCEPT_ENCODING};
use std::sync::{Arc, Mutex, OnceLock};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;
use tokio::sync::oneshot;

fn extract_origin(url: &str) -> Option<String> {
    let scheme_end = url.find("://")?;
    let host_start = scheme_end + 3;
    let rest = &url[host_start..];
    let host_end = rest.find('/').unwrap_or(rest.len());
    Some(format!("{}://{}/", &url[..scheme_end], &rest[..host_end]))
}

fn http_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")
            .pool_max_idle_per_host(6)
            .tcp_keepalive(Some(std::time::Duration::from_secs(30)))
            .timeout(std::time::Duration::from_secs(15))
            .connect_timeout(std::time::Duration::from_secs(5))
            .build()
            .expect("failed to build HTTP client")
    })
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to AniVault!", name)
}

#[tauri::command]
async fn fetch_url(url: String, referer: Option<String>) -> Result<String, String> {
    if url.is_empty() || (!url.starts_with("http://") && !url.starts_with("https://")) {
        let hint: String = url.chars().take(80).collect();
        return Err(format!("无效URL: {}", if url.is_empty() { "(空)" } else { &hint }));
    }

    let mut headers = HeaderMap::new();
    headers.insert(ACCEPT, HeaderValue::from_static("*/*"));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("zh-CN,zh;q=0.9,en;q=0.8"));
    headers.insert(ACCEPT_ENCODING, HeaderValue::from_static("gzip, deflate, br"));
    let referer_val = referer
        .filter(|r| !r.is_empty())
        .or_else(|| extract_origin(&url));
    if let Some(ref r) = referer_val {
        if let Ok(val) = HeaderValue::from_str(r) {
            headers.insert(REFERER, val);
        }
    }

    let response = http_client()
        .get(&url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("请求失败[{}]: {}", &url[..url.len().min(60)], e))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("HTTP {}", status));
    }

    response
        .text()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))
}

async fn try_fetch_image(url: &str, referer: &str) -> Result<(String, Vec<u8>), String> {
    let mut headers = HeaderMap::new();
    headers.insert(ACCEPT, HeaderValue::from_static("image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("zh-CN,zh;q=0.9,en;q=0.8"));
    if !referer.is_empty() {
        if let Ok(val) = HeaderValue::from_str(referer) {
            headers.insert(REFERER, val);
        }
    }
    let resp = http_client()
        .get(url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }

    let content_type = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("读取图片失败: {}", e))?
        .to_vec();

    Ok((content_type, bytes))
}

fn image_to_data_url(content_type: &str, bytes: &[u8]) -> String {
    let b64 = general_purpose::STANDARD.encode(bytes);
    format!("data:{};base64,{}", content_type, b64)
}

#[tauri::command]
async fn fetch_image(url: String) -> Result<String, String> {
    let origin = extract_origin(&url).unwrap_or_default();
    let strategies = [
        origin,
        "https://www.google.com/".into(),
        "https://www.bing.com/".into(),
        "".into(),
    ];

    let (tx, rx) = oneshot::channel::<Result<(String, Vec<u8>), String>>();
    let tx = Arc::new(Mutex::new(Some(tx)));

    for referer in strategies {
        let url = url.clone();
        let tx = tx.clone();
        tokio::spawn(async move {
            let result = try_fetch_image(&url, &referer).await;
            if result.is_ok() {
                if let Ok(mut guard) = tx.lock() {
                    let _ = guard.take().map(|ch| ch.send(result));
                }
            }
        });
    }

    match tokio::time::timeout(std::time::Duration::from_secs(10), rx).await {
        Ok(Ok(Ok(result))) => {
            let (ct, bytes) = result;
            Ok(image_to_data_url(&ct, &bytes))
        }
        Ok(Ok(Err(e))) => Err(e),
        Ok(Err(_)) => Err("所有图片请求策略均失败".into()),
        Err(_) => Err("图片请求超时".into()),
    }
}

#[tauri::command]
async fn fetch_bytes(url: String, referer: Option<String>) -> Result<String, String> {
    let mut headers = HeaderMap::new();
    headers.insert(ACCEPT, HeaderValue::from_static("image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("zh-CN,zh;q=0.9,en;q=0.8"));
    headers.insert(ACCEPT_ENCODING, HeaderValue::from_static("gzip, deflate, br"));
    let referer_val = referer
        .filter(|r| !r.is_empty())
        .or_else(|| extract_origin(&url));
    if let Some(ref r) = referer_val {
        if let Ok(val) = HeaderValue::from_str(r) {
            headers.insert(REFERER, val);
        }
    }
    let resp = http_client()
        .get(&url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("读取失败: {}", e))?;

    Ok(general_purpose::STANDARD.encode(&bytes))
}

fn is_all_hex(s: &str) -> bool {
    !s.is_empty() && s.len().is_multiple_of(2) && s.bytes().all(|b| b.is_ascii_hexdigit())
}

static ENGINE_RUNNING: AtomicBool = AtomicBool::new(false);

fn normalize_path(p: &std::path::Path) -> std::path::PathBuf {
    let s = p.to_string_lossy();
    if let Some(rest) = s.strip_prefix("\\\\?\\") {
        std::path::PathBuf::from(rest)
    } else {
        p.to_path_buf()
    }
}

fn candidate_paths(app: &tauri::AppHandle) -> Vec<std::path::PathBuf> {
    let mut paths = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        let rd = normalize_path(&resource_dir);
        paths.push(rd.join("csp-engine").join("server.js"));
    }

    if let Ok(current_dir) = std::env::current_dir() {
        let cd = normalize_path(&current_dir);
        paths.push(cd.join("csp-engine").join("server.js"));
        paths.push(cd.join("src-tauri").join("csp-engine").join("server.js"));
        paths.push(cd.join("..").join("csp-engine").join("server.js"));
    }

    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let manifest_path = normalize_path(&std::path::PathBuf::from(&manifest_dir));
        paths.push(manifest_path.join("csp-engine").join("server.js"));
        paths.push(manifest_path.join("..").join("csp-engine").join("server.js"));
    }

    paths
}

fn resolve_engine_script(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let candidates = candidate_paths(app);
    for path in &candidates {
        if path.exists() {
            return Ok(path.clone());
        }
    }

    let tried = candidates
        .iter()
        .map(|p| format!("- {}", p.display()))
        .collect::<Vec<_>>()
        .join("\n");
    Err(format!("引擎文件不存在，已尝试路径:\n{}", tried))
}

fn resolve_node_executable(app: &tauri::AppHandle) -> String {
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();

    if let Ok(rd) = app.path().resource_dir() {
        let rd = normalize_path(&rd);
        candidates.push(rd.join("node").join("node.exe"));
        candidates.push(rd.join("node").join("node"));
        candidates.push(rd.join("resources").join("node").join("node.exe"));
        candidates.push(rd.join("resources").join("node").join("node"));
    }

    if let Ok(cd) = std::env::current_dir() {
        let cd = normalize_path(&cd);
        candidates.push(cd.join("src-tauri").join("resources").join("node").join("node.exe"));
        candidates.push(cd.join("src-tauri").join("resources").join("node").join("node"));
    }

    if let Ok(md) = std::env::var("CARGO_MANIFEST_DIR") {
        let mp = normalize_path(&std::path::PathBuf::from(&md));
        candidates.push(mp.join("resources").join("node").join("node.exe"));
        candidates.push(mp.join("resources").join("node").join("node"));
    }

    for path in &candidates {
        if path.exists() {
            eprintln!("[tauri] 找到 node: {}", path.display());
            return path.to_string_lossy().to_string();
        }
    }

    eprintln!("[tauri] 未找到 node.exe，已尝试 {} 条路径", candidates.len());
    for path in &candidates {
        eprintln!("  - {}", path.display());
    }
    "node".to_string()
}

#[tauri::command]
async fn start_engine(app: tauri::AppHandle) -> Result<bool, String> {
    if ENGINE_RUNNING.load(Ordering::SeqCst) {
        return Ok(true);
    }

    let engine_path = normalize_path(&resolve_engine_script(&app)?);
    let engine_path_str = engine_path.to_string_lossy().to_string();
    let engine_dir = engine_path.parent().ok_or("无法获取引擎目录")?.to_path_buf();
    let mut plugins_dir = app
        .path()
        .app_data_dir()
        .map(|p| normalize_path(&p))
        .unwrap_or_else(|_| engine_dir.clone());
    plugins_dir.push("csp-plugins");

    let plugins_dir_str = plugins_dir.to_string_lossy().to_string();
    let node_cmd = resolve_node_executable(&app);

    eprintln!("[tauri] 启动引擎: {} {}", node_cmd, engine_path_str);
    eprintln!("[tauri] 工作目录: {}", engine_dir.display());
    eprintln!("[tauri] 插件目录: {}", plugins_dir_str);

    let result = tokio::task::spawn_blocking(move || {
        let mut cmd = std::process::Command::new(&node_cmd);
        cmd.arg(&engine_path_str)
            .current_dir(&engine_dir)
            .env("CSP_PORT", "9978")
            .env("CSP_PLUGINS_DIR", &plugins_dir_str)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }

        match cmd.spawn() {
            Ok(mut child) => {
                ENGINE_RUNNING.store(true, Ordering::SeqCst);
                if let Some(stderr) = child.stderr.take() {
                    std::thread::spawn(move || {
                        use std::io::Read;
                        let mut buf = Vec::new();
                        let mut reader = stderr;
                        let _ = reader.read_to_end(&mut buf);
                        if !buf.is_empty() {
                            let text = String::from_utf8_lossy(&buf);
                            for line in text.lines().take(20) {
                                eprintln!("[engine] {}", line);
                            }
                        }
                    });
                }
                true
            }
            Err(e) => {
                eprintln!("[tauri] 启动引擎失败: {}", e);
                false
            }
        }
    })
    .await
    .unwrap_or(false);

    if !result {
        return Ok(false);
    }

    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    Ok(ENGINE_RUNNING.load(Ordering::SeqCst))
}

#[tauri::command]
async fn stop_engine() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", "node.exe", "/FI", "WINDOWTITLE eq *server.js*"])
            .output();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new("pkill")
            .args(["-f", "server.js"])
            .output();
    }
    ENGINE_RUNNING.store(false, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
async fn check_node(app: tauri::AppHandle) -> Result<bool, String> {
    let node_cmd = resolve_node_executable(&app);
    eprintln!("[tauri] check_node: {}", node_cmd);
    let cmd = node_cmd.clone();
    tokio::task::spawn_blocking(move || {
        let output = std::process::Command::new(&cmd)
            .arg("--version")
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .output();
        match output {
            Ok(o) => {
                let ok = o.status.success();
                let ver = String::from_utf8_lossy(&o.stdout).trim().to_string();
                if ok { eprintln!("[tauri] node 版本: {}", ver); }
                else { eprintln!("[tauri] node 执行失败: {}", String::from_utf8_lossy(&o.stderr).trim()); }
                ok
            }
            Err(e) => {
                eprintln!("[tauri] node 启动失败: {}", e);
                false
            }
        }
    })
    .await
    .map_err(|e| format!("{}", e))
}

fn try_base64_decode(text: &str) -> Option<Vec<u8>> {
    let s = text.trim();
    general_purpose::STANDARD.decode(s).ok()
}

fn decrypt_aes_ecb(data: &[u8], key: &[u8]) -> Result<Vec<u8>, String> {
    let mut key_bytes = [0u8; 16];
    let copy_len = key.len().min(16);
    key_bytes[..copy_len].copy_from_slice(&key[..copy_len]);

    let cipher = aes::Aes128::new(aes::cipher::generic_array::GenericArray::from_slice(&key_bytes));

    let mut result = Vec::new();
    for chunk in data.chunks(16) {
        if chunk.len() != 16 {
            break;
        }
        let mut block = aes::Block::clone_from_slice(chunk);
        cipher.decrypt_block(&mut block);
        result.extend_from_slice(&block);
    }

    if result.is_empty() {
        return Err("解密数据为空".to_string());
    }

    let last = *result.last().unwrap();
    let pad = last as usize;
    if pad > 0 && pad <= 16 && result.len() >= pad {
        let start = result.len() - pad;
        if result[start..].iter().all(|&b| b == last) {
            result.truncate(start);
        }
    }

    Ok(result)
}

fn find_subsequence(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn parse_and_decrypt_hex(hex_str: &str) -> Result<String, String> {
    let bytes = hex::decode(hex_str).map_err(|e| format!("Hex解码失败: {}", e))?;

    let marker = b"$#";
    let end_marker = b"#$";

    let start = find_subsequence(&bytes, marker).ok_or("未找到加密起始标记$#")?;
    let after_start = &bytes[start + 2..];
    let key_end = find_subsequence(after_start, end_marker).ok_or("未找到加密结束标记#$")?;
    let key_str = std::str::from_utf8(&after_start[..key_end]).map_err(|_| "密钥包含无效字符")?;

    let mut data_offset = start + 2 + key_end + 2;

    if data_offset < bytes.len() && bytes[data_offset] == b',' {
        if let Some(q_pos) = bytes[data_offset..].iter().position(|&b| b == b'?') {
            data_offset += q_pos + 1;
        } else {
            data_offset += 2;
        }
    }

    let encrypted = &bytes[data_offset..];
    let result = decrypt_aes_ecb(encrypted, key_str.as_bytes())?;
    String::from_utf8(result).map_err(|e| format!("UTF-8解码失败: {}", e))
}

#[tauri::command]
async fn decrypt_text(text: String) -> Result<String, String> {
    let trimmed = text.trim();

    if trimmed.is_empty() {
        return Err("输入内容为空".to_string());
    }

    if is_all_hex(trimmed) {
        match parse_and_decrypt_hex(trimmed) {
            Ok(result) => return Ok(result),
            Err(e) => {
                let bytes = hex::decode(trimmed).unwrap_or_default();
                if let Ok(s) = String::from_utf8(bytes) {
                    if s.starts_with('{') || s.starts_with('[') {
                        return Ok(s);
                    }
                }
                return Err(format!("Hex解密失败: {}", e));
            }
        }
    }

    if let Some(decoded) = try_base64_decode(trimmed) {
        if let Ok(s) = String::from_utf8(decoded.clone()) {
            if s.starts_with('{') || s.starts_with('[') {
                return Ok(s);
            }
        }

        if let Some(idx) = find_subsequence(&decoded, b"$#") {
            let after_marker = &decoded[idx + 2..];
            if let Some(key_end) = find_subsequence(after_marker, b"#$") {
                let key_str = std::str::from_utf8(&after_marker[..key_end]).unwrap_or("");
                let mut data_offset = idx + 2 + key_end + 2;
                if data_offset < decoded.len() && decoded[data_offset] == b',' {
                    if let Some(q_pos) = decoded[data_offset..].iter().position(|&b| b == b'?') {
                        data_offset += q_pos + 1;
                    } else {
                        data_offset += 2;
                    }
                }
                let encrypted = &decoded[data_offset..];
                let result = decrypt_aes_ecb(encrypted, key_str.as_bytes())?;
                return String::from_utf8(result).map_err(|e| format!("UTF-8解码失败: {}", e));
            }
        }

        return Ok(String::from_utf8_lossy(&decoded).to_string());
    }

    Err("无法识别的格式：不是Hex加密、不是Base64编码、也不是JSON".to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, fetch_url, fetch_image, fetch_bytes, decrypt_text, start_engine, stop_engine, check_node])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
