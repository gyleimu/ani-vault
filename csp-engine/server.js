const http = require('http')
const vm = require('vm')
const path = require('path')
const fs = require('fs')

const PORT = parseInt(process.env.CSP_PORT || '9978', 10)
const PLUGINS_DIR = process.env.CSP_PLUGINS_DIR || path.join(__dirname, 'plugins')

const BUNDLED_PLUGINS = new Map()
const PLUGIN_META = new Map()

function registerBundled(name, code, meta) {
  BUNDLED_PLUGINS.set(name, code)
  if (meta) PLUGIN_META.set(name, meta)
}

let axiosModule = null
let cheerioModule = null

function getAxios() {
  if (!axiosModule) axiosModule = require('axios')
  return axiosModule
}

function getCheerio() {
  if (!cheerioModule) cheerioModule = require('cheerio')
  return cheerioModule
}

function ensurePluginsDir() {
  if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true })
}

function listPlugins() {
  ensurePluginsDir()
  const filePlugins = new Set()
  try {
    fs.readdirSync(PLUGINS_DIR)
      .filter(f => f.endsWith('.js'))
      .forEach(f => filePlugins.add(f.replace(/\.js$/, '')))
  } catch {}
  for (const name of BUNDLED_PLUGINS.keys()) filePlugins.add(name)
  return [...filePlugins]
}

function loadPluginCode(name) {
  if (BUNDLED_PLUGINS.has(name)) return BUNDLED_PLUGINS.get(name)
  const filePath = path.join(PLUGINS_DIR, name + '.js')
  if (!fs.existsSync(filePath)) return null
  const code = fs.readFileSync(filePath, 'utf-8')
  const trimmed = code.trimStart()
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<?xml')) {
    console.error(`[engine] 插件 ${name}.js 文件内容损坏（HTML而非JS），跳过加载`)
    return BUNDLED_PLUGINS.has(name) ? BUNDLED_PLUGINS.get(name) : null
  }
  return code
}

const pluginCache = new Map()

function getCachedPlugin(name) {
  const cached = pluginCache.get(name)
  if (!cached) return null
  if (cached.bundled) return cached.instance
  try {
    const stat = fs.statSync(path.join(PLUGINS_DIR, name + '.js'))
    if (stat.mtimeMs === cached.mtime) return cached.instance
  } catch {}
  pluginCache.delete(name)
  return null
}

function setCachedPlugin(name, instance) {
  if (BUNDLED_PLUGINS.has(name)) {
    pluginCache.set(name, { instance, bundled: true })
    return
  }
  try {
    const stat = fs.statSync(path.join(PLUGINS_DIR, name + '.js'))
    pluginCache.set(name, { instance, mtime: stat.mtimeMs })
  } catch {
    pluginCache.set(name, { instance, bundled: true })
  }
}

function parseHeaders(str) {
  const headers = {}
  if (!str) return headers
  for (const line of str.split('\n')) {
    const idx = line.indexOf(':')
    if (idx > 0) headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim()
  }
  return headers
}

function createSandbox(pluginName, ext) {
  const cookieJar = {}

  async function req(oUrl, oHeaders, postData, options = {}) {
    const axios = getAxios()
    const isPost = postData || (options && options.withBody)
    const headers = {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      ...parseHeaders(options && options.header)
    }
    if (oHeaders) Object.assign(headers, typeof oHeaders === 'string' ? parseHeaders(oHeaders) : oHeaders)

    const jarCookies = Object.entries(cookieJar)
      .map(([k, v]) => `${k}=${v}`).join('; ')
    if (jarCookies) headers.cookie = (headers.cookie ? headers.cookie + '; ' : '') + jarCookies

    const config = {
      method: isPost ? 'POST' : 'GET',
      url: oUrl,
      headers,
      timeout: 15000,
      maxRedirects: 5,
      responseType: (options && options.buffer) ? 'arraybuffer' : 'text',
      validateStatus: () => true
    }
    if (isPost && postData) {
      config.data = postData
      if (!headers['content-type']) {
        headers['content-type'] = typeof postData === 'string' && postData.includes('=')
          ? 'application/x-www-form-urlencoded'
          : 'application/json'
      }
    }

    const resp = await axios(config)
    const setCookies = resp.headers['set-cookie']
    if (setCookies) {
      for (const c of setCookies) {
        const parts = c.split(';')[0].split('=')
        if (parts.length >= 2) cookieJar[parts[0].trim()] = parts.slice(1).join('=').trim()
      }
    }

    if (options && options.buffer) {
      return Buffer.from(resp.data).toString('base64')
    }
    return typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data)
  }

  function pdfh(html, selector) {
    const $ = getCheerio().load(html)
    if (!selector) return ''
    const parts = selector.split('@')
    const sel = parts[0].trim()
    const attr = parts.length > 1 ? parts[1].trim() : ''
    const el = $(sel).first()
    if (!el.length) return ''
    if (!attr || attr === 'text') return el.text().trim()
    if (attr === 'html') return el.html() || ''
    return el.attr(attr) || ''
  }

  function pdfa(html, selector) {
    const $ = getCheerio().load(html)
    const results = []
    $(selector).each((_, el) => results.push($.html(el)))
    return results
  }

  function pd(html, selector, host) {
    let val = pdfh(html, selector)
    if (!val) return ''
    if (val.startsWith('//')) return 'https:' + val
    if (val.startsWith('/')) {
      try { return new URL(val, host).toString() } catch { return host + val }
    }
    if (!val.startsWith('http')) {
      try { return new URL(val, host).toString() } catch { return val }
    }
    return val
  }

  function log(msg) {
    console.log(`[plugin:${pluginName}]`, msg)
  }

  const global_ = {
    print: log,
    log,
    fetch: req,
    req,
    pdfh,
    pdfa,
    pd,
    jx: () => {},
    input: ext || '',
    MY_URL: ext || '',
    key: pluginName
  }

  global_.string = {
    join: (arr, sep) => (arr || []).join(sep || ''),
    replaceAll: (s, a, b) => (s || '').split(a).join(b)
  }

  global_.JSON = JSON
  global_.parseInt = parseInt
  global_.parseFloat = parseFloat
  global_.encodeURIComponent = encodeURIComponent
  global_.decodeURIComponent = decodeURIComponent
  global_.console = { log, error: log, warn: log, info: log }

  return global_
}

function loadPlugin(pluginName, ext) {
  const cached = getCachedPlugin(pluginName)
  if (cached) return cached

  const code = loadPluginCode(pluginName)
  if (!code) throw new Error(`插件 ${pluginName} 不存在`)

  const sandbox = createSandbox(pluginName, ext)
  const wrappedCode = `
    (function() {
      var module = { exports: {} };
      var exports = module.exports;
      ${code}
      return module.exports;
    })();
  `

  const script = new vm.Script(wrappedCode, { filename: `${pluginName}.js` })
  const context = vm.createContext(sandbox)
  const exports = script.runInContext(context)

  let plugin = null
  if (typeof exports === 'function') {
    plugin = exports(sandbox.req, sandbox.log, sandbox.jx)
  } else if (exports && typeof exports === 'object') {
    plugin = exports.default || exports.spider || exports
  }

  if (!plugin || typeof plugin !== 'object') {
    throw new Error(`插件 ${pluginName} 未返回有效对象`)
  }

  setCachedPlugin(pluginName, plugin)
  return plugin
}

async function executePlugin(pluginName, method, params = {}) {
  const ext = params.extend || ''
  const plugin = loadPlugin(pluginName, ext)

  if (plugin.init && typeof plugin.init === 'function') {
    await plugin.init()
  }

  switch (method) {
    case 'list': {
      const tid = params.tid || params.t || ''
      const pg = parseInt(params.pg) || 1
      const filter = params.filter
      const extend = params.extend || ''
      if (typeof plugin.category !== 'function') {
        throw new Error(`插件 ${pluginName} 不支持列表`)
      }
      const result = await plugin.category(tid, pg, filter, extend)
      if (Array.isArray(result)) return { list: result, page: pg, pagecount: 999, total: 0 }
      return {
        list: result.list || [],
        page: result.page || pg,
        pagecount: result.pagecount || 999,
        total: result.total || 0
      }
    }
    case 'detail': {
      const id = params.ids || params.id || ''
      if (typeof plugin.detail !== 'function') {
        throw new Error(`插件 ${pluginName} 不支持详情`)
      }
      const result = await plugin.detail(id)
      const list = Array.isArray(result) ? result : (result.list || [result])
      return { list }
    }
    case 'play': {
      const { flag, id } = params
      if (typeof plugin.play !== 'function') {
        throw new Error(`插件 ${pluginName} 不支持播放`)
      }
      const result = await plugin.play(flag, id)
      return typeof result === 'string' ? { url: result } : result
    }
    case 'search': {
      const { wd, quick, pg = 1 } = params
      if (typeof plugin.search !== 'function') {
        throw new Error(`插件 ${pluginName} 不支持搜索`)
      }
      const result = await plugin.search(wd, quick, parseInt(pg))
      if (Array.isArray(result)) return { list: result, page: parseInt(pg), pagecount: 1, total: result.length }
      return {
        list: result.list || [],
        page: result.page || parseInt(pg),
        pagecount: result.pagecount || 1,
        total: result.total || 0
      }
    }
    case 'home': {
      if (typeof plugin.home === 'function') {
        const result = await plugin.home()
        return { class: Array.isArray(result) ? result : (result.class || []) }
      }
      return { class: [] }
    }
    case 'homeVod': {
      if (typeof plugin.homeVod === 'function') {
        const result = await plugin.homeVod()
        return { list: Array.isArray(result) ? result : (result.list || []) }
      }
      return { list: [] }
    }
    default:
      throw new Error(`未知方法: ${method}`)
  }
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  })
  res.end(JSON.stringify(data))
}

function sendError(res, msg, status = 500) {
  sendJson(res, { error: msg }, status)
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => resolve(data))
  })
}

function downloadAndSave(pluginName, scriptUrl) {
  return getAxios().get(scriptUrl, {
    timeout: 15000,
    responseType: 'text',
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    validateStatus: () => true
  }).then(resp => {
    if (!resp.data || typeof resp.data !== 'string') {
      throw new Error('下载脚本失败: 响应为空')
    }
    ensurePluginsDir()
    const filePath = path.join(PLUGINS_DIR, pluginName + '.js')
    fs.writeFileSync(filePath, resp.data, 'utf-8')
    pluginCache.delete(pluginName)
    console.log(`[engine] 已注册插件 ${pluginName} (${resp.data.length} bytes)`)
    return { plugin: pluginName, size: resp.data.length }
  })
}

function saveInline(pluginName, code) {
  ensurePluginsDir()
  const filePath = path.join(PLUGINS_DIR, pluginName + '.js')
  fs.writeFileSync(filePath, code, 'utf-8')
  pluginCache.delete(pluginName)
  console.log(`[engine] 已注册内联插件 ${pluginName} (${code.length} bytes)`)
  return { plugin: pluginName, size: code.length }
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`)
  const pathname = reqUrl.pathname
  const query = Object.fromEntries(reqUrl.searchParams.entries())

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  try {
    if (pathname === '/' || pathname === '') {
      sendJson(res, {
        name: 'AniVault Plugin Engine',
        version: '0.2.0',
        port: PORT,
        plugins: listPlugins(),
        endpoints: {
          health: '/health',
          plugins: '/plugins',
          registerUrl: 'POST /register-url',
          registerInline: 'POST /register-inline',
          list: '/plugin/:name/list',
          detail: '/plugin/:name/detail',
          play: '/plugin/:name/play',
          search: '/plugin/:name/search'
        }
      })
      return
    }

    if (pathname === '/health') {
      sendJson(res, { status: 'ok', plugins: listPlugins().length })
      return
    }

    if (pathname === '/plugins') {
      sendJson(res, { plugins: listPlugins() })
      return
    }

    if (pathname === '/plugins-meta') {
      const allNames = listPlugins()
      const meta = allNames.map(name => {
        const m = PLUGIN_META.get(name) || {}
        return {
          name,
          title: m.title || name,
          ext: m.ext || '',
          searchable: m.searchable !== false,
          quickSearch: m.quickSearch !== false
        }
      })
      sendJson(res, { plugins: meta })
      return
    }

    if (pathname === '/register-url' && req.method === 'POST') {
      const body = await readBody(req)
      const { module: pluginName, url: scriptUrl } = JSON.parse(body)
      if (!pluginName || !scriptUrl) {
        sendError(res, '缺少 module 或 url 参数', 400)
        return
      }
      const result = await downloadAndSave(pluginName, scriptUrl)
      sendJson(res, result)
      return
    }

    if (pathname === '/register-inline' && req.method === 'POST') {
      const body = await readBody(req)
      const { module: pluginName, code } = JSON.parse(body)
      if (!pluginName || !code) {
        sendError(res, '缺少 module 或 code 参数', 400)
        return
      }
      const result = saveInline(pluginName, code)
      sendJson(res, result)
      return
    }

    const pluginRouteMatch = pathname.match(/^\/plugin\/([^/]+)\/(list|detail|play|search|home|homeVod)$/)
    if (pluginRouteMatch) {
      const pluginName = decodeURIComponent(pluginRouteMatch[1])
      const method = pluginRouteMatch[2]
      const params = { ...query }

      if (req.method === 'POST') {
        const body = await readBody(req)
        try { Object.assign(params, JSON.parse(body)) } catch {}
      }

      const result = await executePlugin(pluginName, method, params)
      sendJson(res, result)
      return
    }

    const UNIFIED_METHODS = new Set(['list', 'detail', 'play', 'search', 'home', 'homeVod'])
    if (UNIFIED_METHODS.has(pathname.slice(1))) {
      const method = pathname.slice(1)
      const params = { ...query }
      const source = params.source
      delete params.source

      if (!source) {
        sendError(res, '缺少 source 参数，用法: /' + method + '?source=插件名&id=xxx', 400)
        return
      }

      if (req.method === 'POST') {
        const body = await readBody(req)
        try { Object.assign(params, JSON.parse(body)) } catch {}
      }

      const result = await executePlugin(source, method, params)
      sendJson(res, result)
      return
    }

    const pluginInfoMatch = pathname.match(/^\/plugin\/([^/]+)$/)
    if (pluginInfoMatch) {
      const pluginName = decodeURIComponent(pluginInfoMatch[1])
      const exists = listPlugins().includes(pluginName)
      sendJson(res, {
        plugin: pluginName,
        available: exists,
        methods: ['list', 'detail', 'play', 'search', 'home', 'homeVod'],
        example: {
          list: `/plugin/${pluginName}/list`,
          search: `/plugin/${pluginName}/search?wd=关键词`,
          detail: `/plugin/${pluginName}/detail?id=xxx`,
          play: `/plugin/${pluginName}/play?flag=线路&id=xxx`
        }
      })
      return
    }

    sendError(res, 'Not Found', 404)
  } catch (e) {
    console.error('[engine] Error:', e.message)
    sendError(res, e.message)
  }
})

registerBundled('anime', String.raw`
const API = ((input || MY_URL || 'https://cj.lziapi.com').replace(/\/+$/, '')) + '/api.php/provide/vod/'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
function getHeaders(referer) { return { 'User-Agent': UA, 'Referer': referer || API, 'Accept': '*/*' } }
async function apiCall(params) {
  const qs = Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>k+'='+encodeURIComponent(String(v))).join('&')
  const url = qs ? API+'?'+qs : API
  log('API: ' + url)
  const text = await req(url, getHeaders())
  if (!text) throw new Error('API返回空')
  try { return JSON.parse(text) } catch { throw new Error('API返回非JSON: '+text.substring(0,80)) }
}
function parseM3u8Master(content, baseUrl) {
  const lines = content.split('\n'); const streams = []
  for (let i=0;i<lines.length;i++) {
    if (lines[i].includes('#EXT-X-STREAM-INF')) {
      const bw=(lines[i].match(/BANDWIDTH=(\d+)/)||[])[1]; const res=(lines[i].match(/RESOLUTION=(\S+)/)||[])[1]
      const next=(lines[i+1]||'').trim()
      if (next&&!next.startsWith('#')) streams.push({bandwidth:parseInt(bw)||0,resolution:res||'',url:next.startsWith('http')?next:new URL(next,baseUrl).toString()})
    }
  }
  if (streams.length===0) return null; streams.sort((a,b)=>b.bandwidth-a.bandwidth); return streams[0]
}
const SOURCE_WEIGHTS={'lzm3u8':100,'\u91cf\u5b50m3u8':100,'bfzym3u8':90,'\u66b4\u98ce m3u8':90,'1080zyk':80,'1080P':80,'kdm3u8':70,'\u95ea\u7535m3u8':70,'snm3u8':60,'liangzi':50,'\u91cf\u5b50':50,'ffm3u8':40}
function pickBestSource(fromStr,urlStr){const froms=(fromStr||'').split('$$$');const urls=(urlStr||'').split('$$$');if(froms.length===0)return null;let bestIdx=0,bestScore=-1;for(let i=0;i<froms.length;i++){const name=froms[i].trim();let score=SOURCE_WEIGHTS[name]||0;if(score===0){const l=name.toLowerCase();if(l.includes('1080'))score=75;else if(l.includes('m3u8'))score=50;else if(l.includes('hd'))score=40;else score=10}if(score>bestScore){bestScore=score;bestIdx=i}}return{from:froms[bestIdx],url:urls[bestIdx]||'',index:bestIdx}}
module.exports = {
  init: async () => { log('\u52a8\u6f2bCMS\u63d2\u4ef6\u5df2\u52a0\u8f7d: ' + API) },
  home: async () => [{ type_id: '', type_name: '\u9996\u9875' }],
  category: async (tid, pg) => { const data = await apiCall({ ac: 'detail', t: tid, pg: pg }); return { list: data.list || [], page: data.page || pg, pagecount: data.pagecount || 1, total: data.total || 0 } },
  detail: async (ids) => { const data = await apiCall({ ac: 'detail', ids: ids }); return data.list || [] },
  play: async (flag, id) => {
    log('play flag=' + flag + ' id=' + (id || '').substring(0, 80))
    if (/\.m3u8($|\?|#)/i.test(id)) {
      try { const content = await req(id, getHeaders(id)); if (content && content.includes('#EXT-X-STREAM-INF')) { const best = parseM3u8Master(content, id); if (best) { log('\u6700\u9ad8\u753b\u8d28: '+(best.resolution||'?')+' bw='+best.bandwidth); return { url: best.url } } } } catch (e) { log('m3u8\u8d28\u91cf\u9009\u62e9\u5931\u8d25: ' + e.message) }
      return { url: id }
    }
    try {
      const html = await req(id, getHeaders(id))
      if (html) {
        const p1 = html.match(/(?:file|url|src|video_url|play_url)\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i)
        const p2 = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i)
        const m = p1 || p2
        if (m) { const m3u8Url=m[1].replace(/['";\s]+$/,''); log('\u89e3\u6790\u5230m3u8: '+m3u8Url.substring(0,80)); return {url:m3u8Url} }
      }
    } catch (e) { log('\u5206\u4eab\u9875\u89e3\u6790\u5931\u8d25: ' + e.message) }
    return { url: id }
  },
  search: async (wd, quick, pg) => { const data = await apiCall({ ac: 'detail', wd: wd, pg: pg || 1 }); return { list: data.list || [], page: data.page || pg || 1, pagecount: data.pagecount || 1, total: data.total || 0 } }
}
`, { title: '动漫CMS', ext: 'https://cj.lziapi.com', searchable: true, quickSearch: true })

registerBundled('demo', String.raw`
const API = ((input || MY_URL || 'https://www.ffzy.tv').replace(/\/+$/, '')) + '/api.php/provide/vod/'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
function getHeaders(referer) { return { 'User-Agent': UA, 'Referer': referer || API, 'Accept': '*/*' } }
async function apiCall(params) {
  const qs = Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>k+'='+encodeURIComponent(String(v))).join('&')
  const url = qs ? API+'?'+qs : API
  log('API: ' + url)
  const text = await req(url, getHeaders())
  if (!text) throw new Error('API返回空')
  try { return JSON.parse(text) } catch { throw new Error('API返回非JSON: '+text.substring(0,80)) }
}
function parseM3u8Master(content, baseUrl) {
  const lines = content.split('\n'); const streams = []
  for (let i=0;i<lines.length;i++) {
    if (lines[i].includes('#EXT-X-STREAM-INF')) {
      const bw=(lines[i].match(/BANDWIDTH=(\d+)/)||[])[1]; const res=(lines[i].match(/RESOLUTION=(\S+)/)||[])[1]
      const next=(lines[i+1]||'').trim()
      if (next&&!next.startsWith('#')) streams.push({bandwidth:parseInt(bw)||0,resolution:res||'',url:next.startsWith('http')?next:new URL(next,baseUrl).toString()})
    }
  }
  if (streams.length===0) return null; streams.sort((a,b)=>b.bandwidth-a.bandwidth); return streams[0]
}
const SOURCE_WEIGHTS={'lzm3u8':100,'\u91cf\u5b50m3u8':100,'bfzym3u8':90,'\u66b4\u98ce m3u8':90,'1080zyk':80,'1080P':80,'kdm3u8':70,'\u95ea\u7535m3u8':70,'snm3u8':60,'liangzi':50,'\u91cf\u5b50':50,'ffm3u8':40}
function pickBestSource(fromStr,urlStr){const froms=(fromStr||'').split('$$$');const urls=(urlStr||'').split('$$$');if(froms.length===0)return null;let bestIdx=0,bestScore=-1;for(let i=0;i<froms.length;i++){const name=froms[i].trim();let score=SOURCE_WEIGHTS[name]||0;if(score===0){const l=name.toLowerCase();if(l.includes('1080'))score=75;else if(l.includes('m3u8'))score=50;else if(l.includes('hd'))score=40;else score=10}if(score>bestScore){bestScore=score;bestIdx=i}}return{from:froms[bestIdx],url:urls[bestIdx]||'',index:bestIdx}}
module.exports = {
  init: async () => { log('FFZY\u63d2\u4ef6\u5df2\u52a0\u8f7d: ' + API) },
  home: async () => [{ type_id: '', type_name: '\u9996\u9875' }],
  category: async (tid, pg) => { const data = await apiCall({ ac: 'detail', t: tid, pg: pg }); return { list: data.list || [], page: data.page || pg, pagecount: data.pagecount || 1, total: data.total || 0 } },
  detail: async (ids) => { const data = await apiCall({ ac: 'detail', ids: ids }); return data.list || [] },
  play: async (flag, id) => {
    log('play flag=' + flag + ' id=' + (id || '').substring(0, 80))
    if (/\.m3u8($|\?|#)/i.test(id)) {
      try { const content = await req(id, getHeaders(id)); if (content && content.includes('#EXT-X-STREAM-INF')) { const best = parseM3u8Master(content, id); if (best) { log('\u6700\u9ad8\u753b\u8d28: '+(best.resolution||'?')+' bw='+best.bandwidth); return { url: best.url } } } } catch (e) { log('m3u8\u8d28\u91cf\u9009\u62e9\u5931\u8d25: ' + e.message) }
      return { url: id }
    }
    try {
      const html = await req(id, getHeaders(id))
      if (html) {
        const p1 = html.match(/(?:file|url|src|video_url|play_url)\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i)
        const p2 = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i)
        const m = p1 || p2
        if (m) { const m3u8Url=m[1].replace(/['";\s]+$/,''); log('\u89e3\u6790\u5230m3u8: '+m3u8Url.substring(0,80)); return {url:m3u8Url} }
      }
    } catch (e) { log('\u5206\u4eab\u9875\u89e3\u6790\u5931\u8d25: ' + e.message) }
    return { url: id }
  },
  search: async (wd, quick, pg) => { const data = await apiCall({ ac: 'detail', wd: wd, pg: pg || 1 }); return { list: data.list || [], page: data.page || pg || 1, pagecount: data.pagecount || 1, total: data.total || 0 } }
}
`, { title: 'FFZY资源', ext: 'https://www.ffzy.tv', searchable: true, quickSearch: true })

registerBundled('yinghua', String.raw`
const SITE = (input || MY_URL || 'https://www.yinhuadm.xyz').replace(/\/+$/, '')
const API = SITE + '/api.php/provide/vod/'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
function getHeaders(referer) { return { 'User-Agent': UA, 'Referer': referer || API, 'Accept': '*/*' } }
async function apiCall(params) {
  const qs = Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>k+'='+encodeURIComponent(String(v))).join('&')
  const url = qs ? API+'?'+qs : API
  log('API: ' + url)
  const text = await req(url, getHeaders())
  if (!text) throw new Error('API返回空')
  try { return JSON.parse(text) } catch { throw new Error('API返回非JSON: '+text.substring(0,80)) }
}
function fixPic(pic) { if (pic && !pic.startsWith('http')) return SITE + '/' + pic.replace(/^\//, ''); return pic }
function fixList(list) { return (list||[]).map(item => ({...item, vod_pic: fixPic(item.vod_pic)})) }
function parseM3u8Master(content, baseUrl) {
  const lines = content.split('\n'); const streams = []
  for (let i=0;i<lines.length;i++) {
    if (lines[i].includes('#EXT-X-STREAM-INF')) {
      const bw=(lines[i].match(/BANDWIDTH=(\d+)/)||[])[1]; const res=(lines[i].match(/RESOLUTION=(\S+)/)||[])[1]
      const next=(lines[i+1]||'').trim()
      if (next&&!next.startsWith('#')) streams.push({bandwidth:parseInt(bw)||0,resolution:res||'',url:next.startsWith('http')?next:new URL(next,baseUrl).toString()})
    }
  }
  if (streams.length===0) return null; streams.sort((a,b)=>b.bandwidth-a.bandwidth); return streams[0]
}
module.exports = {
  init: async () => { log('\u6a31\u82b1\u52a8\u6f2b\u63d2\u4ef6\u5df2\u52a0\u8f7d: ' + API) },
  home: async () => [{ type_id: '', type_name: '\u9996\u9875' }],
  category: async (tid, pg) => { const data = await apiCall({ ac: 'detail', t: tid, pg: pg }); return { list: fixList(data.list), page: data.page || pg, pagecount: data.pagecount || 1, total: data.total || 0 } },
  detail: async (ids) => { const data = await apiCall({ ac: 'detail', ids: ids }); return fixList(data.list) },
  play: async (flag, id) => {
    log('play flag=' + flag + ' id=' + (id || '').substring(0, 80))
    if (/\.m3u8($|\?|#)/i.test(id)) {
      try { const content = await req(id, getHeaders(id)); if (content && content.includes('#EXT-X-STREAM-INF')) { const best = parseM3u8Master(content, id); if (best) { log('\u6700\u9ad8\u753b\u8d28: '+(best.resolution||'?')+' bw='+best.bandwidth); return { url: best.url } } } } catch (e) { log('m3u8\u8d28\u91cf\u9009\u62e9\u5931\u8d25: ' + e.message) }
      return { url: id }
    }
    try {
      const html = await req(id, getHeaders(id))
      if (html) {
        const p1 = html.match(/(?:file|url|src|video_url|play_url)\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i)
        const p2 = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i)
        const m = p1 || p2
        if (m) { const m3u8Url=m[1].replace(/['";\s]+$/,''); log('\u89e3\u6790\u5230m3u8: '+m3u8Url.substring(0,80)); return {url:m3u8Url} }
      }
    } catch (e) { log('\u5206\u4eab\u9875\u89e3\u6790\u5931\u8d25: ' + e.message) }
    return { url: id }
  },
  search: async (wd, quick, pg) => { const data = await apiCall({ ac: 'detail', wd: wd, pg: pg || 1 }); return { list: fixList(data.list), page: data.page || pg || 1, pagecount: data.pagecount || 1, total: data.total || 0 } }
}
`, { title: '\u6a31\u82b1\u52a8\u6f2b', ext: 'https://www.yinhuadm.xyz', searchable: true, quickSearch: true })

server.listen(PORT, () => {
  console.log(`[engine] 插件引擎已启动，端口: ${PORT}`)
  console.log(`[engine] 插件目录: ${PLUGINS_DIR}`)
  console.log(`[engine] 可用插件: ${listPlugins().join(', ') || '无'}`)
})

process.on('SIGTERM', () => { server.close(); process.exit(0) })
process.on('SIGINT', () => { server.close(); process.exit(0) })
