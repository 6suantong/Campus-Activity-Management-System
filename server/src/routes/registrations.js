const express = require('express');
const pool = require('../config/db');
const { fail, ok } = require('../utils/errors');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/registrations  —— 学生报名活动（REQ-03）
 * body: { activity_id }
 * 校验：仅学生 / 活动存在 / 活动未开始 / 报名窗口内 / 未满员 / 不可重复报名
 * 工程意图：活动开始后报名通道自动关闭；同一学生同一活动唯一
 */
router.post('/', authRequired, requireRole('student'), async (req, res) => {
  try {
    const activityId = Number(req.body.activity_id);
    if (!Number.isInteger(activityId) || activityId <= 0) {
      return fail(res, 400, '活动ID不正确');
    }
    const studentNo = req.user.user_no;

    // 查活动
    const [acts] = await pool.query(
      'SELECT id, title, status, capacity, start_time, register_start, register_end FROM activities WHERE id = ?',
      [activityId]
    );
    if (acts.length === 0) return fail(res, 404, '活动不存在');
    const a = acts[0];

    if (a.status !== 'open') return fail(res, 400, '该活动报名通道已关闭');

    const now = Date.now();
    if (new Date(a.start_time).getTime() <= now) {
      return fail(res, 400, '活动已开始，报名通道已关闭');
    }
    if (new Date(a.register_start).getTime() > now) {
      return fail(res, 400, '报名尚未开始');
    }
    if (new Date(a.register_end).getTime() < now) {
      return fail(res, 400, '报名已截止');
    }

    // 重复报名
    const [mine] = await pool.query(
      "SELECT id FROM registrations WHERE activity_id = ? AND student_no = ? AND status = 'confirmed'",
      [activityId, studentNo]
    );
    if (mine.length > 0) return fail(res, 409, '你已报名该活动，请勿重复报名');

    // 满员
    const [[cnt]] = await pool.query(
      "SELECT COUNT(*) AS c FROM registrations WHERE activity_id = ? AND status = 'confirmed'",
      [activityId]
    );
    if (Number(cnt.c) >= Number(a.capacity)) return fail(res, 409, '活动已满');

    await pool.query(
      "INSERT INTO registrations (activity_id, student_no, status) VALUES (?, ?, 'confirmed')",
      [activityId, studentNo]
    );
    return ok(res, { activity_id: activityId }, '报名成功');
  } catch (err) {
    // 唯一约束兜底：并发下两人同时报名同一活动
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 409, '你已报名该活动，请勿重复报名');
    console.error('register error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

/**
 * GET /api/registrations/mine  —— 我报名的活动列表（学生视角）
 * 支撑用户故事：学生查看自己已经报名过的活动
 */
router.get('/mine', authRequired, requireRole('student'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT reg.id AS registration_id,
             DATE_FORMAT(reg.created_at,'%Y-%m-%d %H:%i:%s') AS registered_at,
             reg.status AS registration_status,
             a.id AS activity_id, a.title, a.location, a.capacity,
             DATE_FORMAT(a.start_time,'%Y-%m-%d %H:%i:%s') AS start_time,
             DATE_FORMAT(a.end_time,'%Y-%m-%d %H:%i:%s') AS end_time,
             DATE_FORMAT(a.register_end,'%Y-%m-%d %H:%i:%s') AS register_end,
             u.name AS publisher_name
      FROM registrations reg
      JOIN activities a ON a.id = reg.activity_id
      JOIN users u ON u.user_no = a.publisher_no
      WHERE reg.student_no = ? AND reg.status = 'confirmed'
      ORDER BY reg.created_at DESC`,
      [req.user.user_no]
    );
    return ok(res, rows, 'OK');
  } catch (err) {
    console.error('my registrations error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

module.exports = router;
