// 线性图标组件：和旧版同一套 SVG path（墨线手绘感）
<script lang="ts">
import { defineComponent } from 'vue'

// 图标库：path 都来自旧版 core.js，原样搬运
const ICONS: Record<string, string> = {
  database:
    '<ellipse cx="12" cy="5.5" rx="8" ry="3" pathLength="100"/>' +
    '<path d="M4 5.5v13c0 1.66 3.58 3 8 3s8-1.34 8-3v-13" pathLength="100"/>' +
    '<path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" pathLength="100"/>',
  about:
    '<path d="M21 3.5L3.8 10.4c-.9.37-.83 1.66.1 1.95L10 14l2.9 6.2c.4.87 1.63.8 1.95-.1L21 3.5z" pathLength="100"/>',
  shard:
    '<path d="M5 3.5l6.5 2.5-4.5 5.5-3.5-4z" pathLength="100"/>' +
    '<path d="M13.5 9.5l6 2-3 6.5-4.5-3z" pathLength="100"/>',
}

export default defineComponent({
  name: 'IconSvg',
  props: { name: { type: String, required: true } },
  computed: {
    paths(): string {
      return ICONS[this.name] || ''
    },
  },
})
</script>

<template>
  <svg viewBox="0 0 24 24" aria-hidden="true" v-html="paths"></svg>
</template>

<style>
/* 图标统一描边风格（对应旧版 .sec-icon / .topnav 的 svg 规则） */
svg[viewBox='0 0 24 24'] {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  display: block;
}
</style>
