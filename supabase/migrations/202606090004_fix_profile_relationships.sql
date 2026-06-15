-- Fix PostgREST relationships between operational records and public.profiles.
-- Safe to run after 202606090003_team_roles_permissions.sql.

alter table public.client_team_assignments
  add column if not exists client_id uuid,
  add column if not exists user_id uuid,
  add column if not exists assigned_by uuid;

-- Stop before changing constraints if required assignment rows are incomplete or
-- reference an auth user/client without a corresponding public record.
do $$
begin
  if exists (select 1 from public.client_team_assignments where client_id is null or user_id is null) then
    raise exception 'client_team_assignments contains rows without client_id or user_id; repair them before applying this migration';
  end if;
  if exists (
    select 1 from public.client_team_assignments assignment
    left join public.clients client on client.id = assignment.client_id
    where client.id is null
  ) then
    raise exception 'client_team_assignments contains a client_id that does not exist in public.clients';
  end if;
  if exists (
    select 1 from public.client_team_assignments assignment
    left join public.profiles profile on profile.id = assignment.user_id
    where profile.id is null
  ) then
    raise exception 'client_team_assignments contains a user_id without a matching public.profiles row';
  end if;
  if exists (
    select 1 from public.client_team_assignments assignment
    left join public.profiles profile on profile.id = assignment.assigned_by
    where assignment.assigned_by is not null and profile.id is null
  ) then
    raise exception 'client_team_assignments contains an assigned_by without a matching public.profiles row';
  end if;
end $$;

alter table public.client_team_assignments
  alter column client_id set not null,
  alter column user_id set not null,
  alter column assigned_by set default auth.uid();

-- Remove any previous FK attached to these columns, regardless of its generated
-- name or whether it points to auth.users/public.profiles.
do $$
declare constraint_name text;
begin
  for constraint_name in
    select distinct constraint_row.conname
    from pg_constraint constraint_row
    join pg_class table_row on table_row.oid = constraint_row.conrelid
    join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
    join unnest(constraint_row.conkey) column_number(attnum) on true
    join pg_attribute column_row on column_row.attrelid = table_row.oid and column_row.attnum = column_number.attnum
    where constraint_row.contype = 'f'
      and schema_row.nspname = 'public'
      and table_row.relname = 'client_team_assignments'
      and column_row.attname in ('client_id','user_id','assigned_by')
  loop
    execute format('alter table public.client_team_assignments drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.client_team_assignments
  add constraint client_team_assignments_client_id_fkey
    foreign key (client_id) references public.clients(id) on delete cascade not valid,
  add constraint client_team_assignments_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade not valid,
  add constraint client_team_assignments_assigned_by_fkey
    foreign key (assigned_by) references public.profiles(id) on delete set null not valid;

alter table public.client_team_assignments
  validate constraint client_team_assignments_client_id_fkey,
  validate constraint client_team_assignments_user_id_fkey,
  validate constraint client_team_assignments_assigned_by_fkey;

-- Normalize other profile embeds already used by the admin UI. Stable names make
-- PostgREST relationship hints deterministic.
do $$
declare relationship record;
begin
  for relationship in
    select distinct table_row.relname as table_name, constraint_row.conname as constraint_name
    from pg_constraint constraint_row
    join pg_class table_row on table_row.oid = constraint_row.conrelid
    join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
    join unnest(constraint_row.conkey) column_number(attnum) on true
    join pg_attribute column_row on column_row.attrelid = table_row.oid and column_row.attnum = column_number.attnum
    where constraint_row.contype = 'f'
      and schema_row.nspname = 'public'
      and (
        (table_row.relname = 'internal_tasks' and column_row.attname in ('assigned_to','created_by'))
        or (table_row.relname = 'internal_notes' and column_row.attname = 'created_by')
        or (table_row.relname = 'client_resources' and column_row.attname = 'created_by')
      )
  loop
    execute format('alter table public.%I drop constraint if exists %I', relationship.table_name, relationship.constraint_name);
  end loop;
end $$;

alter table public.internal_tasks
  add constraint internal_tasks_assigned_to_fkey foreign key (assigned_to) references public.profiles(id) on delete set null not valid,
  add constraint internal_tasks_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null not valid;
alter table public.internal_notes
  add constraint internal_notes_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null not valid;
alter table public.client_resources
  add constraint client_resources_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null not valid;

alter table public.internal_tasks
  validate constraint internal_tasks_assigned_to_fkey,
  validate constraint internal_tasks_created_by_fkey;
alter table public.internal_notes validate constraint internal_notes_created_by_fkey;
alter table public.client_resources validate constraint client_resources_created_by_fkey;

-- Ask PostgREST/Supabase Data API to reload relationship metadata immediately.
notify pgrst, 'reload schema';
