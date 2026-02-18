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
  now_utc timestamptz := now();
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
      now_utc,
      null,
      now_utc
    );

    return jsonb_build_object(
      'allowed', true,
      'remaining', greatest(max_attempts_param - 1, 0),
      'retry_after', 0
    );
  end if;

  if rate_row.blocked_until is not null and rate_row.blocked_until > now_utc then
    retry_after := ceil(extract(epoch from (rate_row.blocked_until - now_utc)));

    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after', greatest(retry_after, 0)
    );
  end if;

  if rate_row.window_started_at + window_interval <= now_utc then
    rate_row.attempt_count := 0;
    rate_row.window_started_at := now_utc;
    rate_row.blocked_until := null;
  end if;

  next_attempt_count := rate_row.attempt_count + 1;

  if next_attempt_count > max_attempts_param then
    update public.request_rate_limits
    set
      attempt_count = next_attempt_count,
      blocked_until = now_utc + block_interval,
      updated_at = now_utc
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
    updated_at = now_utc
  where id = rate_row.id;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(max_attempts_param - next_attempt_count, 0),
    'retry_after', 0
  );
end;
$$;
