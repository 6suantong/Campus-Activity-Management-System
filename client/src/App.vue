<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { getToken, clearAuth, getUser } from './utils/auth';

const router = useRouter();
const loggedIn = computed(() => !!getToken());
const user = computed(() => getUser());

function logout() {
  clearAuth();
  router.push('/login');
}
</script>

<template>
  <div>
    <div v-if="loggedIn" class="navbar">
      <div>校园活动管理系统 V1.0</div>
      <div class="right">
        <span>{{ user?.name }}（{{ user?.role === 'teacher' ? '教师' : '学生' }}）</span>
        <button @click="logout">退出登录</button>
      </div>
    </div>
    <router-view />
  </div>
</template>
