-- 删除 articles 表 unique(type, title) 约束，允许跨批次同名文章共存
alter table articles drop constraint if exists articles_type_title_key;

-- 添加普通索引替代，保持查询性能
create index if not exists idx_articles_type_title on articles(type, title);
