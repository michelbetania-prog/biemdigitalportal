-- BIEM role and permission layer for the agency team.
-- Apply after 202606090002_client_confidentiality_gate.sql.

-- Replace the original role constraint while preserving legacy viewer accounts.
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'account_manager' where role = 'team';
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','client','account_manager','designer','social_media','video_editor','viewer'));

create table if not exists public.client_team_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_on_client text not null check (role_on_client in ('account_manager','designer','social_media','video_editor')),
  assigned_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (client_id, user_id, role_on_client)
);

create table if not exists public.internal_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  task_type text not null check (task_type in ('design','video','copy','social_media','strategy','review','administration')),
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','in_progress','ready_for_review','changes_requested','corrected','completed','paused')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  related_deliverable_id uuid references public.deliverables(id) on delete set null,
  visible_to_client boolean not null default false,
  visible_to_admin boolean not null default true,
  visible_to_account_manager boolean not null default true,
  visible_to_designer boolean not null default false,
  visible_to_social_media boolean not null default false,
  visible_to_video_editor boolean not null default false,
  internal_only boolean not null default true,
  result_url text,
  internal_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  note text not null,
  visibility text not null default 'admin_only' check (visibility in ('admin_only','admin_and_account_manager','assigned_team','specific_role')),
  specific_role text check (specific_role is null or specific_role in ('account_manager','designer','social_media','video_editor')),
  created_at timestamptz not null default now(),
  check (visibility <> 'specific_role' or specific_role is not null)
);

-- Generic strategic/material records provide visibility controls without exposing internal fields to clients.
create table if not exists public.client_resources (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  resource_type text not null check (resource_type in ('recommendation','diagnostic','growth_route','brand_material','brief','comment','next_step')),
  title text not null,
  content text,
  file_url text,
  status text not null default 'draft' check (status in ('draft','in_review','published','archived')),
  visible_to_client boolean not null default false,
  visible_to_admin boolean not null default true,
  visible_to_account_manager boolean not null default true,
  visible_to_designer boolean not null default false,
  visible_to_social_media boolean not null default false,
  visible_to_video_editor boolean not null default false,
  internal_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deliverables also receive explicit visibility controls.
alter table public.deliverables
  add column if not exists visible_to_client boolean not null default true,
  add column if not exists visible_to_admin boolean not null default true,
  add column if not exists visible_to_account_manager boolean not null default true,
  add column if not exists visible_to_designer boolean not null default true,
  add column if not exists visible_to_social_media boolean not null default true,
  add column if not exists visible_to_video_editor boolean not null default true,
  add column if not exists internal_only boolean not null default false,
  add column if not exists publication_url text;

create index if not exists team_assignments_user_idx on public.client_team_assignments(user_id, is_active);
create index if not exists team_assignments_client_idx on public.client_team_assignments(client_id, is_active);
create index if not exists internal_tasks_assignee_idx on public.internal_tasks(assigned_to, status, due_date);
create index if not exists internal_tasks_client_idx on public.internal_tasks(client_id, status);
create index if not exists internal_notes_client_idx on public.internal_notes(client_id, created_at desc);
create index if not exists client_resources_client_idx on public.client_resources(client_id, resource_type, status);

drop trigger if exists internal_tasks_updated_at on public.internal_tasks;
create trigger internal_tasks_updated_at before update on public.internal_tasks
for each row execute function public.set_updated_at();
drop trigger if exists client_resources_updated_at on public.client_resources;
create trigger client_resources_updated_at before update on public.client_resources
for each row execute function public.set_updated_at();

create or replace function public.validate_team_assignment_role()
returns trigger language plpgsql security definer set search_path = '' as $$
declare profile_role text;
begin
  select role into profile_role from public.profiles where id = new.user_id;
  if profile_role is null or profile_role <> new.role_on_client then
    raise exception 'The assignment role must match the collaborator profile role';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_team_assignment_role on public.client_team_assignments;
create trigger validate_team_assignment_role before insert or update on public.client_team_assignments
for each row execute function public.validate_team_assignment_role();

create or replace function public.sync_team_assignments_from_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role then
    if new.role in ('account_manager','designer','social_media','video_editor') then
      update public.client_team_assignments set role_on_client = new.role where user_id = new.id;
    else
      update public.client_team_assignments set is_active = false where user_id = new.id and is_active;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists sync_team_assignments_from_profile on public.profiles;
create trigger sync_team_assignments_from_profile after update of role on public.profiles
for each row execute function public.sync_team_assignments_from_profile();

create or replace function public.limit_specialist_task_updates()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (select public.current_user_role()) in ('designer','social_media','video_editor') and (
    new.client_id is distinct from old.client_id or new.assigned_to is distinct from old.assigned_to
    or new.created_by is distinct from old.created_by or new.task_type is distinct from old.task_type
    or new.title is distinct from old.title or new.description is distinct from old.description
    or new.priority is distinct from old.priority or new.due_date is distinct from old.due_date
    or new.related_deliverable_id is distinct from old.related_deliverable_id
    or new.visible_to_client is distinct from old.visible_to_client or new.visible_to_admin is distinct from old.visible_to_admin
    or new.visible_to_account_manager is distinct from old.visible_to_account_manager or new.visible_to_designer is distinct from old.visible_to_designer
    or new.visible_to_social_media is distinct from old.visible_to_social_media or new.visible_to_video_editor is distinct from old.visible_to_video_editor
    or new.internal_only is distinct from old.internal_only
  ) then raise exception 'Specialists may only update task status, result and internal comment' using errcode='42501'; end if;
  return new;
end;
$$;
drop trigger if exists limit_specialist_task_updates on public.internal_tasks;
create trigger limit_specialist_task_updates before update on public.internal_tasks
for each row execute function public.limit_specialist_task_updates();

create or replace function public.limit_specialist_deliverable_updates()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (select public.current_user_role()) in ('designer','social_media','video_editor') and (
    new.client_id is distinct from old.client_id or new.assigned_to is distinct from old.assigned_to
    or new.name is distinct from old.name or new.content_type is distinct from old.content_type
    or new.description is distinct from old.description or new.priority is distinct from old.priority
    or new.due_date is distinct from old.due_date or new.scheduled_at is distinct from old.scheduled_at
    or new.created_by is distinct from old.created_by or new.client_comments is distinct from old.client_comments
    or new.visible_to_client is distinct from old.visible_to_client or new.visible_to_admin is distinct from old.visible_to_admin
    or new.visible_to_account_manager is distinct from old.visible_to_account_manager or new.visible_to_designer is distinct from old.visible_to_designer
    or new.visible_to_social_media is distinct from old.visible_to_social_media or new.visible_to_video_editor is distinct from old.visible_to_video_editor
    or new.internal_only is distinct from old.internal_only
  ) then raise exception 'Specialists may only update operational delivery fields' using errcode='42501'; end if;
  if (select public.current_user_role()) in ('designer','video_editor') and new.status not in ('pending','in_progress','internal_review','changes_requested','approved') then
    raise exception 'This delivery status is not allowed for the specialist role' using errcode='42501';
  end if;
  if (select public.current_user_role()) = 'social_media' and new.status not in ('approved','published') then
    raise exception 'Social media may only mark approved content as published' using errcode='42501';
  end if;
  return new;
end;
$$;
drop trigger if exists limit_specialist_deliverable_updates on public.deliverables;
create trigger limit_specialist_deliverable_updates before update on public.deliverables
for each row execute function public.limit_specialist_deliverable_updates();

create or replace function public.is_assigned_to_client(p_client_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.client_team_assignments assignment
    where assignment.client_id = p_client_id
      and assignment.user_id = p_user_id
      and assignment.is_active
  );
$$;

create or replace function public.has_client_role(p_client_id uuid, p_role text, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.client_team_assignments assignment
    where assignment.client_id = p_client_id
      and assignment.user_id = p_user_id
      and assignment.role_on_client = p_role
      and assignment.is_active
  );
$$;

revoke all on function public.is_assigned_to_client(uuid, uuid) from public;
revoke all on function public.has_client_role(uuid, text, uuid) from public;
grant execute on function public.is_assigned_to_client(uuid, uuid), public.has_client_role(uuid, text, uuid) to authenticated;

alter table public.client_team_assignments enable row level security;
alter table public.internal_tasks enable row level security;
alter table public.internal_notes enable row level security;
alter table public.client_resources enable row level security;

-- Rebuild affected existing policies using assignment-based access.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or (select public.current_user_role()) = 'admin'
  or (
    (select public.current_user_role()) in ('account_manager','designer','social_media','video_editor')
    and exists (
      select 1 from public.client_team_assignments assignment
      where assignment.client_id = profiles.client_id
        and assignment.user_id = (select auth.uid()) and assignment.is_active
    )
  )
);

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select to authenticated using (
  (select public.current_user_role()) = 'admin'
);

drop policy if exists packages_select on public.packages;
create policy packages_select on public.packages for select to authenticated using (
  (select public.current_user_role()) = 'admin'
  or (
    (select public.current_user_role()) = 'account_manager'
    and id in (
      select c.package_id from public.clients c
      where (select public.has_client_role(c.id, 'account_manager'))
    )
  )
);

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated using (
  (select public.current_user_role()) = 'admin'
);

drop policy if exists deliverables_select on public.deliverables;
create policy deliverables_select on public.deliverables for select to authenticated using (
  (select public.current_user_role()) = 'admin'
  or (
    (select public.is_assigned_to_client(client_id)) and (
      ((select public.current_user_role()) = 'account_manager' and visible_to_account_manager)
      or ((select public.current_user_role()) = 'designer' and visible_to_designer)
      or ((select public.current_user_role()) = 'social_media' and visible_to_social_media)
      or ((select public.current_user_role()) = 'video_editor' and visible_to_video_editor)
    )
  )
  or assigned_to = (select auth.uid())
);

drop policy if exists requests_select on public.requests;
create policy requests_select on public.requests for select to authenticated using (
  (select public.current_user_role()) = 'admin'
  or ((select public.current_user_role()) = 'account_manager' and (select public.has_client_role(client_id, 'account_manager')))
);

-- Assignments: admin manages; collaborators read only their own assignments.
create policy team_assignments_select on public.client_team_assignments for select to authenticated using (
  (select public.current_user_role()) = 'admin' or user_id = (select auth.uid())
);
create policy team_assignments_admin_insert on public.client_team_assignments for insert to authenticated
with check ((select public.current_user_role()) = 'admin');
create policy team_assignments_admin_update on public.client_team_assignments for update to authenticated
using ((select public.current_user_role()) = 'admin') with check ((select public.current_user_role()) = 'admin');
create policy team_assignments_admin_delete on public.client_team_assignments for delete to authenticated
using ((select public.current_user_role()) = 'admin');

-- Tasks: admin controls all; account managers operate assigned clients; specialists operate tasks assigned to themselves.
create policy internal_tasks_select on public.internal_tasks for select to authenticated using (
  (select public.current_user_role()) = 'admin'
  or ((select public.current_user_role()) = 'account_manager' and (select public.has_client_role(client_id, 'account_manager')) and visible_to_account_manager)
  or (assigned_to = (select auth.uid()) and (
    ((select public.current_user_role()) = 'designer' and visible_to_designer)
    or ((select public.current_user_role()) = 'social_media' and visible_to_social_media)
    or ((select public.current_user_role()) = 'video_editor' and visible_to_video_editor)
  ))
);
create policy internal_tasks_admin_insert on public.internal_tasks for insert to authenticated
with check ((select public.current_user_role()) = 'admin');
create policy internal_tasks_account_manager_insert on public.internal_tasks for insert to authenticated
with check ((select public.current_user_role()) = 'account_manager' and (select public.has_client_role(client_id, 'account_manager')) and (assigned_to is null or (select public.is_assigned_to_client(client_id, assigned_to))));
create policy internal_tasks_admin_update on public.internal_tasks for update to authenticated
using ((select public.current_user_role()) = 'admin') with check ((select public.current_user_role()) = 'admin');
create policy internal_tasks_team_update on public.internal_tasks for update to authenticated
using (
  ((select public.current_user_role()) = 'account_manager' and (select public.has_client_role(client_id, 'account_manager')) and (assigned_to is null or (select public.is_assigned_to_client(client_id, assigned_to))))
  or (assigned_to = (select auth.uid()) and (select public.current_user_role()) in ('designer','social_media','video_editor'))
)
with check (
  ((select public.current_user_role()) = 'account_manager' and (select public.has_client_role(client_id, 'account_manager')) and (assigned_to is null or (select public.is_assigned_to_client(client_id, assigned_to))))
  or (assigned_to = (select auth.uid()) and (select public.current_user_role()) in ('designer','social_media','video_editor') and (select public.is_assigned_to_client(client_id)))
);
create policy internal_tasks_admin_delete on public.internal_tasks for delete to authenticated
using ((select public.current_user_role()) = 'admin');

-- Internal notes are never client-readable.
create policy internal_notes_select on public.internal_notes for select to authenticated using (
  (select public.current_user_role()) = 'admin'
  or ((select public.is_assigned_to_client(client_id)) and (
    visibility = 'assigned_team'
    or (visibility = 'admin_and_account_manager' and (select public.current_user_role()) = 'account_manager')
    or (visibility = 'specific_role' and specific_role = (select public.current_user_role()))
  ))
);
create policy internal_notes_admin_insert on public.internal_notes for insert to authenticated
with check ((select public.current_user_role()) = 'admin');
create policy internal_notes_account_manager_insert on public.internal_notes for insert to authenticated
with check ((select public.current_user_role()) = 'account_manager' and (select public.has_client_role(client_id, 'account_manager')));
create policy internal_notes_admin_update on public.internal_notes for update to authenticated
using ((select public.current_user_role()) = 'admin') with check ((select public.current_user_role()) = 'admin');
create policy internal_notes_author_update on public.internal_notes for update to authenticated
using (created_by = (select auth.uid()) and (select public.current_user_role()) = 'account_manager')
with check (created_by = (select auth.uid()) and (select public.has_client_role(client_id, 'account_manager')));
create policy internal_notes_admin_delete on public.internal_notes for delete to authenticated
using ((select public.current_user_role()) = 'admin');

create policy client_resources_select on public.client_resources for select to authenticated using (
  (select public.current_user_role()) = 'admin'
  or ((select public.is_assigned_to_client(client_id)) and (
    ((select public.current_user_role()) = 'account_manager' and visible_to_account_manager)
    or ((select public.current_user_role()) = 'designer' and visible_to_designer)
    or ((select public.current_user_role()) = 'social_media' and visible_to_social_media)
    or ((select public.current_user_role()) = 'video_editor' and visible_to_video_editor)
  ))
);
create policy client_resources_admin_insert on public.client_resources for insert to authenticated
with check ((select public.current_user_role()) = 'admin');
create policy client_resources_client_insert on public.client_resources for insert to authenticated
with check (
  (select public.current_user_role()) = 'client'
  and client_id = (select public.current_client_id())
  and created_by = (select auth.uid())
  and resource_type in ('brand_material','brief')
  and status = 'draft' and visible_to_client and not internal_only
);
create policy client_resources_account_manager_insert on public.client_resources for insert to authenticated
with check ((select public.current_user_role()) = 'account_manager' and (select public.has_client_role(client_id, 'account_manager')) and status <> 'published');
create policy client_resources_admin_update on public.client_resources for update to authenticated
using ((select public.current_user_role()) = 'admin') with check ((select public.current_user_role()) = 'admin');
create policy client_resources_account_manager_update on public.client_resources for update to authenticated
using ((select public.current_user_role()) = 'account_manager' and created_by = (select auth.uid()) and (select public.has_client_role(client_id, 'account_manager')))
with check ((select public.current_user_role()) = 'account_manager' and created_by = (select auth.uid()) and (select public.has_client_role(client_id, 'account_manager')) and status <> 'published');
create policy client_resources_admin_delete on public.client_resources for delete to authenticated
using ((select public.current_user_role()) = 'admin');

-- Operational deliverable updates for assigned staff. Finance and package tables receive no staff mutation policies.
create policy deliverables_account_manager_insert on public.deliverables for insert to authenticated
with check ((select public.current_user_role()) = 'account_manager' and (select public.has_client_role(client_id, 'account_manager')) and (assigned_to is null or (select public.is_assigned_to_client(client_id, assigned_to))));
create policy deliverables_staff_update on public.deliverables for update to authenticated
using (
  ((select public.current_user_role()) = 'account_manager' and (select public.has_client_role(client_id, 'account_manager')) and (assigned_to is null or (select public.is_assigned_to_client(client_id, assigned_to))))
  or (assigned_to = (select auth.uid()) and (select public.current_user_role()) in ('designer','social_media','video_editor'))
)
with check (
  ((select public.current_user_role()) = 'account_manager' and (select public.has_client_role(client_id, 'account_manager')) and (assigned_to is null or (select public.is_assigned_to_client(client_id, assigned_to))))
  or (assigned_to = (select auth.uid()) and (select public.current_user_role()) in ('designer','social_media','video_editor') and (select public.is_assigned_to_client(client_id)))
);
create policy requests_account_manager_update on public.requests for update to authenticated
using ((select public.current_user_role()) = 'account_manager' and (select public.has_client_role(client_id, 'account_manager')))
with check ((select public.current_user_role()) = 'account_manager' and (select public.has_client_role(client_id, 'account_manager')));

grant select, insert, update, delete on public.client_team_assignments, public.internal_tasks, public.internal_notes, public.client_resources to authenticated;
grant select (id,name,brand_name,status,package_id,start_date,renewal_date,package_usage) on public.clients to authenticated;


-- Client data is exposed through narrow RPCs so private columns cannot be requested from the Data API.
create or replace function public.client_account_overview()
returns table (
  id uuid, name text, brand_name text, email text, phone text, status public.record_status,
  start_date date, renewal_date date, package_usage integer, onboarding_type text,
  onboarding_completed boolean, package_name text, package_description text,
  included_services jsonb, graphic_pieces integer, reels integer, stories integer,
  carousels integer, meetings integer, includes_monthly_report boolean, support_level text
)
language sql stable security definer set search_path = '' as $$
  select c.id,c.name,c.brand_name,c.email,c.phone,c.status,c.start_date,c.renewal_date,c.package_usage,
         c.onboarding_type,c.onboarding_completed,p.name,p.description,p.included_services,p.graphic_pieces,
         p.reels,p.stories,p.carousels,p.meetings,p.includes_monthly_report,p.support_level
  from public.clients c left join public.packages p on p.id=c.package_id
  where c.id=(select public.current_client_id()) and (select public.current_user_role())='client';
$$;

create or replace function public.client_deliverables()
returns table (
  id uuid, name text, content_type text, description text, status public.deliverable_status,
  priority text, due_date date, scheduled_at timestamptz, file_url text,
  publication_url text, client_comments text, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select d.id,d.name,d.content_type,d.description,d.status,d.priority,d.due_date,d.scheduled_at,
         d.file_url,d.publication_url,d.client_comments,d.created_at,d.updated_at
  from public.deliverables d
  where d.client_id=(select public.current_client_id()) and d.visible_to_client and not d.internal_only
    and (select public.current_user_role())='client';
$$;

create or replace function public.client_invoices()
returns table (
  id uuid, invoice_number text, amount numeric, currency text, due_date date,
  paid_at timestamptz, status public.payment_status, payment_method text,
  external_url text, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select i.id,i.invoice_number,i.amount,i.currency,i.due_date,i.paid_at,i.status,
         i.payment_method,i.external_url,i.created_at,i.updated_at
  from public.invoices i
  where i.client_id=(select public.current_client_id()) and (select public.current_user_role())='client';
$$;

create or replace function public.client_requests()
returns table (
  id uuid, request_type text, description text, desired_due_date date, attachment_urls jsonb,
  priority text, status public.request_status, admin_response text, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select r.id,r.request_type,r.description,r.desired_due_date,r.attachment_urls,r.priority,
         r.status,r.admin_response,r.created_at,r.updated_at
  from public.requests r
  where r.client_id=(select public.current_client_id()) and (select public.current_user_role())='client';
$$;

create or replace function public.client_visible_tasks()
returns table (
  id uuid, task_type text, title text, description text, status text,
  priority text, due_date date, related_deliverable_id uuid, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select t.id,t.task_type,t.title,t.description,t.status,t.priority,t.due_date,
         t.related_deliverable_id,t.created_at,t.updated_at
  from public.internal_tasks t
  where t.client_id=(select public.current_client_id()) and t.visible_to_client and not t.internal_only
    and (select public.current_user_role())='client';
$$;

create or replace function public.client_visible_resources()
returns table (
  id uuid, resource_type text, title text, content text, file_url text,
  status text, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select r.id,r.resource_type,r.title,r.content,r.file_url,r.status,r.created_at,r.updated_at
  from public.client_resources r
  where r.client_id=(select public.current_client_id()) and r.visible_to_client and not r.internal_only
    and (select public.current_user_role())='client';
$$;

revoke all on function public.client_account_overview() from public;
revoke all on function public.client_deliverables() from public;
revoke all on function public.client_invoices() from public;
revoke all on function public.client_requests() from public;
revoke all on function public.client_visible_tasks() from public;
revoke all on function public.client_visible_resources() from public;
grant execute on function public.client_account_overview(), public.client_deliverables(), public.client_invoices(), public.client_requests(), public.client_visible_tasks(), public.client_visible_resources() to authenticated;

-- Staff client data is exposed through a narrow RPC so financial/internal client columns are never returned.
create or replace function public.team_client_overview()
returns table (
  id uuid, name text, brand_name text, status public.record_status,
  start_date date, renewal_date date, package_usage integer,
  onboarding_type text, onboarding_completed boolean, confidentiality_accepted boolean,
  role_on_client text, package_name text
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.brand_name, c.status, c.start_date, c.renewal_date,
         c.package_usage, c.onboarding_type, c.onboarding_completed,
         exists (
           select 1 from public.client_confidentiality_acceptances acceptance
           join public.confidentiality_agreements agreement on agreement.id = acceptance.agreement_id and agreement.is_active
           where acceptance.client_id = c.id and acceptance.agreement_version = agreement.version
         ), assignment.role_on_client, p.name
  from public.client_team_assignments assignment
  join public.clients c on c.id = assignment.client_id
  left join public.packages p on p.id = c.package_id
  where assignment.user_id = (select auth.uid())
    and assignment.is_active
    and (select public.current_user_role()) in ('account_manager','designer','social_media','video_editor');
$$;
revoke all on function public.team_client_overview() from public;
grant execute on function public.team_client_overview() to authenticated;

-- Client operations expose only the explicitly allowed state transitions.
create or replace function public.client_review_deliverable(p_deliverable_id uuid, p_action text, p_comment text default null)
returns public.deliverables
language plpgsql security definer set search_path = '' as $$
declare result public.deliverables;
begin
  if (select public.current_user_role()) <> 'client' then
    raise exception 'Only clients can review deliverables' using errcode = '42501';
  end if;
  if p_action not in ('approved','changes_requested') then
    raise exception 'Invalid review action';
  end if;
  update public.deliverables
  set status = p_action::public.deliverable_status,
      client_comments = nullif(trim(p_comment), ''),
      updated_at = now()
  where id = p_deliverable_id
    and client_id = (select public.current_client_id())
    and visible_to_client and not internal_only
    and status in ('client_review','changes_requested')
  returning * into result;
  if result.id is null then raise exception 'Deliverable not available for review' using errcode = '42501'; end if;
  return result;
end;
$$;
revoke all on function public.client_review_deliverable(uuid, text, text) from public;
grant execute on function public.client_review_deliverable(uuid, text, text) to authenticated;

create policy requests_client_insert on public.requests for insert to authenticated
with check (
  (select public.current_user_role()) = 'client'
  and client_id = (select public.current_client_id())
  and requested_by = (select auth.uid())
);

-- New users default to viewer unless a trusted app_metadata role is supplied.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_role text;
begin
  requested_role := case
    when new.raw_app_meta_data ->> 'role' in ('admin','client','account_manager','designer','social_media','video_editor','viewer')
      then new.raw_app_meta_data ->> 'role'
    else 'viewer'
  end;
  insert into public.profiles (id, full_name, email, role, client_id)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email,'@',1)), new.email, requested_role, nullif(new.raw_app_meta_data ->> 'client_id','')::uuid);
  return new;
end;
$$;
