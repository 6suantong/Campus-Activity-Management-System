<script setup>
// REQ-01 仅完成认证闭环；活动列表页为占位，后续 REQ-02/03 实现
import { getUser } from '../utils/auth';
const user = getUser();
</script>

<template>
  <div style="max-width:900px;margin:24px auto;padding:0 16px">
    <div style="background:#fff;padding:24px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
      <h3 style="margin:0 0 8px">欢迎，{{ user.name }}</h3>
      <p style="color:#6b7280;margin:0;font-size:14px">
        REQ-01 认证闭环已完成。活动列表与报名功能将在 REQ-02 / REQ-03 中实现。
      </p>
    </div>
  </div>
</template>
