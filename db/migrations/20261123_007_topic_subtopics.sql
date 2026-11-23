-- Migration: 007 — Topic subtopics
-- Date: 2026-11-23
-- Description: Add a subtopics text array to topics so a topic can list sub-points.

alter table public.topics
  add column if not exists subtopics text[] default '{}'::text[];
