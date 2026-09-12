// 全局响应式登录状态
// 背景：localStorage 不是 Vue 响应式数据，直接在 computed 里读取会导致
// 退出登录后导航栏仍显示旧用户名（需刷新才消失）。登录/登出统一经此模块，
// 组件通过 authState/isLoggedIn 读取，状态变化即时反映到界面。
import { reactive, computed } from 'vue';
import {
  getToken,
  getUser,
  setAuth as persistAuth,
  clearAuth as persistClear
} from '../utils/auth';

export const authState = reactive({
  token: getToken(),
  user: getUser()
});

export const isLoggedIn = computed(() => !!authState.token);

// 登录成功：持久化 + 更新响应式状态
export function login(token, user) {
  persistAuth(token, user);
  authState.token = token;
  authState.user = user || {};
}

// 退出/登录态失效：清持久化 + 更新响应式状态
export function logout() {
  persistClear();
  authState.token = '';
  authState.user = {};
}
