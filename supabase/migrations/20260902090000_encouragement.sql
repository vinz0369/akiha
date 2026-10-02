alter table public.notification_deliveries add column idempotency_key uuid;
create unique index notification_deliveries_encouragement_idempotency
on public.notification_deliveries (idempotency_key) where idempotency_key is not null;

create function public.admin_send_encouragement(p_text text, p_idempotency_key uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); recipient_id uuid; delivery_id uuid; last_created timestamptz;
begin
  if actor_id is null or not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if char_length(trim(p_text)) not between 1 and 180 then raise exception 'message must be 1-180 characters' using errcode = '22023'; end if;
  select id into delivery_id from public.notification_deliveries where idempotency_key = p_idempotency_key;
  if delivery_id is not null then return delivery_id; end if;
  if (select count(*) from public.notification_deliveries where created_by = actor_id and kind = 'encouragement' and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'encouragement limit reached for this hour' using errcode = '22023';
  end if;
  select max(created_at) into last_created from public.notification_deliveries
  where created_by = actor_id and kind = 'encouragement';
  if last_created is not null and last_created > now() - interval '30 seconds' then
    raise exception 'please wait before sending another encouragement' using errcode = '22023';
  end if;
  select id into recipient_id from public.profiles where role = 'user' order by created_at limit 1;
  insert into public.notification_deliveries (
    recipient_id, local_date, kind, message_snapshot, status, attempt_count, created_by, idempotency_key
  ) values (
    recipient_id, public.local_today(), 'encouragement', trim(p_text), 'pending', 1, actor_id, p_idempotency_key
  ) returning id into delivery_id;
  return delivery_id;
end;
$$;

revoke all on function public.admin_send_encouragement(text, uuid) from public;
grant execute on function public.admin_send_encouragement(text, uuid) to authenticated;
