-- V2.0 种子数据：系统管理员账号（admin 角色不开放注册，仅由脚本预置）
-- 默认账号 admin / admin123，密码 bcrypt 哈希（与注册接口同一算法，cost=10）
-- 该哈希对应明文 "admin123"，可通过登录接口验证
INSERT INTO `users` (`user_no`, `password_hash`, `name`, `role`, `account_status`)
VALUES ('admin', '$2a$10$iWtZxNg/.w98UegcgizJUuFrO74TyiIbuiKFEDTu4UuOCd5KwgFDi', '系统管理员', 'admin', 'active')
ON DUPLICATE KEY UPDATE `user_no` = `user_no`;
