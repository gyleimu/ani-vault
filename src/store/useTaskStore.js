import { ref, computed, onUnmounted } from 'vue'
import { defineStore } from 'pinia'
import * as worker from '../api/worker-client'

const MAX_LOG_LINES = 500

const FIELD_MAP = {
  input_path: 'inputPath',
  output_path: 'outputPath',
  error_message: 'errorMessage',
  started_at: 'startedAt',
  finished_at: 'finishedAt',
  created_at: 'createdAt',
}

function normalizeTask(raw) {
  const task = {}
  for (const [key, value] of Object.entries(raw)) {
    const mapped = FIELD_MAP[key]
    if (mapped) {
      task[mapped] = value
    } else {
      task[key] = value
    }
  }
  return {
    id: task.id,
    name: task.name || '',
    status: task.status || 'pending',
    progress: task.progress ?? 0,
    inputPath: task.inputPath || '',
    outputPath: task.outputPath || null,
    errorMessage: task.errorMessage || null,
    logs: task.logs || [],
    startedAt: task.startedAt || null,
    finishedAt: task.finishedAt || null,
    createdAt: task.createdAt || new Date().toISOString(),
  }
}

export const useTaskStore = defineStore('task', () => {
  const tasks = ref(new Map())
  const connectionStatus = ref('disconnected')
  const selectedTaskId = ref(null)
  const logsExpanded = ref(new Set())

  let _unsubscribe = null

  const taskList = computed(() => {
    return Array.from(tasks.value.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
  })

  const activeTasks = computed(() => {
    return taskList.value.filter(
      (t) => t.status === 'pending' || t.status === 'running'
    )
  })

  const completedTasks = computed(() => {
    return taskList.value.filter((t) => t.status === 'completed')
  })

  const failedTasks = computed(() => {
    return taskList.value.filter((t) => t.status === 'failed')
  })

  const selectedTask = computed(() => {
    if (!selectedTaskId.value) return null
    return tasks.value.get(selectedTaskId.value) || null
  })

  function _handleMessage(event) {
    const { type } = event

    switch (type) {
      case 'init': {
        const list = Array.isArray(event.tasks) ? event.tasks : []
        const map = new Map()
        for (const raw of list) {
          const task = normalizeTask(raw)
          map.set(task.id, task)
        }
        tasks.value = map
        break
      }

      case 'progress': {
        const tid = event.task_id || event.id
        let task = tasks.value.get(tid)
        if (!task) {
          task = normalizeTask(event)
          tasks.value.set(tid, task)
        }
        if (event.progress != null) task.progress = event.progress
        if (event.status) task.status = event.status
        if (Array.isArray(event.logs_tail)) {
          for (const line of event.logs_tail) {
            if (!task.logs.includes(line)) {
              task.logs.push(line)
              if (task.logs.length > MAX_LOG_LINES) task.logs.shift()
            }
          }
        }
        break
      }

      case 'log': {
        const tid = event.task_id
        const task = tasks.value.get(tid)
        if (!task) break
        task.logs.push(event.line)
        if (task.logs.length > MAX_LOG_LINES) task.logs.shift()
        break
      }

      case 'status': {
        const tid = event.task_id
        let task = tasks.value.get(tid)
        if (!task) {
          task = normalizeTask(event)
          tasks.value.set(tid, task)
        }
        if (event.status) task.status = event.status
        if (event.progress != null) task.progress = event.progress
        if (event.error_message) task.errorMessage = event.error_message
        if (event.output_path) task.outputPath = event.output_path
        if (event.finished_at) task.finishedAt = event.finished_at
        break
      }

      case 'completed': {
        const tid = event.task_id
        const task = tasks.value.get(tid)
        if (!task) break
        task.status = 'completed'
        task.progress = 100
        if (event.output_path) task.outputPath = event.output_path
        if (event.finished_at) task.finishedAt = event.finished_at
        break
      }

      case 'failed': {
        const tid = event.task_id
        const task = tasks.value.get(tid)
        if (!task) break
        task.status = 'failed'
        if (event.error_message) task.errorMessage = event.error_message
        if (event.finished_at) task.finishedAt = event.finished_at
        break
      }

      case 'connected': {
        connectionStatus.value = 'connected'
        break
      }

      case 'disconnected': {
        connectionStatus.value = 'disconnected'
        break
      }

      case 'polling_started': {
        connectionStatus.value = 'polling'
        break
      }
    }
  }

  function init() {
    _unsubscribe = worker.subscribe(_handleMessage)
    worker.ensureConnected()
  }

  function destroy() {
    if (_unsubscribe) {
      _unsubscribe()
      _unsubscribe = null
    }
    worker.disconnect?.()
  }

  async function createTask(params) {
    const result = await worker.createTask(params)
    const task = normalizeTask(result)
    tasks.value.set(task.id, task)
    return task
  }

  async function cancelTask(taskId) {
    await worker.cancelTask(taskId)
  }

  function selectTask(taskId) {
    selectedTaskId.value = taskId
  }

  function toggleLogs(taskId) {
    if (logsExpanded.value.has(taskId)) {
      logsExpanded.value.delete(taskId)
    } else {
      logsExpanded.value.add(taskId)
    }
  }

  function clearLogs(taskId) {
    const task = tasks.value.get(taskId)
    if (task) {
      task.logs = []
    }
  }

  function reconnect() {
    connectionStatus.value = 'reconnecting'
    worker.connect?.()
  }

  return {
    tasks,
    connectionStatus,
    selectedTaskId,
    logsExpanded,
    taskList,
    activeTasks,
    completedTasks,
    failedTasks,
    selectedTask,
    init,
    destroy,
    createTask,
    cancelTask,
    selectTask,
    toggleLogs,
    clearLogs,
    reconnect,
  }
})
