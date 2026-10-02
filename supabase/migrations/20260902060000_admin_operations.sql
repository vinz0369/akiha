create type public.cleanup_status as enum ('pending', 'completed');

create table public.storage_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null check (bucket_id in ('moments', 'app-assets')),
  object_paths text[] not null check (cardinality(object_paths) > 0),
  status public.cleanup_status not null default 'pending',
  attempt_count smallint not null default 0 check (attempt_count between 0 and 20),
  created_by uuid not null references public.profiles(id),
  reason text not null check (char_length(reason) between 1 and 180),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.storage_cleanup_jobs enable row level security;
create policy cleanup_jobs_admin_read on public.storage_cleanup_jobs
for select to authenticated using ((select public.is_admin()));
create policy cleanup_jobs_owner_read on public.storage_cleanup_jobs
for select to authenticated using (created_by = (select auth.uid()));

create function public.admin_get_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare target_user_id uuid; result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'admin required' using errcode = '42501';
  end if;
  select id into target_user_id from public.profiles where role = 'user' order by created_at limit 1;
  select jsonb_build_object(
    'current_streak', public.current_streak_for(target_user_id, public.local_today()),
    'longest_streak', public.longest_streak_for(target_user_id),
    'total_workouts', (select count(*) from public.checkins where user_id = target_user_id),
    'moments', (select count(distinct checkin_id) from public.moment_assets where owner_id = target_user_id),
    'pending_rewards', (select count(*) from public.rewards where owner_id = target_user_id and status = 'proposed'),
    'pending_cleanup_jobs', (select count(*) from public.storage_cleanup_jobs where status = 'pending')
  ) into result;
  return result;
end;
$$;

create function public.admin_update_checkin(
  p_checkin_id uuid,
  p_input jsonb,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  old_row public.checkins%rowtype;
  new_row public.checkins%rowtype;
  target_date date;
  mood_value text;
  note_value text;
begin
  if actor_id is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if char_length(trim(p_reason)) not between 1 and 180 then raise exception 'reason required' using errcode = '22023'; end if;
  select * into old_row from public.checkins where id = p_checkin_id for update;
  if old_row.id is null then raise exception 'check-in not found' using errcode = 'P0002'; end if;

  target_date := coalesce((p_input->>'local_date')::date, old_row.local_date);
  mood_value := case when p_input ? 'mood' then nullif(p_input->>'mood', '') else old_row.mood end;
  note_value := case when p_input ? 'note' then nullif(trim(p_input->>'note'), '') else old_row.note end;
  if target_date > public.local_today() then raise exception 'check-in cannot move to the future' using errcode = '22023'; end if;
  if mood_value is not null and mood_value not in ('energized', 'happy', 'okay', 'tired', 'proud') then raise exception 'unsupported mood' using errcode = '22023'; end if;
  if note_value is not null and char_length(note_value) > 280 then raise exception 'note too long' using errcode = '22023'; end if;

  update public.checkins set
    local_date = target_date,
    mood = mood_value,
    note = note_value,
    source = 'admin_backfill',
    correction_reason = trim(p_reason)
  where id = p_checkin_id returning * into new_row;

  update public.rewards reward set status = 'unlocked', unlocked_at = coalesce(unlocked_at, now())
  where reward.owner_id = old_row.user_id and reward.status = 'active'
    and public.reward_progress(old_row.user_id, reward.rule_type) >= reward.threshold;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after, reason)
  values (actor_id, 'checkin.update', 'checkin', p_checkin_id,
    jsonb_build_object('local_date', old_row.local_date, 'mood', old_row.mood, 'note', old_row.note),
    jsonb_build_object('local_date', new_row.local_date, 'mood', new_row.mood, 'note', new_row.note),
    trim(p_reason));
end;
$$;

create function public.admin_delete_checkin(p_checkin_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  old_row public.checkins%rowtype;
  paths text[];
  cleanup_id uuid;
begin
  if actor_id is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if char_length(trim(p_reason)) not between 1 and 180 then raise exception 'reason required' using errcode = '22023'; end if;
  select * into old_row from public.checkins where id = p_checkin_id for update;
  if old_row.id is null then raise exception 'check-in not found' using errcode = 'P0002'; end if;
  select coalesce(array_agg(path), array[]::text[]) into paths from (
    select full_path as path from public.moment_assets where checkin_id = p_checkin_id
    union all
    select thumb_path from public.moment_assets where checkin_id = p_checkin_id
  ) objects;
  delete from public.checkins where id = p_checkin_id;
  if cardinality(paths) > 0 then
    insert into public.storage_cleanup_jobs (bucket_id, object_paths, created_by, reason)
    values ('moments', paths, actor_id, trim(p_reason)) returning id into cleanup_id;
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, reason)
  values (actor_id, 'checkin.delete', 'checkin', p_checkin_id,
    jsonb_build_object('user_id', old_row.user_id, 'local_date', old_row.local_date), trim(p_reason));
  return jsonb_build_object('cleanup_job_id', cleanup_id, 'object_paths', to_jsonb(paths));
end;
$$;

create function public.remove_moment_asset(p_asset_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); asset public.moment_assets%rowtype; cleanup_id uuid;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into asset from public.moment_assets where id = p_asset_id for update;
  if asset.id is null or (asset.owner_id <> actor_id and not public.is_admin()) then
    raise exception 'asset not found' using errcode = 'P0002';
  end if;
  delete from public.moment_assets where id = p_asset_id;
  update public.moment_assets set position = -(position + 1)
  where checkin_id = asset.checkin_id and position > asset.position;
  update public.moment_assets set position = -position - 2
  where checkin_id = asset.checkin_id and position < 0;
  insert into public.storage_cleanup_jobs (bucket_id, object_paths, created_by, reason)
  values ('moments', array[asset.full_path, asset.thumb_path], actor_id, 'moment asset removed')
  returning id into cleanup_id;
  return jsonb_build_object('cleanup_job_id', cleanup_id, 'object_paths', jsonb_build_array(asset.full_path, asset.thumb_path));
end;
$$;

create function public.complete_storage_cleanup(p_job_id uuid, p_success boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update public.storage_cleanup_jobs set
    status = case when p_success then 'completed' else status end,
    completed_at = case when p_success then now() else completed_at end,
    attempt_count = attempt_count + 1
  where id = p_job_id and (created_by = auth.uid() or public.is_admin());
  if not found then raise exception 'cleanup job not found' using errcode = 'P0002'; end if;
end;
$$;

create function public.reorder_moment_assets(p_checkin_id uuid, p_asset_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); expected_count integer;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if cardinality(p_asset_ids) not between 1 and 3
    or (select count(distinct id) from unnest(p_asset_ids) as ids(id)) <> cardinality(p_asset_ids) then
    raise exception 'invalid asset order' using errcode = '22023';
  end if;
  select count(*) into expected_count from public.moment_assets asset
  join public.checkins checkin on checkin.id = asset.checkin_id
  where asset.checkin_id = p_checkin_id
    and (checkin.user_id = actor_id or public.is_admin())
    and asset.id = any(p_asset_ids);
  if expected_count <> cardinality(p_asset_ids)
    or expected_count <> (select count(*) from public.moment_assets where checkin_id = p_checkin_id) then
    raise exception 'asset order must contain every moment asset exactly once' using errcode = '22023';
  end if;
  update public.moment_assets set position = -(position + 1) where checkin_id = p_checkin_id;
  update public.moment_assets asset set position = ordered.position
  from (select id, ordinality::smallint - 1 as position from unnest(p_asset_ids) with ordinality as item(id, ordinality)) ordered
  where asset.id = ordered.id and asset.checkin_id = p_checkin_id;
end;
$$;

create function public.admin_upsert_reaction(p_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); template_id uuid; kind_value public.reaction_kind;
begin
  if actor_id is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  template_id := nullif(p_input->>'id', '')::uuid;
  kind_value := (p_input->>'kind')::public.reaction_kind;
  if char_length(trim(p_input->>'text')) not between 1 and 180 then raise exception 'invalid reaction text' using errcode = '22023'; end if;
  if template_id is null then
    insert into public.reaction_templates (kind, text, milestone_value, weight, is_active, created_by)
    values (kind_value, trim(p_input->>'text'), nullif(p_input->>'milestone_value', '')::integer,
      coalesce((p_input->>'weight')::smallint, 1), coalesce((p_input->>'is_active')::boolean, true), actor_id)
    returning id into template_id;
  else
    update public.reaction_templates set kind = kind_value, text = trim(p_input->>'text'),
      milestone_value = nullif(p_input->>'milestone_value', '')::integer,
      weight = coalesce((p_input->>'weight')::smallint, weight),
      is_active = coalesce((p_input->>'is_active')::boolean, is_active)
    where id = template_id;
    if not found then raise exception 'reaction not found' using errcode = 'P0002'; end if;
  end if;
  return template_id;
end;
$$;

create function public.admin_upsert_reminder(p_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); template_id uuid;
begin
  if actor_id is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  template_id := nullif(p_input->>'id', '')::uuid;
  if char_length(trim(p_input->>'text')) not between 1 and 180 then raise exception 'invalid reminder text' using errcode = '22023'; end if;
  if template_id is null then
    insert into public.reminder_templates (text, weight, is_active, created_by)
    values (trim(p_input->>'text'), coalesce((p_input->>'weight')::smallint, 1),
      coalesce((p_input->>'is_active')::boolean, true), actor_id) returning id into template_id;
  else
    update public.reminder_templates set text = trim(p_input->>'text'),
      weight = coalesce((p_input->>'weight')::smallint, weight),
      is_active = coalesce((p_input->>'is_active')::boolean, is_active)
    where id = template_id;
    if not found then raise exception 'reminder not found' using errcode = 'P0002'; end if;
  end if;
  return template_id;
end;
$$;

create function public.admin_update_settings(p_input jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  update public.app_settings set
    reminder_time = coalesce((p_input->>'reminder_time')::time, reminder_time),
    reminder_enabled = coalesce((p_input->>'reminder_enabled')::boolean, reminder_enabled),
    protected_days_per_month = coalesce((p_input->>'protected_days_per_month')::smallint, protected_days_per_month),
    updated_by = auth.uid(), updated_at = now()
  where key = 'default';
end;
$$;

revoke all on function public.admin_get_overview() from public;
revoke all on function public.admin_update_checkin(uuid, jsonb, text) from public;
revoke all on function public.admin_delete_checkin(uuid, text) from public;
revoke all on function public.remove_moment_asset(uuid) from public;
revoke all on function public.complete_storage_cleanup(uuid, boolean) from public;
revoke all on function public.reorder_moment_assets(uuid, uuid[]) from public;
revoke all on function public.admin_upsert_reaction(jsonb) from public;
revoke all on function public.admin_upsert_reminder(jsonb) from public;
revoke all on function public.admin_update_settings(jsonb) from public;
grant execute on function public.admin_get_overview() to authenticated;
grant execute on function public.admin_update_checkin(uuid, jsonb, text) to authenticated;
grant execute on function public.admin_delete_checkin(uuid, text) to authenticated;
grant execute on function public.remove_moment_asset(uuid) to authenticated;
grant execute on function public.complete_storage_cleanup(uuid, boolean) to authenticated;
grant execute on function public.reorder_moment_assets(uuid, uuid[]) to authenticated;
grant execute on function public.admin_upsert_reaction(jsonb) to authenticated;
grant execute on function public.admin_upsert_reminder(jsonb) to authenticated;
grant execute on function public.admin_update_settings(jsonb) to authenticated;
