/**
 * 路由配置
 * 定义应用所有页面路由，采用懒加载方式
 */
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/Search.vue'),
    meta: { title: '搜索' }
  },
  {
    path: '/detail/:id',
    name: 'Detail',
    component: () => import('../views/Detail.vue'),
    meta: { title: '番剧详情' }
  },
  {
    path: '/player/:id',
    name: 'Player',
    component: () => import('../views/Player.vue'),
    meta: { title: '播放' }
  },
  {
    path: '/sources',
    name: 'Sources',
    component: () => import('../views/Sources.vue'),
    meta: { title: '订阅源' }
  },
  {
    path: '/enhance',
    name: 'VideoEnhance',
    component: () => import('../views/VideoEnhance.vue'),
    meta: { title: 'AI增强' }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../views/History.vue'),
    meta: { title: '历史记录' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 更新页面标题
router.beforeEach((to) => {
  document.title = `${to.meta.title || 'AniVault'} - AniVault`
})

export default router
