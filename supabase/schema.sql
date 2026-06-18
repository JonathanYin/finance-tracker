create table if not exists public.expenses (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  category text not null check (
    category in (
      'Food',
      'Transport',
      'Shopping',
      'Bills',
      'Entertainment',
      'Health',
      'Travel',
      'Other'
    )
  ),
  description text not null default '',
  merchant text not null default '',
  source text not null default 'manual' check (
    source in ('manual', 'schwab', 'bofa', 'email', 'receipt')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  next_billing_date date not null,
  category text not null check (
    category in (
      'Food',
      'Transport',
      'Shopping',
      'Bills',
      'Entertainment',
      'Health',
      'Travel',
      'Other'
    )
  ),
  merchant text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, date desc, created_at desc);

create index if not exists subscriptions_user_next_billing_idx
  on public.subscriptions (user_id, next_billing_date asc, created_at asc);

alter table public.expenses enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Users can read their own expenses." on public.expenses;
create policy "Users can read their own expenses."
  on public.expenses for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert their own expenses." on public.expenses;
create policy "Users can insert their own expenses."
  on public.expenses for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their own expenses." on public.expenses;
create policy "Users can update their own expenses."
  on public.expenses for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their own expenses." on public.expenses;
create policy "Users can delete their own expenses."
  on public.expenses for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can read their own subscriptions." on public.subscriptions;
create policy "Users can read their own subscriptions."
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert their own subscriptions." on public.subscriptions;
create policy "Users can insert their own subscriptions."
  on public.subscriptions for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their own subscriptions." on public.subscriptions;
create policy "Users can update their own subscriptions."
  on public.subscriptions for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their own subscriptions." on public.subscriptions;
create policy "Users can delete their own subscriptions."
  on public.subscriptions for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
