-- 报名记录表：支撑 REQ-03 学生报名 / REQ-04 满员与截止控制
-- 工程意图约束：同一学生对同一活动只能报名一次（student_no + activity_id 唯一）
DROP TABLE IF EXISTS `registrations`;
CREATE TABLE `registrations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `activity_id` BIGINT UNSIGNED NOT NULL COMMENT '活动ID(activities.id)',
  `student_no` VARCHAR(32) NOT NULL COMMENT '报名学生学号(users.user_no)',
  `status` ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed' COMMENT '报名状态:已确认/已取消',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activity_student` (`activity_id`, `student_no`),
  KEY `idx_student` (`student_no`),
  CONSTRAINT `fk_reg_activity` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`),
  CONSTRAINT `fk_reg_student` FOREIGN KEY (`student_no`) REFERENCES `users` (`user_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报名记录表';
