import request from '../utils/request';

// REQ-02 教师发布活动
export function createActivity(payload) {
  return request.post('/activities', payload);
}

// 公共活动列表（REQ-02 全部活动；REQ-03 起带 onlyRegisterable=true）
export function listActivities(params) {
  return request.get('/activities', { params });
}

// 活动详情
export function getActivity(id) {
  return request.get(`/activities/${id}`);
}
