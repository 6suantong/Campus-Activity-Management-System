-- 活动表：支撑 REQ-02 教师发布活动
-- 字段对齐需求分析：标题、开始/结束时间、地点、人数上限、报名起止时间、活动简介
DROP TABLE IF EXISTS `activities`;
CREATE TABLE `activities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `title` VARCHAR(100) NOT NULL COMMENT '活动标题',
  `start_time` DATETIME NOT NULL COMMENT '活动开始时间',
  `end_time` DATETIME NOT NULL COMMENT '活动结束时间',
  `location` VARCHAR(200) NOT NULL COMMENT '活动地点',
  `capacity` INT UNSIGNED NOT NULL COMMENT '人数上限',
  `register_start` DATETIME NOT NULL COMMENT '报名开始时间',
  `register_end` DATETIME NOT NULL COMMENT '报名截止时间',
  `description` TEXT NOT NULL COMMENT '活动简介',
  `publisher_no` VARCHAR(32) NOT NULL COMMENT '发布教师工号(users.user_no)',
  `status` ENUM('open','closed','cancelled') NOT NULL DEFAULT 'open' COMMENT '活动状态:报名中/已关闭/已取消',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_publisher` (`publisher_no`),
  KEY `idx_status_time` (`status`, `start_time`, `register_end`),
  CONSTRAINT `fk_activities_publisher` FOREIGN KEY (`publisher_no`) REFERENCES `users` (`user_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动表';
