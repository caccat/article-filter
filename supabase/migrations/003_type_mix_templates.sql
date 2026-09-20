-- 多类型（提示词）比例模板表：按平台分桶保存
create table if not exists type_mix_templates (
  id bigint generated always as identity primary key,
  format text not null,
  name text not null,
  mix jsonb not null default '[]',
  created_at timestamptz default now(),
  unique(format, name)
);

create index if not exists idx_type_mix_templates_format on type_mix_templates(format);

-- 筛选配置增加 folder_mode 字段：'subfolder'（分子文件夹）/ 'flat'（不分子文件夹）
alter table filter_configs
  add column if not exists folder_mode text default 'flat';