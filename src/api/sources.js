const ACTIVE_KEY = 'anivault_active_source'
const SOURCES_KEY = 'anivault_sources'

const BUILTIN_SOURCES = [
  {
    key: 'anime',
    name: '动漫CMS',
    api: 'csp_anime',
    sourceType: 'plugin',
    cspModule: 'anime',
    searchable: true,
    quickSearch: true,
    ext: 'https://cj.lziapi.com'
  },
  {
    key: 'demo',
    name: 'FFZY资源',
    api: 'csp_demo',
    sourceType: 'plugin',
    cspModule: 'demo',
    searchable: true,
    quickSearch: true,
    ext: 'https://www.ffzy.tv'
  },
  {
    key: 'yinghua',
    name: '樱花动漫',
    api: 'csp_yinghua',
    sourceType: 'plugin',
    cspModule: 'yinghua',
    searchable: true,
    quickSearch: true,
    ext: 'https://www.yinhuadm.xyz'
  }
]

let activeSource = null

export function setActiveSource(source) {
  activeSource = source
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(source))
  } catch {}
}

export function getActiveSource() {
  if (activeSource) return activeSource

  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    if (raw) {
      activeSource = JSON.parse(raw)
      return activeSource
    }
  } catch {}

  return null
}

export function clearActiveSource() {
  activeSource = null
  try {
    localStorage.removeItem(ACTIVE_KEY)
  } catch {}
}

export function isSourceValid(source) {
  return source && source.api && source.name
}

export function getSources() {
  let userSources = []
  try {
    const raw = localStorage.getItem(SOURCES_KEY)
    if (raw) userSources = JSON.parse(raw)
  } catch {}

  const builtinKeys = new Set(BUILTIN_SOURCES.map(s => s.key))
  const filtered = userSources.filter(s => !s._auto && !builtinKeys.has(s.key))
  if (filtered.length !== userSources.length) {
    try { localStorage.setItem(SOURCES_KEY, JSON.stringify(filtered)) } catch {}
  }
  return [...BUILTIN_SOURCES, ...filtered]
}

export function saveSources(sources) {
  try {
    localStorage.setItem(SOURCES_KEY, JSON.stringify(sources))
  } catch {}
}
