-- Run after `npx supabase db reset`.
begin;

do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'EXECUTE')
  ) then
    raise exception 'anonymous can execute a SECURITY DEFINER function';
  end if;
end;
$$;

delete from public.protected_days where local_date = public.local_today();
delete from public.checkins where local_date = public.local_today();

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select public.create_couple_moment(
  public.local_today(), 'first',
  jsonb_build_object(
    'full_path', '00000000-0000-4000-8000-000000000001/' || public.local_today() || '/00000000-0000-4000-8000-000000000091/full.webp',
    'thumb_path', '00000000-0000-4000-8000-000000000001/' || public.local_today() || '/00000000-0000-4000-8000-000000000091/thumb.webp',
    'mime_type', 'image/webp', 'width', 10, 'height', 10, 'size_bytes', 10
  ),
  '00000000-0000-4000-8000-000000000091'
);
select public.create_couple_moment(
  public.local_today(), 'second',
  jsonb_build_object(
    'full_path', '00000000-0000-4000-8000-000000000001/' || public.local_today() || '/00000000-0000-4000-8000-000000000092/full.webp',
    'thumb_path', '00000000-0000-4000-8000-000000000001/' || public.local_today() || '/00000000-0000-4000-8000-000000000092/thumb.webp',
    'mime_type', 'image/webp', 'width', 10, 'height', 10, 'size_bytes', 10
  ),
  '00000000-0000-4000-8000-000000000092'
);

do $$
begin
  if jsonb_array_length(public.get_couple_home()->'moments') <> 2 then
    raise exception 'author cannot create and read multiple moments in one day';
  end if;
  begin
    perform public.admin_get_overview();
    raise exception 'retired admin RPC is still executable';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare first_id uuid;
begin
  if jsonb_array_length(public.get_couple_home()->'moments') <> 2 then
    raise exception 'partner cannot read shared moments';
  end if;
  select id into first_id from public.checkins where local_date = public.local_today() order by checked_in_at limit 1;
  perform public.set_couple_moment_reaction(first_id, 'heart');
  perform public.add_couple_moment_reply(first_id, 'seen');
  perform public.mark_couple_moment_seen(first_id);
  begin
    perform public.update_couple_moment_caption(first_id, 'forbidden');
    raise exception 'partner edited an author moment';
  exception when no_data_found then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000099', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
do $$
begin
  if exists (select 1 from public.checkins) then
    raise exception 'outsider can read couple moments';
  end if;
  begin
    perform public.get_couple_home();
    raise exception 'outsider opened couple home';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
