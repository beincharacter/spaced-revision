-- Migration: 001 — Initial Schema
-- Date: 2026-05-30
-- Description: Create core tables: profiles, subjects, topics, revisions

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  name             text,
  exam_name        text,
  target_exam_date date,
  daily_goal       integer default 10,
  created_at       timestamptz default now()
);

create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  color      text default '#6366f1',
  created_at timestamptz default now()
);

create table if not exists public.topics (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  subject_id       uuid not null references public.subjects(id) on delete cascade,
  name             text not null,
  difficulty       text default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  first_studied_at timestamptz,
  last_revised_at  timestamptz,
  revision_count   integer default 0,
  is_active        boolean default true,
  created_at       timestamptz default now()
);

create table if not exists public.revisions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  topic_id        uuid not null references public.topics(id) on delete cascade,
  revision_number integer not null,
  scheduled_date  date not null,
  completed_at    timestamptz,
  status          text default 'pending' check (status in ('pending', 'completed', 'skipped')),
  created_at      timestamptz default now()
);

-- ─── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles  enable row level security;
alter table public.subjects  enable row level security;
alter table public.topics    enable row level security;
alter table public.revisions enable row level security;

create policy "own_profile"   on public.profiles  for all using (auth.uid() = id);
create policy "own_subjects"  on public.subjects  for all using (auth.uid() = user_id);
create policy "own_topics"    on public.topics    for all using (auth.uid() = user_id);
create policy "own_revisions" on public.revisions for all using (auth.uid() = user_id);

-- ─── Trigger: auto-create profile on signup ───────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
