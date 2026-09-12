<script setup>
import { ref, onMounted } from 'vue';
import { listActivities, registerActivity } from '../api/activity';
import { getUser } from '../utils/auth';

const user = getUser();
const isStudent = user.role === 'student';
const list = ref([]);
const loading = ref(true);
const errorMsg = ref('');
const registeringId = ref(null);
const tipMsg = ref('');
const tipType = ref('ok');

function fmt(t) {
  if (!t) return '';
  return String(t).replace('T', ' ').slice(0, 16);
}

const statusText = { open: '报名中', closed: '已关闭', cancelled: '已取消' };

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    // REQ-03：学生只看"当前可报名"；教师看全部活动用于管理
    const params = isStudent ? { onlyRegisterable: 'true' } : {};
    list.value = await listActivities(params);
  } catch (err) {
    errorMsg.value = err.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

async function onRegister(a) {
  registeringId.value = a.id;
  tipMsg.value = '';
  try {
    await registerActivity(a.id);
    a.my_registered = 1;
    a.registered_count = Number(a.registered_count) + 1;
    tipType.value = 'ok';
    tipMsg.value = `报名成功：${a.title}`;
  } catch (err) {
    tipType.value = 'fail';
    tipMsg.value = err.message || '报名失败';
    // 报名失败可能是状态变化（截止/满员），刷新列表
    await load();
  } finally {
    registeringId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div style="max-width:900px;margin:24px auto;padding:0 16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0">{{ isStudent ? '当前可报名的活动' : '全部活动（教师视图）' }}</h3>
      <router-link v-if="!isStudent" to="/activities/create">
        <button>＋ 发布活动</button>
      </router-link>
    </div>

    <div v-if="tipMsg" class="msg" :class="tipType" style="margin-bottom:12px">{{ tipMsg }}</div>

    <div v-if="loading" style="color:#6b7280;font-size:14px">加载中...</div>
    <div v-else-if="errorMsg" class="msg fail">{{ errorMsg }}</div>
    <div v-else-if="list.length === 0" style="background:#fff;padding:32px;text-align:center;border-radius:10px;color:#6b7280">
      {{ isStudent ? '当前没有可报名的活动（报名未开始、已截止、已满员或已开始的活动不显示）' : '暂无活动，点击右上角「发布活动」创建' }}
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
          <div>👥 名额情况：
            <span :style="Number(a.registered_count) >= Number(a.capacity) ? 'color:#dc2626;font-weight:600' : ''">
              已报名 {{ a.registered_count ?? 0 }} / {{ a.capacity }} 人
            </span>
          </div>
          <div>📝 报名截止：{{ fmt(a.register_end) }}</div>
          <div>👨‍🏫 发布教师：{{ a.publisher_name }}（{{ a.publisher_no }}）</div>
        </div>
        <p style="margin:10px 0 0;font-size:14px;color:#374151;white-space:pre-wrap;line-height:1.7">{{ a.description }}</p>

        <!-- REQ-03 学生报名操作区 -->
        <div v-if="isStudent" style="margin-top:14px;text-align:right">
          <button v-if="a.my_registered" disabled
            style="background:#f3f4f6;color:#6b7280;cursor:default">
            ✓ 已报名
          </button>
          <button v-else :disabled="registeringId === a.id" @click="onRegister(a)">
            {{ registeringId === a.id ? '提交中...' : '立即报名' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
