<script setup lang="ts">
import { avatarSrc } from './avatar'
// 根组件：顶栏（feed / data / about + 右上角圆形头像）+ 路由出口
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import IconSvg from './components/IconSvg.vue'

const route = useRoute()

// 四栏的统一定义：active 判断规则和图标都在这
const tabs = [
  { path: '/', label: 'feed', hw: '/img/nav-feed.webp', icon: 'shard', exact: true },
  { path: '/database', label: 'data', hw: '/img/nav-data.webp', icon: 'database' },
  { path: '/about', label: 'about', hw: '/img/nav-about.webp', icon: 'about' },
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
        '/': 'Jim Blog',
        '/database': 'Database · Jim Blog',
        '/about': 'About · Jim Blog',
      }
      document.title = names[p] || 'Jim Blog'
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
  history.pushState({ ...history.state, avatar: 1 }, '')
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
        replace
        :class="{ active: isActive(t) }"
      >
        <IconSvg :name="t.icon" /><img class="topnav-hw" :src="t.hw" :alt="t.label" width="120" height="64">
      </RouterLink>
    </nav>

    <button ref="avBtn" type="button" class="nav-avatar" aria-label="头像" @click="openAvatar">
      <img :src="avatarSrc('/img/me-avatar.jpg')" alt="">
    </button>
    <!-- 只在电脑宽屏的左侧栏里显示 -->
    <div class="side-id">
      <div class="side-name">Jim</div>
      <div class="side-bio">咋这么坏</div>
    </div>
    <div class="side-foot">© Jim · 手写于云端</div>
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
.side-id, .side-foot { display: none; }

/* 电脑宽屏：顶栏变成固定的左侧栏（头像、名字、竖排导航），内容在右边 */
@media (min-width: 1100px) {
  body .topbar, body[data-view="home"] .topbar {
    position: fixed; top: 0; bottom: 0;
    left: max(24px, calc(50vw - 540px));
    width: 220px; max-width: none; margin: 0;
    flex-direction: column; align-items: flex-start; gap: 0;
    padding: 64px 28px 36px 0;
    border-bottom: none; border-right: 1px solid var(--hairline);
    transform: none !important;
  }
  .nav-avatar { order: -2; margin: 0 0 18px; width: 72px; height: 72px; }
  .side-id { display: block; order: -1; margin-bottom: 34px; }
  .side-name { font-size: 20px; font-weight: 700; color: #111; line-height: 1.3; }
  .side-bio { margin-top: 4px; font-size: 14px; color: var(--muted); }
  /* 左侧导航：白色手写卡片，从上到下交错叠放，大小不一 */
  .topbar .topnav { flex-direction: column; align-items: flex-start; gap: 0; padding: 4px 0 0 6px; }
  .topbar .topnav a {
    --r: 0deg; --dx: 0px;
    position: relative; opacity: 1; padding: 14px 22px; border-radius: 18px; background: #fff;
    box-shadow: 0 1px 2px rgba(20, 23, 43, .08), 0 8px 22px rgba(20, 23, 43, .12);
    transform: translateX(var(--dx)) rotate(var(--r));
    transition: transform .45s cubic-bezier(.34, 1.56, .64, 1), box-shadow .3s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .topbar .topnav a svg, .topbar .topnav a.active::after { display: none; }
  .topbar .topnav a img.topnav-hw { opacity: .55; transition: opacity .25s ease; }
  .topbar .topnav a:nth-child(1) { --r: -6deg; --dx: 0px; z-index: 3; }
  .topbar .topnav a:nth-child(1) img.topnav-hw { height: 46px; }
  .topbar .topnav a:nth-child(2) { --r: 5deg; --dx: 58px; margin-top: -20px; z-index: 2; }
  .topbar .topnav a:nth-child(2) img.topnav-hw { height: 34px; }
  .topbar .topnav a:nth-child(3) { --r: -3deg; --dx: 14px; margin-top: -14px; z-index: 1; padding: 10px 18px; }
  .topbar .topnav a:nth-child(3) img.topnav-hw { height: 27px; }
  .topbar .topnav a:hover { transform: translateX(var(--dx)) translateY(-5px) rotate(0deg); box-shadow: 0 2px 4px rgba(20, 23, 43, .08), 0 16px 34px rgba(20, 23, 43, .16); }
  .topbar .topnav a:hover img.topnav-hw { opacity: .85; }
  .topbar .topnav a:active { transform: translateX(var(--dx)) scale(.9) rotate(0deg); transition-duration: .12s; }
  .topbar .topnav a.active { z-index: 5; animation: navPop .55s cubic-bezier(.34, 1.56, .64, 1); }
  .topbar .topnav a.active img.topnav-hw { opacity: 1; }
  @keyframes navPop {
    0% { transform: translateX(var(--dx)) scale(.88) rotate(0deg); }
    60% { transform: translateX(var(--dx)) scale(1.08) rotate(calc(var(--r) * -1)); }
    100% { transform: translateX(var(--dx)) scale(1) rotate(var(--r)); }
  }
  .side-foot { display: block; margin-top: auto; font-size: 12px; color: var(--muted); }
  #view { margin-left: calc(max(24px, 50vw - 540px) + 248px); max-width: 800px; }
}

.av-pop { position: fixed; inset: 0; z-index: 200; background: rgba(255, 255, 255, 0); transition: background .9s ease; cursor: zoom-out; }
.av-pop.on { background: rgba(255, 255, 255, .94); }
.av-big { position: fixed; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: left .9s cubic-bezier(.22, .8, .2, 1), top .9s cubic-bezier(.22, .8, .2, 1), width .9s cubic-bezier(.22, .8, .2, 1), height .9s cubic-bezier(.22, .8, .2, 1), box-shadow .9s ease; }
.av-pop.on .av-big { box-shadow: 0 24px 60px rgba(0, 0, 0, .18); }
</style>
