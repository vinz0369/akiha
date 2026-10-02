create extension if not exists pg_net with schema extensions;

create function public.queue_couple_moment_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author_name text;
  authorization_header text;
begin
  select display_name into author_name from public.profiles where id = new.user_id;

  begin
    insert into public.notification_deliveries (
      recipient_id, local_date, kind, message_snapshot, status,
      attempt_count, created_by, idempotency_key
    )
    select
      member.user_id,
      new.local_date,
      'moment',
      left(coalesce(author_name, 'Người thương') || ' vừa gửi một khoảnh khắc.', 180),
      'pending',
      0,
      new.user_id,
      new.id
    from public.couple_members member
    where member.couple_id = new.couple_id
      and member.user_id <> new.user_id
    on conflict (idempotency_key) where idempotency_key is not null do nothing;
  exception when others then
    null;
  end;

  authorization_header := coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'authorization',
    ''
  );
  if authorization_header like 'Bearer %' then
    begin
      perform net.http_post(
        url := 'https://wlyiodorbcivozestiba.supabase.co/functions/v1/send-moment-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', authorization_header
        ),
        body := jsonb_build_object('moment_id', new.id),
        timeout_milliseconds := 10000
      );
    exception when others then
      null;
    end;
  end if;

  return new;
end;
$$;

create trigger checkins_queue_moment_notification
after insert on public.checkins
for each row
when (new.source = 'user' and new.client_request_id is not null)
execute function public.queue_couple_moment_notification();

revoke all on function public.queue_couple_moment_notification() from public;
