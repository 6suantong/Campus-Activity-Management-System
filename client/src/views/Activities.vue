<script setup>
import { ref, onMounted } from 'vue';
import { listActivities, registerActivity, joinWaitlist } from '../api/activity';
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

// REQ-04：通道状态配色（open 绿色；其余为系统自动关闭态，灰/红）
const stateStyle = {
  open: 'background:#dcfce7;color:#16a34a',
  full: 'background:#fee2e2;color:#dc2626',
  deadline: 'background:#f3f4f6;color:#6b7280',
  started: 'background:#f3f4f6;color:#6b7280',
  not_open: 'background:#fef9c3;color:#ca8a04',
  cancelled: 'background:#f3f4f6;color:#6b7280',
  closed: 'background:#f3f4f6;color:#6b7280'
};

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    // REQ-03/REQ-04：学生和教师都加载全部活动，后端统一附加 channel_state
    // 前端根据 channel_state 渲染状态标签 + 控制报名按钮可用性
    list.value = await listActivities();
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
    const res = await registerActivity(a.id);
    // 需审核活动报名后为待审核（后端返回 status=pending），提示语不同
    const pending = Number(a.need_review) === 1;
    tipType.value = 'ok';
    tipMsg.value = pending ? `报名已提交，等待教师审核：${a.title}` : `报名成功：${a.title}`;
    await load(); // 刷新名额与我的报名标记
  } catch (err) {
    tipType.value = 'fail';
    tipMsg.value = err.message || '报名失败';
    // 报名失败可能是状态变化（截止/满员），刷新列表
    await load();
  } finally {
    registeringId.value = null;
  }
}

// US-V2-05 满员活动申请候补
async function onJoinWaitlist(a) {
  registeringId.value = a.id;
  tipMsg.value = '';
  try {
    await joinWaitlist(a.id);
    tipType.value = 'ok';
    tipMsg.value = `已加入「${a.title}」候补队列，可在"我的报名"查看排队顺序`;
    await load();
  } catch (err) {
    tipType.value = 'fail';
    tipMsg.value = err.message || '申请候补失败';
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
      <h3 style="margin:0">{{ isStudent ? '全部活动' : '全部活动（教师视图）' }}</h3>
      <router-link v-if="!isStudent" to="/activities/create">
        <button>＋ 发布活动</button>
      </router-link>
    </div>

    <div v-if="tipMsg" class="msg" :class="tipType" style="margin-bottom:12px">{{ tipMsg }}</div>

    <div v-if="loading" style="color:#6b7280;font-size:14px">加载中...</div>
    <div v-else-if="errorMsg" class="msg fail">{{ errorMsg }}</div>
    <div v-else-if="list.length === 0" style="background:#fff;padding:32px;text-align:center;border-radius:10px;color:#6b7280">
      {{ isStudent ? '暂无活动' : '暂无活动，点击右上角「发布活动」创建' }}
    </div>

    <div v-else style="display:flex;flex-direction:column;gap:14px">
      <div v-for="a in list" :key="a.id"
        style="background:#fff;padding:20px 24px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h4 style="margin:0;font-size:17px">
            {{ a.title }}
            <span v-if="Number(a.need_review) === 1"
              style="font-size:11px;font-weight:normal;padding:2px 8px;border-radius:10px;background:#fef9c3;color:#ca8a04;margin-left:6px">需审核</span>
          </h4>
          <span style="font-size:12px;padding:3px 10px;border-radius:12px"
            :style="stateStyle[a.channel_state] || stateStyle.closed">
            {{ a.channel_state_text || '报名中' }}
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
        <p v-if="a.requirement" style="margin:8px 0 0;font-size:13px;color:#7c3aed">🎯 参加资格：{{ a.requirement }}</p>

        <!-- REQ-03 学生报名操作区：根据 channel_state 控制按钮禁用（REQ-04）；V2.0 满员可申请候补 -->
        <div v-if="isStudent" style="margin-top:14px;text-align:right">
          <button v-if="a.my_registered" disabled
            style="background:#f3f4f6;color:#6b7280;cursor:default">
            ✓ {{ a.my_reg_status_text || '已报名' }}
          </button>
          <!-- 满员且未报名：提供申请候补入口 -->
          <button v-else-if="a.channel_state === 'full'" :disabled="registeringId === a.id"
            @click="onJoinWaitlist(a)"
            style="background:#2563eb;color:#fff">
            {{ registeringId === a.id ? '提交中...' : '申请候补' }}
          </button>
          <button v-else :disabled="a.channel_state !== 'open' || registeringId === a.id"
            @click="onRegister(a)"
            :style="a.channel_state !== 'open' ? 'background:#f3f4f6;color:#6b7280;cursor:not-allowed' : ''">
            {{ registeringId === a.id ? '提交中...' : (a.channel_state === 'open' ? '立即报名' : a.channel_state_text) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
