-- Ledger: full schema with Row Level Security
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  currency text not null default 'INR',
  locale text not null default 'en-IN',
  theme text not null default 'light',
  first_day_of_week int not null default 1,
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('bank','credit_card','upi_wallet','cash','investment','loan')),
  opening_balance numeric(14,2) not null default 0,
  icon text not null default '🏦',
  color text not null default '#1d6e5a',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income','expense')),
  icon text not null default '✨',
  color text not null default '#8a7d5c',
  archived boolean not null default false,
  sort int not null default 0
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense','transfer')),
  amount numeric(14,2) not null check (amount > 0),
  account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id uuid references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  date date not null default current_date,
  note text,
  tags text[],
  created_at timestamptz not null default now()
);
create index transactions_user_date on public.transactions (user_id, date desc);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  rollover boolean not null default false,
  unique (user_id, category_id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  target_date date,
  icon text not null default '🎯',
  color text not null default '#1d6e5a',
  created_at timestamptz not null default now()
);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  amount numeric(14,2) not null,
  date date not null default current_date,
  note text
);

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense','transfer')),
  amount numeric(14,2) not null check (amount > 0),
  account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id uuid references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  note text,
  frequency text not null check (frequency in ('daily','weekly','monthly','yearly')),
  interval int not null default 1 check (interval > 0),
  next_date date not null,
  end_date date,
  auto_post boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  total_amount numeric(14,2) not null check (total_amount > 0),
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.split_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  split_id uuid not null references public.splits(id) on delete cascade,
  person text not null,
  amount numeric(14,2) not null,
  settled boolean not null default false
);

-- Row Level Security: every user only ever sees their own rows.
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.splits enable row level security;
alter table public.split_shares enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own accounts" on public.accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own categories" on public.categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own transactions" on public.transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own budgets" on public.budgets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own goals" on public.goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own goal_contributions" on public.goal_contributions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own recurring_rules" on public.recurring_rules for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own splits" on public.splits for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own split_shares" on public.split_shares for all using (user_id = auth.uid()) with check (user_id = auth.uid());
