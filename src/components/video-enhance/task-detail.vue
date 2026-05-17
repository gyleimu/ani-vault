<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  task: { type: Object, default: null }
})

const emit = defineEmits(['cancel', 'clearLogs'])

const logsRef = ref(null)
const isExpanded = ref(true)
const autoScroll = ref(true)

const statusLabel = computed(() => {
  const map = {
    pending: '等待中',
    running: '处理中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
    canceled: '已取消'
  }
  return map[props.task?.status] || props.task?.status || ''
})

function fileName(path) {
  if (!path) return ''
  return path.split(/[/\\]/).pop()
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

watch(
  () => props.task?.logs?.length,
  () => {
    if (autoScroll.value) {
      nextTick(() => {
        if (logsRef.value) {
          logsRef.value.scrollTop = logsRef.value.scrollHeight
        }
      })
    }
  }
)
</script>

<template>
  <div class="task-detail" v-if="task">
    <div class="task-detail__header">
      <span class="task-detail__title">{{ task.name }}</span>
      <span class="task-detail__badge" :class="`badge-${task.status}`">
        {{ statusLabel }}
      </span>
    </div>

    <div class="task-detail__info">
      <div class="task-detail__info-row">
        <span class="task-detail__label">输入</span>
        <span class="task-detail__value" :title="task.inputPath">{{ fileName(task.inputPath) }}</span>
      </div>
      <div class="task-detail__info-row" v-if="task.outputPath">
        <span class="task-detail__label">输出</span>
        <span class="task-detail__value" :title="task.outputPath">{{ fileName(task.outputPath) }}</span>
      </div>
      <div class="task-detail__info-row" v-if="task.startedAt">
        <span class="task-detail__label">开始</span>
        <span class="task-detail__value">{{ formatTime(task.startedAt) }}</span>
      </div>
      <div class="task-detail__info-row" v-if="task.finishedAt">
        <span class="task-detail__label">结束</span>
        <span class="task-detail__value">{{ formatTime(task.finishedAt) }}</span>
      </div>
    </div>

    <div v-if="task.status === 'running' || task.status === 'pending'" class="task-detail__progress">
      <div class="task-detail__progress-bar">
        <div
          class="task-detail__progress-fill"
          :style="{ width: `${task.progress}%` }"
        ></div>
      </div>
      <span class="task-detail__progress-text">{{ Math.round(task.progress) }}%</span>
    </div>

    <div v-if="task.status === 'failed' && task.errorMessage" class="task-detail__error">
      <span class="task-detail__error-icon">!</span>
      <span class="task-detail__error-text">{{ task.errorMessage }}</span>
    </div>

    <div class="task-detail__actions">
      <button
        v-if="task.status === 'running' || task.status === 'pending'"
        class="task-detail__btn task-detail__btn--cancel"
        @click="emit('cancel', task.id)"
      >取消任务</button>
    </div>

    <div class="task-detail__log-section">
      <div class="task-detail__log-header" @click="isExpanded = !isExpanded">
        <span class="task-detail__log-toggle" :class="{ 'is-expanded': isExpanded }">▸</span>
        <span class="task-detail__log-title">日志输出</span>
        <span class="task-detail__log-count">{{ task.logs?.length || 0 }} 行</span>
        <button
          v-if="task.logs?.length > 0"
          class="task-detail__log-clear"
          @click.stop="emit('clearLogs', task.id)"
        >清空</button>
      </div>

      <div v-show="isExpanded" class="task-detail__log-body">
        <div v-if="!task.logs?.length" class="task-detail__log-empty">暂无日志</div>
        <pre v-else ref="logsRef" class="task-detail__log-content">{{ task.logs.join('\n') }}</pre>
        <div class="task-detail__log-footer">
          <label class="task-detail__autoscroll">
            <input type="checkbox" v-model="autoScroll" />
            <span>自动滚动</span>
          </label>
        </div>
      </div>
    </div>
  </div>

  <div class="task-detail task-detail--empty" v-else>
    <span class="task-detail__empty-text">选择任务查看详情</span>
  </div>
</template>

<style scoped>
.task-detail {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--glass-shadow);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  font-family: var(--font-sans);
  color: var(--text-primary);
}

.task-detail--empty {
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.task-detail__empty-text {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.task-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.task-detail__title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-detail__badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.6;
}

.badge-pending {
  background: rgba(245, 158, 11, 0.12);
  color: var(--color-warning);
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.badge-running {
  background: rgba(59, 130, 246, 0.12);
  color: var(--color-info);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.badge-completed {
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-success);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.badge-failed {
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-error);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.badge-cancelled {
  background: rgba(113, 113, 122, 0.12);
  color: var(--text-tertiary);
  border: 1px solid rgba(113, 113, 122, 0.2);
}

.task-detail__info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2) var(--space-4);
}

.task-detail__info-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.task-detail__label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.task-detail__value {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-detail__progress {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.task-detail__progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-bg-muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.task-detail__progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  background-size: 200% 100%;
  animation: progress-shimmer 2s ease infinite;
  transition: width var(--duration-normal) var(--ease-out);
}

@keyframes progress-shimmer {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.task-detail__progress-text {
  flex-shrink: 0;
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-primary-light);
  min-width: 36px;
  text-align: right;
}

.task-detail__error {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.task-detail__error-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--color-error);
  color: #fff;
  font-size: var(--text-xs);
  font-weight: 700;
  line-height: 1;
}

.task-detail__error-text {
  font-size: var(--text-sm);
  color: var(--color-error);
  line-height: 1.5;
  word-break: break-all;
}

.task-detail__actions {
  display: flex;
  gap: var(--space-2);
}

.task-detail__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--duration-fast) var(--ease-out);
  font-family: inherit;
}

.task-detail__btn--cancel {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
  color: var(--color-error);
}

.task-detail__btn--cancel:hover {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.35);
}

.task-detail__log-section {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.task-detail__log-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-subtle);
  cursor: pointer;
  user-select: none;
  transition: background var(--duration-fast) var(--ease-out);
}

.task-detail__log-header:hover {
  background: var(--color-bg-muted);
}

.task-detail__log-toggle {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  transition: transform var(--duration-fast) var(--ease-out);
  display: inline-block;
}

.task-detail__log-toggle.is-expanded {
  transform: rotate(90deg);
}

.task-detail__log-title {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

.task-detail__log-count {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
  margin-left: auto;
}

.task-detail__log-clear {
  background: none;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  padding: 1px 8px;
  cursor: pointer;
  font-family: inherit;
  transition: all var(--duration-fast) var(--ease-out);
}

.task-detail__log-clear:hover {
  color: var(--color-error);
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.06);
}

.task-detail__log-body {
  border-top: 1px solid var(--border-subtle);
  transition: max-height var(--duration-normal) var(--ease-out);
}

.task-detail__log-empty {
  text-align: center;
  padding: var(--space-6);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.task-detail__log-content {
  margin: 0;
  padding: var(--space-3);
  max-height: 300px;
  overflow-y: auto;
  background: var(--color-bg-base);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.7;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}

.task-detail__log-content::-webkit-scrollbar {
  width: 6px;
}

.task-detail__log-content::-webkit-scrollbar-track {
  background: transparent;
}

.task-detail__log-content::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: var(--radius-full);
}

.task-detail__log-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

.task-detail__log-footer {
  display: flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  background: var(--color-bg-base);
  border-top: 1px solid var(--border-subtle);
}

.task-detail__autoscroll {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
  font-size: var(--text-xs);
  color: var(--text-muted);
  user-select: none;
  transition: color var(--duration-fast) var(--ease-out);
}

.task-detail__autoscroll:hover {
  color: var(--text-tertiary);
}

.task-detail__autoscroll input[type="checkbox"] {
  width: 12px;
  height: 12px;
  accent-color: var(--color-primary);
  cursor: pointer;
}
</style>
