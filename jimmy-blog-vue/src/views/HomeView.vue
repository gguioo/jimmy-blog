<script setup lang="ts">
import { avatarSrc } from '../avatar'
// feed：骨架屏 → 加载条目（文字 + 图片）→ 复制/分享；点图进灯箱，返回手势只关灯箱
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../api'
import { relTime } from '../utils'
import IconSvg from '../components/IconSvg.vue'

interface Entry {
  id: number
  text: string
  photos: string[]
  created_at: string
}

const entries = ref<Entry[]>([])
const loading = ref(true)
const failed = ref(false)

// toast：跟着按钮出现的小黑条
const toastOn = ref('')
const toastText = ref('')
function toast(key: string, msg: string) {
  toastOn.value = key
  toastText.value = msg
  setTimeout(() => {
    if (toastOn.value === key) toastOn.value = ''
  }, 1100)
}

function copy(e: Entry) {
  navigator.clipboard
    .writeText(e.text || '')
    .then(() => toast(e.id + ':copy', '已复制'))
    .catch(() => toast(e.id + ':copy', '复制失败'))
}

function share(e: Entry) {
  const url = location.origin + '/?j=' + e.id
  if (navigator.share) {
    navigator.share({ title: 'Jim Blog', text: e.text, url }).catch(() => {})
  } else {
    navigator.clipboard.writeText(url).then(() => toast(e.id + ':share', '链接已复制'))
  }
}

function load() {
  loading.value = true
  failed.value = false
  api('/api/feed')
    .then((data) => {
      entries.value = (data && data.entries) || []
      loading.value = false
    })
    .catch(() => {
      loading.value = false
      failed.value = true
    })
}

// 灯箱：左右滑切换，点一下或返回手势关闭
const lb = ref<{ photos: string[]; i: number } | null>(null)
function openLb(photos: string[], i: number) {
  lb.value = { photos, i }
  history.pushState({ lb: 1 }, '')
}
function closeLb() {
  if (!lb.value) return
  if (history.state && history.state.lb) history.back()
  else lb.value = null
}
function onPop() {
  lb.value = null
}
function step(d: number) {
  const l = lb.value
  if (!l) return
  l.i = (l.i + d + l.photos.length) % l.photos.length
}
let x0 = 0
let moved = false
function touchStart(ev: TouchEvent) {
  x0 = ev.touches[0].clientX
  moved = false
}
function touchEnd(ev: TouchEvent) {
  const dx = ev.changedTouches[0].clientX - x0
  if (Math.abs(dx) > 40) {
    moved = true
    step(dx < 0 ? 1 : -1)
  }
}
function lbClick() {
  if (moved) {
    moved = false
    return
  }
  closeLb()
}
function onKey(ev: KeyboardEvent) {
  if (!lb.value) return
  if (ev.key === 'Escape') closeLb()
  if (ev.key === 'ArrowRight') step(1)
  if (ev.key === 'ArrowLeft') step(-1)
}

onMounted(() => {
  load()
  window.addEventListener('popstate', onPop)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('popstate', onPop)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="feed fade">
    <div class="sec-head">
      <span class="sec-icon"><IconSvg name="shard" /></span>
      <div class="sec-sub">feed</div>
    </div>

    <!-- 加载中：三条骨架占位，避免内容突然撑开 -->
    <div v-if="loading" id="fd-list">
      <div v-for="i in 3" :key="i" class="fd-sk">
        <span class="sk-av"></span>
        <div>
          <div class="sk-l sk-w1"></div>
          <div class="sk-l"></div>
          <div class="sk-l sk-w2"></div>
        </div>
      </div>
    </div>

    <div v-else-if="failed" class="state">
      海雾干扰了信号，字节们在半路走散了。<br>
      <span class="mini"><a href="/" @click.prevent="load">再试一次</a> · 或者对着屏幕轻轻吹口气</span>
    </div>

    <div v-else id="fd-list">
      <div v-for="e in entries" :key="e.id" class="fd-item">
        <span class="fd-avatar"><img :src="avatarSrc('/img/jimmy-avatar.jpg')" alt=""></span>
        <div class="fd-main">
          <div class="fd-head"><span class="fd-name">Jim</span><span class="fd-date">{{ relTime(e.created_at) }}</span></div>
          <div v-if="e.text" class="fd-text">{{ e.text }}</div>
          <div v-if="e.photos.length" class="fd-photos" :class="{ one: e.photos.length === 1 }">
            <img
              v-for="(src, i) in e.photos"
              :key="src"
              :src="src"
              alt=""
              loading="lazy"
              @click="openLb(e.photos, i)"
            >
          </div>
          <div class="fd-acts">
            <button v-if="e.text" type="button" class="fa-copy" @click="copy(e)">
              <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1.5 1.5 0 011.5-1.5H15"/></svg>
              <span v-if="toastOn === e.id + ':copy'" class="fa-toast">{{ toastText }}</span>
            </button>
            <button type="button" class="fa-share" @click="share(e)">
              <svg viewBox="0 0 24 24"><path d="M21 3L3 10.5l7 2.5 2.5 7L21 3z"/><path d="M10 13l11-10"/></svg>
              <span v-if="toastOn === e.id + ':share'" class="fa-toast">{{ toastText }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="foot">© Jim · 手写于云端 · Wish me well</div>

  <Teleport to="body">
    <div v-if="lb" class="lightbox" role="dialog" aria-label="photo viewer" @click="lbClick" @touchstart.passive="touchStart" @touchend="touchEnd">
      <img :src="lb.photos[lb.i]" alt="">
      <div v-if="lb.photos.length > 1" class="cap">{{ lb.i + 1 }} / {{ lb.photos.length }}</div>
    </div>
  </Teleport>
</template>

<style>
.fd-photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; max-width: 420px; }
.fd-photos img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; border-radius: 8px; background: #f2f2f2; cursor: zoom-in; }
.fd-photos.one { display: block; }
.fd-photos.one img { width: auto; max-width: min(100%, 360px); max-height: 420px; aspect-ratio: auto; }
</style>
