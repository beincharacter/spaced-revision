-- Migration: 004 — Custom Revision Intervals per User
-- Date: 2026-05-30
-- Description: Allow each user to define their own spaced-repetition cycle.
--              Defaults to the standard [1, 3, 7, 15, 30, 60, 120, 180] schedule.

alter table public.profiles
  add column if not exists revision_intervals integer[]
    default '{1,3,7,15,30,60,120,180}';
