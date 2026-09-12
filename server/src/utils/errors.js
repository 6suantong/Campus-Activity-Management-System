/**
 * 统一错误响应包装
 * @param {import('express').Response} res
 * @param {number} status HTTP 状态码
 * @param {string} message 提示文案
 */
function fail(res, status, message) {
  return res.status(status).json({ code: status, message, data: null });
}

function ok(res, data, message = 'OK') {
  return res.json({ code: 0, message, data });
}

module.exports = { fail, ok };
