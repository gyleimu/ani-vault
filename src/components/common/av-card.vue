<script setup>
defineProps({
  hoverable: { type: Boolean, default: false },
  bordered: { type: Boolean, default: true },
  padding: { type: String, default: 'md' }
})
</script>

<template>
  <div
    class="av-card"
    :class="[`av-card--${padding}`, { 'is-hoverable': hoverable, 'is-bordered': bordered }]"
  >
    <div v-if="$slots.header" class="av-card__header">
      <slot name="header" />
    </div>
    <div class="av-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="av-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.av-card {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-base);
}

.is-bordered { border: 1px solid var(--color-border); }
.is-hoverable:hover {
  border-color: var(--color-border-light);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.av-card--sm .av-card__body { padding: 12px; }
.av-card--md .av-card__body { padding: 20px; }
.av-card--lg .av-card__body { padding: 32px; }

.av-card__header { padding: 16px 20px; border-bottom: 1px solid var(--color-border); }
.av-card__footer { padding: 12px 20px; border-top: 1px solid var(--color-border); }
</style>
