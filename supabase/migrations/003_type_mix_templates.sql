-- 筛选配置增加 folder_mode 字段：'subfolder'（分子文件夹）/ 'flat'（不分子文件夹）
alter table filter_configs
  add column if not exists folder_mode text default 'flat';

-- 注：提示词比例模板复用现有 templates 表存储（filter_mode='typemix'，比例存 cities jsonb 字段），无需新表。