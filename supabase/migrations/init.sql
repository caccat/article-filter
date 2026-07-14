-- 类型表
create table if not exists types (
  name text primary key,
  created_at timestamptz default now()
);

-- 文章元数据
create table if not exists articles (
  id bigint generated always as identity primary key,
  type text not null references types(name) on delete cascade,
  format text not null,
  title text not null,
  city text,
  keywords text[] default '{}',
  cos_key text not null,
  created_at timestamptz default now(),
  unique(type, title)
);

-- 模板表
create table if not exists templates (
  id bigint generated always as identity primary key,
  format text not null,
  name text not null,
  filter_mode text not null default 'free',
  cities jsonb default '[]',
  created_at timestamptz default now(),
  unique(format, name)
);

-- 已用文章
create table if not exists used_articles (
  id bigint generated always as identity primary key,
  type text not null,
  title text not null,
  created_at timestamptz default now(),
  unique(type, title)
);

-- 筛选配置
create table if not exists filter_configs (
  id bigint generated always as identity primary key,
  format text not null,
  type text not null,
  filter_mode text not null default 'free',
  cities jsonb default '[]',
  template_counts jsonb default '{}',
  title_filter_on boolean default false,
  preview jsonb,
  unique(format, type)
);

-- 索引
create index if not exists idx_articles_type on articles(type);
create index if not exists idx_articles_format on articles(format);
create index if not exists idx_articles_type_format on articles(type, format);
create index if not exists idx_used_articles_type on used_articles(type);
