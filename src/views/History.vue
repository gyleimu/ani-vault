<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHistoryStore } from '../store/useHistoryStore'

const router = useRouter()
const historyStore = useHistoryStore()

onMounted(() => {
  historyStore.loadFromStorage()
})

const continueWatch = (record) => {
  router.push(`/player/${record.animeId}?ep=${record.episodeId}`)
}
</script>

<template>
  <div class="history-page">
    <div class="history-page__header">
      <button v-if="historyStore.records.length" class="history-page__clear" @click="historyStore.clearAll()"></button>
    </div>

    <div v-if="historyStore.records.length" class="history-page__list">
      <div
        v-for="record in historyStore.records"
        :key="record.animeId + record.episodeId"
        class="history-page__item"
        @click="continueWatch(record)"
      >
        <div class="history-page__item-info">
          <h3 class="history-page__item-title">{{ record.title || '' }}</h3>
        </div>
        <div class="history-page__item-progress">
          <div class="history-page__progress-bar">
            <div class="history-page__progress-fill" :style="{ width: (record.progress / record.duration * 100) + '%' }" />
          </div>
        </div>
        <button class="history-page__item-play"></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px 40px;
}

.history-page__header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.history-page__clear {
  padding: 6px 16px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.history-page__clear:hover { border-color: var(--color-error); color: var(--color-error); }

.history-page__list { display: flex; flex-direction: column; gap: 12px; }

.history-page__item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.history-page__item:hover { border-color: var(--color-border-light); }

.history-page__item-info { flex: 1; }

.history-page__item-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.history-page__item-progress { width: 120px; }

.history-page__progress-bar {
  height: 4px;
  background: var(--color-bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.history-page__progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 2px;
  transition: width var(--transition-base);
}

.history-page__item-play {
  padding: 6px 16px;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-sm);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.history-page__item-play:hover { background: var(--color-primary-hover); }
</style>
