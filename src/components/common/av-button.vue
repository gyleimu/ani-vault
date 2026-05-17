<script setup>
defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  block: { type: Boolean, default: false }
})
</script>

<template>
  <button
    class="av-button"
    :class="[`av-button--${variant}`, `av-button--${size}`, { 'is-block': block, 'is-loading': loading }]"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="av-button__spinner" />
    <slot />
  </button>
</template>

<style scoped>
.av-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  user-select: none;
}

.av-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.av-button--primary {
  background: var(--color-primary);
  color: #fff;
}

.av-button--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-glow);
}

.av-button--ghost {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
}

.av-button--ghost:hover:not(:disabled) {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-light);
}

.av-button--sm { padding: 6px 12px; font-size: 12px; }
.av-button--md { padding: 8px 20px; font-size: 14px; }
.av-button--lg { padding: 12px 28px; font-size: 16px; }

.is-block { width: 100%; }

.av-button__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spinSlow 0.8s linear infinite;
}
</style>
