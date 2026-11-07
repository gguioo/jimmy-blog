<script setup lang="ts">
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

// feed 拼贴板（同 chatblog demo）：便签 + 拍立得照片，每次打开随机角度、位移、层级
interface Piece {
  key: string
  kind: 'note' | 'photo'
  e: Entry
  style: Record<string, string>
  cls?: string
  tape?: boolean
  src?: string
  k?: number
  date: string
}
const pieces = ref<Piece[]>([])
const lifted = ref('')
function buildBoard(list: Entry[]) {
  const R = (a: number, b: number) => a + Math.random() * (b - a)
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
  const W = Math.min(window.innerWidth, 720)
  const pos = () => ({
    '--r': R(-11, 11).toFixed(1) + 'deg',
    '--x': R(-14, 14).toFixed(0) + 'px',
    '--y': R(-10, 14).toFixed(0) + 'px',
    '--z': String(Math.floor(R(1, 20))),
  })
  const out: Piece[] = []
  list.forEach((e) => {
    const date = relTime(e.created_at)
    if (e.text)
      out.push({ key: e.id + 'n', kind: 'note', e, date, cls: pick(['', 'y', 'b', 'p', 'g']), tape: Math.random() < 0.5,
        style: { ...pos(), width: R(W * 0.42, W * 0.62).toFixed(0) + 'px' } })
    e.photos.forEach((src, k) =>
      out.push({ key: e.id + 'p' + k, kind: 'photo', e, date, src, k,
        style: { ...pos(), '--ar': pick(['1/1', '4/5', '4/3', '3/4']), width: R(W * 0.34, W * 0.5).toFixed(0) + 'px' } }))
  })
  // 稍微打乱，同一条的碎片不总挨在一起
  for (let i = out.length - 1; i > 0; i--) {
    if (Math.random() < 0.35) {
      const j = Math.max(0, i - 2 + Math.floor(Math.random() * 2))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
  }
  pieces.value = out
}
function tapNote(p: Piece) {
  lifted.value = lifted.value === p.key ? '' : p.key
}
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
      buildBoard(entries.value)
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

    <div v-else class="board">
      <template v-for="p in pieces" :key="p.key">
        <div v-if="p.kind === 'note'" class="pc note" :class="[p.cls, { tape: p.tape, lift: lifted === p.key }]" :style="p.style" @click="tapNote(p)">{{ p.e.text }}<small><span>{{ p.date }}</span>
            <button type="button" class="pc-act" aria-label="复制" @click.stop="copy(p.e)"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1.5 1.5 0 011.5-1.5H15"/></svg><span v-if="toastOn === p.e.id + ':copy'" class="fa-toast">{{ toastText }}</span></button>
            <button type="button" class="pc-act" aria-label="分享" @click.stop="share(p.e)"><svg viewBox="0 0 24 24"><path d="M21 3L3 10.5l7 2.5 2.5 7L21 3z"/><path d="M10 13l11-10"/></svg><span v-if="toastOn === p.e.id + ':share'" class="fa-toast">{{ toastText }}</span></button></small></div>
        <div v-else class="pc photo" :style="p.style" @click="openLb(p.e.photos, p.k || 0)"><img :src="p.src" alt="" loading="lazy" draggable="false"><span>{{ p.k === 0 ? p.date : '' }}</span></div>
      </template>
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
@font-face { font-family: 'CaveatNav'; src: url(/fonts/caveat-latin.woff2) format('woff2'); font-display: swap; }
.board { overflow-x: clip; display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; padding: 10px 0 60px; }
.pc { position: relative; margin: -10px -12px; transition: transform .45s cubic-bezier(.22,.9,.24,1.2), box-shadow .3s; cursor: pointer;
  transform: translate(var(--x), var(--y)) rotate(var(--r)); z-index: var(--z); }
.pc.lift { transform: translate(var(--x), var(--y)) rotate(0) scale(1.06); z-index: 40 !important; }
.pc.note { background: #fffdf6; color: #2a2d3c; padding: 18px 18px 14px; border-radius: 4px; font-size: 16px; line-height: 1.7;
  box-shadow: 0 10px 24px rgba(20,23,43,.13), 0 1px 2px rgba(20,23,43,.08); white-space: pre-wrap; word-break: break-word; font-family: var(--sans); }
.pc.note.y { background: #fff6c9 } .pc.note.b { background: #e9f1ff } .pc.note.p { background: #ffe9ef } .pc.note.g { background: #eaf6e6 }
.pc.note small { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-size: 12px; color: #8a8fa3; white-space: normal; }
.pc.note small > span { margin-right: auto; }
.pc-act { position: relative; background: none; border: none; padding: 0; display: inline-flex; cursor: pointer; }
.pc-act svg { width: 15px; height: 15px; fill: none; stroke: #a3a7b6; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.pc.note.tape::before { content: ""; position: absolute; top: -10px; left: 50%; width: 70px; height: 22px; transform: translateX(-50%) rotate(-3deg);
  background: rgba(255,255,255,.55); box-shadow: 0 1px 3px rgba(0,0,0,.08); border-left: 1px dashed rgba(0,0,0,.06); border-right: 1px dashed rgba(0,0,0,.06); }
.pc.photo { background: #fff; padding: 8px 8px 30px; border-radius: 3px; box-shadow: 0 12px 28px rgba(20,23,43,.18), 0 1px 2px rgba(20,23,43,.1); cursor: zoom-in; }
.pc.photo img { display: block; width: 100%; aspect-ratio: var(--ar); object-fit: cover; border-radius: 2px; background: #eceef3; }
.pc.photo span { position: absolute; left: 0; right: 0; bottom: 7px; text-align: center; font-family: 'CaveatNav', 'Bradley Hand', cursive; font-size: 15px; color: #6b7086; }
</style>
