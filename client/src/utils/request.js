import axios from 'axios';
import { getToken } from './auth';
import { logout } from '../store/auth';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
});

// 请求拦截器：自动注入 Authorization
request.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：401 自动跳转登录
request.interceptors.response.use(
  resp => {
    const body = resp.data;
    if (body && body.code === 0) {
      return body.data === null ? { ...body, data: undefined } : body.data;
    }
    // 业务错误抛出，组件层捕获展示
    return Promise.reject(new Error(body?.message || '请求失败'));
  },
  error => {
    const status = error.response?.status;
    if (status === 401) {
      logout();
      // 避免循环跳转：如不在登录页则跳转
      if (!location.pathname.startsWith('/login')) {
        location.href = '/login?expired=1';
      }
    }
    const msg = error.response?.data?.message || error.message || '网络错误';
    return Promise.reject(new Error(msg));
  }
);

export default request;
