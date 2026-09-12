/**
 * REQ-04 报名通道状态自动判定（单一事实来源）
 * 不依赖人工修改 activities.status，而是由"时间窗口 + 已报名人数 + 容量"实时算出：
 *   not_open  报名未开始
 *   open      报名中
 *   full      名额已满（系统自动关闭）
 *   deadline  报名已截止（系统自动关闭）
 *   started   活动已开始（工程约束：无论是否到截止时间都关闭）
 *   cancelled 活动已取消
 *   closed    教师手动关闭
 */
const CHANNEL_TEXT = {
  not_open: '报名未开始',
  open: '报名中',
  full: '名额已满',
  deadline: '报名已截止',
  started: '活动已开始',
  cancelled: '活动已取消',
  closed: '报名通道已关闭'
};

/**
 * @param {object} a 活动（含 status/start_time/register_start/register_end/capacity）
 * @param {number} registeredCount 已确认报名人数
 * @param {Date} [now]
 * @returns {{code:string, text:string, registerable:boolean}}
 */
function channelState(a, registeredCount, now = new Date()) {
  if (a.status === 'cancelled') {
    return { code: 'cancelled', text: CHANNEL_TEXT.cancelled, registerable: false };
  }
  if (a.status && a.status !== 'open') {
    return { code: 'closed', text: CHANNEL_TEXT.closed, registerable: false };
  }
  const t = now.getTime();
  if (new Date(a.start_time).getTime() <= t) {
    return { code: 'started', text: CHANNEL_TEXT.started, registerable: false };
  }
  if (new Date(a.register_start).getTime() > t) {
    return { code: 'not_open', text: CHANNEL_TEXT.not_open, registerable: false };
  }
  if (new Date(a.register_end).getTime() < t) {
    return { code: 'deadline', text: CHANNEL_TEXT.deadline, registerable: false };
  }
  if (Number(registeredCount) >= Number(a.capacity)) {
    return { code: 'full', text: CHANNEL_TEXT.full, registerable: false };
  }
  return { code: 'open', text: CHANNEL_TEXT.open, registerable: true };
}

module.exports = { channelState, CHANNEL_TEXT };
