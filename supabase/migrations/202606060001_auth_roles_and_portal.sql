-- BIEM portal: authentication profiles, domain tables and row-level security.
-- Run with the Supabase CLI or paste into the SQL editor as a single migration.

create extension if not exists pgcrypto;
create schema if not exists private;

create type public.record_status as enum ('active', 'paused', 'expired');
create type public.payment_status as enum ('pending', 'paid', 'overdue');
create type public.deliverable_status as enum (
  'pending', 'in_progress', 'internal_review', 'client_review',
  'changes_requested', 'approved', 'published', 'cancelled'
);
create type public.request_status as enum ('new', 'in_review', 'approved', 'rejected', 'converted', 'completed');

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  description text,
  included_services jsonb not null default '[]'::jsonb,
  graphic_pieces integer not null default 0 check (graphic_pieces >= 0),
  reels integer not null default 0 check (reels >= 0),
  stories integer not null default 0 check (stories >= 0),
  carousels integer not null default 0 check (carousels >= 0),
  meetings integer not null default 0 check (meetings >= 0),
  includes_monthly_report boolean not null default true,
  support_level text,
  internal_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand_name text not null,
  email text,
  phone text,
  status public.record_status not null default 'active',
  package_id uuid references public.packages(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  start_date date,
  renewal_date date,
  package_usage integer not null default 0 check (package_usage >= 0),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'viewer' check (role in ('admin', 'client', 'team', 'viewer')),
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_role_requires_client check (role <> 'client' or client_id is not null)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  package_id uuid references public.packages(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  invoice_number text not null unique,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  due_date date not null,
  paid_at timestamptz,
  status public.payment_status not null default 'pending',
  payment_method text,
  external_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  name text not null,
  content_type text not null,
  description text,
  status public.deliverable_status not null default 'pending',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  scheduled_at timestamptz,
  file_url text,
  internal_comments text,
  client_comments text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.extra_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in (
    'strategy_growth', 'content_design', 'advertising_sales', 'organization_automation'
  )),
  description text,
  price_from numeric(12,2) not null default 0 check (price_from >= 0),
  estimated_delivery text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  extra_service_id uuid references public.extra_services(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null default auth.uid(),
  request_type text not null,
  description text,
  desired_due_date date,
  attachment_urls jsonb not null default '[]'::jsonb,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status public.request_status not null default 'new',
  admin_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_client_id_idx on public.profiles(client_id);
create index clients_assigned_to_idx on public.clients(assigned_to);
create index clients_package_id_idx on public.clients(package_id);
create index invoices_client_id_idx on public.invoices(client_id);
create index invoices_assigned_to_idx on public.invoices(assigned_to);
create index deliverables_client_id_idx on public.deliverables(client_id);
create index deliverables_assigned_to_idx on public.deliverables(assigned_to);
create index requests_client_id_idx on public.requests(client_id);
create index requests_assigned_to_idx on public.requests(assigned_to);

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function private.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.client_id from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.get_current_user_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select private.current_user_role();
$$;

grant usage on schema private to authenticated;
revoke all on function private.current_user_role() from public;
revoke all on function private.current_client_id() from public;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.current_client_id() to authenticated;
grant execute on function public.get_current_user_role() to authenticated;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(private.current_user_role() = 'admin', false); $$;
create or replace function private.is_viewer()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(private.current_user_role() = 'viewer', false); $$;
create or replace function private.is_team()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(private.current_user_role() = 'team', false); $$;
revoke all on function private.is_admin() from public;
revoke all on function private.is_viewer() from public;
revoke all on function private.is_team() from public;
grant execute on function private.is_admin(), private.is_viewer(), private.is_team() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := case
    when new.raw_app_meta_data ->> 'role' in ('admin', 'client', 'team', 'viewer')
      then new.raw_app_meta_data ->> 'role'
    else 'viewer'
  end;

  insert into public.profiles (id, full_name, email, role, client_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    requested_role,
    nullif(new.raw_app_meta_data ->> 'client_id', '')::uuid
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger packages_updated_at before update on public.packages for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();
create trigger deliverables_updated_at before update on public.deliverables for each row execute function public.set_updated_at();
create trigger requests_updated_at before update on public.requests for each row execute function public.set_updated_at();
create trigger extra_services_updated_at before update on public.extra_services for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.packages enable row level security;
alter table public.invoices enable row level security;
alter table public.deliverables enable row level security;
alter table public.requests enable row level security;
alter table public.extra_services enable row level security;

-- Profiles: users can read themselves; admins and read-only viewers can read all;
-- team members can read profiles belonging to clients assigned to them.
create policy profiles_select on public.profiles for select to authenticated using (
  id = (select auth.uid()) or (select private.is_admin()) or (select private.is_viewer()) or
  ((select private.is_team()) and client_id in (select c.id from public.clients c where c.assigned_to = (select auth.uid())))
);
create policy profiles_admin_insert on public.profiles for insert to authenticated with check ((select private.is_admin()));
create policy profiles_admin_update on public.profiles for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy profiles_admin_delete on public.profiles for delete to authenticated using ((select private.is_admin()));

-- Clients: client sees only its account; team only assigned accounts; viewer reads all.
create policy clients_select on public.clients for select to authenticated using (
  (select private.is_admin()) or (select private.is_viewer()) or
  id = (select private.current_client_id()) or
  ((select private.is_team()) and assigned_to = (select auth.uid()))
);
create policy clients_admin_insert on public.clients for insert to authenticated with check ((select private.is_admin()));
create policy clients_admin_update on public.clients for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy clients_admin_delete on public.clients for delete to authenticated using ((select private.is_admin()));

-- Packages: clients can read their assigned package; team/viewer can read; only admin mutates.
create policy packages_select on public.packages for select to authenticated using (
  (select private.is_admin()) or (select private.is_viewer()) or (select private.is_team()) or
  id in (select c.package_id from public.clients c where c.id = (select private.current_client_id()))
);
create policy packages_admin_insert on public.packages for insert to authenticated with check ((select private.is_admin()));
create policy packages_admin_update on public.packages for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy packages_admin_delete on public.packages for delete to authenticated using ((select private.is_admin()));

-- Transactional records share the same isolation rule. Team may update assigned work;
-- viewer remains read-only; client remains read-only except request creation.
create policy invoices_select on public.invoices for select to authenticated using (
  (select private.is_admin()) or (select private.is_viewer()) or
  client_id = (select private.current_client_id()) or
  ((select private.is_team()) and assigned_to = (select auth.uid()))
);
create policy invoices_admin_insert on public.invoices for insert to authenticated with check ((select private.is_admin()));
create policy invoices_admin_update on public.invoices for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy invoices_admin_delete on public.invoices for delete to authenticated using ((select private.is_admin()));

create policy deliverables_select on public.deliverables for select to authenticated using (
  (select private.is_admin()) or (select private.is_viewer()) or
  client_id = (select private.current_client_id()) or
  ((select private.is_team()) and assigned_to = (select auth.uid()))
);
create policy deliverables_admin_insert on public.deliverables for insert to authenticated with check ((select private.is_admin()));
create policy deliverables_admin_update on public.deliverables for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy deliverables_team_update on public.deliverables for update to authenticated
  using ((select private.is_team()) and assigned_to = (select auth.uid()))
  with check ((select private.is_team()) and assigned_to = (select auth.uid()));
create policy deliverables_admin_delete on public.deliverables for delete to authenticated using ((select private.is_admin()));

create policy requests_select on public.requests for select to authenticated using (
  (select private.is_admin()) or (select private.is_viewer()) or
  client_id = (select private.current_client_id()) or
  ((select private.is_team()) and assigned_to = (select auth.uid()))
);
create policy requests_client_insert on public.requests for insert to authenticated with check (
  (select private.current_user_role()) = 'client' and
  client_id = (select private.current_client_id()) and requested_by = (select auth.uid())
);
create policy requests_admin_insert on public.requests for insert to authenticated with check ((select private.is_admin()));
create policy requests_admin_update on public.requests for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy requests_team_update on public.requests for update to authenticated
  using ((select private.is_team()) and assigned_to = (select auth.uid()))
  with check ((select private.is_team()) and assigned_to = (select auth.uid()));
create policy requests_admin_delete on public.requests for delete to authenticated using ((select private.is_admin()));

-- Active services are visible to clients. Team/viewer can read the full catalog.
create policy extra_services_select on public.extra_services for select to authenticated using (
  (select private.is_admin()) or (select private.is_viewer()) or (select private.is_team()) or
  ((select private.current_user_role()) = 'client' and is_active)
);
create policy extra_services_admin_insert on public.extra_services for insert to authenticated with check ((select private.is_admin()));
create policy extra_services_admin_update on public.extra_services for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy extra_services_admin_delete on public.extra_services for delete to authenticated using ((select private.is_admin()));

-- Explicit API privileges. RLS remains the final authorization layer.
grant usage on schema public to authenticated;
grant select on public.profiles, public.clients, public.packages, public.invoices,
  public.deliverables, public.requests, public.extra_services to authenticated;
grant insert on public.requests to authenticated;
grant insert, update, delete on public.profiles, public.clients, public.packages,
  public.invoices, public.deliverables, public.extra_services to authenticated;
grant update, delete on public.requests to authenticated;
