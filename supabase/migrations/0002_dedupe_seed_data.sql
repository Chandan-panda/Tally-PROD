-- Cleanup: remove duplicate rows created by the double-seeding bug
-- (React.StrictMode ran the first-login seeder twice before the app-side fix).
-- Keeps the earliest copy of each duplicated category and account.

delete from public.categories
where id in (
  select id from (
    select id,
           row_number() over (partition by user_id, kind, lower(name) order by sort, id) as rn
    from public.categories
  ) t
  where t.rn > 1
);

delete from public.accounts
where id in (
  select id from (
    select id,
           row_number() over (partition by user_id, type, lower(name), opening_balance order by created_at, id) as rn
    from public.accounts
  ) t
  where t.rn > 1
);
