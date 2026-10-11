-- 报名记录表：支撑 REQ-03 学生报名 / REQ-04 满员与截止控制 / V2.0 取消报名、候补与递补
-- 工程意图约束：同一学生对同一活动只能报名一次（student_no + activity_id 唯一）
-- V2.0 状态机：confirmed(已确认) / waitlisted(候补中) / cancelled(已取消，含主动取消与退出候补)
--   取消报名与退出候补均为逻辑删除（状态置 cancelled），保留历史可追溯；
--   候补顺序以 created_at 升序为唯一依据（R-V2-09 先到先得），不维护连续序号字段；
--   统计"已报名人数"只计 status='confirmed'。
DROP TABLE IF EXISTS `registrations`;
CREATE TABLE `registrations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `activity_id` BIGINT UNSIGNED NOT NULL COMMENT '活动ID(activities.id)',
  `student_no` VARCHAR(32) NOT NULL COMMENT '报名学生学号(users.user_no)',
  `status` ENUM('confirmed','waitlisted','cancelled') NOT NULL DEFAULT 'confirmed' COMMENT '报名状态:已确认/候补中/已取消',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间（候补排序依据）',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '状态最后变更时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activity_student` (`activity_id`, `student_no`),
  KEY `idx_student` (`student_no`),
  KEY `idx_activity_status_time` (`activity_id`, `status`, `created_at`),
  CONSTRAINT `fk_reg_activity` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`),
  CONSTRAINT `fk_reg_student` FOREIGN KEY (`student_no`) REFERENCES `users` (`user_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报名记录表';
