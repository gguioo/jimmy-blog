<script setup lang="ts">
// 文章详情：库里存的是整页 HTML，原样放进页面里的 Shadow DOM。
// 不用 iframe：内容按自己的高度自然撑开，只有页面一个滚动条，也不用测高度；
// Shadow DOM 让文章自带的样式和博客样式互不干扰。
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import { fmtDate } from '../utils'

const route = useRoute()
const post = ref<any>(null)
const failed = ref(false)
const host = ref<HTMLElement | null>(null)

// 文章的 html/body/:root 选择器在 Shadow DOM 里没有对应元素，改指到宿主和正文容器上
function scopeCss(css: string) {
  return css
    .replace(/(^|[\s,{}])(html|:root)(?=[\s,{.:#[])/g, '$1:host')
    .replace(/(^|[\s,{}]|:host\s+)body(?=[\s,{.:#[])/g, '$1.doc-body')
}

function render(html: string) {
  const el = host.value
  if (!el) return
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const root = el.shadowRoot || el.attachShadow({ mode: 'open' })
  root.innerHTML = ''
  doc.querySelectorAll('style').forEach((s) => {
    const st = document.createElement('style')
    st.textContent = scopeCss(s.textContent || '')
    root.appendChild(st)
  })
  doc.querySelectorAll('link[rel="stylesheet"]').forEach((l) => root.appendChild(l.cloneNode()))
  const body = document.createElement('div')
  body.className = ('doc-body ' + doc.body.className).trim()
  const inline = doc.body.getAttribute('style')
  if (inline) body.setAttribute('style', inline)
  doc.body.querySelectorAll('style, script').forEach((n) => n.remove())
  body.append(...Array.from(doc.body.childNodes))
  root.appendChild(body)
}

function load() {
  post.value = null
  failed.value = false
  api('/api/posts/' + route.params.slug)
    .then((p) => {
      if (!p || !p.html) {
        failed.value = true
        return
      }
      post.value = p
      document.title = p.title + ' · Jimen Blog'
    })
    .catch(() => {
      failed.value = true
    })
}

watch(() => route.params.slug, load, { immediate: true })
watch(host, () => post.value && render(post.value.html))
</script>

<template>
  <div class="wrap fade">
    <div v-if="failed" class="state">
      这篇文章不存在。<br>
      <span class="mini"><RouterLink to="/database">回 Database</RouterLink></span>
    </div>

    <div v-else-if="!post" class="state"><div class="loading">正在从云端搬运字节……</div></div>

    <div v-else id="post">
      <RouterLink class="backlink" to="/database">← 回 Database</RouterLink>
      <div class="full-meta">{{ fmtDate(post.created_at) }}</div>
      <div ref="host" class="html-doc"></div>
      <div style="height: 60px"></div>
      <RouterLink class="backlink" to="/database">← 回 Database</RouterLink>
    </div>
  </div>
  <div class="foot">© Jimen · 手写于云端 · Wish me well</div>
</template>
