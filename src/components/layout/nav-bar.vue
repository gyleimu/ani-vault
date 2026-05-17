<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchQuery = ref('')

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value.trim() } })
  }
}
</script>

<template>
  <nav class="nav-bar">
    <div class="nav-bar__search" @keydown.enter="handleSearch">
      <span class="nav-bar__search-icon">⌕</span>
      <input
        v-model="searchQuery"
        class="nav-bar__search-input"
        name="q"
        id="nav-search"
        placeholder=""
        autocomplete="off"
      />
    </div>
    <div class="nav-bar__actions">
      <slot name="actions" />
    </div>
  </nav>
</template>

<style scoped>
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  gap: 16px;
}

.nav-bar__search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 400px;
  padding: 8px 14px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.nav-bar__search:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.nav-bar__search-icon { color: var(--color-text-tertiary); font-size: 16px; }

.nav-bar__search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
  font-size: 14px;
  font-family: var(--font-family);
}

.nav-bar__search-input::placeholder { color: var(--color-text-tertiary); }

.nav-bar__actions { display: flex; gap: 8px; }
</style>
