<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { createActivity } from '../api/activity';

const router = useRouter();

const form = reactive({
  title: '',
  start_time: '',
  end_time: '',
  location: '',
  capacity: '',
  register_start: '',
  register_end: '',
  description: ''
});

const errors = ref({});
const msg = ref({ text: '', type: '' });
const loading = ref(false);

function setError(key, text) {
  if (text) errors.value[key] = text;
  else delete errors.value[key];
}

function validate() {
  errors.value = {};
  if (!form.title.trim()) setError('title', '请输入活动标题');
  else if (form.title.trim().length > 100) setError('title', '标题不能超过100字');

  if (!form.start_time) setError('start_time', '请选择活动开始时间');
  if (!form.end_time) setError('end_time', '请选择活动结束时间');
  if (form.start_time && form.end_time && new Date(form.end_time) <= new Date(form.start_time)) {
    setError('end_time', '结束时间必须晚于开始时间');
  }

  if (!form.location.trim()) setError('location', '请输入活动地点');

  const cap = Number(form.capacity);
  if (!form.capacity) setError('capacity', '请输入人数上限');
  else if (!Number.isInteger(cap) || cap <= 0) setError('capacity', '人数上限必须为正整数');

  if (!form.register_start) setError('register_start', '请选择报名开始时间');
  if (!form.register_end) setError('register_end', '请选择报名截止时间');
  if (form.register_start && form.register_end && new Date(form.register_end) <= new Date(form.register_start)) {
    setError('register_end', '报名截止必须晚于报名开始');
  }
  if (form.register_end && form.start_time && new Date(form.register_end) > new Date(form.start_time)) {
    setError('register_end', '报名截止不能晚于活动开始时间');
  }

  if (!form.description.trim()) setError('description', '请输入活动简介');

  return Object.keys(errors.value).length === 0;
}

async function submit() {
  if (!validate()) {
    msg.value = { text: '请完善表单中标红的必填项', type: 'fail' };
    return;
  }
  loading.value = true;
  msg.value = { text: '', type: '' };
  try {
    await createActivity({ ...form, capacity: Number(form.capacity) });
    msg.value = { text: '发布成功，正在返回活动列表...', type: 'ok' };
    setTimeout(() => router.push('/activities'), 800);
  } catch (err) {
    msg.value = { text: err.message || '发布失败', type: 'fail' };
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="max-width:680px;margin:24px auto;padding:0 16px">
    <div class="form-card" style="max-width:none;margin:0">
      <h2>发布活动</h2>
      <div class="sub">REQ-02 · 仅教师可发布，带 * 为必填项</div>

      <div v-if="msg.text" :class="['msg', msg.type]">{{ msg.text }}</div>

      <div class="form-item">
        <label>活动标题 *</label>
        <input v-model="form.title" placeholder="例如：校园编程大赛" maxlength="100" />
        <div v-if="errors.title" class="err">{{ errors.title }}</div>
      </div>

      <div style="display:flex;gap:12px">
        <div class="form-item" style="flex:1">
          <label>活动开始时间 *</label>
          <input v-model="form.start_time" type="datetime-local" />
          <div v-if="errors.start_time" class="err">{{ errors.start_time }}</div>
        </div>
        <div class="form-item" style="flex:1">
          <label>活动结束时间 *</label>
          <input v-model="form.end_time" type="datetime-local" />
          <div v-if="errors.end_time" class="err">{{ errors.end_time }}</div>
        </div>
      </div>

      <div style="display:flex;gap:12px">
        <div class="form-item" style="flex:1">
          <label>活动地点 *</label>
          <input v-model="form.location" placeholder="例如：南区大学生活动中心301" maxlength="200" />
          <div v-if="errors.location" class="err">{{ errors.location }}</div>
        </div>
        <div class="form-item" style="width:140px">
          <label>人数上限 *</label>
          <input v-model="form.capacity" type="number" min="1" step="1" placeholder="例如 50" />
          <div v-if="errors.capacity" class="err">{{ errors.capacity }}</div>
        </div>
      </div>

      <div style="display:flex;gap:12px">
        <div class="form-item" style="flex:1">
          <label>报名开始时间 *</label>
          <input v-model="form.register_start" type="datetime-local" />
          <div v-if="errors.register_start" class="err">{{ errors.register_start }}</div>
        </div>
        <div class="form-item" style="flex:1">
          <label>报名截止时间 *</label>
          <input v-model="form.register_end" type="datetime-local" />
          <div v-if="errors.register_end" class="err">{{ errors.register_end }}</div>
        </div>
      </div>

      <div class="form-item">
        <label>活动简介 *</label>
        <textarea v-model="form.description" rows="4" placeholder="介绍活动内容、面向对象、注意事项等"
          style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:14px;font-family:inherit;resize:vertical"></textarea>
        <div v-if="errors.description" class="err">{{ errors.description }}</div>
      </div>

      <div style="display:flex;gap:10px;margin-top:6px">
        <button :disabled="loading" @click="submit">{{ loading ? '发布中...' : '发布活动' }}</button>
        <button type="button" style="background:#e5e7eb;color:#374151" @click="router.push('/activities')">取消</button>
      </div>
    </div>
  </div>
</template>
