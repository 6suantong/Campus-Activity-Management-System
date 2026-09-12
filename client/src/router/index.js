import { createRouter, createWebHistory } from 'vue-router';
import { getToken, getUser } from '../utils/auth';

const routes = [
  { path: '/', redirect: '/activities' },
  { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
  { path: '/register', name: 'register', component: () => import('../views/Register.vue') },
  {
    path: '/activities',
    name: 'activities',
    component: () => import('../views/Activities.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/activities/create',
    name: 'activity-create',
    component: () => import('../views/ActivityCreate.vue'),
    meta: { requiresAuth: true, roles: ['teacher'] }
  },
  {
    path: '/my-registrations',
    name: 'my-registrations',
    component: () => import('../views/MyRegistrations.vue'),
    meta: { requiresAuth: true, roles: ['student'] }
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
  // 角色限制：例如发布活动仅教师
  if (to.meta.roles && !to.meta.roles.includes(getUser().role)) {
    return next('/activities');
  }
  if (['/login', '/register'].includes(to.path) && getToken()) {
    return next('/activities');
  }
  return next();
});

export default router;
