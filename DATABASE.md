# ReviseFlow — Database Setup

Run these SQL commands in your Supabase SQL editor (Dashboard → SQL Editor).

## 1. Create Tables

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  exam_name text,
  target_exam_date date,
  daily_goal integer default 10,
  -- Google Calendar integration
  google_access_token text,
  google_refresh_token text,
  google_token_expiry timestamptz,
  created_at timestamptz default now()
);

-- Subjects
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text default '#6366f1',
  created_at timestamptz default now()
);

-- Topics
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  difficulty text default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  first_studied_at timestamptz,
  last_revised_at timestamptz,
  revision_count integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Revisions
create table if not exists public.revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  revision_number integer not null,
  scheduled_date date not null,
  completed_at timestamptz,
  status text default 'pending' check (status in ('pending', 'completed', 'skipped')),
  google_event_id text,
  created_at timestamptz default now()
);
```

## 2. Enable Row Level Security

```sql
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.revisions enable row level security;

-- Profiles
create policy "own profile" on public.profiles for all using (auth.uid() = id);

-- Subjects
create policy "own subjects" on public.subjects for all using (auth.uid() = user_id);

-- Topics
create policy "own topics" on public.topics for all using (auth.uid() = user_id);

-- Revisions
create policy "own revisions" on public.revisions for all using (auth.uid() = user_id);
```

## 3. Auto-create Profile on Signup

```sql
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
```

## 4. Supabase Auth Setup

1. Go to Dashboard → Authentication → Providers
2. Enable **Google** provider
   - Add your Google OAuth Client ID and Secret
   - Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`
3. Enable **Email** provider (Magic Link — no password needed)
4. In Authentication → URL Configuration, set:
   - Site URL: `http://localhost:3000` (dev) or your Vercel URL
   - Redirect URLs: `http://localhost:3000/auth/callback`

## 5. Google Calendar OAuth Setup (optional)

To enable the "Sync to Google Calendar" feature:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable the **Google Calendar API** — APIs & Services → Library → search "Google Calendar API"
4. Create OAuth credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/google/callback` (development)
     - `https://your-domain.com/api/google/callback` (production)
5. Copy the Client ID and Client Secret into `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
6. In Settings → Google Calendar, click **Connect Google Calendar**

Once connected, the **Sync Calendar** button on Dashboard and Settings will push all pending revisions as all-day Google Calendar events with 9 AM popup reminders.

## 6. App Setup

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key from Dashboard → Settings → API
# Optionally fill in Google OAuth credentials for Calendar sync
npm run dev
```
