<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Hls from 'hls.js'
import { invoke } from '@tauri-apps/api/core'
import { usePlayerStore } from '../../store/usePlayerStore'

const playerStore = usePlayerStore()

const videoRef = ref(null)
const containerRef = ref(null)
const hls = ref(null)
const showError = ref(false)
const errorMessage = ref('')
const showControls = ref(true)
let controlsTimer = null
let lastClickTime = 0

const isDragging = ref(false)
const dragProgress = ref(0)

function b64ToArrayBuffer(b64) {
  const bin = atob(b64)
  const len = bin.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

function isM3u8Url(url) {
  const lower = url.toLowerCase()
  return lower.includes('.m3u8') || lower.includes('m3u8') || lower.includes('/hls/') || lower.includes('type=m3u8')
}

let currentReferer = ''

class TauriHlsLoader {
  constructor(config) {
    this.stats = { loading: { start: 0, end: 0, first: 0 }, total: 0, aborted: false }
    this.aborted = false
  }

  load(context, config, callbacks) {
    if (this.aborted) return
    this.stats.loading.start = performance.now()
    const url = context.url
    const referer = currentReferer || undefined

    const isText = context.type === 'manifest' || context.type === 'level' || context.type === 'key'
      ? context.responseType === 'text'
      : context.responseType === 'text' || context.responseType === 'json'

    if (isText) {
      invoke('fetch_url', { url, referer })
        .then(data => {
          if (this.aborted) return
          this.stats.loading.end = performance.now()
          this.stats.total = typeof data === 'string' ? data.length : 0
          const respData = context.responseType === 'json' ? JSON.parse(data) : data
          callbacks.onSuccess({ url, data: respData }, this.stats, context)
        })
        .catch(err => {
          if (this.aborted) return
          callbacks.onError({ code: 0, text: String(err) }, context)
        })
    } else {
      invoke('fetch_bytes', { url, referer })
        .then(b64 => {
          if (this.aborted) return
          const buf = b64ToArrayBuffer(b64)
          this.stats.loading.end = performance.now()
          this.stats.total = buf.byteLength
          callbacks.onSuccess({ url, data: buf }, this.stats, context)
        })
        .catch(err => {
          if (this.aborted) return
          callbacks.onError({ code: 0, text: String(err) }, context)
        })
    }
  }

  abort() {
    this.stats.aborted = true
    this.aborted = true
  }

  destroy() {
    this.aborted = true
  }
}

function initPlayer(url) {
  destroyPlayer()
  if (!url || !videoRef.value) {
    console.warn('[player] initPlayer skipped:', { url, hasVideo: !!videoRef.value })
    return
  }

  showError.value = false
  errorMessage.value = ''
  currentReferer = playerStore.videoReferer || ''
  const video = videoRef.value
  video.removeAttribute('src')
  video.load()

  console.log('[player] initPlayer:', url)

  if (Hls.isSupported()) {
    hls.value = new Hls({
      startLevel: -1,
      capLevelToPlayerSize: false,
      autoStartLoad: true,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      loader: TauriHlsLoader,
      enableWorker: false
    })

    hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('[player] manifest parsed')
      if (playerStore.isPlaying) video.play().catch(() => {})
    })

    hls.value.on(Hls.Events.ERROR, (event, data) => {
      console.warn('[player] HLS error:', data.type, data.details, data.fatal ? '(fatal)' : '')
      if (data.fatal) {
        hls.value.destroy()
        hls.value = null
        loadDirect(video, url)
      }
    })

    hls.value.loadSource(url)
    hls.value.attachMedia(video)
  } else {
    loadDirect(video, url)
  }
}

function loadDirect(video, url) {
  video.src = url
  video.load()

  const onReady = () => {
    video.removeEventListener('loadedmetadata', onReady)
    video.removeEventListener('canplay', onReady)
    video.removeEventListener('error', onErr)
    if (playerStore.isPlaying) video.play().catch(() => {})
  }
  const onErr = () => {
    video.removeEventListener('loadedmetadata', onReady)
    video.removeEventListener('canplay', onReady)
    video.removeEventListener('error', onErr)
    const code = video.error?.code || 0
    errorMessage.value = code === 4 ? '视频格式不支持' : '视频加载失败，请尝试其他线路'
    showError.value = true
  }
  video.addEventListener('loadedmetadata', onReady)
  video.addEventListener('canplay', onReady)
  video.addEventListener('error', onErr)
}

function destroyPlayer() {
  if (hls.value) {
    hls.value.destroy()
    hls.value = null
  }
  if (videoRef.value) {
    videoRef.value.pause()
    videoRef.value.removeAttribute('src')
    videoRef.value.load()
  }
}

function togglePlay() {
  if (!videoRef.value) return
  if (videoRef.value.paused) {
    videoRef.value.play().catch(() => {})
    playerStore.play()
  } else {
    videoRef.value.pause()
    playerStore.pause()
  }
}

function handleTimeUpdate() {
  if (videoRef.value) {
    playerStore.updateTime(videoRef.value.currentTime)
  }
}

function handleLoadedMetadata() {
  if (videoRef.value) {
    playerStore.setDuration(videoRef.value.duration)
  }
}

function handleEnded() {
  playerStore.playNext()
}

function seekToRatio(ratio) {
  const clampedRatio = Math.max(0, Math.min(1, ratio))
  const time = clampedRatio * playerStore.duration
  if (videoRef.value) videoRef.value.currentTime = time
  playerStore.seekTo(time)
}

function handleProgressMouseDown(e) {
  isDragging.value = true
  const rect = e.currentTarget.getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  dragProgress.value = Math.max(0, Math.min(100, ratio * 100))
  seekToRatio(ratio)

  const onMove = (ev) => {
    const r = (ev.clientX - rect.left) / rect.width
    dragProgress.value = Math.max(0, Math.min(100, r * 100))
  }
  const onUp = (ev) => {
    isDragging.value = false
    const r = (ev.clientX - rect.left) / rect.width
    seekToRatio(r)
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function handleVideoClick(e) {
  const now = Date.now()
  if (now - lastClickTime < 300) {
    handleFullscreen()
    lastClickTime = 0
    return
  }
  lastClickTime = now
  setTimeout(() => {
    if (lastClickTime !== 0) {
      togglePlay()
      lastClickTime = 0
    }
  }, 300)
}

function handleVolumeClick() {
  playerStore.toggleMute()
}

function handleVolumeWheel(e) {
  const delta = e.deltaY > 0 ? -0.05 : 0.05
  playerStore.setVolume(playerStore.volume + delta)
  if (videoRef.value) videoRef.value.volume = playerStore.volume
}

function handleFullscreen() {
  if (!containerRef.value) return
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    containerRef.value.requestFullscreen()
  }
}

function resetControlsTimer() {
  showControls.value = true
  clearTimeout(controlsTimer)
  controlsTimer = setTimeout(() => {
    if (playerStore.isPlaying) showControls.value = false
  }, 3000)
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

watch(() => playerStore.currentUrl, (url) => {
  nextTick(() => initPlayer(url))
}, { immediate: true })

watch(() => playerStore.isPlaying, (playing) => {
  if (!videoRef.value) return
  if (playing && videoRef.value.paused) {
    videoRef.value.play().catch(() => {})
  } else if (!playing && !videoRef.value.paused) {
    videoRef.value.pause()
  }
})

watch(() => playerStore.volume, (vol) => {
  if (videoRef.value) videoRef.value.volume = vol
})

watch(() => playerStore.isMuted, (muted) => {
  if (videoRef.value) videoRef.value.muted = muted
})

watch(() => playerStore.playbackRate, (rate) => {
  if (videoRef.value) videoRef.value.playbackRate = rate
})

function handleKeydown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
  switch (e.code) {
    case 'Space':
      e.preventDefault()
      togglePlay()
      break
    case 'ArrowLeft':
      e.preventDefault()
      if (videoRef.value) videoRef.value.currentTime -= 5
      break
    case 'ArrowRight':
      e.preventDefault()
      if (videoRef.value) videoRef.value.currentTime += 5
      break
    case 'ArrowUp':
      e.preventDefault()
      playerStore.setVolume(playerStore.volume + 0.05)
      if (videoRef.value) videoRef.value.volume = playerStore.volume
      break
    case 'ArrowDown':
      e.preventDefault()
      playerStore.setVolume(playerStore.volume - 0.05)
      if (videoRef.value) videoRef.value.volume = playerStore.volume
      break
    case 'KeyF':
      e.preventDefault()
      handleFullscreen()
      break
  }
}

onMounted(() => {
  if (videoRef.value) {
    videoRef.value.volume = playerStore.volume
  }
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  playerStore.pause()
  destroyPlayer()
  clearTimeout(controlsTimer)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    ref="containerRef"
    class="player"
    @mousemove="resetControlsTimer"
    @mouseleave="showControls = true"
  >
    <video
      ref="videoRef"
      class="player__video"
      playsinline
      preload="auto"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleLoadedMetadata"
      @ended="handleEnded"
      @click="handleVideoClick"
    />

    <div v-if="showError" class="player__error">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>{{ errorMessage }}</p>
    </div>

    <div class="player__controls" :class="{ 'is-hidden': !showControls }">
      <div class="player__progress-bar" @mousedown="handleProgressMouseDown">
        <div class="player__progress-track">
          <div class="player__progress-filled" :style="{ width: (isDragging ? dragProgress : playerStore.progress) + '%' }"></div>
          <div class="player__progress-thumb" :style="{ left: (isDragging ? dragProgress : playerStore.progress) + '%' }" v-if="isDragging"></div>
        </div>
      </div>

      <div class="player__controls-row">
        <div class="player__controls-left">
          <button class="player__btn" @click="togglePlay">
            <svg v-if="playerStore.isPlaying" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="8,5 20,12 8,19" />
            </svg>
          </button>

          <button class="player__btn" @click="playerStore.playPrev()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="19,20 9,12 19,4" />
              <rect x="5" y="4" width="2" height="16" />
            </svg>
          </button>

          <button class="player__btn" @click="playerStore.playNext()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,4 15,12 5,20" />
              <rect x="17" y="4" width="2" height="16" />
            </svg>
          </button>

          <span class="player__time">
            {{ formatTime(playerStore.currentTime) }} / {{ formatTime(playerStore.duration) }}
          </span>
        </div>

        <div class="player__controls-right">
          <button class="player__btn" @click="handleVolumeClick" @wheel.prevent="handleVolumeWheel">
            <svg v-if="playerStore.isMuted || playerStore.volume === 0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>

          <button class="player__btn" @click="handleFullscreen">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15,3 21,3 21,9" />
              <polyline points="9,21 3,21 3,15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player {
  position: relative;
  width: 100%;
  background: #000;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 8px;
}

.player__video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.player__error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: rgba(255, 255, 255, 0.7);
}

.player__error p {
  font-size: 14px;
  margin: 0;
}

.player__controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
  padding: 40px 16px 12px;
  transition: opacity 250ms ease;
}

.player__controls.is-hidden {
  opacity: 0;
  pointer-events: none;
}

.player__progress-bar {
  width: 100%;
  height: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 8px;
}

.player__progress-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  transition: height 150ms ease;
}

.player__progress-bar:hover .player__progress-track {
  height: 6px;
}

.player__progress-filled {
  height: 100%;
  background: var(--color-primary-light, #818cf8);
  border-radius: 2px;
  transition: width 100ms linear;
}

.player__progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.player__controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.player__controls-left,
.player__controls-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.player__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: background 180ms ease, color 180ms ease;
}

.player__btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.player__btn:active {
  transform: scale(0.9);
}

.player__time {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  font-variant-numeric: tabular-nums;
  margin-left: 4px;
}
</style>
