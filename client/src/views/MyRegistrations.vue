<script setup>
// V2.0 我的报名：展示全部报名状态（已确认/待审核/候补中/已取消），
// 支持取消已确认报名（US-V2-01）、退出候补（US-V2-08），候补中显示排队顺序（US-V2-06）。
import { ref, onMounted } from 'vue';
import { listMyRegistrations, cancelRegistration, leaveWaitlist } from '../api/activity';
import { getUser } from '../utils/auth';

const user = getUser();
const list = ref([]);
const loading = ref(true);
const errorMsg = ref('');
const opMsg = ref('');
const opOk = ref(false);
const busyId = ref(0); // 正在操作的报名记录 id，防止重复点击

// 状态标签样式映射
const STATUS_STYLE = {
  '已确认': { background: '#dcfce7', color: '#16a34a' },
  '待审核': { background: '#fef9c3', color: '#ca8a04' },
  '候补中': { background: '#dbeafe', color: '#2563eb' },
  '已取消': { background: '#f3f4f6', color: '#9ca3af' }
};

function fmt(t) {
  if (!t) return '';
  return String(t).replace('T', ' ').slice(0, 16);
}

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    list.value = await listMyRegistrations();
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

// US-V2-01 取消报名：确认后调用，成功后刷新（可能触发自动递补提示）
async function onCancel(r) {
  if (!confirm(`确定取消报名「${r.title}」吗？`)) return;
  busyId.value = r.registration_id;
  try {
    const res = await cancelRegistration(r.registration_id);
    // 后端返回 code=0，message 可能含"已自动为候补同学补位"
    showOp(res?.message || '取消成功', true);
    await load();
  } catch (err) {
    showOp(err.message || '取消失败', false);
  } finally {
    busyId.value = 0;
  }
}

// US-V2-08 退出候补
async function onLeaveWaitlist(r) {
  if (!confirm(`确定退出「${r.title}」的候补队列吗？`)) return;
  busyId.value = r.registration_id;
  try {
    await leaveWaitlist(r.registration_id);
    showOp('已退出候补', true);
    await load();
  } catch (err) {
    showOp(err.message || '操作失败', false);
  } finally {
    busyId.value = 0;
  }
}

onMounted(load);
</script>

<template>
  <div style="max-width:900px;margin:24px auto;padding:0 16px">
    <h3 style="margin:0 0 16px">我的报名（{{ user.name }}）</h3>

    <div v-if="opMsg" class="msg" :class="opOk ? 'success' : 'fail'" style="margin-bottom:14px">{{ opMsg }}</div>

    <div v-if="loading" style="color:#6b7280;font-size:14px">加载中...</div>
    <div v-else-if="errorMsg" class="msg fail">{{ errorMsg }}</div>
    <div v-else-if="list.length === 0" style="background:#fff;padding:32px;text-align:center;border-radius:10px;color:#6b7280">
      你还没有报名任何活动，去
      <router-link to="/activities" style="color:#2563eb">活动列表</router-link>
      看看吧
    </div>

    <div v-else style="display:flex;flex-direction:column;gap:14px">
      <div v-for="r in list" :key="r.registration_id"
        :style="{ background:'#fff', padding:'20px 24px', borderRadius:'10px', boxShadow:'0 4px 12px rgba(0,0,0,0.05)', opacity: r.registration_status === 'cancelled' ? 0.65 : 1 }">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h4 style="margin:0;font-size:17px">{{ r.title }}</h4>
          <span :style="{ fontSize:'12px', padding:'3px 10px', borderRadius:'12px', ...(STATUS_STYLE[r.status_text] || {}) }">
            {{ r.status_text }}<template v-if="r.queue_position !== null">（第 {{ r.queue_position }} 位）</template>
          </span>
        </div>
        <div style="font-size:13px;color:#6b7280;line-height:1.9">
          <div>🕒 活动时间：{{ fmt(r.start_time) }} ~ {{ fmt(r.end_time) }}</div>
          <div>📍 活动地点：{{ r.location }}</div>
          <div>👨‍🏫 发布教师：{{ r.publisher_name }}</div>
          <div>✅ 报名时间：{{ fmt(r.registered_at) }}</div>
        </div>
        <div v-if="r.can_cancel || r.can_leave_waitlist" style="margin-top:12px;text-align:right">
          <button v-if="r.can_cancel" :disabled="busyId === r.registration_id" @click="onCancel(r)"
            style="padding:6px 16px;font-size:13px;background:#fff;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;cursor:pointer">
            {{ busyId === r.registration_id ? '处理中...' : '取消报名' }}
          </button>
          <button v-if="r.can_leave_waitlist" :disabled="busyId === r.registration_id" @click="onLeaveWaitlist(r)"
            style="padding:6px 16px;font-size:13px;background:#fff;color:#2563eb;border:1px solid #93c5fd;border-radius:6px;cursor:pointer">
            {{ busyId === r.registration_id ? '处理中...' : '退出候补' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
