<script setup lang="ts">
import { avatarSrc } from './avatar'
// 根组件：顶栏（feed / data / about + 右上角圆形头像）+ 路由出口
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import IconSvg from './components/IconSvg.vue'

const route = useRoute()

// 四栏的统一定义：active 判断规则和图标都在这
const tabs = [
  { path: '/', label: 'feed', icon: 'shard', exact: true },
  { path: '/database', label: 'data', icon: 'database' },
  { path: '/about', label: 'about', icon: 'about' },
]
function isActive(t: (typeof tabs)[number]) {
  if (t.exact) return route.path === '/'
  if (t.path === '/database') return route.path === '/database' || route.path.startsWith('/post/')
  return route.path === t.path
}

// 视图标记挂在 body 上，CSS 靠它决定顶栏显隐（首页隐藏顶栏）
watch(
  () => route.path,
  (p) => {
    const view = ['/', '/database', '/about'].includes(p)
          ? p === '/'
            ? 'home'
            : p.slice(1)
          : 'home'
    document.body.dataset.view = view
    // 标题：首页简名，其余带栏目名
    {
      const names: Record<string, string> = {
        '/': 'Jimen Blog',
        '/database': 'Database · Jimen Blog',
        '/about': 'About · Jimen Blog',
      }
      document.title = names[p] || 'Jimen Blog'
    }
  },
  { immediate: true },
)

// 吸顶栏的滑隐：往下滚藏起来（把屏幕还给内容），往上滚才滑回来
const bar = ref<HTMLElement | null>(null)
let lastY = 0
function onScroll() {
  const el = bar.value
  if (!el) return
  const y = window.scrollY
  if (y < 100 || y < lastY - 2) {
    el.classList.remove('nav-hidden') // 在页首，或正在上滑：显示
  } else if (y > lastY + 2) {
    el.classList.add('nav-hidden') // 正在下滑：藏
  }
  lastY = y
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

// 右上角头像：点一下从原位慢慢放大到屏幕中央，再点（或返回手势）慢慢缩回去
const avBtn = ref<HTMLElement | null>(null)
const pop = ref(false) // 覆盖层是否挂着
const big = ref(false) // 是否处于放大状态（驱动过渡）
const box = ref<Record<string, string>>({})
const DUR = 900
let busy = false
function rectStyle() {
  const r = avBtn.value!.getBoundingClientRect()
  return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }
}
function centerStyle() {
  const S = Math.min(300, window.innerWidth * 0.72)
  return {
    left: (window.innerWidth - S) / 2 + 'px',
    top: (window.innerHeight - S) / 2 + 'px',
    width: S + 'px',
    height: S + 'px',
  }
}
function openAvatar() {
  if (busy || pop.value) return
  busy = true
  box.value = rectStyle()
  pop.value = true
  history.pushState({ avatar: 1 }, '')
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      big.value = true
      box.value = centerStyle()
      setTimeout(() => (busy = false), DUR)
    }),
  )
}
function shrink() {
  if (!pop.value) return
  busy = true
  big.value = false
  box.value = rectStyle()
  setTimeout(() => {
    pop.value = false
    busy = false
  }, DUR)
}
function closeAvatar() {
  if (busy || !pop.value) return
  if (history.state && history.state.avatar) history.back() // popstate 里收起
  else shrink()
}
function onPop() {
  if (pop.value) shrink()
}
onMounted(() => window.addEventListener('popstate', onPop))
onBeforeUnmount(() => window.removeEventListener('popstate', onPop))
</script>

<template>
  <header ref="bar" class="topbar">
    <nav class="topnav" aria-label="section nav">
      <RouterLink
        v-for="t in tabs"
        :key="t.path"
        :to="t.path"
        :class="{ active: isActive(t) }"
      >
        <IconSvg :name="t.icon" /><span class="topnav-text">{{ t.label }}</span>
      </RouterLink>
    </nav>

    <button ref="avBtn" type="button" class="nav-avatar" aria-label="头像" @click="openAvatar">
      <img :src="avatarSrc('/img/me-avatar.jpg')" alt="">
    </button>
  </header>

  <Teleport to="body">
    <div v-if="pop" class="av-pop" :class="{ on: big }" @click="closeAvatar">
      <img class="av-big" :style="box" :src="avatarSrc('/img/me-avatar.jpg')" alt="">
    </div>
  </Teleport>

  <main id="view">
    <RouterView />
  </main>
</template>

<style>
.nav-avatar { margin-left: auto; width: 34px; height: 34px; padding: 0; border: 1px solid #e6e6e6; border-radius: 50%; overflow: hidden; background: #fff; cursor: pointer; flex: none; }
.nav-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.av-pop { position: fixed; inset: 0; z-index: 200; background: rgba(255, 255, 255, 0); transition: background .9s ease; cursor: zoom-out; }
.av-pop.on { background: rgba(255, 255, 255, .94); }
.av-big { position: fixed; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: left .9s cubic-bezier(.22, .8, .2, 1), top .9s cubic-bezier(.22, .8, .2, 1), width .9s cubic-bezier(.22, .8, .2, 1), height .9s cubic-bezier(.22, .8, .2, 1), box-shadow .9s ease; }
.av-pop.on .av-big { box-shadow: 0 24px 60px rgba(0, 0, 0, .18); }
</style>
