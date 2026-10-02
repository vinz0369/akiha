create function public.register_push_subscription(p_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  endpoint_value text := p_input->>'endpoint';
  subscription_id uuid;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(endpoint_value) not between 20 and 4096
    or char_length(p_input->>'p256dh') not between 20 and 512
    or char_length(p_input->>'auth_key') not between 8 and 256 then
    raise exception 'invalid push subscription' using errcode = '22023';
  end if;
  insert into public.push_subscriptions (
    user_id, endpoint_hash, endpoint, p256dh, auth_key, user_agent, is_active
  ) values (
    actor_id,
    encode(extensions.digest(endpoint_value, 'sha256'), 'hex'),
    endpoint_value,
    p_input->>'p256dh',
    p_input->>'auth_key',
    left(p_input->>'user_agent', 500),
    true
  ) on conflict (endpoint_hash) do update set
    user_id = excluded.user_id,
    endpoint = excluded.endpoint,
    p256dh = excluded.p256dh,
    auth_key = excluded.auth_key,
    user_agent = excluded.user_agent,
    is_active = true
  returning id into subscription_id;
  return subscription_id;
end;
$$;

create function public.unregister_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update public.push_subscriptions set is_active = false
  where user_id = auth.uid()
    and endpoint_hash = encode(extensions.digest(p_endpoint, 'sha256'), 'hex');
end;
$$;

revoke all on function public.register_push_subscription(jsonb) from public;
revoke all on function public.unregister_push_subscription(text) from public;
grant execute on function public.register_push_subscription(jsonb) to authenticated;
grant execute on function public.unregister_push_subscription(text) to authenticated;

-- Hosted scheduling is intentionally configured after deployment because the URL/key are project-specific.
-- Store `project_url`, `publishable_key`, and `cron_secret` in Supabase Vault, then use pg_cron + pg_net
-- as documented in README.md. The delivery uniqueness index from the baseline migration is the final
-- concurrency guard for (recipient_id, local_date, daily_reminder).
