-- BIEM admin CRUD policies.
-- Safe to run after 202606060001_auth_roles_and_portal.sql.
-- This migration makes profiles.role the only source of application privileges.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid());
$$;

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.client_id
  from public.profiles p
  where p.id = (select auth.uid());
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.current_client_id() from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_client_id() to authenticated;

alter table public.clients enable row level security;
alter table public.packages enable row level security;
alter table public.invoices enable row level security;
alter table public.deliverables enable row level security;
alter table public.requests enable row level security;
alter table public.extra_services enable row level security;

-- Remove previous policies so this migration is the authoritative policy set.
drop policy if exists clients_select on public.clients;
drop policy if exists clients_admin_insert on public.clients;
drop policy if exists clients_admin_update on public.clients;
drop policy if exists clients_admin_delete on public.clients;

drop policy if exists packages_select on public.packages;
drop policy if exists packages_admin_insert on public.packages;
drop policy if exists packages_admin_update on public.packages;
drop policy if exists packages_admin_delete on public.packages;

drop policy if exists invoices_select on public.invoices;
drop policy if exists invoices_admin_insert on public.invoices;
drop policy if exists invoices_admin_update on public.invoices;
drop policy if exists invoices_admin_delete on public.invoices;

drop policy if exists deliverables_select on public.deliverables;
drop policy if exists deliverables_admin_insert on public.deliverables;
drop policy if exists deliverables_admin_update on public.deliverables;
drop policy if exists deliverables_team_update on public.deliverables;
drop policy if exists deliverables_admin_delete on public.deliverables;

drop policy if exists requests_select on public.requests;
drop policy if exists requests_client_insert on public.requests;
drop policy if exists requests_admin_insert on public.requests;
drop policy if exists requests_admin_update on public.requests;
drop policy if exists requests_team_update on public.requests;
drop policy if exists requests_admin_delete on public.requests;

drop policy if exists extra_services_select on public.extra_services;
drop policy if exists extra_services_admin_insert on public.extra_services;
drop policy if exists extra_services_admin_update on public.extra_services;
drop policy if exists extra_services_admin_delete on public.extra_services;

-- SELECT policies: admin and viewer can read globally; clients are tenant scoped;
-- team members only see rows assigned to their auth user.
create policy clients_select on public.clients
for select to authenticated
using (
  (select public.current_user_role()) in ('admin', 'viewer')
  or id = (select public.current_client_id())
  or ((select public.current_user_role()) = 'team' and assigned_to = (select auth.uid()))
);

create policy packages_select on public.packages
for select to authenticated
using (
  (select public.current_user_role()) in ('admin', 'viewer', 'team')
  or id in (
    select c.package_id from public.clients c
    where c.id = (select public.current_client_id())
  )
);

create policy invoices_select on public.invoices
for select to authenticated
using (
  (select public.current_user_role()) in ('admin', 'viewer')
  or client_id = (select public.current_client_id())
  or ((select public.current_user_role()) = 'team' and assigned_to = (select auth.uid()))
);

create policy deliverables_select on public.deliverables
for select to authenticated
using (
  (select public.current_user_role()) in ('admin', 'viewer')
  or client_id = (select public.current_client_id())
  or ((select public.current_user_role()) = 'team' and assigned_to = (select auth.uid()))
);

create policy requests_select on public.requests
for select to authenticated
using (
  (select public.current_user_role()) in ('admin', 'viewer')
  or client_id = (select public.current_client_id())
  or ((select public.current_user_role()) = 'team' and assigned_to = (select auth.uid()))
);

create policy extra_services_select on public.extra_services
for select to authenticated
using (
  (select public.current_user_role()) in ('admin', 'viewer', 'team')
  or ((select public.current_user_role()) = 'client' and is_active)
);

-- ADMIN CRUD: only a user whose public.profiles.role is admin may mutate.
create policy clients_admin_insert on public.clients for insert to authenticated
with check ((select public.current_user_role()) = 'admin');
create policy clients_admin_update on public.clients for update to authenticated
using ((select public.current_user_role()) = 'admin')
with check ((select public.current_user_role()) = 'admin');
create policy clients_admin_delete on public.clients for delete to authenticated
using ((select public.current_user_role()) = 'admin');

create policy packages_admin_insert on public.packages for insert to authenticated
with check ((select public.current_user_role()) = 'admin');
create policy packages_admin_update on public.packages for update to authenticated
using ((select public.current_user_role()) = 'admin')
with check ((select public.current_user_role()) = 'admin');
create policy packages_admin_delete on public.packages for delete to authenticated
using ((select public.current_user_role()) = 'admin');

create policy invoices_admin_insert on public.invoices for insert to authenticated
with check ((select public.current_user_role()) = 'admin');
create policy invoices_admin_update on public.invoices for update to authenticated
using ((select public.current_user_role()) = 'admin')
with check ((select public.current_user_role()) = 'admin');
create policy invoices_admin_delete on public.invoices for delete to authenticated
using ((select public.current_user_role()) = 'admin');

create policy deliverables_admin_insert on public.deliverables for insert to authenticated
with check ((select public.current_user_role()) = 'admin');
create policy deliverables_admin_update on public.deliverables for update to authenticated
using ((select public.current_user_role()) = 'admin')
with check ((select public.current_user_role()) = 'admin');
create policy deliverables_admin_delete on public.deliverables for delete to authenticated
using ((select public.current_user_role()) = 'admin');

create policy requests_admin_insert on public.requests for insert to authenticated
with check ((select public.current_user_role()) = 'admin');
create policy requests_admin_update on public.requests for update to authenticated
using ((select public.current_user_role()) = 'admin')
with check ((select public.current_user_role()) = 'admin');
create policy requests_admin_delete on public.requests for delete to authenticated
using ((select public.current_user_role()) = 'admin');

create policy extra_services_admin_insert on public.extra_services for insert to authenticated
with check ((select public.current_user_role()) = 'admin');
create policy extra_services_admin_update on public.extra_services for update to authenticated
using ((select public.current_user_role()) = 'admin')
with check ((select public.current_user_role()) = 'admin');
create policy extra_services_admin_delete on public.extra_services for delete to authenticated
using ((select public.current_user_role()) = 'admin');

-- Data API grants expose operations to authenticated users; RLS decides which rows
-- each application role can actually read or mutate.
grant select, insert, update, delete on table
  public.clients,
  public.packages,
  public.invoices,
  public.deliverables,
  public.requests,
  public.extra_services
to authenticated;
