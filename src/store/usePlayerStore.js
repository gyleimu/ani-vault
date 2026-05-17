import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'anivault_player'

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

export const usePlayerStore = defineStore('player', () => {
  const saved = loadPersisted()

  const currentAnime = ref(saved.currentAnime || null)
  const currentEpisode = ref(saved.currentEpisode || null)
  const currentSourceIndex = ref(saved.currentSourceIndex || 0)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(saved.volume ?? 0.8)
  const isMuted = ref(false)
  const playbackRate = ref(1)
  const isFullscreen = ref(false)
  const videoReferer = ref('')

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentAnime: currentAnime.value,
        currentEpisode: currentEpisode.value,
        currentSourceIndex: currentSourceIndex.value,
        volume: volume.value
      }))
    } catch {}
  }

  watch([currentAnime, currentEpisode, currentSourceIndex, volume], persist, { deep: true })

  const progress = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })

  const currentUrl = computed(() => {
    if (!currentEpisode.value) return ''
    return currentEpisode.value.url || ''
  })

  const episodeList = computed(() => {
    if (!currentAnime.value?.episodeSources?.length) return []
    const si = currentSourceIndex.value
    return currentAnime.value.episodeSources[si] || currentAnime.value.episodeSources[0] || []
  })

  const sourceNames = computed(() => {
    if (!currentAnime.value?.playFrom) return []
    return currentAnime.value.playFrom.split('$$$').map(s => s.trim()).filter(Boolean)
  })

  function loadAnime(anime, episodeIndex = 0, sourceIndex = 0) {
    currentAnime.value = anime
    currentSourceIndex.value = sourceIndex
    const eps = anime.episodeSources?.[sourceIndex] || anime.episodeSources?.[0] || []
    currentEpisode.value = eps[episodeIndex] || eps[0] || null
    currentTime.value = 0
    duration.value = 0
    isPlaying.value = true
  }

  function playEpisode(index) {
    const eps = episodeList.value
    if (index >= 0 && index < eps.length) {
      currentEpisode.value = eps[index]
      currentTime.value = 0
      duration.value = 0
      isPlaying.value = true
    }
  }

  function switchSource(index) {
    if (!currentAnime.value?.episodeSources?.[index]) return
    currentSourceIndex.value = index
    const eps = currentAnime.value.episodeSources[index]
    const currentEpName = currentEpisode.value?.name
    const match = eps.find(ep => ep.name === currentEpName)
    currentEpisode.value = match || eps[0]
    currentTime.value = 0
    duration.value = 0
  }

  function playNext() {
    const eps = episodeList.value
    const currentIndex = eps.findIndex(ep => ep.url === currentEpisode.value?.url)
    if (currentIndex >= 0 && currentIndex < eps.length - 1) {
      playEpisode(currentIndex + 1)
    }
  }

  function playPrev() {
    const eps = episodeList.value
    const currentIndex = eps.findIndex(ep => ep.url === currentEpisode.value?.url)
    if (currentIndex > 0) {
      playEpisode(currentIndex - 1)
    }
  }

  function togglePlay() { isPlaying.value = !isPlaying.value }
  function play() { isPlaying.value = true }
  function pause() { isPlaying.value = false }
  function seekTo(time) { currentTime.value = time }
  function updateTime(time) { currentTime.value = time }
  function setDuration(dur) { duration.value = dur }
  function setVolume(val) {
    volume.value = Math.max(0, Math.min(1, val))
    if (val > 0) isMuted.value = false
  }
  function toggleMute() { isMuted.value = !isMuted.value }
  function setPlaybackRate(rate) { playbackRate.value = rate }
  function toggleFullscreen() { isFullscreen.value = !isFullscreen.value }
  function setVideoReferer(r) { videoReferer.value = r || '' }

  function reset() {
    currentAnime.value = null
    currentEpisode.value = null
    currentSourceIndex.value = 0
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    persist()
  }

  return {
    currentAnime,
    currentEpisode,
    currentSourceIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    isFullscreen,
    videoReferer,
    progress,
    currentUrl,
    episodeList,
    sourceNames,
    loadAnime,
    playEpisode,
    switchSource,
    playNext,
    playPrev,
    togglePlay,
    play,
    pause,
    seekTo,
    updateTime,
    setDuration,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleFullscreen,
    setVideoReferer,
    reset
  }
})
