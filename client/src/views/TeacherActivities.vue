<script setup>
// V2.0 教师端：我发布的活动列表（US-V2-03 查看各活动真实有效人数与候补/待审核数），
// 点入名单/审核页。入口与"发布活动"区分：这里管已发布活动的报名情况。
import { ref, onMounted } from 'vue';
import { listTeacherActivities } from '../api/activity';
import { useRouter } from 'vue-router';

const router = useRouter();
const list = ref([]);
const loading = ref(true);
const errorMsg = ref('');

function fmt(t) {
  if (!t) return '';
  return String(t).replace('T', ' ').slice(0, 16);
}

onMounted(async () => {
  try {
    list.value = await listTeacherActivities();
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
      <h3 style="margin:0">我发布的活动</h3>
      <router-link to="/activities/create"><button>＋ 发布活动</button></router-link>
    </div>

    <div v-if="loading" style="color:#6b7280;font-size:14px">加载中...</div>
    <div v-else-if="errorMsg" class="msg fail">{{ errorMsg }}</div>
    <div v-else-if="list.length === 0" style="background:#fff;padding:32px;text-align:center;border-radius:10px;color:#6b7280">
      你还没有发布活动，点击右上角「发布活动」创建
    </div>

    <div v-else style="display:flex;flex-direction:column;gap:14px">
      <div v-for="a in list" :key="a.id"
        style="background:#fff;padding:20px 24px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h4 style="margin:0;font-size:17px">{{ a.title }}</h4>
          <button @click="router.push(`/teacher/activities/${a.id}/registrations`)"
            style="padding:6px 16px;font-size:13px">查看名单</button>
        </div>
        <div style="font-size:13px;color:#6b7280;line-height:1.9">
          <div>🕒 活动时间：{{ fmt(a.start_time) }} ~ {{ fmt(a.end_time) }}</div>
          <div>📍 活动地点：{{ a.location }}</div>
          <div>📝 报名截止：{{ fmt(a.register_end) }}</div>
          <div>👥 有效报名 <b style="color:#16a34a">{{ a.confirmed_count }}</b> / {{ a.capacity }} 人
            <span v-if="a.waitlisted_count > 0" style="margin-left:12px;color:#2563eb">候补 {{ a.waitlisted_count }} 人</span>
            <span style="margin-left:12px">剩余位置 {{ a.remaining }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
