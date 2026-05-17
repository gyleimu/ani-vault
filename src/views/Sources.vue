<template>
  <div class="source-page">
    <div class="source-scroll">
      <div class="source-header">
        <h1 class="source-title">订阅源管理</h1>
        <p class="source-desc">添加 TVBox 订阅源或 MacCMS API 地址，管理你的视频源</p>
      </div>

      <div class="source-input-section">
        <div class="input-row">
          <input
            v-model="sourceStore.inputUrl"
            type="text"
            class="source-input"
            name="source-url"
            id="source-url"
            placeholder="输入 TVBox 订阅源或 MacCMS API 地址..."
            autocomplete="off"
            @keyup.enter="handleAdd"
          />
          <button
            class="add-btn"
            :disabled="sourceStore.loading"
            @click="handleAdd"
          >
            <span v-if="sourceStore.loading" class="btn-spinner"></span>
            <span v-else>添加</span>
          </button>
        </div>
        <div v-if="sourceStore.error" class="error-msg">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>{{ sourceStore.error }}</span>
        </div>
      </div>

      <div class="active-source-bar" v-if="sourceStore.activeSource">
        <div class="active-label">当前使用</div>
        <div class="active-info">
          <span class="active-name">{{ sourceStore.activeSource.name }}</span>
          <span class="active-api">{{ sourceStore.activeSource.api }}</span>
        </div>
        <button class="reset-btn" @click="sourceStore.resetToDefault()">重置</button>
      </div>

      <div class="source-actions" v-if="sourceStore.subscriptions.length > 0">
        <button class="action-btn action-refresh" :disabled="sourceStore.loading" @click="sourceStore.refreshAllSubscriptions()">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
          </svg>
          刷新全部
        </button>
        <button class="action-btn action-clear" @click="handleClearAll">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          清除全部
        </button>
      </div>

      <div class="source-sections">
        <div class="source-group" v-if="sourceStore.pluginSources.length">
          <div class="group-header">
            <div class="group-icon sub">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
              </svg>
            </div>
            <h3 class="group-title">内置插件</h3>
            <span class="group-count">{{ sourceStore.pluginSources.length }} 个源</span>
          </div>
          <div class="sites-grid">
            <div
              v-for="site in sourceStore.pluginSources"
              :key="site.key"
              class="site-card"
              :class="{ 'is-active': sourceStore.isActive(site) }"
              @click="sourceStore.selectSource(site)"
            >
              <div class="site-main">
                <div class="site-name">{{ site.name }}</div>
                <div class="site-api">{{ site.ext || site.cspModule }}</div>
              </div>
              <div class="site-badges">
                <span v-if="site.searchable" class="badge badge-green">可搜索</span>
                <span v-if="site.quickSearch" class="badge badge-purple">快搜</span>
                <span class="badge badge-gray">插件</span>
              </div>
              <div v-if="sourceStore.isActive(site)" class="active-indicator">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div
          v-for="sub in sourceStore.subscriptions"
          :key="sub.url"
          class="source-group"
        >
          <div class="group-header">
            <div class="group-icon sub">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
              </svg>
            </div>
            <h3 class="group-title">{{ sub.name }}</h3>
            <span class="group-count">{{ sub.sites.length }} 个源</span>
            <button class="remove-sub-btn" @click="handleRemove(sub.url)" title="删除订阅">
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
          <div class="sites-grid">
            <div
              v-for="site in sub.sites"
              :key="site.key"
              class="site-card"
              :class="{ 'is-active': sourceStore.isActive(site) }"
              @click="sourceStore.selectSource(site)"
            >
              <div class="site-main">
                <div class="site-name">{{ site.name }}</div>
                <div class="site-api">{{ truncateUrl(site.api) }}</div>
              </div>
              <div class="site-badges">
                <span v-if="site.searchable" class="badge badge-green">可搜索</span>
                <span v-if="site.quickSearch" class="badge badge-purple">快搜</span>
                <span class="badge badge-blue">type{{ site.type }}</span>
              </div>
              <div v-if="sourceStore.isActive(site)" class="active-indicator">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!sourceStore.subscriptions.length && !sourceStore.loading" class="empty-hint">
        <div class="hint-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
            <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <p class="hint-text">还没有添加订阅源</p>
        <p class="hint-sub">在上方输入 TVBox 订阅源或 MacCMS API 地址即可开始使用</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSourceStore } from '../store/useSourceStore'

const sourceStore = useSourceStore()

const handleAdd = async () => {
  const result = await sourceStore.addSubscription(sourceStore.inputUrl)
  if (result) {
    sourceStore.inputUrl = ''
  }
}

const handleRemove = (url) => {
  sourceStore.removeSubscription(url)
}

const handleClearAll = () => {
  sourceStore.clearAllSubscriptions()
}

const truncateUrl = (url) => {
  if (!url) return ''
  try {
    const u = new URL(url)
    return u.hostname + u.pathname.replace(/\/$/, '')
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '...' : url
  }
}
</script>

<style scoped>
.source-page {
  width: 100%;
  height: 100%;
  background: #0a0a1a;
  overflow: hidden;
}

.source-scroll {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 32px;
}

.source-scroll::-webkit-scrollbar {
  width: 6px;
}

.source-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.source-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
}

.source-header {
  margin-bottom: 28px;
}

.source-title {
  font-size: 22px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 6px 0;
}

.source-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
}

.source-input-section {
  margin-bottom: 20px;
}

.input-row {
  display: flex;
  gap: 10px;
}

.source-input {
  flex: 1;
  height: 44px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0 16px;
  color: #fff;
  font-size: 13px;
  font-family: var(--font-mono);
  outline: none;
  transition: all 200ms ease;
}

.source-input:focus {
  border-color: rgba(99, 102, 241, 0.5);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.source-input::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

.add-btn {
  height: 44px;
  padding: 0 24px;
  background: linear-gradient(135deg, #6366f1, #7c3aed);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
  white-space: nowrap;
}

.add-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
}

.add-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  color: #f87171;
  font-size: 13px;
}

.active-source-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  margin-bottom: 24px;
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
}

.active-label {
  font-size: 11px;
  font-weight: 600;
  color: #818cf8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.active-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.active-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.active-api {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reset-btn {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  cursor: pointer;
  transition: all 200ms ease;
  white-space: nowrap;
}

.reset-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}

.source-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  cursor: pointer;
  transition: all 200ms ease;
}

.action-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-refresh:hover:not(:disabled) {
  border-color: rgba(99, 102, 241, 0.3);
  color: #818cf8;
}

.action-clear:hover:not(:disabled) {
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.source-sections {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.source-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex-shrink: 0;
}

.group-icon.sub {
  background: rgba(99, 102, 241, 0.1);
  color: #818cf8;
}

.group-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
}

.group-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.25);
}

.remove-sub-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-left: auto;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 200ms ease;
}

.remove-sub-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.sites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.site-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 200ms ease;
}

.site-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}

.site-card.is-active {
  background: rgba(99, 102, 241, 0.06);
  border-color: rgba(99, 102, 241, 0.25);
}

.site-card.is-active:hover {
  background: rgba(99, 102, 241, 0.1);
}

.site-card.is-unsupported {
  opacity: 0.45;
  cursor: not-allowed;
}

.site-card.is-unsupported:hover {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.05);
}

.unsupported-tag {
  display: inline-block;
  padding: 1px 6px;
  margin-left: 6px;
  background: rgba(251, 146, 60, 0.15);
  color: #fb923c;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  vertical-align: middle;
}

.site-main {
  flex: 1;
  min-width: 0;
}

.site-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 3px;
}

.site-api {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-badges {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.badge {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.badge-green {
  background: rgba(34, 197, 94, 0.1);
  color: #4ade80;
}

.badge-blue {
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
}

.badge-purple {
  background: rgba(168, 85, 247, 0.1);
  color: #c084fc;
}

.badge-gray {
  background: rgba(156, 163, 175, 0.1);
  color: #9ca3af;
}

.active-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #6366f1;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.hint-icon {
  color: rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
}

.hint-text {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 6px 0;
}

.hint-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.2);
  margin: 0;
}
</style>
