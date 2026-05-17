import { ref, watch, onMounted } from 'vue'
import { proxyImage } from '../utils/image-proxy'

export function useProxyImage(srcRef) {
  const proxied = ref('')
  const loading = ref(true)
  const error = ref(false)

  async function load(url) {
    if (!url) {
      proxied.value = ''
      loading.value = false
      error.value = false
      return
    }
    loading.value = true
    error.value = false
    try {
      const result = await proxyImage(url)
      if (result && result.startsWith('data:')) {
        proxied.value = result
        error.value = false
      } else {
        proxied.value = ''
        error.value = true
      }
    } catch {
      proxied.value = ''
      error.value = true
    } finally {
      loading.value = false
    }
  }

  if (typeof srcRef === 'function') {
    watch(srcRef, (val) => load(val), { immediate: true })
  } else if (srcRef && srcRef.__v_isRef) {
    watch(srcRef, (val) => load(val), { immediate: true })
  } else {
    onMounted(() => load(typeof srcRef === 'string' ? srcRef : srcRef?.value))
  }

  return { proxied, loading, error }
}
