const express = require('express');
const pool = require('../config/db');
const { fail, ok } = require('../utils/errors');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// datetime-local 控件提交 "2026-09-20T14:00"，统一转成 MySQL 接受的 "YYYY-MM-DD HH:mm:ss"
function normalizeDateTime(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim().replace('T', ' ');
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s) ? (s.length === 16 ? s + ':00' : s) : null;
}

/**
 * POST /api/activities  —— REQ-02 教师发布活动
 * 必填：标题、开始/结束时间、地点、人数上限、报名起止时间、活动简介
 */
router.post('/', authRequired, requireRole('teacher'), async (req, res) => {
  const b = req.body || {};

  // 1) 必填校验
  const requiredFields = [
    ['title', '活动标题'],
    ['start_time', '活动开始时间'],
    ['end_time', '活动结束时间'],
    ['location', '活动地点'],
    ['capacity', '人数上限'],
    ['register_start', '报名开始时间'],
    ['register_end', '报名截止时间'],
    ['description', '活动简介']
  ];
  for (const [key, label] of requiredFields) {
    if (b[key] === undefined || b[key] === null || String(b[key]).trim() === '') {
      return fail(res, 400, `缺少必填项：${label}`);
    }
  }

  const title = String(b.title).trim();
  const location = String(b.location).trim();
  const description = String(b.description).trim();
  const startTime = normalizeDateTime(b.start_time);
  const endTime = normalizeDateTime(b.end_time);
  const registerStart = normalizeDateTime(b.register_start);
  const registerEnd = normalizeDateTime(b.register_end);
  const capacity = Number(b.capacity);

  // 2) 字段格式校验
  if (title.length > 100) return fail(res, 400, '活动标题不能超过100字');
  if (location.length > 200) return fail(res, 400, '活动地点不能超过200字');
  if (!description) return fail(res, 400, '缺少必填项：活动简介');
  if (!Number.isInteger(capacity) || capacity <= 0) return fail(res, 400, '人数上限必须为正整数');
  if (!startTime || !endTime || !registerStart || !registerEnd) {
    return fail(res, 400, '时间格式不正确');
  }

  // 3) 时间逻辑校验
  if (new Date(endTime) <= new Date(startTime)) {
    return fail(res, 400, '活动结束时间必须晚于开始时间');
  }
  if (new Date(registerEnd) <= new Date(registerStart)) {
    return fail(res, 400, '报名截止时间必须晚于报名开始时间');
  }
  if (new Date(registerEnd) > new Date(startTime)) {
    return fail(res, 400, '报名截止时间不能晚于活动开始时间');
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO activities
       (title, start_time, end_time, location, capacity, register_start, register_end, description, publisher_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, startTime, endTime, location, capacity, registerStart, registerEnd, description, req.user.user_no]
    );
    return ok(res, { id: result.insertId }, '发布成功');
  } catch (err) {
    console.error('create activity error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

/**
 * GET /api/activities  —— 公共活动列表
 * REQ-02：发布后活动在公共列表显示且字段完整（按发布时间倒序）
 * 可选 query: onlyRegisterable=true 供 REQ-03 使用（当前可报名过滤）
 */
router.get('/', async (req, res) => {
  try {
    const onlyRegisterable = req.query.onlyRegisterable === 'true';
    const where = [];
    const params = [];
    if (onlyRegisterable) {
      // REQ-03：报名截止未到 + 活动未开始 + 状态开启（满员判断需要报名记录，REQ-04 接入）
      where.push(`a.status = 'open' AND a.start_time > NOW() AND a.register_end > NOW() AND a.register_start <= NOW()`);
    }
    const sql = `
      SELECT a.id, a.title,
             DATE_FORMAT(a.start_time,'%Y-%m-%d %H:%i:%s') AS start_time,
             DATE_FORMAT(a.end_time,'%Y-%m-%d %H:%i:%s') AS end_time,
             a.location, a.capacity,
             DATE_FORMAT(a.register_start,'%Y-%m-%d %H:%i:%s') AS register_start,
             DATE_FORMAT(a.register_end,'%Y-%m-%d %H:%i:%s') AS register_end,
             a.description, a.publisher_no, a.status,
             DATE_FORMAT(a.created_at,'%Y-%m-%d %H:%i:%s') AS created_at,
             u.name AS publisher_name
      FROM activities a
      JOIN users u ON u.user_no = a.publisher_no
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY a.created_at DESC
      LIMIT 100`;
    const [rows] = await pool.query(sql, params);
    return ok(res, rows, 'OK');
  } catch (err) {
    console.error('list activities error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

/**
 * GET /api/activities/:id  —— 活动详情
 */
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, '活动ID不正确');
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.title,
              DATE_FORMAT(a.start_time,'%Y-%m-%d %H:%i:%s') AS start_time,
              DATE_FORMAT(a.end_time,'%Y-%m-%d %H:%i:%s') AS end_time,
              a.location, a.capacity,
              DATE_FORMAT(a.register_start,'%Y-%m-%d %H:%i:%s') AS register_start,
              DATE_FORMAT(a.register_end,'%Y-%m-%d %H:%i:%s') AS register_end,
              a.description, a.publisher_no, a.status,
              u.name AS publisher_name
       FROM activities a JOIN users u ON u.user_no = a.publisher_no
       WHERE a.id = ?`,
      [id]
    );
    if (rows.length === 0) return fail(res, 404, '活动不存在');
    return ok(res, rows[0], 'OK');
  } catch (err) {
    console.error('activity detail error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

module.exports = router;
