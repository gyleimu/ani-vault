<script setup>
import { computed, shallowRef, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const appWindow = shallowRef(null)

onMounted(async () => {
  if ('__TAURI_INTERNALS__' in window) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    appWindow.value = getCurrentWindow()
  }
})

const isHome = computed(() => route.path === '/')
const handleBack = () => router.back()
const handleMinimize = () => appWindow.value?.minimize()
const handleToggleMaximize = () => appWindow.value?.toggleMaximize()
const handleClose = () => appWindow.value?.close()

function handleDragStart(e) {
  if (e.target.closest('button')) return
  appWindow.value?.startDragging()
}
</script>

<template>
  <header class="title-bar" @mousedown="handleDragStart">
    <div class="title-bar__left">
      <button class="title-bar__btn title-bar__btn--back" :class="{ 'is-disabled': isHome }" @click="handleBack">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="10,3 5,8 10,13" />
        </svg>
      </button>
    </div>
    <div class="title-bar__controls">
      <button class="title-bar__btn title-bar__btn--minimize" @click="handleMinimize">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
          <line x1="1" y1="5" x2="9" y2="5" />
        </svg>
      </button>
      <button class="title-bar__btn title-bar__btn--maximize" @click="handleToggleMaximize">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="1" width="8" height="8" rx="1.5" />
        </svg>
      </button>
      <button class="title-bar__btn title-bar__btn--close" @click="handleClose">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
          <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
          <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 42px;
  padding: 0 12px;
  background: #0a0a1a;
  border-bottom: 1px solid #0a0a1a;
  user-select: none;
  flex-shrink: 0;
}

.title-bar__left {
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10;
}

.title-bar__controls {
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 10;
}

.title-bar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 33px;
  height: 33px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
}

.title-bar__btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.title-bar__btn:active {
  transform: scale(0.88);
  background: rgba(255, 255, 255, 0.06);
}

.title-bar__btn--back {
  color: rgba(255, 255, 255, 0.5);
}

.title-bar__btn--back:hover {
  color: rgba(255, 255, 255, 0.9);
}

.title-bar__btn--back.is-disabled {
  opacity: 0.2;
  cursor: default;
  pointer-events: none;
}

.title-bar__btn--close:hover {
  background: rgba(232, 17, 35, 0.85);
  color: #fff;
  box-shadow: 0 0 12px rgba(232, 17, 35, 0.3);
}

.title-bar__btn--close:active {
  background: rgba(232, 17, 35, 0.65);
  box-shadow: none;
}
</style>
