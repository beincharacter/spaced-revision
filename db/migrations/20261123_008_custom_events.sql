-- Migration: 008 — Custom calendar events
-- Date: 2026-11-23
-- Description: Lets users add their own one-off events (e.g. exams/tests) to the calendar.

create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  event_date date not null,
  notes      text,
  created_at timestamptz default now()
);

alter table public.events enable row level security;

create policy "own_events" on public.events for all using (auth.uid() = user_id);

-- Description: Track the synced Google Calendar event id for custom events.

alter table public.events
  add column if not exists google_event_id text;

