<template>
  <div class="ani-logo">
    <div class="logo-glow"></div>

    <div class="logo-icon">
      <svg
        class="logo-svg"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          class="logo-border"
          d="M40 2L66 12L78 38L68 64L40 78L12 68L2 42L12 16Z"
          stroke="url(#borderGrad)"
          stroke-width="1.5"
          fill="none"
        />
        <path
          class="logo-inner"
          d="M40 14L58 26L66 46L54 62L40 70L26 62L14 46L22 26Z"
          fill="url(#innerGrad)"
          opacity="0.15"
        />
        <path
          class="logo-play"
          d="M34 28L56 40L34 52Z"
          fill="url(#playGrad)"
        />
        <defs>
          <linearGradient id="borderGrad" x1="0" y1="0" x2="80" y2="80">
            <stop offset="0%" stop-color="#9b8afb" />
            <stop offset="100%" stop-color="#7c6aef" />
          </linearGradient>
          <linearGradient id="innerGrad" x1="14" y1="14" x2="66" y2="66">
            <stop offset="0%" stop-color="#9b8afb" />
            <stop offset="100%" stop-color="#c084fc" />
          </linearGradient>
          <linearGradient id="playGrad" x1="34" y1="28" x2="56" y2="52">
            <stop offset="0%" stop-color="#fafafa" />
            <stop offset="100%" stop-color="#d4d4d8" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    <div class="logo-text-group">
      <h1 class="logo-text">
        <span class="logo-text-ani">Ani</span><span class="logo-text-vault">Vault</span>
      </h1>
      <div class="logo-divider"></div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.ani-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
  position: relative;
  animation: fadeInUp 0.8s var(--ease-out) both;
}

.logo-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 200px;
  transform: translate(-50%, -60%);
  background: radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%);
  border-radius: 50%;
  animation: breathe 4s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

.logo-icon {
  position: relative;
  z-index: 1;
  animation: float 6s ease-in-out infinite;
}

.logo-svg {
  width: 100px;
  height: 100px;
  filter: drop-shadow(0 0 24px var(--color-primary-glow));
  transition: filter var(--duration-slow) var(--ease-out);
}

.logo-icon:hover .logo-svg {
  filter: drop-shadow(0 0 40px var(--color-primary-glow))
          drop-shadow(0 0 80px rgba(124, 106, 239, 0.2));
}

.logo-border {
  stroke-dasharray: 4 6;
  animation: spinSlow 30s linear infinite;
  transform-origin: center;
}

.logo-inner {
  transition: opacity var(--duration-slow) var(--ease-out);
}

.logo-icon:hover .logo-inner {
  opacity: 0.25;
}

.logo-play {
  transition: transform var(--duration-normal) var(--ease-spring);
  transform-origin: center;
}

.logo-icon:hover .logo-play {
  transform: scale(1.06);
}

.logo-text-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  position: relative;
  z-index: 1;
  animation: fadeInUp 0.8s var(--ease-out) 0.2s both;
}

.logo-text {
  font-size: var(--text-4xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
}

.logo-text-ani {
  color: var(--text-primary);
}

.logo-text-vault {
  background: linear-gradient(135deg, var(--color-primary-light), #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-divider {
  width: 32px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  border-radius: var(--radius-full);
  animation: shimmer 3s ease-in-out infinite;
  background-size: 200% 100%;
}

@media (max-width: 768px) {
  .logo-svg {
    width: 80px;
    height: 80px;
  }

  .logo-text {
    font-size: var(--text-3xl);
  }

  .logo-glow {
    width: 160px;
    height: 160px;
  }
}
</style>
