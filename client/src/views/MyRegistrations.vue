<script setup>
// REQ-03 我的报名：学生查看自己已经报名过的活动
import { ref, onMounted } from 'vue';
import { listMyRegistrations } from '../api/activity';
import { getUser } from '../utils/auth';

const user = getUser();
const list = ref([]);
const loading = ref(true);
const errorMsg = ref('');

function fmt(t) {
  if (!t) return '';
  return String(t).replace('T', ' ').slice(0, 16);
}

onMounted(async () => {
  try {
    list.value = await listMyRegistrations();
  } catch (err) {
    errorMsg.value = err.message || '加载失败';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div style="max-width:900px;margin:24px auto;padding:0 16px">
    <h3 style="margin:0 0 16px">我的报名（{{ user.name }}）</h3>

    <div v-if="loading" style="color:#6b7280;font-size:14px">加载中...</div>
    <div v-else-if="errorMsg" class="msg fail">{{ errorMsg }}</div>
    <div v-else-if="list.length === 0" style="background:#fff;padding:32px;text-align:center;border-radius:10px;color:#6b7280">
      你还没有报名任何活动，去
      <router-link to="/activities" style="color:#2563eb">活动列表</router-link>
      看看吧
    </div>

    <div v-else style="display:flex;flex-direction:column;gap:14px">
      <div v-for="r in list" :key="r.registration_id"
        style="background:#fff;padding:20px 24px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h4 style="margin:0;font-size:17px">{{ r.title }}</h4>
          <span style="font-size:12px;padding:3px 10px;border-radius:12px;background:#dcfce7;color:#16a34a">
            报名成功
          </span>
        </div>
        <div style="font-size:13px;color:#6b7280;line-height:1.9">
          <div>🕒 活动时间：{{ fmt(r.start_time) }} ~ {{ fmt(r.end_time) }}</div>
          <div>📍 活动地点：{{ r.location }}</div>
          <div>👨‍🏫 发布教师：{{ r.publisher_name }}</div>
          <div>✅ 报名时间：{{ fmt(r.registered_at) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
