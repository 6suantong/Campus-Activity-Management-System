<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '../api/auth';

const router = useRouter();
const form = ref({ user_no: '', password: '', name: '', role: 'student' });
const errors = ref({});
const msg = ref({ text: '', type: '' });
const loading = ref(false);

function validate() {
  const e = {};
  if (!form.value.user_no) e.user_no = '请输入学号/工号';
  else if (!/^[A-Za-z0-9]{4,32}$/.test(form.value.user_no)) e.user_no = '字母数字 4-32 位';
  if (!form.value.password || form.value.password.length < 6) e.password = '密码至少 6 位';
  if (!form.value.name) e.name = '请输入姓名';
  errors.value = e;
  return Object.keys(e).length === 0;
}

async function submit() {
  if (!validate()) return;
  loading.value = true;
  msg.value = { text: '', type: '' };
  try {
    await register(form.value);
    msg.value = { text: '注册成功，即将跳转登录', type: 'ok' };
    setTimeout(() => router.push('/login'), 800);
  } catch (err) {
    msg.value = { text: err.message || '注册失败', type: 'fail' };
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="form-card">
    <h2>注册</h2>
    <div class="sub">校园活动管理系统 V1.0</div>

    <div v-if="msg.text" :class="['msg', msg.type]">{{ msg.text }}</div>

    <div class="form-item">
      <label>学号 / 工号</label>
      <input v-model="form.user_no" placeholder="字母数字 4-32 位" />
      <div v-if="errors.user_no" class="err">{{ errors.user_no }}</div>
    </div>

    <div class="form-item">
      <label>姓名</label>
      <input v-model="form.name" placeholder="真实姓名" />
      <div v-if="errors.name" class="err">{{ errors.name }}</div>
    </div>

    <div class="form-item">
      <label>密码</label>
      <input v-model="form.password" type="password" placeholder="至少 6 位" />
      <div v-if="errors.password" class="err">{{ errors.password }}</div>
    </div>

    <div class="form-item">
      <label>角色</label>
      <select v-model="form.role">
        <option value="student">学生</option>
        <option value="teacher">教师</option>
      </select>
    </div>

    <button style="width:100%" :disabled="loading" @click="submit">
      {{ loading ? '提交中...' : '注册' }}
    </button>

    <div style="margin-top:14px;font-size:13px;text-align:center">
      已有账号？<router-link to="/login">去登录</router-link>
    </div>
  </div>
</template>
