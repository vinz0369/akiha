-- Turn the original one-way fitness check-in model into a private, symmetric
-- photo diary for the two members of a couple. Existing check-ins and assets
-- are kept in place and become legacy moments.

-- A database-side snapshot avoids depending on local Docker/pg_dump and keeps
-- the rollback source outside the API-exposed public schema. Photo objects are
-- not moved or overwritten by this migration.
create schema if not exists akiha_archive;
create table akiha_archive.profiles_20260908 as table public.profiles;
create table akiha_archive.checkins_20260908 as table public.checkins;
create table akiha_archive.moment_assets_20260908 as table public.moment_assets;
create table akiha_archive.moment_messages_20260908 as table public.moment_messages;

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

insert into public.couples (id, name, timezone)
values ('00000000-0000-4000-8000-000000000100', 'Thu & Vinh', 'Asia/Ho_Chi_Minh')
on conflict (id) do nothing;

insert into public.couple_members (couple_id, user_id)
select '00000000-0000-4000-8000-000000000100', id
from public.profiles
on conflict (user_id) do nothing;

alter table public.checkins
  add column couple_id uuid references public.couples(id),
  add column client_request_id uuid;

update public.checkins
set couple_id = '00000000-0000-4000-8000-000000000100'
where couple_id is null;

alter table public.checkins alter column couple_id set not null;
alter table public.checkins drop constraint if exists checkins_user_id_local_date_key;
create unique index checkins_user_request_key
  on public.checkins (user_id, client_request_id)
  where client_request_id is not null;
create index checkins_couple_date_time_idx
  on public.checkins (couple_id, local_date desc, checked_in_at desc);

create table public.moment_reactions (
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('heart', 'hug', 'laugh')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (checkin_id, author_id)
);

create table public.moment_replies (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(trim(text)) between 1 and 280),
  created_at timestamptz not null default now()
);

create table public.moment_reads (
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (checkin_id, user_id)
);

create index moment_replies_checkin_created_idx
  on public.moment_replies (checkin_id, created_at);
create index moment_reads_user_seen_idx
  on public.moment_reads (user_id, seen_at desc);

create trigger moment_reactions_set_updated_at before update on public.moment_reactions
for each row execute function public.set_updated_at();

-- Preserve old private notes as replies from their original author.
insert into public.moment_replies (checkin_id, author_id, text, created_at)
select checkin_id, author_id, text, created_at
from public.moment_messages
where exists (select 1 from public.checkins c where c.id = moment_messages.checkin_id);

create function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select couple_id
  from public.couple_members
  where user_id = (select auth.uid())
  limit 1
$$;

create function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = p_couple_id and user_id = (select auth.uid())
  )
$$;

revoke all on function public.current_couple_id() from public;
revoke all on function public.is_couple_member(uuid) from public;
grant execute on function public.current_couple_id() to authenticated;
grant execute on function public.is_couple_member(uuid) to authenticated;

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.moment_reactions enable row level security;
alter table public.moment_replies enable row level security;
alter table public.moment_reads enable row level security;

create policy couples_read_members on public.couples
for select to authenticated using ((select public.is_couple_member(id)));
create policy couple_members_read_same_couple on public.couple_members
for select to authenticated using (couple_id = (select public.current_couple_id()));

drop policy if exists checkins_read_owner_or_admin on public.checkins;
create policy checkins_read_couple on public.checkins
for select to authenticated using ((select public.is_couple_member(couple_id)));

drop policy if exists moment_assets_read_owner_or_admin on public.moment_assets;
create policy moment_assets_read_couple on public.moment_assets
for select to authenticated using (
  exists (
    select 1 from public.checkins c
    where c.id = moment_assets.checkin_id
      and (select public.is_couple_member(c.couple_id))
  )
);

create policy moment_reactions_read_couple on public.moment_reactions
for select to authenticated using (
  exists (
    select 1 from public.checkins c
    where c.id = moment_reactions.checkin_id
      and (select public.is_couple_member(c.couple_id))
  )
);
create policy moment_replies_read_couple on public.moment_replies
for select to authenticated using (
  exists (
    select 1 from public.checkins c
    where c.id = moment_replies.checkin_id
      and (select public.is_couple_member(c.couple_id))
  )
);
create policy moment_reads_read_couple on public.moment_reads
for select to authenticated using (
  exists (
    select 1 from public.checkins c
    where c.id = moment_reads.checkin_id
      and (select public.is_couple_member(c.couple_id))
  )
);

grant select on public.couples, public.couple_members, public.moment_reactions,
  public.moment_replies, public.moment_reads to authenticated;
revoke insert, update, delete on public.couples, public.couple_members,
  public.moment_reactions, public.moment_replies, public.moment_reads from authenticated;

drop policy if exists moments_read_owner_or_admin on storage.objects;
drop policy if exists moments_update_owner_or_admin on storage.objects;
drop policy if exists moments_delete_owner_or_admin on storage.objects;

create policy moments_read_couple on storage.objects
for select to authenticated using (
  bucket_id = 'moments' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.moment_assets asset
      join public.checkins c on c.id = asset.checkin_id
      where (asset.full_path = name or asset.thumb_path = name)
        and (select public.is_couple_member(c.couple_id))
    )
  )
);

create policy moments_update_own on storage.objects
for update to authenticated
using (bucket_id = 'moments' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'moments' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy moments_delete_own on storage.objects
for delete to authenticated
using (bucket_id = 'moments' and (storage.foldername(name))[1] = (select auth.uid())::text);

create function public.create_couple_moment(
  p_local_date date,
  p_caption text,
  p_asset jsonb,
  p_client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_couple_id uuid;
  couple_timezone text;
  today_local date;
  existing_id uuid;
  new_id uuid;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select cm.couple_id, c.timezone into actor_couple_id, couple_timezone
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  where cm.user_id = actor_id;

  if actor_couple_id is null then
    raise exception 'couple membership required' using errcode = '42501';
  end if;

  today_local := (now() at time zone couple_timezone)::date;
  if p_local_date <> today_local then
    raise exception 'a moment must be captured today' using errcode = '22023';
  end if;
  if p_caption is not null and char_length(trim(p_caption)) > 280 then
    raise exception 'caption must be at most 280 characters' using errcode = '22023';
  end if;
  if p_client_request_id is null then
    raise exception 'client request id is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_asset) <> 'object'
    or p_asset->>'full_path' is null
    or p_asset->>'thumb_path' is null
    or p_asset->>'mime_type' not in ('image/jpeg', 'image/webp')
    or (p_asset->>'width')::integer <= 0
    or (p_asset->>'height')::integer <= 0
    or (p_asset->>'size_bytes')::integer not between 1 and 1048576
    or p_asset->>'full_path' not like actor_id::text || '/' || p_local_date::text || '/' || p_client_request_id::text || '/full.%'
    or p_asset->>'thumb_path' not like actor_id::text || '/' || p_local_date::text || '/' || p_client_request_id::text || '/thumb.%'
  then
    raise exception 'invalid photo metadata or owner path' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor_id::text || ':' || p_client_request_id::text, 0));
  select id into existing_id
  from public.checkins
  where user_id = actor_id and client_request_id = p_client_request_id;
  if existing_id is not null then
    return jsonb_build_object('status', 'existing', 'moment_id', existing_id, 'local_date', p_local_date);
  end if;

  if (select count(*) from public.checkins where user_id = actor_id and local_date = today_local) >= 20 then
    raise exception 'daily moment limit reached' using errcode = '22023';
  end if;

  insert into public.checkins (
    user_id, couple_id, local_date, checked_in_at, mood, note,
    created_by, source, client_request_id
  ) values (
    actor_id, actor_couple_id, today_local, now(), null,
    nullif(trim(coalesce(p_caption, '')), ''), actor_id, 'user', p_client_request_id
  ) returning id into new_id;

  insert into public.moment_assets (
    checkin_id, owner_id, position, full_path, thumb_path,
    mime_type, width, height, size_bytes
  ) values (
    new_id, actor_id, 0, p_asset->>'full_path', p_asset->>'thumb_path',
    p_asset->>'mime_type', (p_asset->>'width')::integer,
    (p_asset->>'height')::integer, (p_asset->>'size_bytes')::integer
  );

  return jsonb_build_object('status', 'created', 'moment_id', new_id, 'local_date', today_local);
end;
$$;

create function public.get_couple_home()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_couple_id uuid;
  couple_timezone text;
  today_local date;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select cm.couple_id, c.timezone into actor_couple_id, couple_timezone
  from public.couple_members cm join public.couples c on c.id = cm.couple_id
  where cm.user_id = actor_id;
  if actor_couple_id is null then raise exception 'couple membership required' using errcode = '42501'; end if;
  today_local := (now() at time zone couple_timezone)::date;

  return jsonb_build_object(
    'today', today_local,
    'couple_id', actor_couple_id,
    'viewer_id', actor_id,
    'viewer_name', (select display_name from public.profiles where id = actor_id),
    'partner_name', coalesce((
      select p.display_name from public.couple_members cm
      join public.profiles p on p.id = cm.user_id
      where cm.couple_id = actor_couple_id and cm.user_id <> actor_id
      order by cm.joined_at limit 1
    ), 'người thương'),
    'unseen_count', (
      select count(*) from public.checkins m
      where m.couple_id = actor_couple_id and m.local_date = today_local
        and m.user_id <> actor_id
        and not exists (
          select 1 from public.moment_reads r
          where r.checkin_id = m.id and r.user_id = actor_id
        )
    ),
    'moments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'author_id', m.user_id,
        'author_name', p.display_name,
        'local_date', m.local_date,
        'captured_at', m.checked_in_at,
        'caption', m.note,
        'full_path', a.full_path,
        'thumb_path', a.thumb_path,
        'width', a.width,
        'height', a.height,
        'seen_by_partner', exists (
          select 1 from public.moment_reads r
          where r.checkin_id = m.id and r.user_id <> m.user_id
        ),
        'viewer_reaction', (
          select kind from public.moment_reactions reaction
          where reaction.checkin_id = m.id and reaction.author_id = actor_id
        ),
        'reply_count', (select count(*) from public.moment_replies reply where reply.checkin_id = m.id)
      ) order by m.checked_in_at desc)
      from public.checkins m
      join public.profiles p on p.id = m.user_id
      left join lateral (
        select full_path, thumb_path, width, height
        from public.moment_assets where checkin_id = m.id
        order by position limit 1
      ) a on true
      where m.couple_id = actor_couple_id and m.local_date = today_local
    ), '[]'::jsonb)
  );
end;
$$;

create function public.get_couple_calendar(p_year integer, p_month integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_couple_id uuid;
  month_start date;
  month_end date;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_year not between 2020 and 2200 or p_month not between 1 and 12 then
    raise exception 'invalid calendar month' using errcode = '22023';
  end if;
  actor_couple_id := public.current_couple_id();
  if actor_couple_id is null then raise exception 'couple membership required' using errcode = '42501'; end if;
  month_start := make_date(p_year, p_month, 1);
  month_end := (month_start + interval '1 month')::date;

  return jsonb_build_object(
    'year', p_year,
    'month', p_month,
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'local_date', d.local_date,
        'moment_count', d.moment_count,
        'viewer_count', d.viewer_count,
        'partner_count', d.partner_count,
        'thumb_paths', d.thumb_paths
      ) order by d.local_date)
      from (
        select
          m.local_date,
          count(*)::integer as moment_count,
          count(*) filter (where m.user_id = actor_id)::integer as viewer_count,
          count(*) filter (where m.user_id <> actor_id)::integer as partner_count,
          coalesce((
            select jsonb_agg(recent.thumb_path order by recent.checked_in_at desc)
            from (
              select a.thumb_path, m2.checked_in_at
              from public.checkins m2
              join public.moment_assets a on a.checkin_id = m2.id and a.position = 0
              where m2.couple_id = actor_couple_id and m2.local_date = m.local_date
              order by m2.checked_in_at desc
              limit 3
            ) recent
          ), '[]'::jsonb) as thumb_paths
        from public.checkins m
        where m.couple_id = actor_couple_id
          and m.local_date >= month_start and m.local_date < month_end
        group by m.local_date
      ) d
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'moments', (select count(*) from public.checkins where couple_id = actor_couple_id and local_date >= month_start and local_date < month_end),
      'days', (select count(distinct local_date) from public.checkins where couple_id = actor_couple_id and local_date >= month_start and local_date < month_end),
      'viewer_moments', (select count(*) from public.checkins where couple_id = actor_couple_id and user_id = actor_id and local_date >= month_start and local_date < month_end),
      'partner_moments', (select count(*) from public.checkins where couple_id = actor_couple_id and user_id <> actor_id and local_date >= month_start and local_date < month_end)
    )
  );
end;
$$;

create function public.get_couple_day(p_local_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); actor_couple_id uuid;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  actor_couple_id := public.current_couple_id();
  if actor_couple_id is null then raise exception 'couple membership required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'local_date', p_local_date,
    'viewer_id', actor_id,
    'moments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'author_id', m.user_id, 'author_name', p.display_name,
        'local_date', m.local_date, 'captured_at', m.checked_in_at,
        'caption', m.note, 'full_path', a.full_path, 'thumb_path', a.thumb_path,
        'width', a.width, 'height', a.height,
        'seen_by_partner', exists (select 1 from public.moment_reads r where r.checkin_id = m.id and r.user_id <> m.user_id),
        'viewer_reaction', (select kind from public.moment_reactions reaction where reaction.checkin_id = m.id and reaction.author_id = actor_id),
        'reply_count', (select count(*) from public.moment_replies reply where reply.checkin_id = m.id)
      ) order by m.checked_in_at)
      from public.checkins m
      join public.profiles p on p.id = m.user_id
      left join lateral (
        select full_path, thumb_path, width, height from public.moment_assets
        where checkin_id = m.id order by position limit 1
      ) a on true
      where m.couple_id = actor_couple_id and m.local_date = p_local_date
    ), '[]'::jsonb)
  );
end;
$$;

create function public.get_couple_moment(p_moment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); actor_couple_id uuid; result jsonb;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  actor_couple_id := public.current_couple_id();
  select jsonb_build_object(
    'id', m.id, 'author_id', m.user_id, 'author_name', p.display_name,
    'viewer_id', actor_id, 'local_date', m.local_date, 'captured_at', m.checked_in_at,
    'caption', m.note, 'full_path', a.full_path, 'width', a.width, 'height', a.height,
    'seen_by_partner', exists (select 1 from public.moment_reads r where r.checkin_id = m.id and r.user_id <> m.user_id),
    'viewer_reaction', (select kind from public.moment_reactions reaction where reaction.checkin_id = m.id and reaction.author_id = actor_id),
    'replies', coalesce((select jsonb_agg(jsonb_build_object(
      'id', reply.id, 'author_id', reply.author_id, 'author_name', rp.display_name,
      'text', reply.text, 'created_at', reply.created_at
    ) order by reply.created_at) from public.moment_replies reply join public.profiles rp on rp.id = reply.author_id where reply.checkin_id = m.id), '[]'::jsonb)
  ) into result
  from public.checkins m
  join public.profiles p on p.id = m.user_id
  left join lateral (
    select full_path, width, height from public.moment_assets
    where checkin_id = m.id order by position limit 1
  ) a on true
  where m.id = p_moment_id and m.couple_id = actor_couple_id;
  if result is null then raise exception 'moment not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

create function public.update_couple_moment_caption(p_moment_id uuid, p_caption text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_caption is not null and char_length(trim(p_caption)) > 280 then
    raise exception 'caption must be at most 280 characters' using errcode = '22023';
  end if;
  update public.checkins set note = nullif(trim(coalesce(p_caption, '')), '')
  where id = p_moment_id and user_id = auth.uid() and couple_id = public.current_couple_id();
  if not found then raise exception 'moment not found' using errcode = 'P0002'; end if;
end;
$$;

create function public.delete_couple_moment(p_moment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare paths jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(path), '[]'::jsonb) into paths
  from (
    select full_path as path from public.moment_assets where checkin_id = p_moment_id
    union all
    select thumb_path as path from public.moment_assets where checkin_id = p_moment_id
  ) asset_paths;
  delete from public.checkins
  where id = p_moment_id and user_id = auth.uid() and couple_id = public.current_couple_id();
  if not found then raise exception 'moment not found' using errcode = 'P0002'; end if;
  return jsonb_build_object('object_paths', paths);
end;
$$;

create function public.set_couple_moment_reaction(p_moment_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); owner_id uuid;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select user_id into owner_id from public.checkins
  where id = p_moment_id and couple_id = public.current_couple_id();
  if owner_id is null then raise exception 'moment not found' using errcode = 'P0002'; end if;
  if owner_id = actor_id then raise exception 'cannot react to your own moment' using errcode = '22023'; end if;
  if p_kind is null then
    delete from public.moment_reactions where checkin_id = p_moment_id and author_id = actor_id;
  elsif p_kind in ('heart', 'hug', 'laugh') then
    insert into public.moment_reactions (checkin_id, author_id, kind)
    values (p_moment_id, actor_id, p_kind)
    on conflict (checkin_id, author_id) do update set kind = excluded.kind;
  else
    raise exception 'unsupported reaction' using errcode = '22023';
  end if;
end;
$$;

create function public.add_couple_moment_reply(p_moment_id uuid, p_text text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); owner_id uuid; reply_id uuid;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_text, ''))) not between 1 and 280 then
    raise exception 'reply must be between 1 and 280 characters' using errcode = '22023';
  end if;
  select user_id into owner_id from public.checkins
  where id = p_moment_id and couple_id = public.current_couple_id();
  if owner_id is null then raise exception 'moment not found' using errcode = 'P0002'; end if;
  if owner_id = actor_id then raise exception 'cannot reply to your own moment' using errcode = '22023'; end if;
  insert into public.moment_replies (checkin_id, author_id, text)
  values (p_moment_id, actor_id, trim(p_text)) returning id into reply_id;
  return reply_id;
end;
$$;

create function public.mark_couple_moment_seen(p_moment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); owner_id uuid;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select user_id into owner_id from public.checkins
  where id = p_moment_id and couple_id = public.current_couple_id();
  if owner_id is null then raise exception 'moment not found' using errcode = 'P0002'; end if;
  if owner_id <> actor_id then
    insert into public.moment_reads (checkin_id, user_id)
    values (p_moment_id, actor_id)
    on conflict (checkin_id, user_id) do update set seen_at = excluded.seen_at;
  end if;
end;
$$;

revoke all on function public.create_couple_moment(date, text, jsonb, uuid) from public;
revoke all on function public.get_couple_home() from public;
revoke all on function public.get_couple_calendar(integer, integer) from public;
revoke all on function public.get_couple_day(date) from public;
revoke all on function public.get_couple_moment(uuid) from public;
revoke all on function public.update_couple_moment_caption(uuid, text) from public;
revoke all on function public.delete_couple_moment(uuid) from public;
revoke all on function public.set_couple_moment_reaction(uuid, text) from public;
revoke all on function public.add_couple_moment_reply(uuid, text) from public;
revoke all on function public.mark_couple_moment_seen(uuid) from public;

grant execute on function public.create_couple_moment(date, text, jsonb, uuid) to authenticated;
grant execute on function public.get_couple_home() to authenticated;
grant execute on function public.get_couple_calendar(integer, integer) to authenticated;
grant execute on function public.get_couple_day(date) to authenticated;
grant execute on function public.get_couple_moment(uuid) to authenticated;
grant execute on function public.update_couple_moment_caption(uuid, text) to authenticated;
grant execute on function public.delete_couple_moment(uuid) to authenticated;
grant execute on function public.set_couple_moment_reaction(uuid, text) to authenticated;
grant execute on function public.add_couple_moment_reply(uuid, text) to authenticated;
grant execute on function public.mark_couple_moment_seen(uuid) to authenticated;

-- The old admin surface is retired. Keep the functions for rollback/migration,
-- but make them inaccessible from the application role.
revoke execute on all functions in schema public from authenticated;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.local_today() to authenticated;
grant execute on function public.current_couple_id() to authenticated;
grant execute on function public.is_couple_member(uuid) to authenticated;
grant execute on function public.create_couple_moment(date, text, jsonb, uuid) to authenticated;
grant execute on function public.get_couple_home() to authenticated;
grant execute on function public.get_couple_calendar(integer, integer) to authenticated;
grant execute on function public.get_couple_day(date) to authenticated;
grant execute on function public.get_couple_moment(uuid) to authenticated;
grant execute on function public.update_couple_moment_caption(uuid, text) to authenticated;
grant execute on function public.delete_couple_moment(uuid) to authenticated;
grant execute on function public.set_couple_moment_reaction(uuid, text) to authenticated;
grant execute on function public.add_couple_moment_reply(uuid, text) to authenticated;
grant execute on function public.mark_couple_moment_seen(uuid) to authenticated;
grant execute on function public.reserve_chat_request() to authenticated;
grant execute on function public.register_push_subscription(jsonb) to authenticated;
grant execute on function public.unregister_push_subscription(text) to authenticated;
grant execute on function public.unregister_push_device(uuid) to authenticated;
grant execute on function public.get_push_devices() to authenticated;
grant execute on function public.log_data_export(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.checkins;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.moment_reactions;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.moment_replies;
exception when duplicate_object then null;
end $$;
