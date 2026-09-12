const jwt = require('jsonwebtoken');
const { fail } = require('../utils/errors');

/**
 * JWT 校验中间件
 * 从 Authorization: Bearer <token> 中解析用户信息，挂载到 req.user
 * 失败场景：无 token / token 过期 / token 非法 —— 一律返回 401
 */
function authRequired(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return fail(res, 401, '未登录或登录态已失效');
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, user_no: payload.user_no, name: payload.name, role: payload.role };
    return next();
  } catch (err) {
    return fail(res, 401, '登录态已失效，请重新登录');
  }
}

/**
 * 角色限制中间件工厂
 * 用法：router.post('/', authRequired, requireRole('teacher'), handler)
 * 必须在 authRequired 之后使用（依赖 req.user）
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 403, '无权操作：仅教师可发布活动');
    }
    return next();
  };
}

module.exports = { authRequired, requireRole };
