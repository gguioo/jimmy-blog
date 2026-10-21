// 路由表：全部懒加载，每个页面打包成独立 js
import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/HomeView.vue') },
    { path: '/database', component: () => import('./views/DatabaseView.vue') },
    { path: '/post/:slug', component: () => import('./views/PostView.vue') },
    { path: '/about', component: () => import('./views/AboutView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' }, // 未知路径回首页
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})
