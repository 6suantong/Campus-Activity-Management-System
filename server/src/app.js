const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const activityRoutes = require('./routes/activities');
const registrationRoutes = require('./routes/registrations');

const app = express();

app.use(cors());
app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => res.json({ code: 0, message: 'OK', data: { status: 'up' } }));

// REQ-01 用户认证路由
app.use('/api/auth', authRoutes);

// REQ-02 活动路由
app.use('/api/activities', activityRoutes);

// REQ-03 报名路由
app.use('/api/registrations', registrationRoutes);

// V2.0 教师端（本人活动名单/导出，活动归属鉴权）
app.use('/api/teacher', require('./routes/teacher'));

// V2.0 系统管理员端（账号状态维护，仅 admin 角色）
app.use('/api/admin', require('./routes/admin'));

// 统一 404
app.use((req, res) => res.status(404).json({ code: 404, message: 'Not Found', data: null }));

// 统一错误处理
app.use((err, req, res, next) => {
  console.error('unhandled error:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] 校园活动管理系统后端已启动: http://localhost:${PORT}`);
});

module.exports = app;
