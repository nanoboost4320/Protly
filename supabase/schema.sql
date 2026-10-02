-- Protly（食事管理アプリ）用のテーブル定義
-- Supabase の SQL Editor に貼り付けて実行してください

-- ユーザーごとのバックアップ（設定＋全記録をJSONで保存）
create table if not exists public.user_backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: 自分のデータだけ読める／書ける
alter table public.user_backups enable row level security;

create policy "Users can read own backup"
  on public.user_backups
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own backup"
  on public.user_backups
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own backup"
  on public.user_backups
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own backup"
  on public.user_backups
  for delete
  using (auth.uid() = user_id);
