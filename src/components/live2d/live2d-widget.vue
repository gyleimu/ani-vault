<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const visible = ref(true)
const loaded = ref(false)
const showPanel = ref(false)
const dialogText = ref('')
const showDialog = ref(false)
const currentKey = ref('shizuku')
const isDragging = ref(false)
const dragOffset = { x: 0, y: 0 }
const position = ref({ x: null, y: null })
const hasError = ref(false)
const loadingModel = ref(false)
let oml2dInstance = null
let instanceReady = false
let dragStartPos = { x: 0, y: 0 }
let wasDragging = false

const MODEL_KEY = 'anivault_live2d_model'
const VISIBLE_KEY = 'anivault_live2d_visible'
const POSITION_KEY = 'anivault_live2d_position'

const GREETINGS = [
  '欢迎来到AniVault~ 🎬',
  '今天看什么动漫呢？(◕ᴗ◕✿)',
  '一起追番吧！✨',
  '动漫时间到啦~',
  '有什么想看的吗？',
  '新番更新了哦~',
  '摸鱼不如看番！',
  '一起探索新世界吧~',
  '休息一下，看部动漫吧~',
  '你是最棒的！💪'
]

const MODEL_LIST = [
  { key: 'shizuku', name: '水滴', desc: '活泼的少女', path: '/live2d-models/shizuku/shizuku.model.json', position: [70, 70], scale: 0.2, stageStyle: { height: 370, width: 400 } },
  { key: 'haru', name: '春日', desc: '温柔的和服少女', path: '/live2d-models/haru/haru_greeter_t03.model3.json', position: [70, 70], scale: 0.2, stageStyle: { height: 370, width: 400 } },
  { key: 'yiselin', name: '伊瑟琳', desc: '崩坏学园2角色', path: '/live2d-models/yiselin/model.json', position: [0, 20], scale: 0.15, stageStyle: { height: 350, width: 350 } },
  { key: 'kp31', name: '柯尔特', desc: '少女前线战术人形', path: '/live2d-models/kp31/model.json', position: [0, 60], scale: 0.08, stageStyle: { height: 450, width: 400 } },
  { key: 'himeko', name: '姬子', desc: '崩坏学园2角色', path: '/live2d-models/himeko/model.json', position: [0, 20], scale: 0.15, stageStyle: { height: 350, width: 350 } },
  { key: 'bronya', name: '布洛妮娅', desc: '崩坏学园2角色', path: '/live2d-models/bronya/model.json', position: [0, 20], scale: 0.15, stageStyle: { height: 350, width: 350 } }
]

function currentModelIndex() {
  return MODEL_LIST.findIndex(m => m.key === currentKey.value)
}

function modelToOption(m) {
  return {
    name: m.key,
    path: m.path,
    scale: m.scale,
    position: m.position,
    stageStyle: m.stageStyle || {},
    volume: 0,
    motionPreloadStrategy: 'NONE'
  }
}

function randomGreeting() {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
}

function showGreeting(text) {
  dialogText.value = text || randomGreeting()
  showDialog.value = true
  setTimeout(() => { showDialog.value = false }, 4000)
}

function handleClick() {
  if (wasDragging) { wasDragging = false; return }
  showGreeting()
}

function onMouseDown(e) {
  isDragging.value = true
  wasDragging = false
  dragStartPos.x = e.clientX
  dragStartPos.y = e.clientY
  const rect = e.currentTarget.getBoundingClientRect()
  dragOffset.x = e.clientX - rect.left
  dragOffset.y = e.clientY - rect.top
  e.preventDefault()
}

function onMouseMove(e) {
  if (!isDragging.value) return
  const dx = e.clientX - dragStartPos.x
  const dy = e.clientY - dragStartPos.y
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) wasDragging = true
  position.value = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
}

function onMouseUp() {
  if (isDragging.value) {
    isDragging.value = false
    if (position.value.x !== null) {
      try { localStorage.setItem(POSITION_KEY, JSON.stringify(position.value)) } catch {}
    }
  }
}

let pixiErrorHandler = null

function setupPixiErrorHandler() {
  if (pixiErrorHandler) return
  pixiErrorHandler = (event) => {
    const stack = (event.error?.stack || '') + (event.reason?.stack || '')
    const msg = event.message || event.reason?.message || String(event.reason || '')
    const text = msg + stack
    if (
      text.includes('_calculateBounds') ||
      text.includes('updateTransform') ||
      text.includes('modelSize') ||
      (text.includes('width') && text.includes('pixi'))
    ) {
      event.preventDefault()
      return false
    }
  }
  window.addEventListener('error', pixiErrorHandler)
  window.addEventListener('unhandledrejection', pixiErrorHandler)
}

function removePixiErrorHandler() {
  if (pixiErrorHandler) {
    window.removeEventListener('error', pixiErrorHandler)
    window.removeEventListener('unhandledrejection', pixiErrorHandler)
    pixiErrorHandler = null
  }
}

let loadTimeout = null

async function initOml2d() {
  if (instanceReady) return
  if (loadingModel.value) return
  loadingModel.value = true
  hasError.value = false

  if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null }

  loadTimeout = setTimeout(() => {
    if (loadingModel.value) {
      loadingModel.value = false
      hasError.value = true
    }
  }, 20000)

  try {
    const { loadOml2d } = await import('oh-my-live2d')

    const savedIdx = currentModelIndex()
    const firstModel = MODEL_LIST[savedIdx >= 0 ? savedIdx : 0]

    oml2dInstance = loadOml2d({
      parentElement: document.body,
      dockedPosition: 'right',
      primaryColor: '#6633ff',
      models: [modelToOption(firstModel)],
      statusBar: { disable: true },
      menus: { disable: true },
      tips: {
        welcomeTips: { duration: 0 },
        idleTips: {}
      }
    })

    oml2dInstance.onLoad((status) => {
      if (status === 'success') {
        instanceReady = true
        loaded.value = true
        hasError.value = false
        if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null }
        loadingModel.value = false
        setTimeout(() => showGreeting('欢迎来到AniVault~ 🎬'), 500)
      } else if (status === 'fail') {
        hasError.value = true
        if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null }
        loadingModel.value = false
      }
    })
  } catch (err) {
    if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null }
    loadingModel.value = false
    hasError.value = true
  }
}

async function switchModel(key) {
  if (key === currentKey.value) return
  currentKey.value = key
  try { localStorage.setItem(MODEL_KEY, key) } catch {}
  showPanel.value = false

  if (!oml2dInstance) return

  loadingModel.value = true
  try {
    if (oml2dInstance.loadModelByName) {
      await oml2dInstance.loadModelByName(key)
    } else if (oml2dInstance.loadModelByIndex) {
      const idx = MODEL_LIST.findIndex(m => m.key === key)
      await oml2dInstance.loadModelByIndex(idx >= 0 ? idx : 0)
    }
  } catch {} finally {
    loadingModel.value = false
  }
}

function toggleVisible() {
  visible.value = !visible.value
  try { localStorage.setItem(VISIBLE_KEY, visible.value ? '1' : '0') } catch {}
  if (oml2dInstance) {
    if (visible.value) {
      oml2dInstance.stageSlideIn?.()
    } else {
      oml2dInstance.stageSlideOut?.()
    }
  }
}

function handleRetry() {
  hasError.value = false
  if (oml2dInstance && oml2dInstance.reloadModel) {
    loadingModel.value = true
    oml2dInstance.reloadModel().then(() => {
      loadingModel.value = false
      loaded.value = true
    }).catch(() => {
      loadingModel.value = false
      hasError.value = true
    })
  } else {
    instanceReady = false
    initOml2d()
  }
}

onMounted(async () => {
  setupPixiErrorHandler()

  const saved = localStorage.getItem(MODEL_KEY)
  if (saved && MODEL_LIST.find(m => m.key === saved)) currentKey.value = saved

  const savedVisible = localStorage.getItem(VISIBLE_KEY)
  if (savedVisible === '0') { visible.value = false; return }

  const savedPos = localStorage.getItem(POSITION_KEY)
  if (savedPos) {
    try { position.value = JSON.parse(savedPos) } catch {}
  }

  await nextTick()
  initOml2d()
})

onBeforeUnmount(() => {
  if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null }
  removePixiErrorHandler()
})
</script>

<template>
  <div
    v-if="visible"
    class="live2d-widget"
    :class="{ dragging: isDragging }"
    :style="{
      right: position.x !== null ? 'auto' : '16px',
      bottom: position.x !== null ? 'auto' : '0',
      left: position.x !== null ? position.x + 'px' : 'auto',
      top: position.x !== null ? position.y + 'px' : 'auto'
    }"
  >
    <div
      class="live2d-drag-area"
      @mousedown="onMouseDown"
      @click="handleClick"
    />
    <div v-if="dialogText && showDialog" class="live2d-dialog">
      <div class="live2d-dialog__content">{{ dialogText }}</div>
    </div>
    <button class="live2d-toggle-btn" @click.stop="showPanel = !showPanel" title="外观选择">
      🎨
    </button>
    <transition name="panel-fade">
      <div v-if="showPanel" class="live2d-panel" @click.stop>
        <div class="live2d-panel__header">
          <span>选择外观</span>
          <button class="live2d-panel__close" @click="showPanel = false">×</button>
        </div>
        <div class="live2d-panel__list">
          <button
            v-for="m in MODEL_LIST"
            :key="m.key"
            class="live2d-panel__item"
            :class="{ active: currentKey === m.key }"
            @click="switchModel(m.key)"
            :disabled="loadingModel"
          >
            <div class="live2d-panel__item-name">{{ m.name }}</div>
            <div class="live2d-panel__item-desc">{{ m.desc }}</div>
          </button>
        </div>
      </div>
    </transition>
    <div v-if="hasError" class="live2d-error" @click="handleRetry">
      <span>加载失败，点击重试</span>
    </div>
    <div v-if="loadingModel && !hasError" class="live2d-loading">
      <div class="live2d-loading__spinner"></div>
      <span>模型加载中...</span>
    </div>
  </div>

  <button
    v-if="!visible"
    class="live2d-show-btn"
    @click="toggleVisible"
    title="显示看板娘"
  >
    🎭
  </button>
  <button
    v-if="visible"
    class="live2d-hide-btn"
    @click="toggleVisible"
    title="隐藏看板娘"
  >
    ✕
  </button>

  <div
    v-if="isDragging"
    class="live2d-drag-overlay"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
  />
</template>

<style scoped>
.live2d-widget {
  position: fixed;
  z-index: 9998;
  pointer-events: none;
  transition: none;
}
.live2d-widget.dragging {
  opacity: 0.85;
}
.live2d-drag-area {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 300px;
  height: 300px;
  cursor: grab;
  pointer-events: auto;
  z-index: 10;
  border-radius: 8px;
  user-select: none;
}
.live2d-drag-area:active {
  cursor: grabbing;
}
.live2d-dialog {
  position: absolute;
  bottom: 320px;
  right: 0;
  pointer-events: auto;
  z-index: 20;
  animation: dialog-in 0.3s ease-out;
}
.live2d-dialog__content {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  max-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  line-height: 1.5;
  word-break: break-all;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(102, 51, 255, 0.15);
}
@keyframes dialog-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.live2d-toggle-btn {
  position: absolute;
  bottom: 310px;
  right: 10px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(102, 51, 255, 0.85);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(102, 51, 255, 0.3);
  transition: transform 0.2s;
  z-index: 20;
}
.live2d-toggle-btn:hover { transform: scale(1.1); }
.live2d-panel {
  position: absolute;
  bottom: 350px;
  right: 0;
  width: 220px;
  background: var(--bg-primary, #1a1a2e);
  border: 1px solid var(--border, rgba(255,255,255,0.1));
  border-radius: 12px;
  overflow: hidden;
  pointer-events: auto;
  z-index: 30;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
.live2d-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #fff);
  border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));
}
.live2d-panel__close {
  background: none;
  border: none;
  color: var(--text-secondary, #aaa);
  cursor: pointer;
  font-size: 18px;
  padding: 0 4px;
}
.live2d-panel__list {
  padding: 6px;
  max-height: 300px;
  overflow-y: auto;
}
.live2d-panel__item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  margin-bottom: 2px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.live2d-panel__item:hover {
  background: var(--bg-secondary, rgba(255, 255, 255, 0.06));
}
.live2d-panel__item.active {
  background: rgba(102, 51, 255, 0.2);
  border-left: 3px solid #6633ff;
}
.live2d-panel__item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.live2d-panel__item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #fff);
}
.live2d-panel__item-desc {
  font-size: 11px;
  color: var(--text-secondary, #aaa);
  margin-top: 2px;
}
.live2d-error {
  position: absolute;
  bottom: 80px;
  right: 20px;
  padding: 8px 14px;
  background: rgba(255, 77, 79, 0.15);
  border: 1px solid rgba(255, 77, 79, 0.3);
  border-radius: 8px;
  color: #ff6b6b;
  font-size: 12px;
  cursor: pointer;
  pointer-events: auto;
}
.live2d-loading {
  position: absolute;
  bottom: 120px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(26, 26, 46, 0.85);
  border: 1px solid rgba(102, 51, 255, 0.3);
  border-radius: 8px;
  color: #aaa;
  font-size: 12px;
  pointer-events: none;
  backdrop-filter: blur(4px);
}
.live2d-loading__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(102, 51, 255, 0.3);
  border-top-color: #6633ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.live2d-show-btn {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(102, 51, 255, 0.85);
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  box-shadow: 0 2px 12px rgba(102, 51, 255, 0.4);
  z-index: 9999;
  transition: transform 0.2s;
}
.live2d-show-btn:hover { transform: scale(1.1); }
.live2d-hide-btn {
  position: fixed;
  bottom: 310px;
  right: 16px;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 77, 79, 0.7);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  transition: transform 0.2s;
}
.live2d-hide-btn:hover { transform: scale(1.1); }
.live2d-drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 9997;
  cursor: grabbing;
}
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
