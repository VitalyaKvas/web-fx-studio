import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/assets/styles/mixins" as *;\n`,
      },
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // Limit dep discovery to actual source — without this, Vite 8's rolldown
    // scanner crawls public/presets/**/*.js and complains about `three` (which
    // the iframe resolves via importmap at runtime, not at build time).
    entries: ['index.html', 'src/**/*.{ts,vue}'],
    include: ['monaco-editor/esm/vs/editor/editor.api'],
  },
})
