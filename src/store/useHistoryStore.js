/**
 * 历史记录 Store
 * 管理用户的观看历史，支持持久化存储
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useHistoryStore = defineStore('history', () => {
  // ── 状态 ──────────────────────────────────────────────
  const records = ref([])

  // ── 计算属性 ──────────────────────────────────────────
  const recordCount = computed(() => records.value.length)

  /** 按时间倒序排列的历史记录 */
  const sortedRecords = computed(() => {
    return [...records.value].sort((a, b) => b.updatedAt - a.updatedAt)
  })

  // ── Actions ───────────────────────────────────────────

  /** 添加/更新观看记录 */
  function addRecord(record) {
    const existing = records.value.find(r => r.animeId === record.animeId)
    if (existing) {
      Object.assign(existing, record, { updatedAt: Date.now() })
    } else {
      records.value.push({
        ...record,
        updatedAt: Date.now()
      })
    }
    saveToStorage()
  }

  /** 删除单条记录 */
  function removeRecord(animeId) {
    records.value = records.value.filter(r => r.animeId !== animeId)
    saveToStorage()
  }

  /** 清空所有记录 */
  function clearAll() {
    records.value = []
    saveToStorage()
  }

  /** 获取指定番剧的观看记录 */
  function getRecord(animeId) {
    return records.value.find(r => r.animeId === animeId)
  }

  /** 从本地存储加载 */
  function loadFromStorage() {
    try {
      const data = localStorage.getItem('anivault_history')
      if (data) {
        records.value = JSON.parse(data)
      }
    } catch (err) {
      console.warn('加载历史记录失败:', err)
    }
  }

  /** 保存到本地存储 */
  function saveToStorage() {
    try {
      localStorage.setItem('anivault_history', JSON.stringify(records.value))
    } catch (err) {
      console.warn('保存历史记录失败:', err)
    }
  }

  return {
    records,
    recordCount,
    sortedRecords,
    addRecord,
    removeRecord,
    clearAll,
    getRecord,
    loadFromStorage,
    saveToStorage
  }
})
