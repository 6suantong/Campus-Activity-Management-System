import request from '../utils/request';
import { getToken } from '../utils/auth';
import axios from 'axios';

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

// REQ-03 学生报名活动
export function registerActivity(activityId) {
  return request.post('/registrations', { activity_id: activityId });
}

// REQ-03 我的报名
export function listMyRegistrations() {
  return request.get('/registrations/mine');
}

// ===== V2.0 报名后半程 =====
// US-V2-01 取消报名（已确认记录）
export function cancelRegistration(registrationId) {
  return request.post(`/registrations/${registrationId}/cancel`);
}

// US-V2-05 申请候补（满员活动）
export function joinWaitlist(activityId) {
  return request.post('/registrations/waitlist', { activity_id: activityId });
}

// US-V2-08 退出候补
export function leaveWaitlist(registrationId) {
  return request.post(`/registrations/${registrationId}/leave-waitlist`);
}

// ===== V2.0 教师端 =====
// 我发布的活动（含已确认/候补/待审核人数）
export function listTeacherActivities() {
  return request.get('/teacher/activities');
}

// US-V2-02/03 本人活动报名名单（区分状态）
export function listActivityRegistrations(activityId) {
  return request.get(`/teacher/activities/${activityId}/registrations`);
}

// US-V2-09 待审核申请列表
export function listPendingRegistrations(activityId) {
  return request.get(`/teacher/activities/${activityId}/pending`);
}

// US-V2-09/10 审核报名申请：action = 'approve' | 'reject'
export function reviewRegistration(registrationId, action) {
  return request.post(`/teacher/registrations/${registrationId}/review`, { action });
}

// US-V2-02 导出报名名单 CSV（带 token 的 blob 下载，避免 <a href> 无法注入 Authorization）
export async function exportRegistrationsCsv(activityId, activityTitle) {
  const resp = await axios.get(`/api/teacher/activities/${activityId}/registrations/export`, {
    headers: { Authorization: `Bearer ${getToken()}` },
    responseType: 'blob'
  });
  const url = URL.createObjectURL(resp.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `报名名单_${activityTitle || activityId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ===== V2.0 管理员端 =====
// US-V2-04 查看平台账号与基本状态
export function listAdminUsers(params) {
  return request.get('/admin/users', { params });
}

// US-V2-04 停用账号
export function disableUser(userNo) {
  return request.post(`/admin/users/${userNo}/disable`);
}

// US-V2-04 恢复账号
export function enableUser(userNo) {
  return request.post(`/admin/users/${userNo}/enable`);
}
