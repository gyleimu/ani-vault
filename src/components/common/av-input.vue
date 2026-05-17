<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  type: { type: String, default: 'text' },
  size: { type: String, default: 'md' },
  disabled: { type: Boolean, default: false },
  clearable: { type: Boolean, default: false }
})

defineEmits(['update:modelValue', 'clear'])
</script>

<template>
  <div class="av-input" :class="[`av-input--${size}`, { 'is-disabled': disabled }]">
    <span v-if="$slots.prefix" class="av-input__prefix">
      <slot name="prefix" />
    </span>
    <input
      class="av-input__inner"
      :id="id || undefined"
      :name="name || undefined"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      autocomplete="off"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <span v-if="clearable && modelValue" class="av-input__clear" @click="$emit('clear')">
      ✕
    </span>
    <span v-if="$slots.suffix" class="av-input__suffix">
      <slot name="suffix" />
    </span>
  </div>
</template>

<style scoped>
.av-input {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.av-input:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.av-input__inner {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
  font-family: var(--font-family);
}

.av-input__inner::placeholder { color: var(--color-text-tertiary); }

.av-input--sm { padding: 6px 12px; }
.av-input--md { padding: 8px 14px; }
.av-input--lg { padding: 12px 16px; }

.av-input--sm .av-input__inner { font-size: 12px; }
.av-input--md .av-input__inner { font-size: 14px; }
.av-input--lg .av-input__inner { font-size: 16px; }

.av-input__prefix, .av-input__suffix { color: var(--color-text-tertiary); }
.av-input__clear { cursor: pointer; color: var(--color-text-tertiary); font-size: 12px; }
.av-input__clear:hover { color: var(--color-text); }

.is-disabled { opacity: 0.5; pointer-events: none; }
</style>
