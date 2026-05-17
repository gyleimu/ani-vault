const WORKER_PORT = 9980
const WORKER_BASE = `http://127.0.0.1:${WORKER_PORT}`
const WS_URL = `ws://127.0.0.1:${WORKER_PORT}/ws/tasks`

let ws = null
let isReady = false
let reconnectTimer = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10
const RECONNECT_BASE_DELAY = 1000
let pollTimer = null
const POLL_INTERVAL = 3000
let subscribers = new Set()

export async function createTask({ name, inputPath, outputPath, model, scale }) {
  try {
    const resp = await fetch(`${WORKER_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, inputPath, outputPath, model, scale }),
      signal: AbortSignal.timeout(10000)
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      let errorMsg = `创建任务失败: ${resp.status}`
      try { errorMsg = JSON.parse(text).error || errorMsg } catch {}
      throw new Error(errorMsg)
    }
    const text = await resp.text()
    return JSON.parse(text)
  } catch (e) {
    if (e.message.startsWith('创建任务失败')) throw e
    throw new Error('创建任务请求失败: ' + e.message)
  }
}

export async function getTasks() {
  try {
    const resp = await fetch(`${WORKER_BASE}/tasks`, {
      signal: AbortSignal.timeout(10000)
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      let errorMsg = `获取任务列表失败: ${resp.status}`
      try { errorMsg = JSON.parse(text).error || errorMsg } catch {}
      throw new Error(errorMsg)
    }
    const text = await resp.text()
    return JSON.parse(text)
  } catch (e) {
    if (e.message.startsWith('获取任务列表失败')) throw e
    throw new Error('获取任务列表请求失败: ' + e.message)
  }
}

export async function getTask(taskId) {
  try {
    const resp = await fetch(`${WORKER_BASE}/tasks/${encodeURIComponent(taskId)}`, {
      signal: AbortSignal.timeout(10000)
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      let errorMsg = `获取任务详情失败: ${resp.status}`
      try { errorMsg = JSON.parse(text).error || errorMsg } catch {}
      throw new Error(errorMsg)
    }
    const text = await resp.text()
    return JSON.parse(text)
  } catch (e) {
    if (e.message.startsWith('获取任务详情失败')) throw e
    throw new Error('获取任务详情请求失败: ' + e.message)
  }
}

export async function cancelTask(taskId) {
  try {
    const resp = await fetch(`${WORKER_BASE}/tasks/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000)
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      let errorMsg = `取消任务失败: ${resp.status}`
      try { errorMsg = JSON.parse(text).error || errorMsg } catch {}
      throw new Error(errorMsg)
    }
    const text = await resp.text()
    return JSON.parse(text)
  } catch (e) {
    if (e.message.startsWith('取消任务失败')) throw e
    throw new Error('取消任务请求失败: ' + e.message)
  }
}

export async function healthCheck() {
  try {
    const resp = await fetch(`${WORKER_BASE}/health`, {
      signal: AbortSignal.timeout(5000)
    })
    const text = await resp.text()
    const data = JSON.parse(text)
    return data.status === 'ok'
  } catch {
    return false
  }
}

export function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  try {
    ws = new WebSocket(WS_URL)
  } catch {
    reconnect()
    return
  }

  ws.onopen = () => {
    isReady = true
    reconnectAttempts = 0
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    notifyAll({ type: 'connected' })
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      notifyAll(data)
    } catch {
      notifyAll({ type: 'message', raw: event.data })
    }
  }

  ws.onclose = () => {
    isReady = false
    ws = null
    notifyAll({ type: 'disconnected' })
    reconnect()
  }

  ws.onerror = () => {}
}

export function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  reconnectAttempts = 0
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
  isReady = false
}

function reconnect() {
  if (reconnectTimer) return
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    startPolling()
    return
  }

  const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts), 30000)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    reconnectAttempts++
    connect()
  }, delay)
}

function startPolling() {
  if (pollTimer) return
  notifyAll({ type: 'polling_started' })
  pollTimer = setInterval(async () => {
    try {
      const tasks = await getTasks()
      if (Array.isArray(tasks)) {
        tasks.forEach(task => {
          notifyAll({ type: 'progress', ...task })
        })
      }
    } catch {}
  }, POLL_INTERVAL)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export function subscribe(callback) {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

export function unsubscribe(callback) {
  subscribers.delete(callback)
}

function notifyAll(data) {
  for (const cb of subscribers) {
    try { cb(data) } catch {}
  }
}

export function ensureConnected() {
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    connect()
  }
}

export function getConnectionStatus() {
  if (pollTimer) return 'polling'
  if (ws && ws.readyState === WebSocket.OPEN) return 'connected'
  if (reconnectTimer) return 'reconnecting'
  return 'disconnected'
}
