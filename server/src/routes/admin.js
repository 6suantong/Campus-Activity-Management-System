const express = require('express');
const pool = require('../config/db');
const { fail, ok } = require('../utils/errors');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * 系统管理员模块（V2.0，US-V2-04）
 * 权限边界：仅 admin 角色可用；只维护账号基本状态，不触碰任何报名/活动业务数据，
 *          也不能查看学生个人报名详情（R-V2-05 隐私边界）。
 */

const ROLE_TEXT = { student: '学生', teacher: '教师', admin: '管理员' };
const ACCOUNT_STATUS_TEXT = { active: '可用', disabled: '已停用' };

/**
 * GET /api/admin/users  —— 查看平台用户账号与基本状态
 * 返回：学号/工号、姓名、角色、账号状态、注册时间；不含密码哈希，不含任何报名数据。
 * 支持 ?keyword= 按学号/姓名模糊查询，?role= 按角色过滤。
 */
router.get('/users', authRequired, requireRole('admin'), async (req, res) => {
  const keyword = (req.query.keyword || '').trim();
  const role = (req.query.role || '').trim();

  let sql = `SELECT user_no, name, role, account_status,
                    DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS created_at
             FROM users WHERE 1=1`;
  const params = [];
  if (keyword) {
    sql += ' AND (user_no LIKE ? OR name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (role && ['student', 'teacher', 'admin'].includes(role)) {
    sql += ' AND role = ?';
    params.push(role);
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';

  try {
    const [rows] = await pool.query(sql, params);
    rows.forEach(r => {
      r.role_text = ROLE_TEXT[r.role] || r.role;
      r.account_status_text = ACCOUNT_STATUS_TEXT[r.account_status] || r.account_status;
    });
    return ok(res, rows, 'OK');
  } catch (err) {
    console.error('admin list users error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

/**
 * POST /api/admin/users/:userNo/disable  —— 停用异常账号
 * 仅修改 account_status -> disabled；停用后该账号无法登录（登录接口拦截）。
 * 不删除/修改其历史报名与活动数据；不能停用其他管理员账号（防止误操作导致失去管理入口）。
 */
router.post('/users/:userNo/disable', authRequired, requireRole('admin'), async (req, res) => {
  const targetNo = req.params.userNo;
  try {
    const [rows] = await pool.query('SELECT user_no, role, account_status FROM users WHERE user_no = ?', [targetNo]);
    if (rows.length === 0) return fail(res, 404, '账号不存在');
    const target = rows[0];
    if (target.role === 'admin') return fail(res, 400, '不能停用管理员账号');
    if (target.account_status === 'disabled') return fail(res, 409, '该账号已是停用状态');

    await pool.query("UPDATE users SET account_status = 'disabled' WHERE user_no = ?", [targetNo]);
    return ok(res, { user_no: targetNo, account_status: 'disabled' }, '账号已停用');
  } catch (err) {
    console.error('admin disable user error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

/**
 * POST /api/admin/users/:userNo/enable  —— 恢复账号为可用状态
 * 问题处理完毕后恢复；仅修改 account_status -> active。
 */
router.post('/users/:userNo/enable', authRequired, requireRole('admin'), async (req, res) => {
  const targetNo = req.params.userNo;
  try {
    const [rows] = await pool.query('SELECT user_no, account_status FROM users WHERE user_no = ?', [targetNo]);
    if (rows.length === 0) return fail(res, 404, '账号不存在');
    if (rows[0].account_status === 'active') return fail(res, 409, '该账号已是可用状态');

    await pool.query("UPDATE users SET account_status = 'active' WHERE user_no = ?", [targetNo]);
    return ok(res, { user_no: targetNo, account_status: 'active' }, '账号已恢复可用');
  } catch (err) {
    console.error('admin enable user error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

module.exports = router;
