<script setup>
// V2.0 教师端：本人活动报名名单（US-V2-02/03 区分已确认/待审核/候补中/已取消，导出 CSV）
// 兼报名审核（US-V2-09/10）：待审核记录可一键通过/拒绝，通过后按剩余名额自动转已确认或候补。
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  listActivityRegistrations,
  exportRegistrationsCsv,
  reviewRegistration
} from '../api/activity';

const route = useRoute();
const activityId = Number(route.params.id);

const data = ref(null);
const loading = ref(true);
const errorMsg = ref('');
const opMsg = ref('');
const opOk = ref(false);
const busyId = ref(0);

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
    data.value = await listActivityRegistrations(activityId);
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

// US-V2-09/10 审核报名申请
async function onReview(r, action) {
  const actionText = action === 'approve' ? '通过' : '拒绝';
  if (!confirm(`确定${actionText}「${r.student_name}（${r.student_no}）」的报名申请吗？`)) return;
  busyId.value = r.registration_id;
  try {
    const res = await reviewRegistration(r.registration_id, action);
    showOp(res?.message || `已${actionText}`, true);
    await load();
  } catch (err) {
    showOp(err.message || '操作失败', false);
  } finally {
    busyId.value = 0;
  }
}

// US-V2-02 导出 CSV
async function onExport() {
  try {
    await exportRegistrationsCsv(activityId, data.value?.activity?.title);
    showOp('已开始下载名单 CSV', true);
  } catch (err) {
    showOp(err.message || '导出失败', false);
  }
}

onMounted(load);
</script>

<template>
  <div style="max-width:960px;margin:24px auto;padding:0 16px">
    <div v-if="loading" style="color:#6b7280;font-size:14px">加载中...</div>
    <div v-else-if="errorMsg" class="msg fail">{{ errorMsg }}</div>

    <template v-else-if="data">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0">{{ data.activity.title }} · 报名名单</h3>
        <button @click="onExport" style="padding:6px 16px;font-size:13px;background:#16a34a;color:#fff">导出名单 CSV</button>
      </div>

      <div style="display:flex;gap:16px;margin-bottom:16px;font-size:13px;color:#6b7280">
        <span>容量 {{ data.activity.capacity }} 人</span>
        <span style="color:#16a34a">已确认 {{ data.confirmed_count }}</span>
        <span v-if="data.pending_count > 0" style="color:#ca8a04">待审核 {{ data.pending_count }}</span>
        <span v-if="data.waitlisted_count > 0" style="color:#2563eb">候补 {{ data.waitlisted_count }}</span>
        <span>剩余位置 {{ data.remaining }}</span>
      </div>

      <div v-if="opMsg" class="msg" :class="opOk ? 'success' : 'fail'" style="margin-bottom:14px">{{ opMsg }}</div>

      <div v-if="data.registrations.length === 0"
        style="background:#fff;padding:32px;text-align:center;border-radius:10px;color:#6b7280">暂无报名记录</div>

      <div v-else style="background:#fff;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.05);overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f9fafb;text-align:left">
              <th style="padding:12px 16px;font-weight:600;color:#374151">学号</th>
              <th style="padding:12px 16px;font-weight:600;color:#374151">姓名</th>
              <th style="padding:12px 16px;font-weight:600;color:#374151">状态</th>
              <th style="padding:12px 16px;font-weight:600;color:#374151">报名时间</th>
              <th style="padding:12px 16px;font-weight:600;color:#374151">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data.registrations" :key="r.registration_id"
              :style="{ borderTop:'1px solid #f3f4f6', opacity: r.status === 'cancelled' ? 0.55 : 1 }">
              <td style="padding:12px 16px">{{ r.student_no }}</td>
              <td style="padding:12px 16px">{{ r.student_name }}</td>
              <td style="padding:12px 16px">
                <span :style="{ fontSize:'12px', padding:'2px 8px', borderRadius:'10px', ...(STATUS_STYLE[r.status_text] || {}) }">
                  {{ r.status_text }}<template v-if="r.queue_position !== null">（第 {{ r.queue_position }} 位）</template>
                </span>
              </td>
              <td style="padding:12px 16px;color:#6b7280">{{ fmt(r.registered_at) }}</td>
              <td style="padding:12px 16px">
                <template v-if="r.status === 'pending'">
                  <button :disabled="busyId === r.registration_id" @click="onReview(r, 'approve')"
                    style="padding:4px 12px;font-size:12px;background:#16a34a;color:#fff;margin-right:8px">通过</button>
                  <button :disabled="busyId === r.registration_id" @click="onReview(r, 'reject')"
                    style="padding:4px 12px;font-size:12px;background:#fff;color:#dc2626;border:1px solid #fca5a5">拒绝</button>
                </template>
                <span v-else style="color:#d1d5db;font-size:12px">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
