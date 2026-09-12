import { createRouter, createWebHistory } from 'vue-router';
import { getToken } from '../utils/auth';

const routes = [
  { path: '/', redirect: '/activities' },
  { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
  { path: '/register', name: 'register', component: () => import('../views/Register.vue') },
  {
    path: '/activities',
    name: 'activities',
    component: () => import('../views/Activities.vue'),
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫：未登录跳转登录页
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !getToken()) {
    return next({ path: '/login', query: { redirect: to.fullPath } });
  }
  if (['/login', '/register'].includes(to.path) && getToken()) {
    return next('/activities');
  }
  return next();
});

export default router;
