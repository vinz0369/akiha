create function public.get_in_app_reminder()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_user_id uuid;
  settings public.app_settings%rowtype;
  local_date_value date := public.local_today();
  local_time_value time := (now() at time zone 'Asia/Ho_Chi_Minh')::time;
  message_value text;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if public.is_admin() then
    select id into target_user_id from public.profiles where role = 'user' order by created_at limit 1;
  else
    target_user_id := actor_id;
  end if;
  select * into settings from public.app_settings where key = 'default';
  select text into message_value from public.reminder_templates
  where is_active order by created_at, id limit 1;
  return jsonb_build_object(
    'eligible', coalesce(settings.reminder_enabled, true)
      and local_time_value >= coalesce(settings.reminder_time, time '19:00')
      and not exists (select 1 from public.checkins where user_id = target_user_id and local_date = local_date_value),
    'message', coalesce(message_value, '10 minutes still counts. Just show up ♡')
  );
end;
$$;

revoke all on function public.get_in_app_reminder() from public;
grant execute on function public.get_in_app_reminder() to authenticated;
