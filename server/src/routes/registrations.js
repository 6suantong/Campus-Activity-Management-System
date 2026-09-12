const express = require('express');
const pool = require('../config/db');
const { fail, ok } = require('../utils/errors');
const { authRequired, requireRole } = require('../middleware/auth');
const { channelState } = require('../utils/channel-state');

const router = express.Router();

/**
 * POST /api/registrations  —— 学生报名活动
 * REQ-03：学生报名；REQ-04：满员/截止/开始后系统自动关闭通道
 * 并发安全：事务 + 活动行 FOR UPDATE 锁，串行化同一活动的报名，
 *           保证容量为 N 时第 N+1 名一定被拒绝（不会超额）
 */
router.post('/', authRequired, requireRole('student'), async (req, res) => {
  const activityId = Number(req.body.activity_id);
  if (!Number.isInteger(activityId) || activityId <= 0) {
    return fail(res, 400, '活动ID不正确');
  }
  const studentNo = req.user.user_no;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 锁定活动行：并发报名同一活动时，后来的事务在此等待，提交后才能读到最新人数
    const [acts] = await conn.query(
      'SELECT id, title, status, capacity, start_time, register_start, register_end FROM activities WHERE id = ? FOR UPDATE',
      [activityId]
    );
    if (acts.length === 0) {
      await conn.rollback();
      return fail(res, 404, '活动不存在');
    }
    const a = acts[0];

    // 统计当前已确认报名数（活动行已持锁，此数在本事务内准确）
    const [[cntRow]] = await conn.query(
      "SELECT COUNT(*) AS c FROM registrations WHERE activity_id = ? AND status = 'confirmed'",
      [activityId]
    );

    // REQ-04：通道状态统一判定（满员/截止/已开始自动关闭）
    const state = channelState(a, cntRow.c);
    if (!state.registerable) {
      await conn.rollback();
      // 文案与验收依据对齐
      const denyMsg = {
        full: '活动已满',
        deadline: '报名已截止',
        started: '活动已开始，报名通道已关闭',
        not_open: '报名尚未开始',
        cancelled: '活动已取消，无法报名',
        closed: '报名通道已关闭'
      }[state.code] || '当前不可报名';
      return fail(res, state.code === 'full' ? 409 : 400, denyMsg);
    }

    // 唯一校验前置（数据库唯一索引还会兜底并发重复）
    const [mine] = await conn.query(
      "SELECT id FROM registrations WHERE activity_id = ? AND student_no = ? AND status = 'confirmed' FOR UPDATE",
      [activityId, studentNo]
    );
    if (mine.length > 0) {
      await conn.rollback();
      return fail(res, 409, '你已报名该活动，请勿重复报名');
    }

    await conn.query(
      "INSERT INTO registrations (activity_id, student_no, status) VALUES (?, ?, 'confirmed')",
      [activityId, studentNo]
    );
    await conn.commit();
    return ok(res, { activity_id: activityId }, '报名成功');
  } catch (err) {
    await conn.rollback();
    // 唯一约束兜底：极端并发下重复报名
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 409, '你已报名该活动，请勿重复报名');
    console.error('register error:', err);
    return fail(res, 500, '服务器内部错误');
  } finally {
    conn.release();
  }
});

/**
 * GET /api/registrations/mine  —— 我报名的活动列表（学生视角）
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
