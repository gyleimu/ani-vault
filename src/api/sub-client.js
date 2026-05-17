import { invoke } from '@tauri-apps/api/core'

const SUB_STORAGE_KEY = 'anivault_subscriptions'
const ACTIVE_SOURCE_KEY = 'anivault_active_source'

export function stripJsonComments(text) {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .trim()
}

export function extractJson(text) {
  const start = text.indexOf('{')
  if (start === -1) return text
  const end = text.lastIndexOf('}')
  if (end === -1 || end <= start) return text
  return text.substring(start, end + 1)
}

export function isAllHex(str) {
  return /^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0
}

export function isLikelyBase64(str) {
  return /^[A-Za-z0-9+/=]+$/.test(str) && str.length > 20 && str.length % 4 === 0
}

export function tryParseJson(text) {
  const cleaned = stripJsonComments(text)
  if (cleaned.startsWith('<')) return null
  const jsonStr = extractJson(cleaned)
  try {
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

const GITHUB_MIRRORS = [
  url => url.replace('raw.githubusercontent.com', 'raw.gitmirror.com'),
  url => url.replace('raw.githubusercontent.com', 'raw.kkgithub.com'),
  url => 'https://ghfast.top/' + url,
  url => 'https://gh-proxy.com/' + url
]

function isGithubRawUrl(url) {
  return url.startsWith('https://raw.githubusercontent.com/')
}

function getMirrorUrls(url) {
  return GITHUB_MIRRORS.map(fn => fn(url))
}

async function doFetch(url, retries = 2) {
  const urls = isGithubRawUrl(url)
    ? [url, ...getMirrorUrls(url)]
    : [url]

  for (const currentUrl of urls) {
    for (let i = 0; i <= retries; i++) {
      let text
      try {
        console.log('[sub-client] 尝试:', currentUrl)
        text = await invoke('fetch_url', { url: currentUrl })
      } catch (e) {
        const msg = e?.message || String(e) || '网络请求失败'
        if (i === retries) {
          console.warn(`[sub-client] ${currentUrl} 失败: ${msg}`)
          if (currentUrl === urls[urls.length - 1]) throw new Error(msg)
          break
        }
        console.warn(`[sub-client] retry ${i + 1}:`, msg)
        await new Promise(r => setTimeout(r, 1000 * (i + 1)))
        continue
      }

      if (!text || !text.trim()) {
        if (i === retries) {
          if (currentUrl === urls[urls.length - 1]) throw new Error('服务器返回了空内容')
          break
        }
        await new Promise(r => setTimeout(r, 1000 * (i + 1)))
        continue
      }

      console.log('[sub-client] 响应长度:', text.length, '前50字符:', text.substring(0, 50))

      const jsonResult = tryParseJson(text)
      if (jsonResult) {
        console.log('[sub-client] 直接解析JSON成功')
        return jsonResult
      }

      const isHex = isAllHex(text.trim())
      const isB64 = isLikelyBase64(text.trim())
      console.log('[sub-client] 需要解密 - hex:', isHex, 'base64:', isB64)

      if (isHex || isB64) {
        try {
          const decrypted = await invoke('decrypt_text', { text: text.trim() })
          console.log('[sub-client] 解密成功，前100字符:', decrypted.substring(0, 100))

          const jsonResult2 = tryParseJson(decrypted)
          if (jsonResult2) {
            console.log('[sub-client] 解密后JSON解析成功')
            return jsonResult2
          }

          throw new Error('解密成功但内容不是有效JSON')
        } catch (e) {
          if (i === retries) throw new Error('解密失败: ' + (e.message || e))
          console.warn(`[sub-client] 解密重试 ${i + 1}:`, e.message)
          await new Promise(r => setTimeout(r, 1000 * (i + 1)))
          continue
        }
      }

      if (i === retries) {
        if (currentUrl === urls[urls.length - 1]) throw new Error('无法识别的订阅源格式（不是JSON、Hex加密或Base64编码）')
        break
      }
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw new Error('所有请求地址均失败')
}

export async function fetchSubscription(url) {
  const data = await doFetch(url)

  if (!data || typeof data !== 'object') {
    throw new Error('无效的订阅源格式')
  }

  if (Array.isArray(data.sites)) {
    const sites = parseSites(data)
    if (sites.length === 0) {
      throw new Error('当前订阅源暂不支持（未找到可用的 MacCMS API 源）')
    }
    return {
      name: data.name || extractNameFromUrl(url),
      url,
      sites,
      lives: data.lives || [],
      parses: data.parses || [],
      fetchedAt: Date.now()
    }
  }

  if (data.code !== undefined || data.list || data.msg) {
    const apiUrl = extractApiBaseUrl(url)
    const name = extractNameFromUrl(apiUrl)
    const site = {
      key: 'direct_' + name,
      name: name,
      type: 3,
      api: apiUrl,
      searchable: 1,
      quickSearch: 1,
      filterable: 1,
      ext: '',
      jar: '',
      categories: []
    }
    console.log('[sub-client] 检测到MacCMS API，自动创建源:', site.name, site.api)
    return {
      name: name,
      url: apiUrl,
      sites: [site],
      lives: [],
      parses: [],
      fetchedAt: Date.now()
    }
  }

  throw new Error('无法识别的订阅源格式')
}

function extractApiBaseUrl(url) {
  try {
    const u = new URL(url)
    let path = u.pathname
    if (path.includes('api.php/provide/vod')) {
      path = path.substring(0, path.indexOf('api.php/provide/vod') + 'api.php/provide/vod'.length)
      if (!path.endsWith('/')) path += '/'
    }
    return u.origin + path
  } catch {
    return url.split('?')[0]
  }
}

const MACCMS_CSP_TYPES = new Set(['csp_AppYsV2', 'csp_AppMr', 'csp_AppTv'])

function isUsableApi(url) {
  if (!url) return false
  const lower = url.toLowerCase()
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) return false
  return lower.includes('/api.php') || lower.includes('/provide/vod')
}

function resolveApiUrl(site) {
  if (isUsableApi(site.api)) {
    return {
      api: site.api.replace(/\/+$/, ''),
      ext: typeof site.ext === 'string' ? site.ext.trim() : '',
      sourceType: 'cms'
    }
  }

  if (MACCMS_CSP_TYPES.has(site.api) && typeof site.ext === 'string') {
    const ext = site.ext.trim()
    if (isUsableApi(ext)) {
      console.log('[sub-client] 提取AppYs源API:', site.name, '→', ext)
      return { api: ext.replace(/\/+$/, ''), ext: '', sourceType: 'appys' }
    }
  }

  if (typeof site.api === 'string' && site.api.startsWith('csp_')) {
    const moduleName = site.api.replace(/^csp_/, '')
    const ext = typeof site.ext === 'string' ? site.ext.trim() : ''
    return {
      api: site.api,
      ext,
      sourceType: 'plugin',
      cspModule: moduleName
    }
  }

  return null
}

export function parseSites(data) {
  const rawSites = data.sites || []
  if (!Array.isArray(rawSites)) return []

  return rawSites
    .filter(site => site && site.api && site.name)
    .map(site => {
      const resolved = resolveApiUrl(site)
      if (!resolved) return null
      return {
        key: site.key || site.name,
        name: site.name,
        type: site.type ?? 3,
        api: resolved.api,
        searchable: site.searchable ?? 1,
        quickSearch: site.quickSearch ?? 1,
        filterable: site.filterable ?? 1,
        ext: resolved.ext,
        jar: site.jar || '',
        categories: site.categories || [],
        supported: true,
        sourceType: resolved.sourceType,
        cspModule: resolved.cspModule || ''
      }
    })
    .filter(Boolean)
}

function normalizeApiUrl(api) {
  if (!api) return ''
  return api.replace(/\/+$/, '')
}

function extractNameFromUrl(url) {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, '').split('.')[0]
  } catch {
    return '未命名订阅'
  }
}

export function saveSubscriptions(subscriptions) {
  try {
    localStorage.setItem(SUB_STORAGE_KEY, JSON.stringify(subscriptions))
  } catch (e) {
    console.error('[sub-client] saveSubscriptions failed:', e)
  }
}

export function loadSubscriptions() {
  try {
    const raw = localStorage.getItem(SUB_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function removeSubscription(url) {
  const subs = loadSubscriptions()
  const filtered = subs.filter(s => s.url !== url)
  saveSubscriptions(filtered)
  return filtered
}

export function saveActiveSource(source) {
  try {
    localStorage.setItem(ACTIVE_SOURCE_KEY, JSON.stringify(source))
  } catch (e) {
    console.error('[sub-client] saveActiveSource failed:', e)
  }
}

export function loadActiveSource() {
  try {
    const raw = localStorage.getItem(ACTIVE_SOURCE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
