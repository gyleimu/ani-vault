import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      include: ['src/api/**', 'src/store/**', 'src/utils/**'],
    },
  },
  resolve: {
    alias: {
      '@tauri-apps/api/core': resolve(__dirname, 'tests/unit/__mocks__/tauri-core.js'),
    },
  },
})
