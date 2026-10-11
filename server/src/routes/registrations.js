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

    // 唯一校验前置：该学生对同一活动存在任一有效记录（已确认/候补中）都不可再报
    // （数据库唯一索引 (activity_id, student_no) 兜底并发重复）
    const [mine] = await conn.query(
      "SELECT id, status FROM registrations WHERE activity_id = ? AND student_no = ? AND status IN ('confirmed','waitlisted') FOR UPDATE",
      [activityId, studentNo]
    );
    if (mine.length > 0) {
      await conn.rollback();
      const msg = mine[0].status === 'waitlisted'
        ? '你已在该活动候补队列中，请勿重复申请'
        : '你已报名该活动，请勿重复报名';
      return fail(res, 409, msg);
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
 * POST /api/registrations/waitlist  —— V2.0 学生申请候补（US-V2-05）
 * 仅当活动报名通道因"满员"关闭时开放；候补按进入时间（created_at）升序排队。
 * 其余关闭原因（截止/已开始/未开始/已取消）不允许候补。
 * 并发安全：同样使用事务 + 活动行 FOR UPDATE 锁。
 */
router.post('/waitlist', authRequired, requireRole('student'), async (req, res) => {
  const activityId = Number(req.body.activity_id);
  if (!Number.isInteger(activityId) || activityId <= 0) {
    return fail(res, 400, '活动ID不正确');
  }
  const studentNo = req.user.user_no;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 锁定活动行，串行化同一活动的候补申请
    const [acts] = await conn.query(
      'SELECT id, title, status, capacity, start_time, register_start, register_end FROM activities WHERE id = ? FOR UPDATE',
      [activityId]
    );
    if (acts.length === 0) {
      await conn.rollback();
      return fail(res, 404, '活动不存在');
    }
    const a = acts[0];

    const [[cntRow]] = await conn.query(
      "SELECT COUNT(*) AS c FROM registrations WHERE activity_id = ? AND status = 'confirmed'",
      [activityId]
    );

    // 仅"满员"状态允许候补；其余状态按原通道口径拒绝
    const state = channelState(a, cntRow.c);
    if (state.code !== 'full') {
      await conn.rollback();
      if (state.registerable) {
        return fail(res, 409, '活动尚有名额，请直接报名');
      }
      const denyMsg = {
        deadline: '报名已截止，无法候补',
        started: '活动已开始，无法候补',
        not_open: '报名尚未开始',
        cancelled: '活动已取消，无法候补',
        closed: '报名通道已关闭，无法候补'
      }[state.code] || '当前不可候补';
      return fail(res, 400, denyMsg);
    }

    // 已有有效记录（已确认/候补中）不可重复申请
    const [mine] = await conn.query(
      "SELECT id, status FROM registrations WHERE activity_id = ? AND student_no = ? AND status IN ('confirmed','waitlisted') FOR UPDATE",
      [activityId, studentNo]
    );
    if (mine.length > 0) {
      await conn.rollback();
      const msg = mine[0].status === 'waitlisted'
        ? '你已在该活动候补队列中，请勿重复申请'
        : '你已报名该活动，无需候补';
      return fail(res, 409, msg);
    }

    // 写入候补记录；若该学生此前取消过（存在 cancelled 旧记录），受唯一索引约束需原地复用
    const [old] = await conn.query(
      "SELECT id FROM registrations WHERE activity_id = ? AND student_no = ? AND status = 'cancelled'",
      [activityId, studentNo]
    );
    if (old.length > 0) {
      await conn.query(
        "UPDATE registrations SET status = 'waitlisted', created_at = NOW() WHERE id = ?",
        [old[0].id]
      );
    } else {
      await conn.query(
        "INSERT INTO registrations (activity_id, student_no, status) VALUES (?, ?, 'waitlisted')",
        [activityId, studentNo]
      );
    }

    // 计算当前排队顺序（按进入候补时间升序，先到先得）
    const [[pos]] = await conn.query(
      "SELECT COUNT(*) AS p FROM registrations WHERE activity_id = ? AND status = 'waitlisted' AND created_at <= (SELECT created_at FROM (SELECT created_at FROM registrations WHERE activity_id = ? AND student_no = ?) t)",
      [activityId, activityId, studentNo]
    );

    await conn.commit();
    return ok(res, { activity_id: activityId, queue_position: pos.p }, '已加入候补队列');
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 409, '你已在该活动候补队列中，请勿重复申请');
    console.error('waitlist error:', err);
    return fail(res, 500, '服务器内部错误');
  } finally {
    conn.release();
  }
});

/**
 * POST /api/registrations/:id/cancel  —— V2.0 学生取消已确认报名（US-V2-01）
 * 仅本人可取消；取消为逻辑删除（status -> cancelled），释放名额。
 * 关键规则（US-V2-07）：若该活动存在候补，同一事务内将候补队首（created_at 最早）
 * 自动转为 confirmed，保证"取消释放的名额立刻补位"且正式人数不超上限。
 */
router.post('/:id/cancel', authRequired, requireRole('student'), async (req, res) => {
  const regId = Number(req.params.id);
  if (!Number.isInteger(regId) || regId <= 0) {
    return fail(res, 400, '报名记录ID不正确');
  }
  const studentNo = req.user.user_no;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 锁定该报名记录，校验归属与状态
    const [regs] = await conn.query(
      'SELECT id, activity_id, student_no, status FROM registrations WHERE id = ? FOR UPDATE',
      [regId]
    );
    if (regs.length === 0) {
      await conn.rollback();
      return fail(res, 404, '报名记录不存在');
    }
    const reg = regs[0];
    if (reg.student_no !== studentNo) {
      await conn.rollback();
      return fail(res, 403, '无权操作：只能取消本人的报名');
    }
    if (reg.status === 'cancelled') {
      await conn.rollback();
      return fail(res, 409, '该报名已取消，请勿重复操作');
    }
    if (reg.status !== 'confirmed') {
      await conn.rollback();
      return fail(res, 400, '仅已确认的报名可通过此接口取消，候补请使用退出候补');
    }

    // 取消该报名（逻辑删除）
    await conn.query(
      "UPDATE registrations SET status = 'cancelled' WHERE id = ?",
      [regId]
    );

    // 同一事务内自动递补：取候补队首（进入时间最早）转为已确认
    const [next] = await conn.query(
      "SELECT id, student_no FROM registrations WHERE activity_id = ? AND status = 'waitlisted' ORDER BY created_at ASC, id ASC LIMIT 1 FOR UPDATE",
      [reg.activity_id]
    );
    let promoted = null;
    if (next.length > 0) {
      await conn.query(
        "UPDATE registrations SET status = 'confirmed' WHERE id = ?",
        [next[0].id]
      );
      promoted = { registration_id: next[0].id, student_no: next[0].student_no };
    }

    await conn.commit();
    return ok(
      res,
      { cancelled_id: regId, promoted },
      promoted ? '取消成功，已自动为候补同学补位' : '取消成功'
    );
  } catch (err) {
    await conn.rollback();
    console.error('cancel registration error:', err);
    return fail(res, 500, '服务器内部错误');
  } finally {
    conn.release();
  }
});

/**
 * POST /api/registrations/:id/leave-waitlist  —— V2.0 学生退出候补（US-V2-08）
 * 仅本人可退出；退出为逻辑删除（status -> cancelled），后续候补因按 created_at 排序而自然前移。
 * 不影响正式名单与已确认人数。
 */
router.post('/:id/leave-waitlist', authRequired, requireRole('student'), async (req, res) => {
  const regId = Number(req.params.id);
  if (!Number.isInteger(regId) || regId <= 0) {
    return fail(res, 400, '报名记录ID不正确');
  }
  const studentNo = req.user.user_no;

  try {
    const [result] = await pool.query(
      "UPDATE registrations SET status = 'cancelled' WHERE id = ? AND student_no = ? AND status = 'waitlisted'",
      [regId, studentNo]
    );
    if (result.affectedRows === 0) {
      // 区分"不存在/无权/状态不对"，统一提示即可（不泄露他人记录存在性）
      return fail(res, 409, '退出失败：候补记录不存在或不处于候补中状态');
    }
    return ok(res, { left_id: regId }, '已退出候补');
  } catch (err) {
    console.error('leave waitlist error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

/**
 * GET /api/registrations/mine  —— 我的报名列表（学生视角，V2.0）
 * 展示本人全部报名记录（含 已确认/候补中/已取消），支撑 US-V2-06 状态可见：
 *   - status / status_text  报名状态（待审核类活动后续由审核模块扩展 pending 状态）
 *   - queue_position        候补中记录的当前排队顺序（按进入候补时间升序）；非候补为 null
 *   - can_cancel            已确认 => true（可取消）；can_leave_waitlist 候补中 => true（可退出候补）
 * 已取消记录保留可追溯（逻辑删除不物理删除），不计入有效报名。
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
             u.name AS publisher_name,
             (SELECT COUNT(*) FROM registrations w
               WHERE w.activity_id = reg.activity_id AND w.status = 'waitlisted'
                 AND (w.created_at < reg.created_at
                      OR (w.created_at = reg.created_at AND w.id <= reg.id))) AS queue_position
      FROM registrations reg
      JOIN activities a ON a.id = reg.activity_id
      JOIN users u ON u.user_no = a.publisher_no
      WHERE reg.student_no = ?
      ORDER BY reg.created_at DESC`,
      [req.user.user_no]
    );

    const STATUS_TEXT = { confirmed: '已确认', waitlisted: '候补中', cancelled: '已取消' };
    rows.forEach(r => {
      r.status_text = STATUS_TEXT[r.registration_status] || r.registration_status;
      // 仅候补中的记录有排队顺序，其余置 null
      r.queue_position = r.registration_status === 'waitlisted' ? r.queue_position : null;
      r.can_cancel = r.registration_status === 'confirmed';
      r.can_leave_waitlist = r.registration_status === 'waitlisted';
    });

    return ok(res, rows, 'OK');
  } catch (err) {
    console.error('my registrations error:', err);
    return fail(res, 500, '服务器内部错误');
  }
});

module.exports = router;
