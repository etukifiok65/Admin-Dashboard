create table if not exists public.request_rate_limits (
  id bigserial primary key,
  action text not null,
  identifier text not null,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default timezone('utc', now()),
  blocked_until timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  unique(action, identifier)
);
create index if not exists idx_request_rate_limits_blocked_until
  on public.request_rate_limits (blocked_until);
create index if not exists idx_request_rate_limits_updated_at
  on public.request_rate_limits (updated_at);
create or replace function public.enforce_rate_limit(
  identifier_param text,
  action_param text,
  max_attempts_param integer default 5,
  window_seconds_param integer default 900,
  block_seconds_param integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_time timestamptz := timezone('utc', now());
  normalized_identifier text := lower(trim(coalesce(identifier_param, '')));
  normalized_action text := lower(trim(coalesce(action_param, '')));
  rate_row public.request_rate_limits%rowtype;
  next_attempt_count integer;
  retry_after integer := 0;
  window_interval interval;
  block_interval interval;
begin
  if normalized_identifier = '' or normalized_action = '' then
    return jsonb_build_object(
      'allowed', true,
      'remaining', max_attempts_param,
      'retry_after', 0
    );
  end if;

  window_interval := make_interval(secs => greatest(window_seconds_param, 1));
  block_interval := make_interval(secs => greatest(block_seconds_param, 1));

  select *
  into rate_row
  from public.request_rate_limits
  where action = normalized_action
    and identifier = normalized_identifier
  for update;

  if not found then
    insert into public.request_rate_limits (
      action,
      identifier,
      attempt_count,
      window_started_at,
      blocked_until,
      updated_at
    )
    values (
      normalized_action,
      normalized_identifier,
      1,
      current_time,
      null,
      current_time
    );

    return jsonb_build_object(
      'allowed', true,
      'remaining', greatest(max_attempts_param - 1, 0),
      'retry_after', 0
    );
  end if;

  if rate_row.blocked_until is not null and rate_row.blocked_until > current_time then
    retry_after := ceil(extract(epoch from (rate_row.blocked_until - current_time)));

    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after', greatest(retry_after, 0)
    );
  end if;

  if rate_row.window_started_at + window_interval <= current_time then
    rate_row.attempt_count := 0;
    rate_row.window_started_at := current_time;
    rate_row.blocked_until := null;
  end if;

  next_attempt_count := rate_row.attempt_count + 1;

  if next_attempt_count > max_attempts_param then
    update public.request_rate_limits
    set
      attempt_count = next_attempt_count,
      blocked_until = current_time + block_interval,
      updated_at = current_time
    where id = rate_row.id;

    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after', block_seconds_param
    );
  end if;

  update public.request_rate_limits
  set
    attempt_count = next_attempt_count,
    window_started_at = rate_row.window_started_at,
    blocked_until = null,
    updated_at = current_time
  where id = rate_row.id;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(max_attempts_param - next_attempt_count, 0),
    'retry_after', 0
  );
end;
$$;
grant execute on function public.enforce_rate_limit(text, text, integer, integer, integer) to anon, authenticated, service_role;
-- Keep table private from direct reads/writes by client roles.
revoke all on table public.request_rate_limits from anon, authenticated;
