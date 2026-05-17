/**
 * 工具函数集合
 * 通用辅助方法，不含业务逻辑
 */

/**
 * 防抖函数
 * @param {Function} fn - 目标函数
 * @param {number} delay - 延迟时间 (ms)
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn - 目标函数
 * @param {number} interval - 间隔时间 (ms)
 * @returns {Function}
 */
export function throttle(fn, interval = 200) {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= interval) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

/**
 * 格式化日期
 * @param {number|Date|string} date - 日期
 * @param {string} format - 格式模板 (YYYY-MM-DD HH:mm:ss)
 * @returns {string}
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date)
  const map = {
    YYYY: d.getFullYear(),
    MM: String(d.getMonth() + 1).padStart(2, '0'),
    DD: String(d.getDate()).padStart(2, '0'),
    HH: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
    ss: String(d.getSeconds()).padStart(2, '0')
  }
  return Object.entries(map).reduce((str, [key, val]) => str.replace(key, val), format)
}

/**
 * 格式化时长 (秒 → hh:mm:ss 或 mm:ss)
 * @param {number} seconds - 秒数
 * @returns {string}
 */
export function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * 格式化数字 (1000 → 1k, 10000 → 1万)
 * @param {number} num - 数字
 * @returns {string}
 */
export function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  }
  return String(num)
}

/**
 * 生成唯一 ID
 * @returns {string}
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * 深拷贝
 * @param {*} obj - 目标对象
 * @returns {*}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 本地存储封装
 */
export const storage = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(`anivault_${key}`)
      return value ? JSON.parse(value) : defaultValue
    } catch {
      return defaultValue
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(`anivault_${key}`, JSON.stringify(value))
    } catch (err) {
      console.warn('存储写入失败:', err)
    }
  },

  remove(key) {
    localStorage.removeItem(`anivault_${key}`)
  }
}
