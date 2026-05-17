<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const collapsed = ref(false)

const navItems = [
  { path: '/', icon: 'home', label: '首页' },
  { path: '/search', icon: 'search', label: '搜索' },
  { path: '/sources', icon: 'sources', label: '订阅源' },
  { path: '/enhance', icon: 'enhance', label: 'AI增强' },
  { path: '/history', icon: 'history', label: '历史' }
]

const currentPath = computed(() => route.path)

const toggleCollapse = () => { collapsed.value = !collapsed.value }

const navigate = (path) => { router.push(path) }
</script>

<template>
  <aside class="side-bar" :class="{ 'is-collapsed': collapsed }">
    <nav class="side-bar__nav">
      <button
        v-for="item in navItems"
        :key="item.path"
        class="side-bar__item"
        :class="{ 'is-active': currentPath === item.path }"
        :title="item.label"
        @click="navigate(item.path)"
      >
        <span class="side-bar__active-bar"></span>
        <span class="side-bar__icon-wrap">
          <svg v-if="item.icon === 'home'" class="side-bar__svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 8.5L10 2.5l7 6V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5z" />
            <path d="M7.5 18V11h5v7" />
          </svg>
          <svg v-else-if="item.icon === 'search'" class="side-bar__svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <line x1="13" y1="13" x2="17" y2="17" />
          </svg>
          <svg v-else-if="item.icon === 'sources'" class="side-bar__svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="10" cy="5" rx="7" ry="2.5" />
            <path d="M3 5v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5V5" />
            <path d="M3 9v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5V9" />
          </svg>
          <svg v-else-if="item.icon === 'enhance'" class="side-bar__svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 2l1.5 3.5L15 7l-3.5 1.5L10 12l-1.5-3.5L5 7l3.5-1.5L10 2z" />
            <path d="M15 11l.75 1.75L17.5 13.5l-1.75.75L15 16l-.75-1.75L12.5 13.5l1.75-.75L15 11z" />
            <path d="M3 14l.75 1.75L5.5 16.5l-1.75.75L3 19l-.75-1.75L.5 16.5l1.75-.75L3 14z" />
          </svg>
          <svg v-else class="side-bar__svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="10" r="7.5" />
            <polyline points="10,5.5 10,10 13.5,12" />
          </svg>
        </span>
      </button>
    </nav>

    <div class="side-bar__divider"></div>

    <button class="side-bar__toggle" @click="toggleCollapse" title="折叠/展开">
      <svg class="side-bar__toggle-icon" :class="{ 'is-rotated': collapsed }" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="10,4 6,8 10,12" />
      </svg>
    </button>
  </aside>
</template>

<style scoped>
.side-bar {
  display: flex;
  flex-direction: column;
  width: 72px;
  height: 100%;
  padding: 16px 0;
  background: #0a0a1a;
  border-right: 1px solid #0a0a1a;
  flex-shrink: 0;
  transition: width 280ms cubic-bezier(0.4, 0, 0.2, 1);
  align-items: center;
}

.side-bar.is-collapsed {
  width: 52px;
}

.side-bar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  width: 100%;
  padding: 0 10px;
}

.side-bar__item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  max-height: 48px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.side-bar__item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.8);
}

.side-bar__item:active {
  transform: scale(0.92);
}

.side-bar__item.is-active {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary-light, #818cf8);
}

.side-bar__item.is-active:hover {
  background: rgba(99, 102, 241, 0.16);
}

.side-bar__active-bar {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 3px;
  height: 20px;
  border-radius: 0 3px 3px 0;
  background: var(--color-primary-light, #818cf8);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

.side-bar__item.is-active .side-bar__active-bar {
  transform: translateY(-50%) scaleY(1);
}

.side-bar__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.side-bar__item:hover .side-bar__icon-wrap {
  transform: scale(1.1);
}

.side-bar__svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.side-bar__divider {
  width: 28px;
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 8px 0;
  flex-shrink: 0;
}

.side-bar__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-bottom: 4px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.side-bar__toggle:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
}

.side-bar__toggle:active {
  transform: scale(0.9);
}

.side-bar__toggle-icon {
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.side-bar__toggle-icon.is-rotated {
  transform: rotate(180deg);
}
</style>
