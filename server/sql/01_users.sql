-- 用户表：支撑 REQ-01 注册 / 登录 / 登出
-- 字段对齐需求分析：学号/工号 + 密码 + 姓名；role 区分学生与教师
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_no` VARCHAR(32) NOT NULL COMMENT '学号或工号',
  `password_hash` VARCHAR(100) NOT NULL COMMENT 'bcrypt 加密后的密码',
  `name` VARCHAR(32) NOT NULL COMMENT '姓名',
  `role` ENUM('student','teacher') NOT NULL DEFAULT 'student' COMMENT '角色：学生/教师',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_no` (`user_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
