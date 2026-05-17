<script setup>
import { computed } from 'vue'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  selectedTaskId: { type: String, default: null },
  connectionStatus: { type: String, default: 'disconnected' }
})

const emit = defineEmits(['select', 'cancel', 'reconnect'])

const statusClass = computed(() => {
  const map = {
    connected: 'status--connected',
    disconnected: 'status--disconnected',
    reconnecting: 'status--reconnecting',
    polling: 'status--polling'
  }
  return map[props.connectionStatus] || 'status--disconnected'
})

const statusText = computed(() => {
  const map = {
    connected: '已连接',
    disconnected: '未连接',
    reconnecting: '重连中',
    polling: '轮询中'
  }
  return map[props.connectionStatus] || '未连接'
})
</script>

<template>
  <div class="task-queue">
    <div class="task-queue__header">
      <span class="task-queue__title">任务队列</span>
      <span class="task-queue__status" :class="statusClass">
        <span class="task-queue__status-dot"></span>
        {{ statusText }}
      </span>
    </div>

    <div v-if="tasks.length === 0" class="task-queue__empty">
      暂无任务
    </div>

    <div v-else class="task-queue__list">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-item"
        :class="{ 'is-selected': task.id === selectedTaskId, 'is-failed': task.status === 'failed' }"
        @click="emit('select', task.id)"
      >
        <span class="task-item__status-icon" :class="`status-${task.status}`">
          <template v-if="task.status === 'pending'">⏳</template>
          <template v-else-if="task.status === 'running'">▶</template>
          <template v-else-if="task.status === 'completed'">✓</template>
          <template v-else-if="task.status === 'failed'">✕</template>
          <template v-else-if="task.status === 'canceled'">◼</template>
        </span>

        <div class="task-item__info">
          <span class="task-item__name">{{ task.name }}</span>
          <span class="task-item__meta">
            {{ task.inputPath ? task.inputPath.split(/[/\\]/).pop() : '' }}
          </span>
        </div>

        <div class="task-item__progress-wrap">
          <div class="task-item__progress-bar">
            <div
              class="task-item__progress-fill"
              :class="`fill-${task.status}`"
              :style="{ width: `${task.progress}%` }"
            ></div>
          </div>
          <span class="task-item__progress-text">{{ Math.round(task.progress) }}%</span>
        </div>

        <button
          v-if="task.status === 'pending' || task.status === 'running'"
          class="task-item__cancel"
          @click.stop="emit('cancel', task.id)"
          title="取消任务"
        >✕</button>
      </div>
    </div>

    <button
      v-if="connectionStatus === 'disconnected'"
      class="task-queue__reconnect"
      @click="emit('reconnect')"
    >重新连接</button>
  </div>
</template>

<style scoped>
.task-queue {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.task-queue__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-default);
}

.task-queue__title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.task-queue__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  transition: color var(--duration-fast) var(--ease-out);
}

.task-queue__status-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--text-tertiary);
  transition: background var(--duration-fast) var(--ease-out);
}

.status--connected {
  color: var(--color-success);
}

.status--connected .task-queue__status-dot {
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
}

.status--disconnected {
  color: var(--color-error);
}

.status--disconnected .task-queue__status-dot {
  background: var(--color-error);
}

.status--reconnecting {
  color: var(--color-warning);
}

.status--reconnecting .task-queue__status-dot {
  background: var(--color-warning);
  animation: pulse-dot 1s ease-in-out infinite;
}

.status--polling {
  color: var(--color-info);
}

.status--polling .task-queue__status-dot {
  background: var(--color-info);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.task-queue__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.task-queue__list {
  display: flex;
  flex-direction: column;
  max-height: 400px;
  overflow-y: auto;
}

.task-queue__list::-webkit-scrollbar {
  width: 4px;
}

.task-queue__list::-webkit-scrollbar-track {
  background: transparent;
}

.task-queue__list::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: var(--radius-full);
}

.task-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
  border-left: 2px solid transparent;
}

.task-item + .task-item {
  border-top: 1px solid var(--border-subtle);
}

.task-item:hover {
  background: var(--glass-bg-hover);
}

.task-item.is-selected {
  background: var(--glass-bg-hover);
  border-left-color: var(--color-primary);
  box-shadow: inset 0 0 12px var(--color-primary-glow);
}

.task-item.is-failed {
  border-left-color: var(--color-error);
}

.task-item__status-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  border-radius: var(--radius-full);
}

.task-item__status-icon.status-pending {
  color: var(--color-warning);
}

.task-item__status-icon.status-running {
  color: var(--color-primary);
  animation: pulse-icon 1.2s ease-in-out infinite;
}

.task-item__status-icon.status-completed {
  color: var(--color-success);
  background: rgba(34, 197, 94, 0.12);
}

.task-item__status-icon.status-failed {
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.12);
}

.task-item__status-icon.status-canceled {
  color: var(--text-tertiary);
}

@keyframes pulse-icon {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.task-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-item__name {
  font-size: var(--text-sm);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-item__meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-item__progress-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 80px;
}

.task-item__progress-bar {
  flex: 1;
  height: 3px;
  background: var(--border-default);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.task-item__progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--duration-normal) var(--ease-out);
}

.task-item__progress-fill.fill-pending {
  background: var(--color-warning);
}

.task-item__progress-fill.fill-running {
  background: var(--color-primary);
  animation: shimmer-fill 2s ease-in-out infinite;
}

.task-item__progress-fill.fill-completed {
  background: var(--color-success);
}

.task-item__progress-fill.fill-failed {
  background: var(--color-error);
}

.task-item__progress-fill.fill-canceled {
  background: var(--text-tertiary);
}

@keyframes shimmer-fill {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.task-item__progress-text {
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  min-width: 32px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.task-item__cancel {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-tertiary);
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  line-height: 1;
}

.task-item__cancel:hover {
  color: var(--color-error);
  border-color: var(--color-error);
  background: rgba(239, 68, 68, 0.08);
}

.task-queue__reconnect {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-xs);
  color: var(--color-primary-light);
  background: transparent;
  border: none;
  border-top: 1px solid var(--border-default);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.task-queue__reconnect:hover {
  background: var(--glass-bg-hover);
  color: var(--color-primary);
}
</style>
