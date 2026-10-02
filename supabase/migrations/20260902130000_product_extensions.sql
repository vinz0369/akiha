-- Product extensions: durable couple interactions, safer chat usage, operational
-- recovery, device management, recap and garden read models.

create table public.moment_messages (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null unique references public.checkins(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  text text not null check (char_length(trim(text)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.protected_day_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null,
  reason text not null check (char_length(trim(reason)) between 1 and 180),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  response_reason text check (response_reason is null or char_length(trim(response_reason)) between 1 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index protected_day_requests_pending_key
  on public.protected_day_requests (user_id, local_date)
  where status = 'pending';

create table public.monthly_recap_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  year integer not null check (year between 2020 and 2200),
  month smallint not null check (month between 1 and 12),
  text text not null check (char_length(trim(text)) between 1 and 500),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year, month)
);

create table public.chat_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index chat_usage_events_user_created_idx
  on public.chat_usage_events (user_id, created_at desc);
create index moment_messages_checkin_idx on public.moment_messages (checkin_id);
create index protected_day_requests_status_created_idx
  on public.protected_day_requests (status, created_at desc);

create trigger moment_messages_set_updated_at before update on public.moment_messages
for each row execute function public.set_updated_at();
create trigger protected_day_requests_set_updated_at before update on public.protected_day_requests
for each row execute function public.set_updated_at();
create trigger monthly_recap_notes_set_updated_at before update on public.monthly_recap_notes
for each row execute function public.set_updated_at();

alter table public.moment_messages enable row level security;
alter table public.protected_day_requests enable row level security;
alter table public.monthly_recap_notes enable row level security;
alter table public.chat_usage_events enable row level security;

create policy moment_messages_read_owner_or_admin on public.moment_messages
for select to authenticated using (
  (select public.is_admin()) or exists (
    select 1 from public.checkins
    where checkins.id = moment_messages.checkin_id
      and checkins.user_id = (select auth.uid())
  )
);
create policy protected_day_requests_read_owner_or_admin on public.protected_day_requests
for select to authenticated using (
  user_id = (select auth.uid()) or (select public.is_admin())
);
create policy monthly_recap_notes_read_owner_or_admin on public.monthly_recap_notes
for select to authenticated using (
  user_id = (select auth.uid()) or (select public.is_admin())
);
create policy chat_usage_events_admin_read on public.chat_usage_events
for select to authenticated using ((select public.is_admin()));

revoke insert, update, delete on public.moment_messages from authenticated;
revoke insert, update, delete on public.protected_day_requests from authenticated;
revoke insert, update, delete on public.monthly_recap_notes from authenticated;
revoke insert, update, delete on public.chat_usage_events from authenticated;
grant select on public.moment_messages to authenticated;
grant select on public.protected_day_requests to authenticated;
grant select on public.monthly_recap_notes to authenticated;

create function public.reserve_chat_request()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  minute_count integer;
  day_count integer;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor_id::text || ':chat', 0));
  select count(*) into minute_count from public.chat_usage_events
    where user_id = actor_id and created_at >= now() - interval '1 minute';
  select count(*) into day_count from public.chat_usage_events
    where user_id = actor_id and created_at >= date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
  if minute_count >= 6 then
    return jsonb_build_object('allowed', false, 'reason', 'minute_limit', 'retry_after_seconds', 60);
  end if;
  if day_count >= 100 then
    return jsonb_build_object('allowed', false, 'reason', 'daily_limit', 'retry_after_seconds', 3600);
  end if;
  insert into public.chat_usage_events (user_id) values (actor_id);
  return jsonb_build_object('allowed', true, 'remaining_today', greatest(0, 99 - day_count));
end;
$$;

create function public.get_push_devices()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id,
      'user_agent', coalesce(user_agent, 'Thiết bị không xác định'),
      'is_active', is_active,
      'last_success_at', last_success_at,
      'created_at', created_at,
      'updated_at', updated_at
    ) order by updated_at desc)
    from public.push_subscriptions where user_id = auth.uid()
  ), '[]'::jsonb);
end;
$$;

create function public.unregister_push_device(p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update public.push_subscriptions set is_active = false
  where id = p_subscription_id and user_id = auth.uid();
  if not found then raise exception 'device not found' using errcode = 'P0002'; end if;
end;
$$;

create function public.request_protected_day(p_local_date date, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); request_id uuid;
begin
  if actor_id is null or public.is_admin() then raise exception 'user required' using errcode = '42501'; end if;
  if p_local_date >= public.local_today() then raise exception 'only a missed past day can be requested' using errcode = '22023'; end if;
  if char_length(trim(p_reason)) not between 1 and 180 then raise exception 'reason required' using errcode = '22023'; end if;
  if exists (select 1 from public.checkins where user_id = actor_id and local_date = p_local_date)
    or exists (select 1 from public.protected_days where user_id = actor_id and local_date = p_local_date) then
    raise exception 'date is already active' using errcode = '23505';
  end if;
  insert into public.protected_day_requests (user_id, local_date, reason)
  values (actor_id, p_local_date, trim(p_reason)) returning id into request_id;
  return request_id;
end;
$$;

create function public.admin_review_protected_request(p_request_id uuid, p_decision text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); request_row public.protected_day_requests%rowtype;
begin
  if actor_id is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if p_decision not in ('approve', 'reject') then raise exception 'invalid decision' using errcode = '22023'; end if;
  if p_decision = 'reject' and char_length(trim(coalesce(p_reason, ''))) not between 1 and 180 then
    raise exception 'rejection reason required' using errcode = '22023';
  end if;
  select * into request_row from public.protected_day_requests where id = p_request_id for update;
  if request_row.id is null or request_row.status <> 'pending' then raise exception 'pending request not found' using errcode = 'P0002'; end if;
  if p_decision = 'approve' then
    perform public.admin_set_protected_day(request_row.local_date, request_row.reason);
  end if;
  update public.protected_day_requests set
    status = case when p_decision = 'approve' then 'approved' else 'rejected' end,
    reviewed_by = actor_id,
    reviewed_at = now(),
    response_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_request_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after, reason)
  values (actor_id, 'protected_request.' || p_decision, 'protected_day_request', p_request_id,
    jsonb_build_object('status', 'pending'), jsonb_build_object('status', case when p_decision = 'approve' then 'approved' else 'rejected' end),
    nullif(trim(coalesce(p_reason, request_row.reason)), ''));
end;
$$;

create function public.admin_upsert_moment_message(p_checkin_id uuid, p_text text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); message_id uuid; old_text text;
begin
  if actor_id is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if char_length(trim(p_text)) not between 1 and 500 then raise exception 'invalid message' using errcode = '22023'; end if;
  if not exists (select 1 from public.checkins where id = p_checkin_id) then raise exception 'check-in not found' using errcode = 'P0002'; end if;
  select text into old_text from public.moment_messages where checkin_id = p_checkin_id;
  insert into public.moment_messages (checkin_id, author_id, text)
  values (p_checkin_id, actor_id, trim(p_text))
  on conflict (checkin_id) do update set text = excluded.text, author_id = excluded.author_id
  returning id into message_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (actor_id, 'moment_message.upsert', 'checkin', p_checkin_id,
    case when old_text is null then null else jsonb_build_object('text', old_text) end,
    jsonb_build_object('text', trim(p_text)));
  return message_id;
end;
$$;

create function public.admin_update_reward(p_reward_id uuid, p_input jsonb, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); old_row public.rewards%rowtype; new_row public.rewards%rowtype; secret_value text;
begin
  if actor_id is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if char_length(trim(p_reason)) not between 1 and 180 then raise exception 'reason required' using errcode = '22023'; end if;
  select * into old_row from public.rewards where id = p_reward_id for update;
  if old_row.id is null then raise exception 'reward not found' using errcode = 'P0002'; end if;
  if old_row.status in ('unlocked', 'claimed', 'archived') then raise exception 'completed reward cannot be edited' using errcode = '22023'; end if;
  update public.rewards set
    title = coalesce(nullif(trim(p_input->>'title'), ''), title),
    public_description = case when p_input ? 'public_description' then nullif(trim(p_input->>'public_description'), '') else public_description end,
    rule_type = coalesce((p_input->>'rule_type')::public.reward_rule_type, rule_type),
    threshold = coalesce((p_input->>'threshold')::integer, threshold),
    is_mystery = coalesce((p_input->>'is_mystery')::boolean, is_mystery)
    ,status = case when p_input ? 'status' and p_input->>'status' in ('proposed', 'active', 'rejected') then (p_input->>'status')::public.reward_status else status end
  where id = p_reward_id returning * into new_row;
  secret_value := nullif(trim(p_input->>'secret_text'), '');
  if p_input ? 'secret_text' then
    if secret_value is null then
      delete from public.reward_secrets where reward_id = p_reward_id;
    else
      insert into public.reward_secrets (reward_id, secret_type, secret_text, created_by)
      values (p_reward_id, 'letter', secret_value, actor_id)
      on conflict (reward_id) do update set secret_type = 'letter', secret_text = excluded.secret_text,
        secret_asset_path = null, created_by = excluded.created_by;
    end if;
  end if;
  if new_row.status = 'active' and public.reward_progress(new_row.owner_id, new_row.rule_type) >= new_row.threshold then
    update public.rewards set status = 'unlocked', unlocked_at = coalesce(unlocked_at, now()) where id = p_reward_id;
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after, reason)
  values (actor_id, 'reward.update', 'reward', p_reward_id,
    jsonb_build_object('title', old_row.title, 'rule_type', old_row.rule_type, 'threshold', old_row.threshold, 'status', old_row.status),
    jsonb_build_object('title', new_row.title, 'rule_type', new_row.rule_type, 'threshold', new_row.threshold, 'status', new_row.status), trim(p_reason));
end;
$$;

create function public.admin_archive_reward(p_reward_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); old_status public.reward_status;
begin
  if actor_id is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if char_length(trim(p_reason)) not between 1 and 180 then raise exception 'reason required' using errcode = '22023'; end if;
  select status into old_status from public.rewards where id = p_reward_id for update;
  if old_status is null then raise exception 'reward not found' using errcode = 'P0002'; end if;
  if old_status = 'claimed' then raise exception 'claimed reward is kept as a memory' using errcode = '22023'; end if;
  update public.rewards set status = 'archived' where id = p_reward_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after, reason)
  values (actor_id, 'reward.archive', 'reward', p_reward_id,
    jsonb_build_object('status', old_status), jsonb_build_object('status', 'archived'), trim(p_reason));
end;
$$;

create function public.admin_upsert_recap_note(p_year integer, p_month integer, p_text text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); target_user_id uuid; note_id uuid;
begin
  if actor_id is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if p_year not between 2020 and 2200 or p_month not between 1 and 12 then raise exception 'invalid month' using errcode = '22023'; end if;
  if char_length(trim(p_text)) not between 1 and 500 then raise exception 'invalid recap note' using errcode = '22023'; end if;
  select id into target_user_id from public.profiles where role = 'user' order by created_at limit 1;
  insert into public.monthly_recap_notes (user_id, year, month, text, updated_by)
  values (target_user_id, p_year, p_month, trim(p_text), actor_id)
  on conflict (user_id, year, month) do update set text = excluded.text, updated_by = excluded.updated_by
  returning id into note_id;
  return note_id;
end;
$$;

create function public.get_monthly_recap(p_year integer, p_month integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); target_user_id uuid; month_start date; month_end date;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_year not between 2020 and 2200 or p_month not between 1 and 12 then raise exception 'invalid month' using errcode = '22023'; end if;
  target_user_id := case when public.is_admin() then (select id from public.profiles where role = 'user' order by created_at limit 1) else actor_id end;
  month_start := make_date(p_year, p_month, 1);
  month_end := (month_start + interval '1 month')::date;
  return jsonb_build_object(
    'year', p_year,
    'month', p_month,
    'longest_streak', coalesce((public.get_calendar_month(p_year, p_month)->'summary'->>'longest_streak')::integer, 0),
    'workouts', (select count(*) from public.checkins where user_id = target_user_id and local_date >= month_start and local_date < month_end),
    'memories', (select count(distinct c.id) from public.checkins c join public.moment_assets a on a.checkin_id = c.id where c.user_id = target_user_id and c.local_date >= month_start and c.local_date < month_end),
    'protected_days', (select count(*) from public.protected_days where user_id = target_user_id and local_date >= month_start and local_date < month_end),
    'rewards_unlocked', (select count(*) from public.rewards where owner_id = target_user_id and unlocked_at >= month_start::timestamp at time zone 'Asia/Ho_Chi_Minh' and unlocked_at < month_end::timestamp at time zone 'Asia/Ho_Chi_Minh'),
    'mood_counts', coalesce((select jsonb_object_agg(mood, amount) from (select mood, count(*) amount from public.checkins where user_id = target_user_id and local_date >= month_start and local_date < month_end and mood is not null group by mood) moods), '{}'::jsonb),
    'cover_thumb_path', (select a.thumb_path from public.moment_assets a join public.checkins c on c.id = a.checkin_id where c.user_id = target_user_id and c.local_date >= month_start and c.local_date < month_end order by c.local_date desc, a.position limit 1),
    'note', (select text from public.monthly_recap_notes where user_id = target_user_id and year = p_year and month = p_month)
  );
end;
$$;

create function public.get_garden_year(p_year integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); target_user_id uuid;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_year not between 2020 and 2200 then raise exception 'invalid year' using errcode = '22023'; end if;
  target_user_id := case when public.is_admin() then (select id from public.profiles where role = 'user' order by created_at limit 1) else actor_id end;
  return coalesce((select jsonb_agg(item order by item->>'local_date') from (
    select jsonb_build_object('local_date', local_date, 'state', 'checkin', 'mood', mood) item from public.checkins where user_id = target_user_id and extract(year from local_date) = p_year
    union all
    select jsonb_build_object('local_date', local_date, 'state', 'protected', 'mood', null) item from public.protected_days where user_id = target_user_id and extract(year from local_date) = p_year
  ) rows), '[]'::jsonb);
end;
$$;

create function public.get_admin_insights()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare target_user_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  select id into target_user_id from public.profiles where role = 'user' order by created_at limit 1;
  return jsonb_build_object(
    'checkins_7d', (select count(*) from public.checkins where user_id = target_user_id and local_date >= public.local_today() - 6),
    'checkins_30d', (select count(*) from public.checkins where user_id = target_user_id and local_date >= public.local_today() - 29),
    'photo_days_30d', (select count(distinct c.id) from public.checkins c join public.moment_assets a on a.checkin_id = c.id where c.user_id = target_user_id and c.local_date >= public.local_today() - 29),
    'rewards_unlocked', (select count(*) from public.rewards where owner_id = target_user_id and status in ('unlocked', 'claimed')),
    'reminders_sent_30d', (select count(*) from public.notification_deliveries where recipient_id = target_user_id and kind = 'daily_reminder' and status = 'sent' and local_date >= public.local_today() - 29),
    'checkins_after_reminder_30d', (select count(distinct c.id) from public.checkins c join public.notification_deliveries d on d.recipient_id = c.user_id and d.local_date = c.local_date and d.kind = 'daily_reminder' and d.status = 'sent' where c.user_id = target_user_id and c.local_date >= public.local_today() - 29 and c.checked_in_at > d.sent_at)
  );
end;
$$;

create function public.log_data_export(p_format text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_format not in ('json', 'csv') then raise exception 'invalid export format' using errcode = '22023'; end if;
  insert into public.audit_logs (actor_id, action, entity_type, reason)
  values (auth.uid(), 'data.export', 'profile', p_format);
end;
$$;

revoke all on function public.reserve_chat_request() from public, anon;
revoke all on function public.get_push_devices() from public, anon;
revoke all on function public.unregister_push_device(uuid) from public, anon;
revoke all on function public.request_protected_day(date, text) from public, anon;
revoke all on function public.admin_review_protected_request(uuid, text, text) from public, anon;
revoke all on function public.admin_upsert_moment_message(uuid, text) from public, anon;
revoke all on function public.admin_update_reward(uuid, jsonb, text) from public, anon;
revoke all on function public.admin_archive_reward(uuid, text) from public, anon;
revoke all on function public.admin_upsert_recap_note(integer, integer, text) from public, anon;
revoke all on function public.get_monthly_recap(integer, integer) from public, anon;
revoke all on function public.get_garden_year(integer) from public, anon;
revoke all on function public.get_admin_insights() from public, anon;
revoke all on function public.log_data_export(text) from public, anon;
grant execute on function public.reserve_chat_request() to authenticated;
grant execute on function public.get_push_devices() to authenticated;
grant execute on function public.unregister_push_device(uuid) to authenticated;
grant execute on function public.request_protected_day(date, text) to authenticated;
grant execute on function public.admin_review_protected_request(uuid, text, text) to authenticated;
grant execute on function public.admin_upsert_moment_message(uuid, text) to authenticated;
grant execute on function public.admin_update_reward(uuid, jsonb, text) to authenticated;
grant execute on function public.admin_archive_reward(uuid, text) to authenticated;
grant execute on function public.admin_upsert_recap_note(integer, integer, text) to authenticated;
grant execute on function public.get_monthly_recap(integer, integer) to authenticated;
grant execute on function public.get_garden_year(integer) to authenticated;
grant execute on function public.get_admin_insights() to authenticated;
grant execute on function public.log_data_export(text) to authenticated;
