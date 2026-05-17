<script setup>
import { onMounted } from 'vue'
import TitleBar from './components/layout/title-bar.vue'
import SideBar from './components/layout/side-bar.vue'
import Live2dWidget from './components/live2d/live2d-widget.vue'
import { startEngine } from './api/engine-client'

onMounted(async () => {
  try {
    const ok = await startEngine()
    console.log('[App] 引擎启动:', ok ? '成功' : '失败')
  } catch (e) {
    console.warn('[App] 引擎启动异常:', e.message)
  }
})
</script>

<template>
  <div class="app">
    <TitleBar />

    <div class="app__body">
      <SideBar />
      <main class="app__content">
        <router-view />
      </main>
    </div>

    <Live2dWidget />
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.app__body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.app__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}


</style>
