create function public.get_calendar_month(p_year integer, p_month integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_user_id uuid;
  month_start date;
  month_end date;
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
  if p_year not between 2020 and 2200 or p_month not between 1 and 12 then
    raise exception 'invalid calendar month' using errcode = '22023';
  end if;

  month_start := make_date(p_year, p_month, 1);
  month_end := (month_start + interval '1 month')::date;

  with checkin_days as (
    select
      checkin.id,
      checkin.local_date,
      checkin.mood,
      checkin.note,
      count(asset.id)::integer as photo_count,
      min(asset.thumb_path) filter (where asset.position = 0) as thumb_path
    from public.checkins checkin
    left join public.moment_assets asset on asset.checkin_id = checkin.id
    where checkin.user_id = target_user_id
      and checkin.local_date >= month_start
      and checkin.local_date < month_end
    group by checkin.id
  ),
  protected as (
    select local_date, reason
    from public.protected_days
    where user_id = target_user_id and local_date >= month_start and local_date < month_end
  ),
  active_dates as (
    select local_date from checkin_days
    union
    select local_date from protected
  ),
  grouped as (
    select
      local_date,
      local_date - (row_number() over (order by local_date))::integer as run_key
    from active_dates
  ),
  monthly_runs as (
    select count(*)::integer as length from grouped group by run_key
  )
  select jsonb_build_object(
    'year', p_year,
    'month', p_month,
    'days', coalesce((
      select jsonb_agg(day order by day->>'local_date')
      from (
        select jsonb_build_object(
          'local_date', checkin_days.local_date,
          'state', 'checkin',
          'mood', checkin_days.mood,
          'note', checkin_days.note,
          'photo_count', checkin_days.photo_count,
          'thumb_path', checkin_days.thumb_path,
          'protected_reason', null
        ) as day
        from checkin_days
        union all
        select jsonb_build_object(
          'local_date', protected.local_date,
          'state', 'protected',
          'mood', null,
          'note', null,
          'photo_count', 0,
          'thumb_path', null,
          'protected_reason', protected.reason
        ) as day
        from protected
      ) calendar_days
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'workouts', (select count(*) from checkin_days),
      'memories', (select count(*) from checkin_days where photo_count > 0),
      'longest_streak', coalesce((select max(length) from monthly_runs), 0),
      'rewards_unlocked', (
        select count(*) from public.rewards reward
        where reward.owner_id = target_user_id
          and reward.unlocked_at >= month_start::timestamp at time zone 'Asia/Ho_Chi_Minh'
          and reward.unlocked_at < month_end::timestamp at time zone 'Asia/Ho_Chi_Minh'
      )
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_calendar_month(integer, integer) from public;
grant execute on function public.get_calendar_month(integer, integer) to authenticated;

create function public.get_moment(p_local_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_user_id uuid;
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

  select jsonb_build_object(
    'id', checkin.id,
    'local_date', checkin.local_date,
    'mood', checkin.mood,
    'note', checkin.note,
    'source', checkin.source,
    'reaction', jsonb_build_object(
      'text', delivery.rendered_text,
      'asset_path', delivery.rendered_asset_path
    ),
    'assets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', asset.id,
        'position', asset.position,
        'full_path', asset.full_path,
        'width', asset.width,
        'height', asset.height
      ) order by asset.position)
      from public.moment_assets asset where asset.checkin_id = checkin.id
    ), '[]'::jsonb)
  ) into result
  from public.checkins checkin
  left join public.reaction_deliveries delivery on delivery.checkin_id = checkin.id
  where checkin.user_id = target_user_id and checkin.local_date = p_local_date;

  if result is null then
    raise exception 'moment not found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

create function public.update_moment(p_checkin_id uuid, p_mood text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_mood is not null and p_mood not in ('energized', 'happy', 'okay', 'tired', 'proud') then
    raise exception 'unsupported mood' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 280 then
    raise exception 'note must be at most 280 characters' using errcode = '22023';
  end if;

  update public.checkins
  set mood = p_mood, note = nullif(trim(p_note), '')
  where id = p_checkin_id and user_id = actor_id;

  if not found then
    raise exception 'moment not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.get_moment(date) from public;
revoke all on function public.update_moment(uuid, text, text) from public;
grant execute on function public.get_moment(date) to authenticated;
grant execute on function public.update_moment(uuid, text, text) to authenticated;
