-- Migration: 003 — Google Calendar Event ID on Revisions
-- Date: 2026-05-30
-- Description: Track which revisions have been synced to Google Calendar
--              to prevent duplicate events on subsequent syncs

alter table public.revisions
  add column if not exists google_event_id text;
