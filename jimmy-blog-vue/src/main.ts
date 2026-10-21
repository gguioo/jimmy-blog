// 入口：引入全局样式，挂载 Vue 应用
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

import './styles/main.css'    // 原 style.css 原样移植（配色/布局/动效）
import './styles/extras.css'  // 原先 JS 注入的 feed/导航样式
import './styles/songti.css'  // 思源宋体 700 字体声明

createApp(App).use(router).mount('#app')

// 空闲时把各页面的组件文件提前拉到本地（每个才几 KB）：
// 否则点导航要先下载页面文件才换页，网络慢时有「点了没反应」的空窗
function preloadViews() {
  import('./views/HomeView.vue')
  import('./views/DatabaseView.vue')
  import('./views/PostView.vue')
  import('./views/AboutView.vue')
}
if ('requestIdleCallback' in window) {
  ;(window as any).requestIdleCallback(preloadViews)
} else {
  setTimeout(preloadViews, 1500)
}
