-- /Users/zhuwenlong/Desktop/ai-study/two-join/docs/migrations/add_comment_reply_fields.sql
-- 评论功能重构：添加@评论支持字段
-- 执行时间：2026-03-27

-- 添加 reply_to_id 字段（被回复的评论ID）
ALTER TABLE square_comments 
ADD COLUMN reply_to_id INT NULL COMMENT '被回复的评论ID' AFTER parent_id,
ADD INDEX idx_reply_to (reply_to_id);

-- 添加 reply_to_user_id 字段（被回复的用户ID）
ALTER TABLE square_comments 
ADD COLUMN reply_to_user_id INT NULL COMMENT '被回复的用户ID' AFTER reply_to_id,
ADD INDEX idx_reply_to_user (reply_to_user_id);

-- 添加外键约束（可选，根据需要启用）
-- ALTER TABLE square_comments 
-- ADD CONSTRAINT fk_comment_reply_to 
-- FOREIGN KEY (reply_to_id) REFERENCES square_comments(id) ON DELETE SET NULL;

-- ALTER TABLE square_comments 
-- ADD CONSTRAINT fk_comment_reply_to_user 
-- FOREIGN KEY (reply_to_user_id) REFERENCES users(id) ON DELETE SET NULL;