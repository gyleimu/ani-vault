<script setup>
import { computed } from 'vue'

const props = defineProps({
  anime: { type: Object, required: true }
})

const emit = defineEmits(['click'])

const coverSrc = computed(() => props.anime?.cover || '')

const displayType = computed(() => {
  const parts = []
  if (props.anime?.year) parts.push(props.anime.year)
  if (props.anime?.typeName) parts.push(props.anime.typeName)
  return parts.join(' · ')
})

function handleClick() {
  emit('click', props.anime)
}
</script>

<template>
  <div class="anime-card" @click="handleClick">
    <div class="anime-card__cover">
      <img
        v-if="coverSrc"
        v-lazy="coverSrc"
        :alt="anime.title"
        class="anime-card__img"
      />
      <div v-else class="anime-card__empty">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <polygon points="10,8 16,12 10,16" />
        </svg>
      </div>
      <span v-if="anime?.remarks" class="anime-card__badge">{{ anime.remarks }}</span>
    </div>

    <div class="anime-card__info">
      <h3 class="anime-card__title">{{ anime?.title || '未知标题' }}</h3>
      <p v-if="displayType" class="anime-card__meta">{{ displayType }}</p>
    </div>
  </div>
</template>

<style scoped>
.anime-card {
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease;
}

.anime-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
}

.anime-card__cover {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
}

.anime-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.anime-card__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.anime-card__badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  border-radius: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
}

.anime-card__info {
  padding: 10px;
}

.anime-card__title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.anime-card__meta {
  margin: 4px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
}
</style>
