import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 极简配置：Vue 单页应用，构建产物在 dist/
export default defineConfig({
  plugins: [vue()],
})
