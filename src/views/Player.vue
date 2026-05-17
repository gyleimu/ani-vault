<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayerStore } from '../store/usePlayerStore'
import { useHistoryStore } from '../store/useHistoryStore'
import AnimePlayer from '../components/anime/anime-player.vue'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const historyStore = useHistoryStore()

const animeId = route.params.id
const sidebarVisible = ref(true)
const activeSourceTab = ref(playerStore.currentSourceIndex || 0)

const animeTitle = computed(() => playerStore.currentAnime?.title || '')
const episodeList = computed(() => {
  const sources = playerStore.currentAnime?.episodeSources || []
  return sources[activeSourceTab.value] || sources[0] || []
})
const sourceNames = computed(() => {
  const raw = playerStore.currentAnime?.playFrom || ''
  if (!raw) return ['默认线路']
  return raw.split('$$$').filter(Boolean)
})
const currentEpIndex = computed(() => {
  return episodeList.value.findIndex(ep => ep.url === playerStore.currentUrl)
})

function playEp(index) {
  playerStore.switchSource(activeSourceTab.value)
  playerStore.playEpisode(index)
}

function switchSourceTab(index) {
  activeSourceTab.value = index
  playerStore.switchSource(index)
}

function goBack() {
  playerStore.pause()
  router.push(`/detail/${animeId}`)
}

function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}

function scrollToCurrentEp() {
  const el = document.querySelector('.ep-btn.is-active')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

onMounted(() => {
  if (!playerStore.currentAnime) {
    router.replace(`/detail/${animeId}`)
    return
  }
  activeSourceTab.value = playerStore.currentSourceIndex || 0
})

onUnmounted(() => {
  historyStore.addRecord({
    animeId,
    title: animeTitle.value,
    episode: playerStore.currentEpisode?.name || '',
    url: playerStore.currentUrl,
    progress: playerStore.currentTime,
    duration: playerStore.duration,
    timestamp: Date.now()
  })
})
</script>

<template>
  <div class="player-layout" v-if="playerStore.currentAnime">
    <div class="player-main">
      <div class="player-topbar">
        <button class="topbar-btn" @click="goBack" title="返回详情">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div class="topbar-title">
          <span class="topbar-anime">{{ animeTitle }}</span>
          <span class="topbar-ep" v-if="playerStore.currentEpisode?.name"> · {{ playerStore.currentEpisode.name }}</span>
        </div>
        <button class="topbar-btn" @click="toggleSidebar" :title="sidebarVisible ? '隐藏列表' : '显示列表'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="18" rx="1" />
            <rect x="14" y="3" width="7" height="18" rx="1" />
          </svg>
        </button>
      </div>

      <div class="player-video-wrap">
        <AnimePlayer />
      </div>
    </div>

    <aside class="player-sidebar" :class="{ 'is-hidden': !sidebarVisible }">
      <div class="sidebar-header">
        <h3 class="sidebar-title">播放列表</h3>
        <span class="sidebar-count">{{ episodeList.length }}集</span>
      </div>

      <div class="source-tabs" v-if="sourceNames.length > 1">
        <button
          v-for="(name, i) in sourceNames"
          :key="i"
          class="source-tab"
          :class="{ 'is-active': activeSourceTab === i }"
          @click="switchSourceTab(i)"
        >
          {{ name }}
        </button>
      </div>

      <div class="ep-grid">
        <button
          v-for="(ep, i) in episodeList"
          :key="ep.url"
          class="ep-btn"
          :class="{ 'is-active': currentEpIndex === i }"
          @click="playEp(i)"
        >
          {{ ep.name }}
        </button>
      </div>
    </aside>
  </div>

  <div v-else class="player-empty">
    <p>正在加载番剧信息...</p>
    <button class="empty-back" @click="goBack">返回详情</button>
  </div>
</template>

<style scoped>
.player-layout {
  position: fixed;
  inset: 0;
  display: flex;
  background: #000;
  z-index: 100;
}

.player-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.player-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 10;
}

.topbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
}

.topbar-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.topbar-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar-anime {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.topbar-ep {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.player-video-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  min-height: 0;
}

.player-video-wrap :deep(.player) {
  width: 100%;
  height: 100%;
  max-height: 100%;
  aspect-ratio: unset;
  border-radius: 0;
}

.player-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: rgba(10, 10, 26, 0.95);
  backdrop-filter: blur(12px);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  transition: width 200ms ease, opacity 200ms ease;
}

.player-sidebar.is-hidden {
  width: 0;
  opacity: 0;
  border-left: none;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

.sidebar-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
}

.source-tabs {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.source-tab {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
}

.source-tab:hover {
  background: rgba(255, 255, 255, 0.08);
}

.source-tab.is-active {
  background: rgba(124, 106, 239, 0.2);
  border-color: rgba(124, 106, 239, 0.4);
  color: rgba(124, 106, 239, 0.95);
}

.ep-grid {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  align-content: start;
}

.ep-grid::-webkit-scrollbar {
  width: 4px;
}

.ep-grid::-webkit-scrollbar-track {
  background: transparent;
}

.ep-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.ep-btn {
  padding: 8px 4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
  cursor: pointer;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
}

.ep-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.ep-btn.is-active {
  background: rgba(124, 106, 239, 0.25);
  border-color: rgba(124, 106, 239, 0.5);
  color: #fff;
  font-weight: 600;
}

.player-empty {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #000;
  color: rgba(255, 255, 255, 0.5);
  z-index: 100;
}

.player-empty p {
  font-size: 14px;
  margin: 0;
}

.empty-back {
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: background 150ms ease;
}

.empty-back:hover {
  background: rgba(255, 255, 255, 0.12);
}

@media (max-width: 768px) {
  .player-sidebar {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 240px;
    z-index: 20;
  }

  .player-sidebar.is-hidden {
    width: 0;
  }
}
</style>
