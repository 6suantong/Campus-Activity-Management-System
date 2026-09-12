const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { fail, ok } = require('../utils/errors');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// 学号/工号正则：字母数字 4-32 位
const USER_NO_RE = /^[A-Za-z0-9]{4,32}$/;

/**
 * POST /api/auth/register
 * 注册：学号/工号 + 密码 + 姓名 + role
 */
router.post('/register', async (req, res) => {
  const { user_no, password, name, role } = req.body || {};

  if (!user_no || !password || !name) {
    return fail(res, 400, '学号/工号、密码、姓名均为必填项');
  }
  if (!USER_NO_RE.test(user_no)) {
    return fail(res, 400, '学号/工号格式不正确（字母数字 4-32 位）');
  }
  if (password.length < 6) {
    return fail(res, 400, '密码长度至少 6 位');
  }
  if (role && !['student', 'teacher'].includes(role)) {
    return fail(res, 400, 'role 取值仅支持 student / teacher');
  }

  try {
    const [exist] = await pool.query('SELECT id FROM users WHERE user_no = ?', [user_no]);
    if (exist.length > 0) {
      return fail(res, 409, '该学号/工号已注册');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (user_no, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [user_no, passwordHash, name, role || 'student']
    );
    return ok(res, null, '注册成功');
  } catch (err) {
    console.error('register error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

/**
 * POST /api/auth/login
 * 登录：学号/工号 + 密码 -> 返回 JWT
 */
router.post('/login', async (req, res) => {
  const { user_no, password } = req.body || {};

  if (!user_no || !password) {
    return fail(res, 400, '请输入学号/工号和密码');
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, user_no, password_hash, name, role FROM users WHERE user_no = ?',
      [user_no]
    );
    if (rows.length === 0) {
      return fail(res, 404, '账号不存在');
    }
    const user = rows[0];
    const okPwd = await bcrypt.compare(password, user.password_hash);
    if (!okPwd) {
      return fail(res, 401, '账号或密码错误');
    }
    const token = jwt.sign(
      { id: user.id, user_no: user.user_no, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    return ok(res, { token, user: { id: user.id, user_no: user.user_no, name: user.name, role: user.role } }, '登录成功');
  } catch (err) {
    console.error('login error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

/**
 * POST /api/auth/logout
 * 登出：客户端清除本地 token；服务端仅做必要校验
 */
router.post('/logout', authRequired, (req, res) => {
  // JWT 无状态：服务端不维护会话，客户端清除 token 即可
  return ok(res, null, '已退出登录');
});

/**
 * GET /api/auth/me
 * 获取当前登录用户（供前端守卫校验 token 有效性）
 */
router.get('/me', authRequired, (req, res) => {
  return ok(res, req.user, 'OK');
});

module.exports = router;
