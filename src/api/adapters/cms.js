import { invoke } from '@tauri-apps/api/core'

const REQUEST_TIMEOUT = 10000

function buildQueryUrl(base, params) {
  const cleanBase = base.replace(/\/+$/, '')
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
  return query ? `${cleanBase}?${query}` : cleanBase
}

async function request(url) {
  console.log('[cms] 请求:', url)
  try {
    const text = await invoke('fetch_url', { url })
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new Error('服务器返回了空内容')
    }
    try {
      return JSON.parse(text)
    } catch {
      const snippet = text.substring(0, 200)
      throw new Error(`JSON解析失败，响应前200字符: ${snippet}`)
    }
  } catch (e) {
    throw new Error(`请求失败: ${e.message || e}`)
  }
}

function extractList(data) {
  if (!data) return []
  if (Array.isArray(data.list)) return data.list
  if (data.data && Array.isArray(data.data.list)) return data.data.list
  if (Array.isArray(data)) return data
  return []
}

function extractTotal(data) { return data?.total || data?.data?.total || 0 }
function extractPage(data) { return data?.page || data?.data?.page || 1 }
function extractPageCount(data) { return data?.pagecount || data?.data?.pagecount || 1 }

export async function search(api, keyword, page = 1) {
  const url = buildQueryUrl(api, { ac: 'list', wd: keyword, pg: page })
  const data = await request(url)
  return {
    list: extractList(data),
    page: extractPage(data),
    pagecount: extractPageCount(data),
    total: extractTotal(data)
  }
}

export async function list(api, params = {}) {
  const { page = 1, typeId } = params
  const queryParams = { ac: 'list', pg: page }
  if (typeId) queryParams.t = typeId
  const url = buildQueryUrl(api, queryParams)
  const data = await request(url)
  return {
    list: extractList(data),
    page: extractPage(data),
    pagecount: extractPageCount(data),
    total: extractTotal(data)
  }
}

export async function detail(api, id) {
  const url = buildQueryUrl(api, { ac: 'detail', ids: id })
  const data = await request(url)
  const list = extractList(data)
  return list[0] || null
}

export function parsePlayUrl(str) {
  if (!str || typeof str !== 'string') return []
  const groups = str.split('$$$')
  const result = []
  for (const group of groups) {
    if (!group || !group.trim()) continue
    const lines = group.split('#')
    const items = []
    let index = 0
    for (const line of lines) {
      const firstDollar = line.indexOf('$')
      if (firstDollar === -1) continue
      const name = line.substring(0, firstDollar).trim() || `第${index + 1}集`
      const url = line.substring(firstDollar + 1).trim()
      if (url) {
        items.push({ index, name, url, sourceIndex: result.length })
        index++
      }
    }
    if (items.length > 0) result.push(items)
  }
  return result
}
