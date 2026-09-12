import request from '../utils/request';

export function register(payload) {
  return request.post('/auth/register', payload);
}

export function login(payload) {
  return request.post('/auth/login', payload);
}

export function logout() {
  return request.post('/auth/logout');
}

export function me() {
  return request.get('/auth/me');
}
