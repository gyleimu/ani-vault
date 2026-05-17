import { getActiveSource } from './sources'
import * as cms from './adapters/cms'
import * as appys from './adapters/appys'
import { pluginSearch, pluginDetail, pluginList, pluginPlay, registerScript, registerInline, isEngineReady, startEngine } from './engine-client'

const registeredPlugins = new Set()

function detectSourceType(source) {
  if (source.sourceType) return source.sourceType
  const api = source.api || ''
  if (api.startsWith('csp_')) return 'plugin'
  if (api.startsWith('http') && (api.includes('/api.php') || api.includes('/provide/vod'))) return 'cms'
  return 'cms'
}

function getPluginName(source) {
  if (source.cspModule) return source.cspModule
  if (source.key) return source.key
  const api = source.api || ''
  if (api.startsWith('csp_')) return api.replace(/^csp_/, '')
  return source.name
}

export function getSourceReferer(source) {
  const s = source || getActiveSource()
  if (!s) return ''
  const type = detectSourceType(s)
  if (type === 'plugin') {
    if (s.ext && s.ext.startsWith('http')) {
      return s.ext.replace(/\/+$/, '') + '/'
    }
  }
  const api = s.api || ''
  if (api.startsWith('http')) {
    const idx = api.indexOf('/api.php')
    if (idx > 0) return api.substring(0, idx) + '/'
    try { return new URL(api).origin + '/' } catch {}
  }
  return ''
}

const pluginCache = new Map()

function getPluginCacheKey(source) {
  const name = getPluginName(source)
  const ext = source.ext || ''
  return `${name}|${ext}`
}

async function ensurePlugin(source) {
  const name = getPluginName(source)
  const cacheKey = getPluginCacheKey(source)

  if (pluginCache.has(cacheKey)) {
    return pluginCache.get(cacheKey)
  }

  const promise = (async () => {
    if (!isEngineReady()) {
      const started = await startEngine()
      if (!started) throw new Error('插件引擎启动失败，请确保已安装Node.js')
    }

    if (source.ext && source.ext.startsWith('http')) {
      console.log('[source-client] 注册插件:', name, source.ext)
      await registerScript(name, source.ext)
    } else if (source.ext) {
      console.log('[source-client] 注册内联插件:', name)
      await registerInline(name, source.ext)
    }

    registeredPlugins.add(name)
    return true
  })()

  pluginCache.set(cacheKey, promise)

  try {
    return await promise
  } catch (e) {
    pluginCache.delete(cacheKey)
    throw e
  }
}

function normalizePluginSearchResult(item) {
  return {
    id: item.vod_id ?? item.id,
    title: item.vod_name ?? item.title ?? '',
    cover: item.vod_pic ?? item.cover ?? '',
    remarks: item.vod_remarks ?? item.remarks ?? '',
    year: item.vod_year ?? item.year ?? '',
    typeName: item.type_name ?? item.typeName ?? ''
  }
}

function parsePlayUrlGroups(vodPlayFrom, vodPlayUrl) {
  const fromNames = (vodPlayFrom || '').split('$$$').filter(Boolean)
  const urlGroups = (vodPlayUrl || '').split('$$$')
  const sources = []

  for (let i = 0; i < fromNames.length; i++) {
    const eps = (urlGroups[i] || '').split('#').filter(Boolean).map((ep, j) => {
      const sep = ep.indexOf('$')
      if (sep === -1) return { name: `第${j + 1}集`, url: ep, index: j }
      return { name: ep.substring(0, sep), url: ep.substring(sep + 1), index: j }
    })
    sources.push(eps)
  }

  if (sources.length === 0 && vodPlayUrl) {
    const eps = vodPlayUrl.split('#').filter(Boolean).map((ep, j) => {
      const sep = ep.indexOf('$')
      if (sep === -1) return { name: `第${j + 1}集`, url: ep, index: j }
      return { name: ep.substring(0, sep), url: ep.substring(sep + 1), index: j }
    })
    if (eps.length > 0) sources.push(eps)
  }

  return { fromNames, sources }
}

function normalizePluginDetail(raw) {
  if (!raw) return null
  const d = raw.list?.[0] || raw
  const { fromNames, sources } = parsePlayUrlGroups(d.vod_play_from, d.vod_play_url)

  return {
    id: d.vod_id ?? d.id,
    title: d.vod_name ?? d.title ?? '',
    cover: d.vod_pic ?? d.cover ?? '',
    description: d.vod_content ?? d.vod_blurb ?? d.description ?? '',
    typeName: d.type_name ?? d.typeName ?? '',
    year: d.vod_year ?? d.year ?? '',
    area: d.vod_area ?? d.area ?? '',
    remarks: d.vod_remarks ?? d.remarks ?? '',
    director: d.vod_director ?? d.director ?? '',
    actor: d.vod_actor ?? d.actor ?? '',
    playFrom: fromNames.join('$$$'),
    episodeSources: sources
  }
}

export async function searchAnime(keyword, source) {
  const activeSource = source || getActiveSource()
  if (!activeSource) throw new Error('未配置视频源')

  const type = detectSourceType(activeSource)

  if (type === 'plugin') {
    await ensurePlugin(activeSource)
    const data = await pluginSearch(getPluginName(activeSource), keyword)
    if (data?.list) {
      data.list = data.list.map(normalizePluginSearchResult)
    }
    return data
  }

  if (type === 'appys') return appys.search(activeSource.api, keyword)
  return cms.search(activeSource.api, keyword)
}

export async function getAnimeDetail(id, source) {
  const activeSource = source || getActiveSource()
  if (!activeSource) throw new Error('未配置视频源')

  const type = detectSourceType(activeSource)

  if (type === 'plugin') {
    await ensurePlugin(activeSource)
    const data = await pluginDetail(getPluginName(activeSource), id)
    return normalizePluginDetail(data)
  }

  if (type === 'appys') return appys.detail(activeSource.api, id)
  return cms.detail(activeSource.api, id)
}

export async function getAnimeList(params = {}) {
  const activeSource = getActiveSource()
  if (!activeSource) throw new Error('未配置视频源')

  const type = detectSourceType(activeSource)

  if (type === 'plugin') {
    await ensurePlugin(activeSource)
    const data = await pluginList(getPluginName(activeSource), params)
    if (data?.list) {
      data.list = data.list.map(normalizePluginSearchResult)
    }
    return data
  }

  if (type === 'appys') return appys.list(activeSource.api, params)
  return cms.list(activeSource.api, params)
}

export async function getPlayUrl(source, flag, id) {
  const activeSource = source || getActiveSource()
  if (!activeSource) throw new Error('未配置视频源')

  const type = detectSourceType(activeSource)

  if (type === 'plugin') {
    await ensurePlugin(activeSource)
    return pluginPlay(getPluginName(activeSource), flag, id)
  }

  return { url: id }
}

export { parsePlayUrl } from './adapters/cms'
