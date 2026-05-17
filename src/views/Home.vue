<template>
  <div class="anivault-home">
    <canvas ref="canvasRef" class="particle-canvas"></canvas>

    <div class="home-scroll">
      <div class="hero-section">
        <div class="brand">
          <AniLogo />
        </div>

        <div class="search-container">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            name="q"
            id="home-search"
            placeholder="搜索动漫..."
            autocomplete="off"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>

        <div class="tags-container">
          <span
            v-for="(tag, index) in hotTags"
            :key="index"
            class="hot-tag"
            @click="clickTag(tag)"
          >
            # {{ tag }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AniLogo from '../components/common/ani-logo.vue'

const router = useRouter()

const searchQuery = ref('')
const hotTags = ref(['热血', '治愈', '悬疑', '奇幻', '科幻'])
const canvasRef = ref(null)

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value.trim() } })
  }
}

const clickTag = (tag) => {
  searchQuery.value = tag
  handleSearch()
}

let animationFrameId = null
const particles = []
const particleCount = 100

const initCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  const resizeCanvas = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.5 + 0.1
    })
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy

      if (p.x < 0) p.x = canvas.width
      if (p.x > canvas.width) p.x = 0
      if (p.y < 0) p.y = canvas.height
      if (p.y > canvas.height) p.y = 0

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0, 210, 255, ${p.alpha})`
      ctx.fill()
    })

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 100) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(176, 38, 255, ${0.15 - distance / 1000})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }

    animationFrameId = requestAnimationFrame(animate)
  }

  animate()
}

onMounted(() => {
  initCanvas()
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', () => {})
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');

.anivault-home {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #0a0a1a;
  overflow: hidden;
  font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

.home-scroll {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.home-scroll::-webkit-scrollbar {
  width: 6px;
}

.home-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.home-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
}

.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10vh;
  padding-bottom: 40px;
  animation: fadeIn 1s ease-out forwards;
}

.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.search-container {
  display: flex;
  width: 100%;
  max-width: 560px;
  height: 56px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(176, 38, 255, 0.3);
  border-radius: 28px;
  padding: 4px 4px 4px 24px;
  box-shadow: 0 0 20px rgba(0, 210, 255, 0.05);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  margin: 0 20px;
}

.search-container:focus-within {
  border-color: rgba(0, 210, 255, 0.6);
  box-shadow: 0 0 25px rgba(0, 210, 255, 0.2), 0 0 20px rgba(176, 38, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 1rem;
  font-family: inherit;
}

.search-input::placeholder {
  color: #5a5a75;
}

.search-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #b026ff, #00d2ff);
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.search-btn svg {
  width: 20px;
  height: 20px;
}

.search-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(0, 210, 255, 0.5);
}

.tags-container {
  margin-top: 24px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0 20px;
}

.hot-tag {
  padding: 5px 14px;
  font-size: 0.85rem;
  color: #a0a0b8;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.hot-tag:hover {
  color: #fff;
  border-color: #00d2ff;
  background: rgba(0, 210, 255, 0.1);
  box-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
  transform: translateY(-2px);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
