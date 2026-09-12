<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { login as loginApi } from '../api/auth';
import { login } from '../store/auth';

const router = useRouter();
const route = useRoute();

const form = ref({ user_no: '', password: '' });
const errors = ref({});
const msg = ref({ text: '', type: '' });
const loading = ref(false);

onMounted(() => {
  if (route.query.expired) {
    msg.value = { text: '登录态已失效，请重新登录', type: 'fail' };
  }
});

function validate() {
  const e = {};
  if (!form.value.user_no) e.user_no = '请输入学号/工号';
  else if (!/^[A-Za-z0-9]{4,32}$/.test(form.value.user_no)) e.user_no = '学号/工号格式不正确';
  if (!form.value.password) e.password = '请输入密码';
  errors.value = e;
  return Object.keys(e).length === 0;
}

async function submit() {
  if (!validate()) return;
  loading.value = true;
  msg.value = { text: '', type: '' };
  try {
    const data = await loginApi(form.value);
    login(data.token, data.user);
    router.replace(route.query.redirect || '/activities');
  } catch (err) {
    msg.value = { text: err.message || '登录失败', type: 'fail' };
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="form-card">
    <h2>登录</h2>
    <div class="sub">校园活动管理系统 V1.0</div>

    <div v-if="msg.text" :class="['msg', msg.type]">{{ msg.text }}</div>

    <div class="form-item">
      <label>学号 / 工号</label>
      <input v-model="form.user_no" placeholder="字母数字 4-32 位" />
      <div v-if="errors.user_no" class="err">{{ errors.user_no }}</div>
    </div>

    <div class="form-item">
      <label>密码</label>
      <input v-model="form.password" type="password" placeholder="至少 6 位" />
      <div v-if="errors.password" class="err">{{ errors.password }}</div>
    </div>

    <button style="width:100%" :disabled="loading" @click="submit">
      {{ loading ? '登录中...' : '登录' }}
    </button>

    <div style="margin-top:14px;font-size:13px;text-align:center">
      还没有账号？<router-link to="/register">去注册</router-link>
    </div>
  </div>
</template>
