<script setup>
// V2.0 系统管理员：查看平台账号与基本状态（US-V2-04），对异常账号停用/恢复。
// 仅展示账号基本字段，不展示任何报名/活动业务数据（R-V2-05 隐私边界）。
import { ref, onMounted } from 'vue';
import { listAdminUsers, disableUser, enableUser } from '../api/activity';

const list = ref([]);
const loading = ref(true);
const errorMsg = ref('');
const opMsg = ref('');
const opOk = ref(false);
const busyNo = ref('');
const keyword = ref('');
const roleFilter = ref('');

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const params = {};
    if (keyword.value.trim()) params.keyword = keyword.value.trim();
    if (roleFilter.value) params.role = roleFilter.value;
    list.value = await listAdminUsers(params);
  } catch (err) {
    errorMsg.value = err.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

function showOp(msg, okFlag) {
  opMsg.value = msg;
  opOk.value = okFlag;
  setTimeout(() => { opMsg.value = ''; }, 3000);
}

// US-V2-04 停用账号
async function onDisable(u) {
  if (!confirm(`确定停用账号「${u.name}（${u.user_no}）」吗？停用后该账号将无法登录。`)) return;
  busyNo.value = u.user_no;
  try {
    await disableUser(u.user_no);
    showOp(`账号 ${u.user_no} 已停用`, true);
    await load();
  } catch (err) {
    showOp(err.message || '操作失败', false);
  } finally {
    busyNo.value = '';
  }
}

// US-V2-04 恢复账号
async function onEnable(u) {
  if (!confirm(`确定恢复账号「${u.name}（${u.user_no}）」为可用状态吗？`)) return;
  busyNo.value = u.user_no;
  try {
    await enableUser(u.user_no);
    showOp(`账号 ${u.user_no} 已恢复可用`, true);
    await load();
  } catch (err) {
    showOp(err.message || '操作失败', false);
  } finally {
    busyNo.value = '';
  }
}

onMounted(load);
</script>

<template>
  <div style="max-width:960px;margin:24px auto;padding:0 16px">
    <h3 style="margin:0 0 16px">账号管理（系统管理员）</h3>

    <div style="display:flex;gap:10px;margin-bottom:16px">
      <input v-model="keyword" placeholder="按学号/工号或姓名搜索" @keyup.enter="load"
        style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px" />
      <select v-model="roleFilter" @change="load"
        style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px">
        <option value="">全部角色</option>
        <option value="student">学生</option>
        <option value="teacher">教师</option>
        <option value="admin">管理员</option>
      </select>
      <button @click="load" style="padding:8px 20px;font-size:14px">搜索</button>
    </div>

    <div v-if="opMsg" class="msg" :class="opOk ? 'success' : 'fail'" style="margin-bottom:14px">{{ opMsg }}</div>

    <div v-if="loading" style="color:#6b7280;font-size:14px">加载中...</div>
    <div v-else-if="errorMsg" class="msg fail">{{ errorMsg }}</div>
    <div v-else-if="list.length === 0"
      style="background:#fff;padding:32px;text-align:center;border-radius:10px;color:#6b7280">没有匹配的账号</div>

    <div v-else style="background:#fff;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.05);overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f9fafb;text-align:left">
            <th style="padding:12px 16px;font-weight:600;color:#374151">学号/工号</th>
            <th style="padding:12px 16px;font-weight:600;color:#374151">姓名</th>
            <th style="padding:12px 16px;font-weight:600;color:#374151">角色</th>
            <th style="padding:12px 16px;font-weight:600;color:#374151">账号状态</th>
            <th style="padding:12px 16px;font-weight:600;color:#374151">注册时间</th>
            <th style="padding:12px 16px;font-weight:600;color:#374151">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in list" :key="u.user_no" style="border-top:1px solid #f3f4f6">
            <td style="padding:12px 16px">{{ u.user_no }}</td>
            <td style="padding:12px 16px">{{ u.name }}</td>
            <td style="padding:12px 16px">{{ u.role_text }}</td>
            <td style="padding:12px 16px">
              <span :style="{ fontSize:'12px', padding:'2px 8px', borderRadius:'10px',
                ...(u.account_status === 'active' ? { background:'#dcfce7', color:'#16a34a' } : { background:'#fee2e2', color:'#dc2626' }) }">
                {{ u.account_status_text }}
              </span>
            </td>
            <td style="padding:12px 16px;color:#6b7280">{{ u.created_at }}</td>
            <td style="padding:12px 16px">
              <button v-if="u.account_status === 'active' && u.role !== 'admin'"
                :disabled="busyNo === u.user_no" @click="onDisable(u)"
                style="padding:4px 12px;font-size:12px;background:#fff;color:#dc2626;border:1px solid #fca5a5">停用</button>
              <button v-else-if="u.account_status === 'disabled'"
                :disabled="busyNo === u.user_no" @click="onEnable(u)"
                style="padding:4px 12px;font-size:12px;background:#16a34a;color:#fff">恢复</button>
              <span v-else style="color:#d1d5db;font-size:12px">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
