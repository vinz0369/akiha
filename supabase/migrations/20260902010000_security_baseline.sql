create type public.app_role as enum ('user', 'admin');
create type public.reward_source as enum ('admin', 'user_proposal');
create type public.reward_status as enum (
  'proposed', 'rejected', 'active', 'unlocked', 'claimed', 'archived'
);
create type public.reward_rule_type as enum ('streak_days', 'total_checkins');
create type public.reaction_kind as enum (
  'normal', 'milestone', 'late_night', 'with_photo', 'without_photo'
);
create type public.notification_kind as enum ('daily_reminder', 'encouragement');
create type public.delivery_status as enum ('pending', 'sent', 'skipped', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  role public.app_role not null default 'user',
  avatar_path text,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key check (key = 'default'),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  reminder_time time not null default '19:00',
  reminder_enabled boolean not null default true,
  protected_days_per_month smallint not null default 2
    check (protected_days_per_month between 0 and 5),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null,
  checked_in_at timestamptz not null default now(),
  mood text check (mood in ('energized', 'happy', 'okay', 'tired', 'proud')),
  note text check (note is null or char_length(note) <= 280),
  created_by uuid not null references public.profiles(id),
  source text not null check (source in ('user', 'late_checkin', 'admin_backfill')),
  correction_reason text check (
    correction_reason is null or char_length(correction_reason) between 1 and 180
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_date),
  check (source <> 'admin_backfill' or correction_reason is not null)
);

create table public.moment_assets (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  position smallint not null check (position between 0 and 2),
  full_path text not null,
  thumb_path text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  size_bytes integer not null check (size_bytes between 1 and 1048576),
  created_at timestamptz not null default now(),
  unique (checkin_id, position),
  unique (full_path),
  unique (thumb_path)
);

create table public.protected_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null,
  reason text not null check (char_length(reason) between 1 and 120),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (user_id, local_date)
);

create table public.reaction_templates (
  id uuid primary key default gen_random_uuid(),
  kind public.reaction_kind not null,
  text text not null check (char_length(text) between 1 and 180),
  asset_path text,
  milestone_value integer check (milestone_value is null or milestone_value > 0),
  weight smallint not null default 1 check (weight between 1 and 100),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'milestone' and milestone_value is not null)
    or (kind <> 'milestone' and milestone_value is null)
  )
);

create table public.reaction_deliveries (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null unique references public.checkins(id) on delete cascade,
  template_id uuid references public.reaction_templates(id) on delete restrict,
  rendered_text text not null check (char_length(rendered_text) between 1 and 180),
  rendered_asset_path text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  source public.reward_source not null,
  created_by uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 1 and 100),
  public_description text check (
    public_description is null or char_length(public_description) <= 500
  ),
  is_mystery boolean not null default false,
  rule_type public.reward_rule_type not null,
  threshold integer not null check (threshold between 1 and 10000),
  status public.reward_status not null,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  unlocked_at timestamptz,
  claimed_at timestamptz,
  rejected_reason text check (
    rejected_reason is null or char_length(rejected_reason) <= 280
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('unlocked', 'claimed') or unlocked_at is not null),
  check (status <> 'claimed' or claimed_at is not null)
);

create table public.reward_secrets (
  reward_id uuid primary key references public.rewards(id) on delete cascade,
  secret_type text not null check (secret_type in ('letter', 'message', 'image')),
  secret_text text,
  secret_asset_path text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (secret_text is not null or secret_asset_path is not null)
);

create table public.reminder_templates (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 180),
  weight smallint not null default 1 check (weight between 1 and 100),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint_hash text not null unique,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  is_active boolean not null default true,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null,
  kind public.notification_kind not null,
  message_snapshot text not null check (char_length(message_snapshot) between 1 and 180),
  status public.delivery_status not null default 'pending',
  attempt_count smallint not null default 0 check (attempt_count between 0 and 10),
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 80),
  sent_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index notification_deliveries_daily_reminder_key
  on public.notification_deliveries (recipient_id, local_date, kind)
  where kind = 'daily_reminder';

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index checkins_user_date_idx on public.checkins (user_id, local_date desc);
create index protected_days_user_date_idx on public.protected_days (user_id, local_date desc);
create index moment_assets_checkin_position_idx on public.moment_assets (checkin_id, position);
create index rewards_owner_status_created_idx on public.rewards (owner_id, status, created_at desc);
create index reaction_templates_kind_active_idx on public.reaction_templates (kind, is_active);
create index notification_deliveries_recipient_date_idx
  on public.notification_deliveries (recipient_id, local_date desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger reaction_templates_set_updated_at before update on public.reaction_templates
for each row execute function public.set_updated_at();
create trigger reminder_templates_set_updated_at before update on public.reminder_templates
for each row execute function public.set_updated_at();
create trigger rewards_set_updated_at before update on public.rewards
for each row execute function public.set_updated_at();
create trigger checkins_set_updated_at before update on public.checkins
for each row execute function public.set_updated_at();
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();
create trigger notification_deliveries_set_updated_at before update on public.notification_deliveries
for each row execute function public.set_updated_at();

create function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select public.current_role() = 'admin'::public.app_role), false)
$$;

create function public.local_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date
$$;

revoke all on function public.current_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.local_today() from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.local_today() to authenticated;

create function public.enforce_asset_owner_and_count()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  expected_owner uuid;
  current_count integer;
begin
  select user_id into expected_owner
  from public.checkins
  where id = new.checkin_id
  for update;

  if expected_owner is null or expected_owner <> new.owner_id then
    raise exception 'asset owner must match check-in owner' using errcode = '23514';
  end if;

  select count(*) into current_count
  from public.moment_assets
  where checkin_id = new.checkin_id and id <> new.id;

  if current_count >= 3 then
    raise exception 'a check-in may contain at most three assets' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger moment_assets_enforce_owner_and_count
before insert or update on public.moment_assets
for each row execute function public.enforce_asset_owner_and_count();

create function public.prevent_active_date_overlap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'checkins' then
    if exists (
      select 1 from public.protected_days
      where user_id = new.user_id and local_date = new.local_date
    ) then
      raise exception 'check-in date already has a protected day' using errcode = '23505';
    end if;
  else
    if exists (
      select 1 from public.checkins
      where user_id = new.user_id and local_date = new.local_date
    ) then
      raise exception 'protected date already has a check-in' using errcode = '23505';
    end if;
  end if;
  return new;
end;
$$;

create trigger checkins_prevent_protected_overlap
before insert or update of user_id, local_date on public.checkins
for each row execute function public.prevent_active_date_overlap();
create trigger protected_days_prevent_checkin_overlap
before insert or update of user_id, local_date on public.protected_days
for each row execute function public.prevent_active_date_overlap();

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.checkins enable row level security;
alter table public.moment_assets enable row level security;
alter table public.protected_days enable row level security;
alter table public.reaction_templates enable row level security;
alter table public.reaction_deliveries enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_secrets enable row level security;
alter table public.reminder_templates enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read_authenticated on public.profiles
for select to authenticated using ((select auth.uid()) is not null);
create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy app_settings_read_authenticated on public.app_settings
for select to authenticated using (true);
create policy app_settings_admin_update on public.app_settings
for update to authenticated using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy checkins_read_owner_or_admin on public.checkins
for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy moment_assets_read_owner_or_admin on public.moment_assets
for select to authenticated
using (owner_id = (select auth.uid()) or (select public.is_admin()));

create policy protected_days_read_owner_or_admin on public.protected_days
for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy reaction_templates_admin_all on public.reaction_templates
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy reaction_deliveries_read_owner_or_admin on public.reaction_deliveries
for select to authenticated
using (
  exists (
    select 1 from public.checkins
    where checkins.id = reaction_deliveries.checkin_id
      and (checkins.user_id = (select auth.uid()) or (select public.is_admin()))
  )
);

create policy rewards_read_owner_or_admin on public.rewards
for select to authenticated
using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy rewards_admin_all on public.rewards
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy reward_secrets_read_after_unlock on public.reward_secrets
for select to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1 from public.rewards
    where rewards.id = reward_secrets.reward_id
      and rewards.owner_id = (select auth.uid())
      and rewards.status in ('unlocked', 'claimed')
  )
);
create policy reward_secrets_admin_all on public.reward_secrets
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy reminder_templates_admin_all on public.reminder_templates
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy push_subscriptions_insert_own on public.push_subscriptions
for insert to authenticated with check (user_id = (select auth.uid()));
create policy push_subscriptions_update_own on public.push_subscriptions
for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_subscriptions_delete_own on public.push_subscriptions
for delete to authenticated using (user_id = (select auth.uid()));

create policy notification_deliveries_read_owner_or_admin on public.notification_deliveries
for select to authenticated
using (recipient_id = (select auth.uid()) or (select public.is_admin()));

create policy audit_logs_admin_read on public.audit_logs
for select to authenticated using ((select public.is_admin()));

revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_path) on public.profiles to authenticated;
revoke insert, update, delete on public.checkins from authenticated;
revoke insert, update, delete on public.moment_assets from authenticated;
revoke insert, update, delete on public.protected_days from authenticated;
revoke insert, update, delete on public.reaction_deliveries from authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'moments',
  'moments',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
), (
  'app-assets',
  'app-assets',
  true,
  1048576,
  array['image/svg+xml', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy moments_insert_own_prefix on storage.objects
for insert to authenticated
with check (
  bucket_id = 'moments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy moments_read_owner_or_admin on storage.objects
for select to authenticated
using (
  bucket_id = 'moments'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
);
create policy moments_update_owner_or_admin on storage.objects
for update to authenticated
using (
  bucket_id = 'moments'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
)
with check (
  bucket_id = 'moments'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
);
create policy moments_delete_owner_or_admin on storage.objects
for delete to authenticated
using (
  bucket_id = 'moments'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
);
