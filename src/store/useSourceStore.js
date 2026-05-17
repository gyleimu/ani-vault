import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  fetchSubscription,
  saveSubscriptions,
  loadSubscriptions,
  removeSubscription as removeSub
} from '../api/sub-client'
import {
  getActiveSource,
  setActiveSource,
  clearActiveSource,
  getSources
} from '../api/sources'

export const useSourceStore = defineStore('source', () => {
  const subscriptions = ref([])
  const activeSource = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const inputUrl = ref('')

  const pluginSources = computed(() => {
    return getSources().map(src => ({
      key: src.key,
      name: src.name,
      api: src.api,
      sourceType: src.sourceType || 'plugin',
      cspModule: src.cspModule || '',
      searchable: src.searchable !== false,
      quickSearch: src.quickSearch !== false,
      ext: src.ext || '',
      subscriptionName: '引擎插件',
      subscriptionUrl: ''
    }))
  })

  const allSites = computed(() => {
    const sites = [...pluginSources.value]
    for (const sub of subscriptions.value) {
      for (const site of sub.sites) {
        sites.push({
          ...site,
          subscriptionName: sub.name,
          subscriptionUrl: sub.url
        })
      }
    }
    return sites
  })

  function init() {
    subscriptions.value = loadSubscriptions()
    activeSource.value = getActiveSource()
  }

  async function addSubscription(url) {
    if (!url?.trim()) {
      error.value = '请输入订阅源地址'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const sub = await fetchSubscription(url.trim())

      const exists = subscriptions.value.findIndex(s => s.url === sub.url)
      if (exists >= 0) {
        subscriptions.value[exists] = sub
      } else {
        subscriptions.value.push(sub)
      }

      saveSubscriptions(subscriptions.value)
      return sub
    } catch (err) {
      console.error('[useSourceStore] addSubscription error:', err)
      error.value = err.message || '获取订阅源失败'
      return null
    } finally {
      loading.value = false
    }
  }

  function removeSubscription(url) {
    subscriptions.value = removeSub(url)
  }

  function clearAllSubscriptions() {
    subscriptions.value = []
    saveSubscriptions([])
    clearActiveSource()
    activeSource.value = null
  }

  async function refreshAllSubscriptions() {
    const urls = subscriptions.value.map(s => s.url)
    if (urls.length === 0) return

    loading.value = true
    error.value = null

    try {
      const results = []
      for (const url of urls) {
        try {
          const sub = await fetchSubscription(url)
          results.push(sub)
        } catch (err) {
          console.warn(`[useSourceStore] 刷新失败: ${url}`, err.message)
        }
      }
      subscriptions.value = results
      saveSubscriptions(results)
    } finally {
      loading.value = false
    }
  }

  function selectSource(site) {
    const source = {
      key: site.key,
      name: site.name,
      api: site.api,
      type: site.type,
      searchable: site.searchable,
      quickSearch: site.quickSearch,
      filterable: site.filterable,
      ext: site.ext || '',
      categories: site.categories || [],
      sourceType: site.sourceType || 'cms',
      cspModule: site.cspModule || ''
    }
    setActiveSource(source)
    activeSource.value = source
  }

  function isActive(site) {
    if (!activeSource.value) return false
    return activeSource.value.api === site.api
  }

  function resetToDefault() {
    clearActiveSource()
    activeSource.value = getActiveSource()
  }

  function clearError() {
    error.value = null
  }

  init()

  return {
    subscriptions,
    activeSource,
    loading,
    error,
    inputUrl,
    pluginSources,
    allSites,
    addSubscription,
    removeSubscription,
    clearAllSubscriptions,
    refreshAllSubscriptions,
    selectSource,
    isActive,
    resetToDefault,
    clearError,
    init
  }
})
