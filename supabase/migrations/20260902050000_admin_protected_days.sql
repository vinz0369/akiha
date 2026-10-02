create function public.lock_active_date_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || new.local_date::text, 0));
  return new;
end;
$$;

create trigger a_checkins_lock_active_date
before insert or update of user_id, local_date on public.checkins
for each row execute function public.lock_active_date_key();
create trigger a_protected_days_lock_active_date
before insert or update of user_id, local_date on public.protected_days
for each row execute function public.lock_active_date_key();

create function public.admin_set_protected_day(p_local_date date, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_user_id uuid;
  quota integer;
  used integer;
  protected_id uuid;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'admin required' using errcode = '42501';
  end if;
  if p_local_date >= public.local_today() or char_length(trim(p_reason)) not between 1 and 120 then
    raise exception 'protected day must be a past date with a reason' using errcode = '22023';
  end if;

  select id into target_user_id from public.profiles where role = 'user' order by created_at limit 1;
  if target_user_id is null then raise exception 'user profile not found' using errcode = 'P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'protected-quota:' || target_user_id::text || ':' || date_trunc('month', p_local_date)::date::text,
    0
  ));
  select protected_days_per_month into quota from public.app_settings where key = 'default';
  select count(*) into used from public.protected_days
  where user_id = target_user_id
    and local_date >= date_trunc('month', p_local_date)::date
    and local_date < (date_trunc('month', p_local_date) + interval '1 month')::date;
  if used >= coalesce(quota, 2) then
    raise exception 'protected-day quota reached for this month' using errcode = '22023';
  end if;

  insert into public.protected_days (user_id, local_date, reason, created_by)
  values (target_user_id, p_local_date, trim(p_reason), actor_id)
  returning id into protected_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after, reason)
  values (actor_id, 'protected_day.create', 'protected_day', protected_id,
    jsonb_build_object('user_id', target_user_id, 'local_date', p_local_date), trim(p_reason));

  update public.rewards reward set status = 'unlocked', unlocked_at = coalesce(unlocked_at, now())
  where reward.owner_id = target_user_id and reward.status = 'active'
    and public.reward_progress(target_user_id, reward.rule_type) >= reward.threshold;
  return protected_id;
end;
$$;

create function public.admin_remove_protected_day(p_protected_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); old_row public.protected_days%rowtype;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'admin required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) not between 1 and 120 then
    raise exception 'reason required' using errcode = '22023';
  end if;
  delete from public.protected_days where id = p_protected_id returning * into old_row;
  if old_row.id is null then raise exception 'protected day not found' using errcode = 'P0002'; end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, reason)
  values (actor_id, 'protected_day.remove', 'protected_day', old_row.id,
    jsonb_build_object('user_id', old_row.user_id, 'local_date', old_row.local_date), trim(p_reason));
  -- Rewards deliberately remain unlocked if the historical streak becomes shorter.
end;
$$;

create function public.admin_backfill_checkin(p_local_date date, p_mood text, p_note text, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_user_id uuid;
  checkin_id uuid;
  template public.reaction_templates%rowtype;
  streak_value integer;
begin
  if actor_id is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if p_local_date > public.local_today() or char_length(trim(p_reason)) not between 1 and 180 then
    raise exception 'invalid backfill date or reason' using errcode = '22023';
  end if;
  if p_mood is not null and p_mood not in ('energized', 'happy', 'okay', 'tired', 'proud') then
    raise exception 'unsupported mood' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 280 then raise exception 'note too long' using errcode = '22023'; end if;
  select id into target_user_id from public.profiles where role = 'user' order by created_at limit 1;

  insert into public.checkins (user_id, local_date, mood, note, created_by, source, correction_reason)
  values (target_user_id, p_local_date, p_mood, nullif(trim(p_note), ''), actor_id, 'admin_backfill', trim(p_reason))
  returning id into checkin_id;

  streak_value := public.current_streak_for(target_user_id, public.local_today());
  select * into template from public.reaction_templates
  where is_active and (
    (kind = 'milestone' and milestone_value = streak_value) or kind = 'without_photo' or kind = 'normal'
  )
  order by case when kind = 'milestone' and milestone_value = streak_value then 0 when kind = 'without_photo' then 1 else 2 end,
    power(random(), 1.0 / weight::double precision) desc limit 1;
  insert into public.reaction_deliveries (checkin_id, template_id, rendered_text, rendered_asset_path, context)
  values (checkin_id, template.id, coalesce(template.text, 'You showed up ♡'), template.asset_path,
    jsonb_build_object('admin_backfill', true, 'streak', streak_value));

  update public.rewards reward set status = 'unlocked', unlocked_at = coalesce(unlocked_at, now())
  where reward.owner_id = target_user_id and reward.status = 'active'
    and public.reward_progress(target_user_id, reward.rule_type) >= reward.threshold;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after, reason)
  values (actor_id, 'checkin.backfill', 'checkin', checkin_id,
    jsonb_build_object('user_id', target_user_id, 'local_date', p_local_date), trim(p_reason));
  return checkin_id;
end;
$$;

revoke all on function public.admin_set_protected_day(date, text) from public;
revoke all on function public.admin_remove_protected_day(uuid, text) from public;
revoke all on function public.admin_backfill_checkin(date, text, text, text) from public;
grant execute on function public.admin_set_protected_day(date, text) to authenticated;
grant execute on function public.admin_remove_protected_day(uuid, text) to authenticated;
grant execute on function public.admin_backfill_checkin(date, text, text, text) to authenticated;
