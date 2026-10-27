<script setup lang="ts">
// 长文列表页
import { onMounted, ref } from 'vue'
import { api } from '../api'
import { fmtDate } from '../utils'
import IconSvg from '../components/IconSvg.vue'

interface Post {
  slug: string
  title: string
  created_at: string
}

const posts = ref<Post[]>([])
const loading = ref(true)
const failed = ref(false)

function load() {
  loading.value = true
  failed.value = false
  api('/api/posts')
    .then((data) => {
      posts.value = (data && data.posts) || []
      loading.value = false
    })
    .catch(() => {
      loading.value = false
      failed.value = true
    })
}

onMounted(load)
</script>

<template>
  <div class="wrap fade">
    <div class="sec-head">
      <span class="sec-icon"><IconSvg name="database" /></span>
      <div class="sec-sub">长文乱写区</div>
    </div>

    <div v-if="loading" class="state"><div class="loading">正在从云端搬运字节……</div></div>

    <div v-else-if="failed" class="state">
      海雾干扰了信号，字节们在半路走散了。<br>
      <span class="mini"><a href="/database" @click.prevent="load">再试一次</a> · 或者对着屏幕轻轻吹口气</span>
    </div>

    <div v-else-if="!posts.length" class="state">这片数据库还是空的。</div>

    <div v-else id="posts">
      <article v-for="p in posts" :key="p.slug" class="post">
        <h2 class="post-title">
          <RouterLink :to="'/post/' + encodeURIComponent(p.slug)">{{ p.title }}</RouterLink>
        </h2>
        <div class="post-meta">
          {{ fmtDate(p.created_at) }}
        </div>
      </article>
    </div>
  </div>
  <div class="foot">© Jimen · 手写于云端 · Wish me well</div>
</template>
