-- Migration: 006 — Update default revision cycle to [1, 4, 7, 21]
-- Date: 2026-05-30
-- Description: Change the default revision_intervals to the new shorter cycle.
--              Also backfills existing rows that still have the old default or null.

-- Update column default for all new sign-ups
alter table public.profiles
  alter column revision_intervals set default '{1,4,7,21}';

-- Backfill: rows that are null or still on the old 8-step default get the new default
update public.profiles
  set revision_intervals = '{1,4,7,21}'
  where revision_intervals is null
     or revision_intervals = '{1,3,7,15,30,60,120,180}';
