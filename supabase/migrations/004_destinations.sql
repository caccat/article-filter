-- 分发目标表（仅视频使用）。图文/头条/资讯/搜狐等"按 type 维度已用"机制保持不变。
create table if not exists destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- 预置 2 个常见目标
insert into destinations (name) values ('抖音'), ('微信视频号')
  on conflict (name) do nothing;

-- used_articles 加可空列 destination_id（非视频行 = NULL，行为不变）
alter table used_articles add column if not exists destination_id text;

-- 索引：按 (type, destination_id) 查询"某类型某目标已用集"
create index if not exists idx_used_articles_type_dest on used_articles(type, destination_id);

-- 提示：unique(type, title) 约束需要放开，否则同一文章在同一 type 下不能被 2 个目标分别标记
-- 新规则：video 行用 (type, destination_id, title) 唯一；非 video 行 (destination_id IS NULL) 仍按 type+title 唯一
-- 实现：用条件唯一索引（PG 暂不支持条件 unique 的 NULL 多值差异，所以拆为两个部分索引）
alter table used_articles drop constraint if exists used_articles_type_title_key;
create unique index uq_used_articles_video on used_articles (type, destination_id, title) where destination_id is not null;
create unique index uq_used_articles_nonvideo on used_articles (type, title) where destination_id is null;