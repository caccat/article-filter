-- 补齐 filter_configs 缺失的列（线上库实际缺 active_types / keyword_template_id）
alter table filter_configs add column if not exists folder_mode text default 'flat';
alter table filter_configs add column if not exists active_types jsonb default '[]';
alter table filter_configs add column if not exists keyword_template_id bigint;

-- 注：提示词比例模板复用现有 templates 表存储（filter_mode='typemix'，比例存 cities jsonb 字段），无需新表。
-- 代码端已做通用降级：缺列时自动剔除字段重试，不阻塞保存。
