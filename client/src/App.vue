<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { authState, isLoggedIn, logout as logoutStore } from './store/auth';

const router = useRouter();
const user = computed(() => authState.user);

function logout() {
  logoutStore();
  router.push('/login');
}
</script>

<template>
  <div>
    <div v-if="isLoggedIn" class="navbar">
      <div style="display:flex;align-items:center;gap:20px">
        <strong>校园活动管理系统 V1.0</strong>
        <router-link to="/activities" style="font-size:14px">活动列表</router-link>
        <router-link v-if="user?.role === 'teacher'" to="/activities/create" style="font-size:14px">发布活动</router-link>
        <router-link v-if="user?.role === 'student'" to="/my-registrations" style="font-size:14px">我的报名</router-link>
      </div>
      <div class="right">
        <span>{{ user?.name }}（{{ user?.role === 'teacher' ? '教师' : '学生' }}）</span>
        <button @click="logout">退出登录</button>
      </div>
    </div>
    <router-view />
  </div>
</template>
