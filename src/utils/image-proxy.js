import { invoke } from '@tauri-apps/api/core'

const cache = new Map()
const MAX_CACHE = 200
const pending = new Map()

export async function proxyImage(url) {
  if (!url) return ''
  if (url.startsWith('data:')) return url

  if (cache.has(url)) return cache.get(url)

  if (pending.has(url)) return pending.get(url)

  const promise = (async () => {
    try {
      const dataUrl = await invoke('fetch_image', { url })
      if (dataUrl && dataUrl.startsWith('data:')) {
        if (cache.size >= MAX_CACHE) {
          const firstKey = cache.keys().next().value
          cache.delete(firstKey)
        }
        cache.set(url, dataUrl)
        return dataUrl
      }
      return url
    } catch (e) {
      console.warn('[proxyImage] failed:', url, String(e))
      return url
    } finally {
      pending.delete(url)
    }
  })()

  pending.set(url, promise)
  return promise
}

export function clearImageCache() {
  cache.clear()
}
