create function public.current_streak_for(p_user_id uuid, p_today date default public.local_today())
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with recursive active_dates as (
    select local_date from public.checkins where user_id = p_user_id and local_date <= p_today
    union
    select local_date from public.protected_days where user_id = p_user_id and local_date <= p_today
  ),
  anchor as (
    select case
      when exists (select 1 from active_dates where local_date = p_today) then p_today
      when exists (select 1 from active_dates where local_date = p_today - 1) then p_today - 1
      else null
    end as local_date
  ),
  streak(local_date) as (
    select local_date from anchor where local_date is not null
    union all
    select streak.local_date - 1
    from streak
    where exists (
      select 1 from active_dates where active_dates.local_date = streak.local_date - 1
    )
  )
  select count(*)::integer from streak
$$;

create function public.longest_streak_for(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with active_dates as (
    select local_date from public.checkins where user_id = p_user_id
    union
    select local_date from public.protected_days where user_id = p_user_id
  ),
  grouped as (
    select
      local_date,
      local_date - (row_number() over (order by local_date))::integer as run_key
    from active_dates
  ),
  runs as (
    select count(*)::integer as length from grouped group by run_key
  )
  select coalesce(max(length), 0)::integer from runs
$$;

revoke all on function public.current_streak_for(uuid, date) from public;
revoke all on function public.longest_streak_for(uuid) from public;

create function public.create_checkin(
  p_local_date date,
  p_mood text default null,
  p_note text default null,
  p_assets jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  today_local date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  local_clock time := (now() at time zone 'Asia/Ho_Chi_Minh')::time;
  new_checkin public.checkins%rowtype;
  existing_checkin public.checkins%rowtype;
  asset jsonb;
  asset_count integer;
  streak_value integer;
  reaction_kind_value public.reaction_kind;
  selected_template public.reaction_templates%rowtype;
  reaction_text text;
  reaction_asset text;
  unlocked_ids uuid[] := array[]::uuid[];
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if public.current_role() <> 'user'::public.app_role then
    raise exception 'only the user account can create a daily check-in' using errcode = '42501';
  end if;

  select * into existing_checkin
  from public.checkins
  where user_id = actor_id and local_date = p_local_date;

  if found then
    select rendered_text, rendered_asset_path
      into reaction_text, reaction_asset
    from public.reaction_deliveries
    where checkin_id = existing_checkin.id;

    return jsonb_build_object(
      'status', 'existing',
      'checkin_id', existing_checkin.id,
      'local_date', existing_checkin.local_date,
      'current_streak', public.current_streak_for(actor_id, today_local),
      'reaction', jsonb_build_object('text', reaction_text, 'asset_path', reaction_asset),
      'unlocked_reward_ids', '[]'::jsonb
    );
  end if;

  if p_local_date <> today_local and not (
    p_local_date = today_local - 1 and local_clock <= time '02:00:00'
  ) then
    raise exception 'check-in date is outside the allowed window' using errcode = '22023';
  end if;

  if p_mood is not null and p_mood not in ('energized', 'happy', 'okay', 'tired', 'proud') then
    raise exception 'unsupported mood' using errcode = '22023';
  end if;

  if p_note is not null and char_length(p_note) > 280 then
    raise exception 'note must be at most 280 characters' using errcode = '22023';
  end if;

  if jsonb_typeof(p_assets) <> 'array' then
    raise exception 'assets must be an array' using errcode = '22023';
  end if;

  asset_count := jsonb_array_length(p_assets);
  if asset_count > 3 then
    raise exception 'a check-in may contain at most three assets' using errcode = '22023';
  end if;

  for asset in select value from jsonb_array_elements(p_assets)
  loop
    if (asset->>'position')::integer not between 0 and 2
      or asset->>'full_path' is null
      or asset->>'thumb_path' is null
      or asset->>'mime_type' not in ('image/jpeg', 'image/png', 'image/webp')
      or (asset->>'width')::integer <= 0
      or (asset->>'height')::integer <= 0
      or (asset->>'size_bytes')::integer not between 1 and 1048576
      or asset->>'full_path' not like actor_id::text || '/' || p_local_date::text || '/%/full.%'
      or asset->>'thumb_path' not like actor_id::text || '/' || p_local_date::text || '/%/thumb.%'
    then
      raise exception 'invalid asset metadata or owner path' using errcode = '22023';
    end if;
  end loop;

  begin
    insert into public.checkins (
      user_id,
      local_date,
      checked_in_at,
      mood,
      note,
      created_by,
      source
    )
    values (
      actor_id,
      p_local_date,
      now(),
      p_mood,
      nullif(trim(p_note), ''),
      actor_id,
      case when p_local_date = today_local then 'user' else 'late_checkin' end
    )
    returning * into new_checkin;
  exception when unique_violation then
    select * into existing_checkin
    from public.checkins
    where user_id = actor_id and local_date = p_local_date;

    if not found then
      raise;
    end if;

    return jsonb_build_object(
      'status', 'existing',
      'checkin_id', existing_checkin.id,
      'local_date', existing_checkin.local_date,
      'current_streak', public.current_streak_for(actor_id, today_local),
      'reaction', (
        select jsonb_build_object('text', rendered_text, 'asset_path', rendered_asset_path)
        from public.reaction_deliveries where checkin_id = existing_checkin.id
      ),
      'unlocked_reward_ids', '[]'::jsonb
    );
  end;

  for asset in select value from jsonb_array_elements(p_assets)
  loop
    insert into public.moment_assets (
      checkin_id,
      owner_id,
      position,
      full_path,
      thumb_path,
      mime_type,
      width,
      height,
      size_bytes
    )
    values (
      new_checkin.id,
      actor_id,
      (asset->>'position')::smallint,
      asset->>'full_path',
      asset->>'thumb_path',
      asset->>'mime_type',
      (asset->>'width')::integer,
      (asset->>'height')::integer,
      (asset->>'size_bytes')::integer
    );
  end loop;

  streak_value := public.current_streak_for(actor_id, today_local);

  if exists (
    select 1 from public.reaction_templates
    where kind = 'milestone' and milestone_value = streak_value and is_active
  ) then
    reaction_kind_value := 'milestone';
  elsif local_clock >= time '22:30:00' then
    reaction_kind_value := 'late_night';
  elsif asset_count > 0 then
    reaction_kind_value := 'with_photo';
  else
    reaction_kind_value := 'without_photo';
  end if;

  with recent as (
    select template_id
    from public.reaction_deliveries deliveries
    join public.checkins recent_checkin on recent_checkin.id = deliveries.checkin_id
    where recent_checkin.user_id = actor_id and deliveries.template_id is not null
    order by deliveries.created_at desc
    limit 3
  ),
  pool as (
    select templates.*
    from public.reaction_templates templates
    where templates.is_active
      and templates.kind = reaction_kind_value
      and (
        reaction_kind_value <> 'milestone'
        or templates.milestone_value = streak_value
      )
  ),
  preferred as (
    select pool.* from pool where pool.id not in (select template_id from recent)
  ),
  candidates as (
    select * from preferred
    union all
    select * from pool where not exists (select 1 from preferred)
  )
  select * into selected_template
  from candidates
  order by power(random(), 1.0 / weight::double precision) desc
  limit 1;

  if selected_template.id is null and reaction_kind_value <> 'normal' then
    with recent as (
      select template_id
      from public.reaction_deliveries deliveries
      join public.checkins recent_checkin on recent_checkin.id = deliveries.checkin_id
      where recent_checkin.user_id = actor_id and deliveries.template_id is not null
      order by deliveries.created_at desc
      limit 3
    ),
    pool as (
      select templates.* from public.reaction_templates templates
      where templates.is_active and templates.kind = 'normal'
    ),
    preferred as (
      select pool.* from pool where pool.id not in (select template_id from recent)
    ),
    candidates as (
      select * from preferred
      union all
      select * from pool where not exists (select 1 from preferred)
    )
    select * into selected_template
    from candidates
    order by power(random(), 1.0 / weight::double precision) desc
    limit 1;
  end if;

  reaction_text := coalesce(selected_template.text, 'You showed up ♡');
  reaction_asset := selected_template.asset_path;

  insert into public.reaction_deliveries (
    checkin_id,
    template_id,
    rendered_text,
    rendered_asset_path,
    context
  ) values (
    new_checkin.id,
    selected_template.id,
    reaction_text,
    reaction_asset,
    jsonb_build_object(
      'streak', streak_value,
      'with_photo', asset_count > 0,
      'late_night', local_clock >= time '22:30:00',
      'pool', reaction_kind_value
    )
  );

  with metrics as (
    select
      streak_value as current_streak,
      (select count(*)::integer from public.checkins where user_id = actor_id) as total_checkins
  ),
  newly_unlocked as (
    update public.rewards reward
    set status = 'unlocked', unlocked_at = coalesce(unlocked_at, now())
    from metrics
    where reward.owner_id = actor_id
      and reward.status = 'active'
      and (
        (reward.rule_type = 'streak_days' and metrics.current_streak >= reward.threshold)
        or (reward.rule_type = 'total_checkins' and metrics.total_checkins >= reward.threshold)
      )
    returning reward.id
  )
  select coalesce(array_agg(id), array[]::uuid[]) into unlocked_ids from newly_unlocked;

  return jsonb_build_object(
    'status', 'created',
    'checkin_id', new_checkin.id,
    'local_date', new_checkin.local_date,
    'current_streak', streak_value,
    'reaction', jsonb_build_object('text', reaction_text, 'asset_path', reaction_asset),
    'unlocked_reward_ids', to_jsonb(unlocked_ids)
  );
end;
$$;

revoke all on function public.create_checkin(date, text, text, jsonb) from public;
grant execute on function public.create_checkin(date, text, text, jsonb) to authenticated;

create function public.get_home_state(p_local_date date default public.local_today())
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_user_id uuid;
  today_local date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  result jsonb;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if public.is_admin() then
    select id into target_user_id from public.profiles where role = 'user' order by created_at limit 1;
  else
    target_user_id := actor_id;
  end if;

  if p_local_date <> today_local then
    raise exception 'home date must match the server local date' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'today', today_local,
    'display_name', profile.display_name,
    'current_streak', public.current_streak_for(target_user_id, today_local),
    'longest_streak', public.longest_streak_for(target_user_id),
    'checkin', case when checkin.id is null then null else jsonb_build_object(
      'id', checkin.id,
      'local_date', checkin.local_date,
      'mood', checkin.mood,
      'note', checkin.note,
      'reaction', jsonb_build_object(
        'text', delivery.rendered_text,
        'asset_path', delivery.rendered_asset_path
      )
    ) end,
    'next_rewards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', reward.id,
        'title', reward.title,
        'rule_type', reward.rule_type,
        'threshold', reward.threshold,
        'progress', case
          when reward.rule_type = 'streak_days' then public.current_streak_for(target_user_id, today_local)
          else (select count(*)::integer from public.checkins where user_id = target_user_id)
        end
      ) order by reward.threshold)
      from public.rewards reward
      where reward.owner_id = target_user_id and reward.status = 'active'
    ), '[]'::jsonb)
  ) into result
  from public.profiles profile
  left join public.checkins checkin
    on checkin.user_id = profile.id and checkin.local_date = today_local
  left join public.reaction_deliveries delivery on delivery.checkin_id = checkin.id
  where profile.id = target_user_id;

  return result;
end;
$$;

revoke all on function public.get_home_state(date) from public;
grant execute on function public.get_home_state(date) to authenticated;
