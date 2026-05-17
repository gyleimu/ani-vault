import { invoke } from '@tauri-apps/api/core'

const ENGINE_PORT = 9978
const ENGINE_BASE = `http://127.0.0.1:${ENGINE_PORT}`

let healthCheckTimer = null
let isStarting = false
let isReady = false

async function isNodeAvailable() {
  try {
    return await invoke('check_node')
  } catch {
    return false
  }
}

async function isServiceRunning() {
  try {
    const resp = await fetch(`${ENGINE_BASE}/health`, { signal: AbortSignal.timeout(2000) })
    const text = await resp.text()
    const data = JSON.parse(text)
    return data.status === 'ok'
  } catch {
    return false
  }
}

export async function startEngine() {
  if (isReady) return true
  if (isStarting) {
    await new Promise(r => setTimeout(r, 500))
    return isReady
  }

  isStarting = true
  try {
    if (await isServiceRunning()) {
      isReady = true
      console.log('[engine] 服务已在运行')
      return true
    }

    if (!(await isNodeAvailable())) {
      console.warn('[engine] Node.js 未安装，无法启动插件引擎')
      return false
    }

    console.log('[engine] 正在启动...')
    const ok = await invoke('start_engine')
    if (!ok) {
      console.warn('[engine] 启动命令返回失败')
      return false
    }

    let attempts = 0
    while (attempts < 15) {
      await new Promise(r => setTimeout(r, 500))
      if (await isServiceRunning()) {
        isReady = true
        console.log('[engine] 服务启动成功')
        startHealthCheck()
        return true
      }
      attempts++
    }

    console.error('[engine] 服务启动超时')
    return false
  } catch (e) {
    console.error('[engine] 启动服务失败:', e)
    return false
  } finally {
    isStarting = false
  }
}

export async function stopEngine() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer)
    healthCheckTimer = null
  }
  try {
    await invoke('stop_engine')
  } catch {}
  isReady = false
}

function startHealthCheck() {
  if (healthCheckTimer) return
  healthCheckTimer = setInterval(async () => {
    if (!(await isServiceRunning())) {
      isReady = false
      console.warn('[engine] 健康检查失败，尝试重启...')
      await startEngine()
    }
  }, 30000)
}

export function isEngineReady() {
  return isReady
}

export async function ensureEngine() {
  if (!isReady) {
    const started = await startEngine()
    if (!started) throw new Error('插件引擎启动失败，请确保已安装 Node.js')
  }
}

async function engineRequest(path, params = {}) {
  await ensureEngine()

  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v))
  }

  const url = `${ENGINE_BASE}${path}?${query}`
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    let errorMsg = `引擎请求失败: ${resp.status}`
    try {
      const err = JSON.parse(text)
      errorMsg = err.error || errorMsg
    } catch {
      if (text.startsWith('<')) {
        errorMsg = `引擎返回HTML而非JSON (HTTP ${resp.status})`
      }
    }
    throw new Error(errorMsg)
  }

  const text = await resp.text()
  if (text.startsWith('<')) {
    throw new Error('引擎返回了HTML而非JSON，可能是插件不存在或引擎异常')
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('引擎响应不是有效JSON: ' + text.substring(0, 100))
  }
}

export async function pluginList(plugin, params = {}) {
  return engineRequest(`/plugin/${encodeURIComponent(plugin)}/list`, params)
}

export async function pluginDetail(plugin, id) {
  return engineRequest(`/plugin/${encodeURIComponent(plugin)}/detail`, { id })
}

export async function pluginPlay(plugin, flag, id) {
  return engineRequest(`/plugin/${encodeURIComponent(plugin)}/play`, { flag, id })
}

export async function pluginSearch(plugin, keyword, page = 1) {
  return engineRequest(`/plugin/${encodeURIComponent(plugin)}/search`, { wd: keyword, pg: page })
}

export async function registerScript(moduleName, scriptUrl) {
  await ensureEngine()
  const resp = await fetch(`${ENGINE_BASE}/register-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: moduleName, url: scriptUrl }),
    signal: AbortSignal.timeout(20000)
  })
  const text = await resp.text()
  if (!resp.ok) {
    let errorMsg = `注册脚本失败: ${resp.status}`
    try { errorMsg = JSON.parse(text).error || errorMsg } catch {}
    throw new Error(errorMsg)
  }
  try { return JSON.parse(text) } catch { throw new Error('注册响应不是有效JSON') }
}

export async function registerInline(moduleName, code) {
  await ensureEngine()
  const resp = await fetch(`${ENGINE_BASE}/register-inline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: moduleName, code }),
    signal: AbortSignal.timeout(10000)
  })
  const text = await resp.text()
  if (!resp.ok) {
    let errorMsg = `注册内联脚本失败: ${resp.status}`
    try { errorMsg = JSON.parse(text).error || errorMsg } catch {}
    throw new Error(errorMsg)
  }
  try { return JSON.parse(text) } catch { throw new Error('注册响应不是有效JSON') }
}

export async function getPlugins() {
  try {
    const resp = await fetch(`${ENGINE_BASE}/plugins`, { signal: AbortSignal.timeout(3000) })
    const text = await resp.text()
    const data = JSON.parse(text)
    return data.plugins || []
  } catch {
    return []
  }
}
