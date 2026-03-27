-- /Users/zhuwenlong/Desktop/ai-study/two-join/server-nest/docs/migrations/bilibili_comment_structure.sql
-- B站风格评论系统：添加缺失字段
-- 执行时间：2026-03-27

-- 检查并添加缺失的字段
-- 注意：如果字段已存在，此脚本将报错，这表示字段已添加

-- 添加 root_id 字段（如果不存在）
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'wetogether' AND TABLE_NAME = 'square_comments' AND COLUMN_NAME = 'root_id');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE square_comments ADD COLUMN `root_id` BIGINT NULL COMMENT \'根评论ID\' AFTER `parent_id`, ADD INDEX `idx_root_id` (`root_id`)', 
    'SELECT "Column root_id already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 like_count 字段（如果不存在）
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'wetogether' AND TABLE_NAME = 'square_comments' AND COLUMN_NAME = 'like_count');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE square_comments ADD COLUMN `like_count` INT UNSIGNED DEFAULT 0 COMMENT \'点赞数\' AFTER `content`, ADD INDEX `idx_like_count` (`like_count`)', 
    'SELECT "Column like_count already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 reply_count 字段（如果不存在）
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'wetogether' AND TABLE_NAME = 'square_comments' AND COLUMN_NAME = 'reply_count');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE square_comments ADD COLUMN `reply_count` INT UNSIGNED DEFAULT 0 COMMENT \'回复数\' AFTER `like_count`', 
    'SELECT "Column reply_count already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 is_top 字段（如果不存在）
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'wetogether' AND TABLE_NAME = 'square_comments' AND COLUMN_NAME = 'is_top');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE square_comments ADD COLUMN `is_top` TINYINT DEFAULT 0 COMMENT \'是否置顶\' AFTER `reply_count`', 
    'SELECT "Column is_top already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 is_folded 字段（如果不存在）
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'wetogether' AND TABLE_NAME = 'square_comments' AND COLUMN_NAME = 'is_folded');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE square_comments ADD COLUMN `is_folded` TINYINT DEFAULT 0 COMMENT \'是否折叠\' AFTER `is_top`', 
    'SELECT "Column is_folded already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 is_hot 字段（如果不存在）
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'wetogether' AND TABLE_NAME = 'square_comments' AND COLUMN_NAME = 'is_hot');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE square_comments ADD COLUMN `is_hot` TINYINT DEFAULT 0 COMMENT \'是否热评\' AFTER `is_folded`', 
    'SELECT "Column is_hot already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 status 字段（如果不存在）
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'wetogether' AND TABLE_NAME = 'square_comments' AND COLUMN_NAME = 'status');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE square_comments ADD COLUMN `status` TINYINT DEFAULT 1 COMMENT \'状态：1-正常，0-删除\' AFTER `is_hot`', 
    'SELECT "Column status already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 updated_at 字段（如果不存在）
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'wetogether' AND TABLE_NAME = 'square_comments' AND COLUMN_NAME = 'updated_at');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE square_comments ADD COLUMN `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER `status`', 
    'SELECT "Column updated_at already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 更新现有评论的root_id（顶级评论设置为自己的ID，子评论设置为父评论的root_id）
UPDATE square_comments SET root_id = id WHERE parent_id IS NULL;
UPDATE square_comments sc1 
JOIN square_comments sc2 ON sc1.parent_id = sc2.id 
SET sc1.root_id = sc2.root_id 
WHERE sc1.parent_id IS NOT NULL AND sc1.root_id IS NULL;

SELECT "B站风格评论系统数据库迁移完成" as message;