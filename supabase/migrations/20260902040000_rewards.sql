create function public.reward_progress(p_owner_id uuid, p_rule_type public.reward_rule_type)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_rule_type = 'streak_days' then public.current_streak_for(p_owner_id, public.local_today())
    else (select count(*)::integer from public.checkins where user_id = p_owner_id)
  end
$$;

revoke all on function public.reward_progress(uuid, public.reward_rule_type) from public;

create function public.propose_reward(p_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  reward_id uuid;
  title_value text := trim(p_input->>'title');
  description_value text := nullif(trim(p_input->>'public_description'), '');
  rule_value public.reward_rule_type;
  threshold_value integer;
begin
  if actor_id is null or public.current_role() <> 'user' then
    raise exception 'only the user can propose a reward' using errcode = '42501';
  end if;
  rule_value := (p_input->>'rule_type')::public.reward_rule_type;
  threshold_value := (p_input->>'threshold')::integer;
  if char_length(title_value) not between 1 and 100
    or (description_value is not null and char_length(description_value) > 500)
    or threshold_value not between 1 and 10000 then
    raise exception 'invalid reward proposal' using errcode = '22023';
  end if;

  insert into public.rewards (
    owner_id, source, created_by, title, public_description,
    is_mystery, rule_type, threshold, status
  ) values (
    actor_id, 'user_proposal', actor_id, title_value, description_value,
    false, rule_value, threshold_value, 'proposed'
  ) returning id into reward_id;
  return reward_id;
end;
$$;

create function public.get_reward_state()
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', reward.id,
    'source', reward.source,
    'title', reward.title,
    'public_description', reward.public_description,
    'is_mystery', reward.is_mystery,
    'rule_type', reward.rule_type,
    'threshold', reward.threshold,
    'progress', public.reward_progress(target_user_id, reward.rule_type),
    'status', reward.status,
    'rejected_reason', reward.rejected_reason,
    'unlocked_at', reward.unlocked_at,
    'claimed_at', reward.claimed_at,
    'secret', case
      when public.is_admin() or reward.status in ('unlocked', 'claimed') then (
        select jsonb_build_object(
          'type', secret.secret_type,
          'text', secret.secret_text,
          'asset_path', secret.secret_asset_path
        ) from public.reward_secrets secret where secret.reward_id = reward.id
      )
      else null
    end
  ) order by reward.created_at desc), '[]'::jsonb) into result
  from public.rewards reward
  where reward.owner_id = target_user_id and reward.status <> 'archived';

  return result;
end;
$$;

create function public.admin_create_reward(p_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_user_id uuid;
  reward_id uuid;
  rule_value public.reward_rule_type;
  threshold_value integer;
  title_value text := trim(p_input->>'title');
  status_value public.reward_status := coalesce((p_input->>'status')::public.reward_status, 'active');
  secret_text_value text := nullif(p_input->>'secret_text', '');
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'admin required' using errcode = '42501';
  end if;
  select id into target_user_id from public.profiles where role = 'user' order by created_at limit 1;
  rule_value := (p_input->>'rule_type')::public.reward_rule_type;
  threshold_value := (p_input->>'threshold')::integer;

  if target_user_id is null or char_length(title_value) not between 1 and 100
    or threshold_value not between 1 and 10000 or status_value <> 'active' then
    raise exception 'invalid reward' using errcode = '22023';
  end if;

  insert into public.rewards (
    owner_id, source, created_by, title, public_description, is_mystery,
    rule_type, threshold, status, approved_by, approved_at
  ) values (
    target_user_id, 'admin', actor_id, title_value, nullif(trim(p_input->>'public_description'), ''),
    coalesce((p_input->>'is_mystery')::boolean, false), rule_value, threshold_value,
    'active', actor_id, now()
  ) returning id into reward_id;

  if secret_text_value is not null then
    insert into public.reward_secrets (reward_id, secret_type, secret_text, created_by)
    values (reward_id, coalesce(p_input->>'secret_type', 'message'), secret_text_value, actor_id);
  end if;

  if public.reward_progress(target_user_id, rule_value) >= threshold_value then
    update public.rewards set status = 'unlocked', unlocked_at = now() where id = reward_id;
  end if;
  return reward_id;
end;
$$;

create function public.admin_review_reward(p_reward_id uuid, p_decision text, p_edits jsonb default '{}'::jsonb)
returns public.reward_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  reward public.rewards%rowtype;
  next_status public.reward_status;
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'admin required' using errcode = '42501';
  end if;
  select * into reward from public.rewards where id = p_reward_id for update;
  if reward.id is null or reward.status <> 'proposed' then
    raise exception 'reward is not pending review' using errcode = '22023';
  end if;

  if p_decision = 'reject' then
    update public.rewards set
      status = 'rejected',
      rejected_reason = nullif(trim(p_edits->>'rejected_reason'), '')
    where id = p_reward_id;
    return 'rejected';
  elsif p_decision <> 'approve' then
    raise exception 'decision must be approve or reject' using errcode = '22023';
  end if;

  update public.rewards set
    title = coalesce(nullif(trim(p_edits->>'title'), ''), title),
    public_description = coalesce(p_edits->>'public_description', public_description),
    threshold = coalesce((p_edits->>'threshold')::integer, threshold),
    rule_type = coalesce((p_edits->>'rule_type')::public.reward_rule_type, rule_type),
    status = 'active',
    approved_by = actor_id,
    approved_at = now()
  where id = p_reward_id
  returning * into reward;

  if public.reward_progress(reward.owner_id, reward.rule_type) >= reward.threshold then
    update public.rewards set status = 'unlocked', unlocked_at = coalesce(unlocked_at, now())
    where id = p_reward_id returning status into next_status;
  else
    next_status := 'active';
  end if;
  return next_status;
end;
$$;

create function public.admin_claim_reward(p_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'admin required' using errcode = '42501';
  end if;
  update public.rewards set status = 'claimed', claimed_at = coalesce(claimed_at, now())
  where id = p_reward_id and status in ('unlocked', 'claimed');
  if not found then raise exception 'reward is not unlocked' using errcode = '22023'; end if;
end;
$$;

revoke all on function public.propose_reward(jsonb) from public;
revoke all on function public.get_reward_state() from public;
revoke all on function public.admin_create_reward(jsonb) from public;
revoke all on function public.admin_review_reward(uuid, text, jsonb) from public;
revoke all on function public.admin_claim_reward(uuid) from public;
grant execute on function public.propose_reward(jsonb) to authenticated;
grant execute on function public.get_reward_state() to authenticated;
grant execute on function public.admin_create_reward(jsonb) to authenticated;
grant execute on function public.admin_review_reward(uuid, text, jsonb) to authenticated;
grant execute on function public.admin_claim_reward(uuid) to authenticated;
