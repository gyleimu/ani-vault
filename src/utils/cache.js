const DEFAULT_TTL = 10 * 60 * 1000

export class MemoryCache {
  constructor(ttl = DEFAULT_TTL, maxSize = 100) {
    this.ttl = ttl
    this.maxSize = maxSize
    this.store = new Map()
  }

  get(key) {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expireAt) {
      this.store.delete(key)
      return null
    }
    this.store.delete(key)
    this.store.set(key, entry)
    return entry.value
  }

  set(key, value) {
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value
      this.store.delete(oldest)
    }
    this.store.set(key, {
      value,
      expireAt: Date.now() + this.ttl
    })
  }

  has(key) {
    return this.get(key) !== null
  }

  clear() {
    this.store.clear()
  }
}

const DETAIL_STORAGE_KEY = 'anivault_detail_cache'
const DETAIL_MAX = 50

export function getCachedDetail(id) {
  try {
    const raw = localStorage.getItem(`${DETAIL_STORAGE_KEY}_${id}`)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (Date.now() > entry.expireAt) {
      localStorage.removeItem(`${DETAIL_STORAGE_KEY}_${id}`)
      return null
    }
    return entry.value
  } catch {
    return null
  }
}

export function setCachedDetail(id, value) {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(DETAIL_STORAGE_KEY))
    if (keys.length >= DETAIL_MAX) {
      const oldest = keys[0]
      localStorage.removeItem(oldest)
    }
    localStorage.setItem(`${DETAIL_STORAGE_KEY}_${id}`, JSON.stringify({
      value,
      expireAt: Date.now() + 24 * 60 * 60 * 1000
    }))
  } catch {}
}
