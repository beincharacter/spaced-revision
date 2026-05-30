-- Migration: 005 — Revision Outcome
-- Date: 2026-05-30
-- Description: Track HOW a completed revision was marked — "well" vs "needs_practice".
--              Skipped revisions keep status='pending' (rescheduled), so outcome stays NULL.

alter table public.revisions
  add column if not exists outcome text
    check (outcome in ('well', 'needs_practice'))
    default null;
