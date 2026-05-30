-- Migration: 002 — Google Calendar Token Storage
-- Date: 2026-05-30
-- Description: Add Google OAuth token columns to profiles for Calendar sync

alter table public.profiles
  add column if not exists google_access_token  text,
  add column if not exists google_refresh_token text,
  add column if not exists google_token_expiry  timestamptz;
