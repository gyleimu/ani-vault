import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAnimeDetail as apiFetchDetail, searchAnime } from '../api/anime'
import { MemoryCache, getCachedDetail, setCachedDetail } from '../utils/cache'

const searchCache = new MemoryCache(10 * 60 * 1000, 50)

export const useAnimeStore = defineStore('anime', () => {
  const searchResults = ref([])
  const recommendations = ref([])
  const currentAnime = ref(null)
  const loading = ref(false)
  const searchLoading = ref(false)
  const error = ref(null)

  async function fetchRecommendations() {
    loading.value = true
    error.value = null
    try {
      recommendations.value = []
    } catch (err) {
      error.value = err.message || '获取推荐失败'
    } finally {
      loading.value = false
    }
  }

  async function search(keyword, page = 1) {
    const trimmed = keyword.trim()
    if (!trimmed) return

    const cacheKey = `${trimmed}_${page}`
    const cached = searchCache.get(cacheKey)
    if (cached) {
      searchResults.value = cached
      return
    }

    searchLoading.value = true
    error.value = null
    try {
      const results = await searchAnime(trimmed, { page })
      const list = Array.isArray(results) ? results : (results?.list || [])
      searchResults.value = list
      searchCache.set(cacheKey, list)
    } catch (err) {
      error.value = err.message || '搜索失败'
    } finally {
      searchLoading.value = false
    }
  }

  async function fetchDetail(id) {
    if (!id) return

    const cached = getCachedDetail(id)
    if (cached) {
      currentAnime.value = cached
      return
    }

    searchLoading.value = true
    error.value = null
    try {
      const detail = await apiFetchDetail(id)
      currentAnime.value = detail
      setCachedDetail(id, detail)
    } catch (err) {
      error.value = err.message || '获取详情失败'
    } finally {
      searchLoading.value = false
    }
  }

  function clearSearch() {
    searchResults.value = []
    error.value = null
  }

  function clearCurrent() {
    currentAnime.value = null
    error.value = null
  }

  function clearCache() {
    searchCache.clear()
  }

  return {
    searchResults,
    recommendations,
    currentAnime,
    loading,
    searchLoading,
    error,
    fetchRecommendations,
    search,
    fetchDetail,
    clearSearch,
    clearCurrent,
    clearCache
  }
})
