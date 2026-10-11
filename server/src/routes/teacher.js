const express = require('express');
const pool = require('../config/db');
const { fail, ok } = require('../utils/errors');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * 本模块全部接口要求教师角色，且仅可操作"本人发布"的活动（活动归属鉴权：publisher_no = 当前工号）。
 * 对应 V2.0 权限边界：教师只能管理本人活动，不能查看他人活动报名名单。
 */

const STATUS_TEXT = { confirmed: '已确认', waitlisted: '候补中', pending: '待审核', cancelled: '已取消' };

// 名单排序：已确认 -> 待审核 -> 候补中 -> 已取消，各组内按报名时间升序
const ROSTER_ORDER = "FIELD(reg.status,'confirmed','pending','waitlisted','cancelled'), reg.created_at ASC";

/**
 * GET /api/teacher/activities  —— 我发布的活动列表（教师视角，V2.0）
 * 每个活动附带：已确认人数 / 候补人数 / 剩余位置，供教师一眼看清报名情况（US-V2-03 真实有效人数）。
 */
router.get('/activities', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.id, a.title,
             DATE_FORMAT(a.start_time,'%Y-%m-%d %H:%i:%s') AS start_time,
             DATE_FORMAT(a.end_time,'%Y-%m-%d %H:%i:%s') AS end_time,
             a.location, a.capacity,
             DATE_FORMAT(a.register_end,'%Y-%m-%d %H:%i:%s') AS register_end,
             a.status,
             (SELECT COUNT(*) FROM registrations r WHERE r.activity_id = a.id AND r.status = 'confirmed')  AS confirmed_count,
             (SELECT COUNT(*) FROM registrations r WHERE r.activity_id = a.id AND r.status = 'waitlisted') AS waitlisted_count,
             (a.capacity - (SELECT COUNT(*) FROM registrations r WHERE r.activity_id = a.id AND r.status = 'confirmed')) AS remaining
      FROM activities a
      WHERE a.publisher_no = ?
      ORDER BY a.created_at DESC`,
      [req.user.user_no]
    );
    return ok(res, rows, 'OK');
  } catch (err) {
    console.error('teacher activities error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

/**
 * 校验活动归属：活动必须存在且为当前教师本人发布，否则统一 404/403。
 * 返回活动行供后续使用。
 */
async function loadOwnActivity(activityId, teacherNo) {
  const [rows] = await pool.query(
    'SELECT id, title, publisher_no, capacity FROM activities WHERE id = ?',
    [activityId]
  );
  if (rows.length === 0) return { error: { code: 404, msg: '活动不存在' } };
  if (rows[0].publisher_no !== teacherNo) {
    return { error: { code: 403, msg: '无权操作：只能查看本人发布的活动' } };
  }
  return { activity: rows[0] };
}

/**
 * GET /api/teacher/activities/:id/registrations  —— 查看本人活动报名名单（US-V2-02/03）
 * 名单区分 confirmed/waitlisted/cancelled 状态；统计口径只计 confirmed 为有效人数。
 * 候补记录附排队顺序（按进入候补时间升序）。
 */
router.get('/activities/:id/registrations', authRequired, requireRole('teacher'), async (req, res) => {
  const activityId = Number(req.params.id);
  if (!Number.isInteger(activityId) || activityId <= 0) return fail(res, 400, '活动ID不正确');

  const { activity, error } = await loadOwnActivity(activityId, req.user.user_no);
  if (error) return fail(res, error.code, error.msg);

  try {
    const [rows] = await pool.query(`
      SELECT reg.id AS registration_id,
             reg.student_no, u.name AS student_name,
             reg.status,
             DATE_FORMAT(reg.created_at,'%Y-%m-%d %H:%i:%s') AS registered_at,
             (SELECT COUNT(*) FROM registrations w
               WHERE w.activity_id = reg.activity_id AND w.status = 'waitlisted'
                 AND (w.created_at < reg.created_at
                      OR (w.created_at = reg.created_at AND w.id <= reg.id))) AS queue_position
      FROM registrations reg
      JOIN users u ON u.user_no = reg.student_no
      WHERE reg.activity_id = ?
      ORDER BY ${ROSTER_ORDER}`,
      [activityId]
    );

    rows.forEach(r => {
      r.status_text = STATUS_TEXT[r.status] || r.status;
      r.queue_position = r.status === 'waitlisted' ? r.queue_position : null;
    });

    const confirmedCount = rows.filter(r => r.status === 'confirmed').length;
    const waitlistedCount = rows.filter(r => r.status === 'waitlisted').length;
    const pendingCount = rows.filter(r => r.status === 'pending').length;

    return ok(res, {
      activity: { id: activity.id, title: activity.title, capacity: activity.capacity },
      confirmed_count: confirmedCount,
      waitlisted_count: waitlistedCount,
      pending_count: pendingCount,
      remaining: activity.capacity - confirmedCount,
      registrations: rows
    }, 'OK');
  } catch (err) {
    console.error('teacher registrations error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

/**
 * GET /api/teacher/activities/:id/registrations/export  —— 导出报名名单 CSV（US-V2-02）
 * 导出全部状态记录（含已取消，便于追溯）；字段：学号、姓名、状态、报名时间、候补顺序。
 * 加 UTF-8 BOM 使 Excel 直接打开不乱码。
 */
router.get('/activities/:id/registrations/export', authRequired, requireRole('teacher'), async (req, res) => {
  const activityId = Number(req.params.id);
  if (!Number.isInteger(activityId) || activityId <= 0) return fail(res, 400, '活动ID不正确');

  const { activity, error } = await loadOwnActivity(activityId, req.user.user_no);
  if (error) return fail(res, error.code, error.msg);

  try {
    const [rows] = await pool.query(`
      SELECT reg.student_no, u.name AS student_name, reg.status,
             DATE_FORMAT(reg.created_at,'%Y-%m-%d %H:%i:%s') AS registered_at,
             (SELECT COUNT(*) FROM registrations w
               WHERE w.activity_id = reg.activity_id AND w.status = 'waitlisted'
                 AND (w.created_at < reg.created_at
                      OR (w.created_at = reg.created_at AND w.id <= reg.id))) AS queue_position
      FROM registrations reg
      JOIN users u ON u.user_no = reg.student_no
      WHERE reg.activity_id = ?
      ORDER BY FIELD(reg.status,'confirmed','pending','waitlisted','cancelled'), reg.created_at ASC`,
      [activityId]
    );

    // 转义 CSV 字段中的逗号/引号/换行
    const esc = v => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };

    const header = '学号,姓名,报名状态,报名时间,候补顺序';
    const lines = rows.map(r => [
      esc(r.student_no),
      esc(r.student_name),
      esc(STATUS_TEXT[r.status] || r.status),
      esc(r.registered_at),
      r.status === 'waitlisted' ? r.queue_position : ''
    ].join(','));

    // UTF-8 BOM + CSV，保证 Excel 打开中文不乱码
    const csv = '﻿' + header + '\n' + lines.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="registrations_${activityId}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error('export registrations error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

/**
 * GET /api/teacher/activities/:id/pending  —— 查看本人活动的待审核申请列表（US-V2-09）
 * 仅开启审核（need_review=1）的本人活动有待审核申请；未开启审核的活动不产生待审核数据。
 */
router.get('/activities/:id/pending', authRequired, requireRole('teacher'), async (req, res) => {
  const activityId = Number(req.params.id);
  if (!Number.isInteger(activityId) || activityId <= 0) return fail(res, 400, '活动ID不正确');

  const { activity, error } = await loadOwnActivity(activityId, req.user.user_no);
  if (error) return fail(res, error.code, error.msg);

  try {
    const [[act]] = await pool.query('SELECT need_review FROM activities WHERE id = ?', [activityId]);
    if (Number(act.need_review) !== 1) {
      return fail(res, 400, '该活动未开启报名审核，无待审核申请');
    }
    const [rows] = await pool.query(`
      SELECT reg.id AS registration_id, reg.student_no, u.name AS student_name,
             DATE_FORMAT(reg.created_at,'%Y-%m-%d %H:%i:%s') AS applied_at
      FROM registrations reg
      JOIN users u ON u.user_no = reg.student_no
      WHERE reg.activity_id = ? AND reg.status = 'pending'
      ORDER BY reg.created_at ASC`,
      [activityId]
    );
    return ok(res, { activity: { id: activity.id, title: activity.title }, pending: rows }, 'OK');
  } catch (err) {
    console.error('pending list error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

/**
 * POST /api/teacher/registrations/:id/review  —— 审核本人活动的报名申请（US-V2-09/10）
 * body: { action: 'approve' | 'reject' }
 * 仅可审核本人活动且记录处于 pending 状态。
 * 通过：同一事务内按当前剩余名额判定 —— 有空位转 confirmed，已满转 waitlisted（进入候补按原报名时间排队）；
 * 拒绝：转 cancelled，不占名额也不进候补。审核结果对学生可见（状态同步）。
 */
router.post('/registrations/:id/review', authRequired, requireRole('teacher'), async (req, res) => {
  const regId = Number(req.params.id);
  if (!Number.isInteger(regId) || regId <= 0) return fail(res, 400, '报名记录ID不正确');
  const action = (req.body && req.body.action) || '';
  if (!['approve', 'reject'].includes(action)) return fail(res, 400, "action 仅支持 'approve' 或 'reject'");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 锁定报名记录 + 校验归属与状态
    const [regs] = await conn.query(
      'SELECT id, activity_id, student_no, status FROM registrations WHERE id = ? FOR UPDATE',
      [regId]
    );
    if (regs.length === 0) { await conn.rollback(); return fail(res, 404, '报名申请不存在'); }
    const reg = regs[0];

    // 活动归属鉴权：只能审核本人发布的活动
    const [acts] = await conn.query(
      'SELECT id, publisher_no, capacity, need_review FROM activities WHERE id = ? FOR UPDATE',
      [reg.activity_id]
    );
    const act = acts[0];
    if (!act || act.publisher_no !== req.user.user_no) {
      await conn.rollback();
      return fail(res, 403, '无权操作：只能审核本人发布的活动');
    }
    if (Number(act.need_review) !== 1) {
      await conn.rollback();
      return fail(res, 400, '该活动未开启报名审核');
    }
    if (reg.status !== 'pending') {
      await conn.rollback();
      return fail(res, 409, '该申请已处理，请勿重复审核');
    }

    if (action === 'reject') {
      await conn.query("UPDATE registrations SET status = 'cancelled' WHERE id = ?", [regId]);
      await conn.commit();
      return ok(res, { registration_id: regId, result: 'rejected' }, '已拒绝该报名申请');
    }

    // approve：同一事务内按剩余名额判定 confirmed / waitlisted
    const [[cntRow]] = await conn.query(
      "SELECT COUNT(*) AS c FROM registrations WHERE activity_id = ? AND status = 'confirmed' FOR UPDATE",
      [reg.activity_id]
    );
    const newStatus = cntRow.c < Number(act.capacity) ? 'confirmed' : 'waitlisted';
    await conn.query('UPDATE registrations SET status = ? WHERE id = ?', [newStatus, regId]);
    await conn.commit();

    const msg = newStatus === 'confirmed'
      ? '已通过审核，该学生报名成功'
      : '已通过审核，因名额已满该学生进入候补队列';
    return ok(res, { registration_id: regId, result: 'approved', status: newStatus }, msg);
  } catch (err) {
    await conn.rollback();
    console.error('review error:', err);
    return fail(res, 500, '服务器内部错误');
  } finally {
    conn.release();
  }
});

module.exports = router;