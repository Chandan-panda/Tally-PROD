-- Run this in the Supabase SQL editor.
-- Adds personal details (date of birth, gender) to public.profiles.
-- Columns are nullable so existing accounts continue to work unchanged.

alter table public.profiles
  add column if not exists dob date,
  add column if not exists gender text
    check (gender in ('male','female','other','prefer_not_to_say'));
