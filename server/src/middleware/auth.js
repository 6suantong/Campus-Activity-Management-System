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
const ROLE_DENY_MSG = {
  teacher: '无权操作：仅教师可发布活动',
  student: '无权操作：仅学生可报名活动'
};

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const need = roles[0];
      return fail(res, 403, ROLE_DENY_MSG[need] || '无权操作：权限不足');
    }
    return next();
  };
}

/**
 * 可选鉴权：带合法 token 时挂载 req.user；不带/失效时不拦截（req.user 为空）
 * 用于公共列表：登录学生可看到"我是否已报名"标记，未登录也能浏览
 */
function optionalAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.id, user_no: payload.user_no, name: payload.name, role: payload.role };
    } catch (err) {
      // 失效令牌按未登录处理，不报错
    }
  }
  return next();
}

module.exports = { authRequired, requireRole, optionalAuth };
