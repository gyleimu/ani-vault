<!-- 视图层 - AI视频增强：任务创建、队列管理、日志查看 -->

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useTaskStore } from '../store/useTaskStore'
import TaskQueue from '../components/video-enhance/task-queue.vue'
import TaskDetail from '../components/video-enhance/task-detail.vue'

const taskStore = useTaskStore()

const inputPath = ref('')
const outputPath = ref('')
const taskName = ref('')
const scale = ref(4)
const showCreateForm = ref(false)

onMounted(() => {
  taskStore.init()
})

onUnmounted(() => {
  taskStore.destroy()
})

async function handleCreate() {
  if (!inputPath.value.trim()) return
  try {
    await taskStore.createTask({
      name: taskName.value || inputPath.value.split(/[/\\]/).pop(),
      inputPath: inputPath.value.trim(),
      outputPath: outputPath.value.trim() || undefined,
      scale: scale.value
    })
    inputPath.value = ''
    outputPath.value = ''
    taskName.value = ''
    showCreateForm.value = false
  } catch (e) {
    console.error('[VideoEnhance] 创建任务失败:', e.message)
  }
}
</script>

<template>
  <div class="video-enhance">
    <div class="video-enhance__toolbar">
      <div class="video-enhance__toolbar-left">
        <h1 class="video-enhance__page-title">AI 视频增强</h1>
        <span class="video-enhance__task-count" v-if="taskStore.activeTasks.length > 0">
          {{ taskStore.activeTasks.length }} 个活跃任务
        </span>
      </div>
      <button
        class="video-enhance__create-btn"
        @click="showCreateForm = !showCreateForm"
      >
        {{ showCreateForm ? '取消' : '+ 新建任务' }}
      </button>
    </div>

    <div v-if="showCreateForm" class="video-enhance__create-form">
      <div class="create-form__row">
        <div class="create-form__field">
          <label class="create-form__label">输入文件路径</label>
          <input
            v-model="inputPath"
            type="text"
            class="create-form__input"
            placeholder="例如: D:\videos\input.mp4"
          />
        </div>
      </div>
      <div class="create-form__row create-form__row--split">
        <div class="create-form__field">
          <label class="create-form__label">任务名称</label>
          <input
            v-model="taskName"
            type="text"
            class="create-form__input"
            placeholder="留空则使用文件名"
          />
        </div>
        <div class="create-form__field create-form__field--narrow">
          <label class="create-form__label">放大倍数</label>
          <select v-model.number="scale" class="create-form__select">
            <option :value="2">2x</option>
            <option :value="4">4x</option>
          </select>
        </div>
      </div>
      <div class="create-form__row">
        <div class="create-form__field">
          <label class="create-form__label">输出路径 <span class="create-form__optional">可选</span></label>
          <input
            v-model="outputPath"
            type="text"
            class="create-form__input"
            placeholder="留空则自动生成"
          />
        </div>
      </div>
      <div class="create-form__actions">
        <button
          class="create-form__submit"
          :disabled="!inputPath.trim()"
          @click="handleCreate"
        >开始处理</button>
      </div>
    </div>

    <div class="video-enhance__content">
      <div class="video-enhance__queue-panel">
        <TaskQueue
          :tasks="taskStore.taskList"
          :selected-task-id="taskStore.selectedTaskId"
          :connection-status="taskStore.connectionStatus"
          @select="taskStore.selectTask"
          @cancel="taskStore.cancelTask"
          @reconnect="taskStore.reconnect"
        />
      </div>
      <div class="video-enhance__detail-panel">
        <TaskDetail
          :task="taskStore.selectedTask"
          @cancel="taskStore.cancelTask"
          @clear-logs="taskStore.clearLogs"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-enhance {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-6);
  gap: var(--space-5);
  overflow-y: auto;
  background: var(--color-bg-base);
}

.video-enhance__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.video-enhance__toolbar-left {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}

.video-enhance__page-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.video-enhance__task-count {
  font-size: var(--text-xs);
  color: var(--color-primary-light);
  background: rgba(124, 106, 239, 0.1);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(124, 106, 239, 0.2);
}

.video-enhance__create-btn {
  padding: var(--space-2) var(--space-5);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  font-family: inherit;
}

.video-enhance__create-btn:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
}

.video-enhance__create-form {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex-shrink: 0;
}

.create-form__row {
  display: flex;
  gap: var(--space-4);
}

.create-form__row--split {
  display: flex;
  gap: var(--space-4);
}

.create-form__field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.create-form__field--narrow {
  flex: 0 0 120px;
}

.create-form__label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.create-form__optional {
  text-transform: none;
  letter-spacing: normal;
  color: var(--text-muted);
}

.create-form__input,
.create-form__select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--color-bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out);
  font-family: inherit;
  box-sizing: border-box;
}

.create-form__input:focus,
.create-form__select:focus {
  border-color: var(--color-primary);
}

.create-form__input::placeholder {
  color: var(--text-muted);
}

.create-form__select {
  cursor: pointer;
  appearance: auto;
}

.create-form__actions {
  display: flex;
  justify-content: flex-end;
}

.create-form__submit {
  padding: var(--space-2) var(--space-8);
  font-size: var(--text-sm);
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  font-family: inherit;
}

.create-form__submit:hover:not(:disabled) {
  box-shadow: var(--shadow-glow);
  transform: translateY(-1px);
}

.create-form__submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.video-enhance__content {
  display: flex;
  gap: var(--space-5);
  flex: 1;
  min-height: 0;
}

.video-enhance__queue-panel {
  width: 380px;
  flex-shrink: 0;
  overflow-y: auto;
}

.video-enhance__detail-panel {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .video-enhance__content {
    flex-direction: column;
  }

  .video-enhance__queue-panel {
    width: 100%;
  }
}
</style>
