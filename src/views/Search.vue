<template>
  <div class="search-page">
    <div class="search-header">
      <div class="search-input-wrap">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          class="search-input"
          name="q"
          id="page-search"
          placeholder="搜索动漫..."
          autocomplete="off"
          @keyup.enter="doSearch"
        />
        <button v-if="query" class="search-clear" @click="query = ''">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <button class="search-submit" :disabled="!query.trim() || animeStore.loading" @click="doSearch">
        {{ animeStore.loading ? '搜索中...' : '搜索' }}
      </button>
    </div>

    <div class="search-body">
      <div v-if="animeStore.error && searched" class="search-error">
        <span class="error-icon">!</span>
        <span>{{ animeStore.error }}</span>
      </div>

      <div v-if="animeStore.loading && !animeStore.searchResults.length" class="anime-grid">
        <div v-for="n in 12" :key="n" class="skeleton-card">
          <div class="skeleton-cover"></div>
          <div class="skeleton-title"></div>
        </div>
      </div>

      <div v-else-if="animeStore.searchResults.length" class="anime-grid">
        <AnimeCard
          v-for="anime in animeStore.searchResults"
          :key="anime.id"
          :anime="anime"
          @click="goToDetail(anime)"
        />
      </div>

      <div v-else-if="searched && !animeStore.loading" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        <p>没有找到相关结果</p>
      </div>

      <div v-else class="empty-state">
        <p>输入关键词开始搜索</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAnimeStore } from '../store/useAnimeStore'
import AnimeCard from '../components/anime/anime-card.vue'

const route = useRoute()
const router = useRouter()
const animeStore = useAnimeStore()

const query = ref('')
const searched = ref(false)
const inputRef = ref(null)

const doSearch = async () => {
  const q = query.value.trim()
  if (!q) return
  searched.value = true
  await animeStore.search(q)
}

const goToDetail = (anime) => {
  router.push(`/detail/${anime.id}`)
}

onMounted(() => {
  const q = route.query.q
  if (q) {
    query.value = q
    doSearch()
  }
  nextTick(() => inputRef.value?.focus())
})
</script>

<style scoped>
.search-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  overflow: hidden;
}

.search-header {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  height: 44px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0 14px;
  transition: border-color 200ms ease;
}

.search-input-wrap:focus-within {
  border-color: rgba(255, 255, 255, 0.2);
}

.search-icon {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.3);
  margin-right: 10px;
}

.search-input {
  flex: 1;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 150ms ease;
}

.search-clear:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
}

.search-submit {
  padding: 0 20px;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: var(--color-primary, #6366f1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms ease;
}

.search-submit:hover:not(:disabled) {
  background: var(--color-primary-light, #818cf8);
}

.search-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-body {
  flex: 1;
  overflow-y: auto;
}

.search-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  color: #f87171;
  font-size: 13px;
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: rgba(239, 68, 68, 0.15);
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.search-body::-webkit-scrollbar {
  width: 6px;
}

.search-body::-webkit-scrollbar-track {
  background: transparent;
}

.search-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
}

.anime-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.skeleton-card {
  border-radius: 12px;
  overflow: hidden;
}

.skeleton-cover {
  aspect-ratio: 3 / 4;
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

.skeleton-title {
  height: 14px;
  margin-top: 10px;
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 50%;
  min-height: 200px;
}

.empty-state p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
}
</style>
