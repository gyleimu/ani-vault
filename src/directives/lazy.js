import { proxyImage } from '../utils/image-proxy'

const observerMap = new WeakMap()

export const vLazy = {
  mounted(el, binding) {
    const src = binding.value
    if (!src) return

    el.dataset.originalSrc = src
    el.style.opacity = '0'
    el.style.transition = 'opacity 300ms ease'

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const target = entry.target
            const url = target.dataset.originalSrc
            if (url) {
              proxyImage(url).then(dataUrl => {
                target.src = dataUrl || url
                target.onload = () => {
                  target.style.opacity = '1'
                }
                target.onerror = () => {
                  target.style.opacity = '1'
                }
              }).catch(() => {
                target.src = url
                target.style.opacity = '1'
              })
              delete target.dataset.originalSrc
            }
            observer.unobserve(target)
            observerMap.delete(target)
          }
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    observerMap.set(el, observer)
  },

  updated(el, binding) {
    if (binding.value !== binding.oldValue && binding.value) {
      el.dataset.originalSrc = binding.value
      el.style.opacity = '0'

      const observer = observerMap.get(el)
      if (observer) {
        observer.unobserve(el)
        observer.observe(el)
      }
    }
  },

  unmounted(el) {
    const observer = observerMap.get(el)
    if (observer) {
      observer.unobserve(el)
      observerMap.delete(el)
    }
  }
}
