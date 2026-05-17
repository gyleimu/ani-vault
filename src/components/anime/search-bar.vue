<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'search', 'clear'])

const isFocused = ref(false)

const handleInput = (e) => {
  emit('update:modelValue', e.target.value)
}

const handleSearch = () => {
  emit('search', props.modelValue)
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <div class="search-bar" :class="{ 'is-focused': isFocused }">
    <span class="search-bar__icon">⌕</span>
    <input
      class="search-bar__input"
      name="q"
      id="search-bar-input"
      :value="modelValue"
      :placeholder="placeholder"
      autocomplete="off"
      @input="handleInput"
      @focus="isFocused = true"
      @blur="isFocused = false"
      @keydown.enter="handleSearch"
    />
    <button v-if="modelValue" class="search-bar__clear" @click="handleClear">✕</button>
    <button class="search-bar__submit" @click="handleSearch"></button>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.search-bar.is-focused {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.search-bar__icon { font-size: 20px; color: var(--color-text-tertiary); }

.search-bar__input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
  font-size: 16px;
  font-family: var(--font-family);
}

.search-bar__input::placeholder { color: var(--color-text-tertiary); }

.search-bar__clear {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
}

.search-bar__clear:hover { color: var(--color-text); }

.search-bar__submit {
  padding: 8px 24px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.search-bar__submit:hover { background: var(--color-primary-hover); }
</style>
