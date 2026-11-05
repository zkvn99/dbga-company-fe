import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// 백엔드는 같은 오리진처럼 프록시한다 — HttpOnly 쿠키 · XSRF-TOKEN 쿠키가 그대로 동작(docs/frontend.md 5장).
const API_TARGET = process.env.API_TARGET ?? 'http://localhost:8081'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/api': { target: API_TARGET } },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
