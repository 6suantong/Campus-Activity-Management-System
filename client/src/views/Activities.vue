<script setup>
import { ref, onMounted } from 'vue';
import { listActivities } from '../api/activity';
import { getUser } from '../utils/auth';

const user = getUser();
const list = ref([]);
const loading = ref(true);
const errorMsg = ref('');

function fmt(t) {
  if (!t) return '';
  // MySQL DATETIME 在 JSON 中形如 "2026-09-20 06:00:00"（UTC），直接展示原始时间字符串
  return String(t).replace('T', ' ').slice(0, 16);
}

const statusText = { open: '报名中', closed: '已关闭', cancelled: '已取消' };

onMounted(async () => {
  try {
    list.value = await listActivities();
  } catch (err) {
    errorMsg.value = err.message || '加载失败';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div style="max-width:900px;margin:24px auto;padding:0 16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0">校园活动列表</h3>
      <router-link v-if="user.role === 'teacher'" to="/activities/create">
        <button>＋ 发布活动</button>
      </router-link>
    </div>

    <div v-if="loading" style="color:#6b7280;font-size:14px">加载中...</div>
    <div v-else-if="errorMsg" class="msg fail">{{ errorMsg }}</div>
    <div v-else-if="list.length === 0" style="background:#fff;padding:32px;text-align:center;border-radius:10px;color:#6b7280">
      暂无活动，教师可点击右上角「发布活动」创建
    </div>

    <div v-else style="display:flex;flex-direction:column;gap:14px">
      <div v-for="a in list" :key="a.id"
        style="background:#fff;padding:20px 24px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h4 style="margin:0;font-size:17px">{{ a.title }}</h4>
          <span style="font-size:12px;padding:3px 10px;border-radius:12px"
            :style="a.status === 'open' ? 'background:#dcfce7;color:#16a34a' : 'background:#f3f4f6;color:#6b7280'">
            {{ statusText[a.status] || a.status }}
          </span>
        </div>
        <div style="font-size:13px;color:#6b7280;line-height:1.9">
          <div>🕒 活动时间：{{ fmt(a.start_time) }} ~ {{ fmt(a.end_time) }}</div>
          <div>📍 活动地点：{{ a.location }}</div>
          <div>👥 人数上限：{{ a.capacity }} 人</div>
          <div>📝 报名时间：{{ fmt(a.register_start) }} ~ {{ fmt(a.register_end) }}</div>
          <div>👨‍🏫 发布教师：{{ a.publisher_name }}（{{ a.publisher_no }}）</div>
        </div>
        <p style="margin:10px 0 0;font-size:14px;color:#374151;white-space:pre-wrap;line-height:1.7">{{ a.description }}</p>
      </div>
    </div>
  </div>
</template>
