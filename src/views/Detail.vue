<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAnimeStore } from '../store/useAnimeStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { getSourceReferer } from '../api/source-client'

const route = useRoute()
const router = useRouter()
const animeStore = useAnimeStore()
const playerStore = usePlayerStore()

const activeSourceTab = ref(0)
const showFullDesc = ref(false)

const playFromNames = computed(() => {
  const raw = animeStore.currentAnime?.playFrom || ''
  if (!raw) return ['默认线路']
  return raw.split('$$$').filter(Boolean)
})

const currentEpisodes = computed(() => {
  const sources = animeStore.currentAnime?.episodeSources || []
  if (!sources.length) return []
  return sources[activeSourceTab.value] || sources[0] || []
})

const cleanDescription = computed(() => {
  const raw = animeStore.currentAnime?.description || ''
  return raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
})

function playEpisode(ep) {
  const eps = currentEpisodes.value
  const epIndex = eps.findIndex(e => e.url === ep.url)
  playerStore.setVideoReferer(getSourceReferer())
  playerStore.loadAnime(animeStore.currentAnime, epIndex >= 0 ? epIndex : 0, activeSourceTab.value)
  router.push(`/player/${route.params.id}`)
}

function playFirst() {
  playerStore.setVideoReferer(getSourceReferer())
  playerStore.loadAnime(animeStore.currentAnime, 0, activeSourceTab.value)
  router.push(`/player/${route.params.id}`)
}

function goBack() {
  router.back()
}

onMounted(() => {
  animeStore.fetchDetail(route.params.id)
})

onUnmounted(() => {
  animeStore.clearCurrent()
})
</script>

<template>
  <div class="detail-page">
    <button class="detail-back" @click="goBack">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      <span>返回</span>
    </button>

    <div v-if="animeStore.loading" class="detail-loading">
      <div class="skeleton-banner">
        <div class="skeleton-cover"></div>
        <div class="skeleton-info">
          <div class="skeleton-line skeleton-line--title"></div>
          <div class="skeleton-line skeleton-line--short"></div>
          <div class="skeleton-line skeleton-line--short"></div>
          <div class="skeleton-line skeleton-line--long"></div>
        </div>
      </div>
    </div>

    <div v-else-if="animeStore.error" class="detail-error">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>{{ animeStore.error }}</p>
      <button class="retry-btn" @click="animeStore.fetchDetail(route.params.id)">重试</button>
    </div>

    <template v-else-if="animeStore.currentAnime">
      <div class="detail-banner">
        <div class="detail-cover">
          <img
            v-if="animeStore.currentAnime.cover"
            v-lazy="animeStore.currentAnime.cover"
            :alt="animeStore.currentAnime.title"
          />
          <div v-else class="detail-cover__empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <polygon points="10,8 16,12 10,16" />
            </svg>
          </div>
        </div>

        <div class="detail-info">
          <h1 class="detail-title">{{ animeStore.currentAnime.title }}</h1>

          <div class="detail-meta">
            <span v-if="animeStore.currentAnime.typeName" class="meta-tag">{{ animeStore.currentAnime.typeName }}</span>
            <span v-if="animeStore.currentAnime.year" class="meta-tag">{{ animeStore.currentAnime.year }}</span>
            <span v-if="animeStore.currentAnime.area" class="meta-tag">{{ animeStore.currentAnime.area }}</span>
            <span v-if="animeStore.currentAnime.remarks" class="meta-tag meta-tag--accent">{{ animeStore.currentAnime.remarks }}</span>
          </div>

          <div v-if="animeStore.currentAnime.director" class="detail-field">
            <span class="field-label">导演</span>
            <span class="field-value">{{ animeStore.currentAnime.director }}</span>
          </div>
          <div v-if="animeStore.currentAnime.actor" class="detail-field">
            <span class="field-label">主演</span>
            <span class="field-value">{{ animeStore.currentAnime.actor }}</span>
          </div>

          <div v-if="cleanDescription" class="detail-desc" :class="{ 'is-expanded': showFullDesc }">
            <p>{{ cleanDescription }}</p>
            <button v-if="cleanDescription.length > 100" class="desc-toggle" @click="showFullDesc = !showFullDesc">
              {{ showFullDesc ? '收起' : '展开全部' }}
            </button>
          </div>

          <button class="play-btn" @click="playFirst">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="8,5 20,12 8,19" />
            </svg>
            <span>立即播放</span>
          </button>
        </div>
      </div>

      <section v-if="currentEpisodes.length > 0" class="detail-episodes">
        <div class="episodes-header">
          <h2 class="episodes-title">播放列表</h2>
          <span class="episodes-count">共 {{ currentEpisodes.length }} 集</span>
        </div>

        <div v-if="playFromNames.length > 1" class="source-tabs">
          <button
            v-for="(name, i) in playFromNames"
            :key="i"
            class="source-tab"
            :class="{ 'is-active': activeSourceTab === i }"
            @click="activeSourceTab = i"
          >
            {{ name }}
          </button>
        </div>

        <div class="episode-grid">
          <button
            v-for="ep in currentEpisodes"
            :key="ep.index"
            class="episode-btn"
            @click="playEpisode(ep)"
          >
            {{ ep.name }}
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.detail-page {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 40px;
}

.detail-back {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 16px 20px 0;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  cursor: pointer;
  transition: all 180ms ease;
}

.detail-back:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.detail-loading {
  padding: 20px;
}

.skeleton-banner {
  display: flex;
  gap: 24px;
}

.skeleton-cover {
  width: 200px;
  height: 267px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
}

.skeleton-line {
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-line--title { height: 32px; width: 60%; }
.skeleton-line--short { height: 18px; width: 30%; }
.skeleton-line--long { height: 60px; width: 100%; }

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

.detail-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.detail-error p {
  font-size: 14px;
  margin: 0;
}

.retry-btn {
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: all 180ms ease;
}

.retry-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.detail-banner {
  display: flex;
  gap: 24px;
  padding: 20px;
}

.detail-cover {
  width: 200px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 3 / 4;
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.detail-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-cover__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.detail-info {
  flex: 1;
  min-width: 0;
}

.detail-title {
  font-size: 24px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 12px;
  line-height: 1.3;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.meta-tag {
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.meta-tag--accent {
  background: rgba(124, 106, 239, 0.15);
  border-color: rgba(124, 106, 239, 0.3);
  color: rgba(124, 106, 239, 0.9);
}

.detail-field {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.field-label {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.4);
  width: 36px;
}

.field-value {
  color: rgba(255, 255, 255, 0.7);
}

.detail-desc {
  margin: 12px 0 16px;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.5);
}

.detail-desc p {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.detail-desc.is-expanded p {
  -webkit-line-clamp: unset;
  line-clamp: unset;
}

.desc-toggle {
  display: inline-block;
  margin-top: 6px;
  padding: 0;
  background: none;
  border: none;
  color: rgba(124, 106, 239, 0.8);
  font-size: 12px;
  cursor: pointer;
}

.desc-toggle:hover {
  color: rgba(124, 106, 239, 1);
}

.play-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: linear-gradient(135deg, #7c6aef, #9b8afb);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
  box-shadow: 0 4px 16px rgba(124, 106, 239, 0.3);
}

.play-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(124, 106, 239, 0.4);
}

.play-btn:active {
  transform: translateY(0);
}

.detail-episodes {
  padding: 0 20px;
  margin-top: 8px;
}

.episodes-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.episodes-title {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.episodes-count {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
}

.source-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.source-tab {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  cursor: pointer;
  transition: all 180ms ease;
}

.source-tab:hover {
  background: rgba(255, 255, 255, 0.08);
}

.source-tab.is-active {
  background: rgba(124, 106, 239, 0.2);
  border-color: rgba(124, 106, 239, 0.4);
  color: rgba(124, 106, 239, 0.95);
}

.episode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
}

.episode-btn {
  padding: 10px 4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  cursor: pointer;
  transition: all 180ms ease;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.episode-btn:hover {
  background: rgba(124, 106, 239, 0.15);
  border-color: rgba(124, 106, 239, 0.3);
  color: #fff;
}
</style>
