create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_type text not null check (user_type in ('patient', 'provider')),
  consent_type text not null check (consent_type in ('privacy_policy', 'terms_of_service')),
  consent_version text not null,
  accepted boolean not null default true,
  accepted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, consent_type, consent_version)
);
create index if not exists idx_user_consents_user_id
  on public.user_consents(user_id);
create index if not exists idx_user_consents_type
  on public.user_consents(consent_type);
alter table public.user_consents enable row level security;
grant select, insert on public.user_consents to authenticated;
drop policy if exists "Users can view own consents" on public.user_consents;
create policy "Users can view own consents"
  on public.user_consents for select
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own consents" on public.user_consents;
create policy "Users can insert own consents"
  on public.user_consents for insert
  with check (auth.uid() = user_id);
