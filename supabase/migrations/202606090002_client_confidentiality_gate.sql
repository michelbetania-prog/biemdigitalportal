-- BIEM private client confidentiality gate.
-- Apply after the portal schema and admin CRUD migrations.

alter table public.clients
  add column if not exists onboarding_type text
    check (onboarding_type in ('new', 'existing')),
  add column if not exists onboarding_completed boolean not null default false;

create table if not exists public.confidentiality_agreements (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null default 'Compromiso de Confidencialidad',
  content text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create unique index if not exists confidentiality_agreements_one_active_idx
  on public.confidentiality_agreements (is_active)
  where is_active = true;

create table if not exists public.client_confidentiality_acceptances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agreement_id uuid not null references public.confidentiality_agreements(id) on delete restrict,
  agreement_version text not null,
  accepted_at timestamptz not null default now(),
  accepted_name text not null,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, agreement_id)
);

create index if not exists confidentiality_acceptances_client_idx
  on public.client_confidentiality_acceptances(client_id, accepted_at desc);
create index if not exists confidentiality_acceptances_agreement_idx
  on public.client_confidentiality_acceptances(agreement_id, accepted_at desc);

drop trigger if exists confidentiality_agreements_updated_at on public.confidentiality_agreements;
create trigger confidentiality_agreements_updated_at
before update on public.confidentiality_agreements
for each row execute function public.set_updated_at();

alter table public.confidentiality_agreements enable row level security;
alter table public.client_confidentiality_acceptances enable row level security;

drop policy if exists confidentiality_agreements_select on public.confidentiality_agreements;
drop policy if exists confidentiality_agreements_admin_insert on public.confidentiality_agreements;
drop policy if exists confidentiality_agreements_admin_update on public.confidentiality_agreements;
drop policy if exists confidentiality_agreements_admin_delete on public.confidentiality_agreements;
drop policy if exists confidentiality_acceptances_select on public.client_confidentiality_acceptances;
drop policy if exists confidentiality_acceptances_client_insert on public.client_confidentiality_acceptances;
drop policy if exists confidentiality_acceptances_admin_delete on public.client_confidentiality_acceptances;

create policy confidentiality_agreements_select on public.confidentiality_agreements
for select to authenticated
using (
  (select public.current_user_role()) in ('admin', 'viewer')
  or ((select public.current_user_role()) = 'client' and is_active)
);
create policy confidentiality_agreements_admin_insert on public.confidentiality_agreements
for insert to authenticated
with check ((select public.current_user_role()) = 'admin');
create policy confidentiality_agreements_admin_update on public.confidentiality_agreements
for update to authenticated
using ((select public.current_user_role()) = 'admin')
with check ((select public.current_user_role()) = 'admin');
create policy confidentiality_agreements_admin_delete on public.confidentiality_agreements
for delete to authenticated
using ((select public.current_user_role()) = 'admin');

create policy confidentiality_acceptances_select on public.client_confidentiality_acceptances
for select to authenticated
using (
  (select public.current_user_role()) in ('admin', 'viewer')
  or (
    (select public.current_user_role()) = 'client'
    and user_id = (select auth.uid())
    and client_id = (select public.current_client_id())
  )
);
create policy confidentiality_acceptances_client_insert on public.client_confidentiality_acceptances
for insert to authenticated
with check (
  (select public.current_user_role()) = 'client'
  and user_id = (select auth.uid())
  and client_id = (select public.current_client_id())
  and exists (
    select 1 from public.confidentiality_agreements agreement
    where agreement.id = agreement_id
      and agreement.is_active
      and agreement.version = agreement_version
  )
);
create policy confidentiality_acceptances_admin_delete on public.client_confidentiality_acceptances
for delete to authenticated
using ((select public.current_user_role()) = 'admin');

grant select, insert, update, delete on public.confidentiality_agreements to authenticated;
grant select, delete on public.client_confidentiality_acceptances to authenticated;
revoke insert, update on public.client_confidentiality_acceptances from authenticated;

create or replace function public.accept_active_confidentiality(
  p_accepted_name text default null,
  p_user_agent text default null
)
returns public.client_confidentiality_acceptances
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_agreement public.confidentiality_agreements;
  current_profile public.profiles;
  acceptance public.client_confidentiality_acceptances;
  request_headers jsonb;
  forwarded_ip text;
begin
  select * into current_profile
  from public.profiles
  where id = (select auth.uid());

  if current_profile.role <> 'client' or current_profile.client_id is null then
    raise exception 'Only a client profile linked to a client can accept the agreement' using errcode = '42501';
  end if;

  select * into active_agreement
  from public.confidentiality_agreements
  where is_active
  limit 1;

  if active_agreement.id is null then
    raise exception 'There is no active confidentiality agreement' using errcode = 'P0001';
  end if;

  begin
    request_headers := nullif(current_setting('request.headers', true), '')::jsonb;
    forwarded_ip := split_part(coalesce(request_headers ->> 'x-forwarded-for', ''), ',', 1);
  exception when others then
    forwarded_ip := null;
  end;

  insert into public.client_confidentiality_acceptances (
    client_id, user_id, agreement_id, agreement_version,
    accepted_name, ip_address, user_agent
  ) values (
    current_profile.client_id,
    (select auth.uid()),
    active_agreement.id,
    active_agreement.version,
    coalesce(nullif(trim(p_accepted_name), ''), current_profile.full_name, current_profile.email, 'Cliente'),
    nullif(trim(forwarded_ip), '')::inet,
    coalesce(nullif(p_user_agent, ''), request_headers ->> 'user-agent')
  )
  on conflict (user_id, agreement_id) do update
    set agreement_version = excluded.agreement_version,
        accepted_at = excluded.accepted_at,
        accepted_name = excluded.accepted_name,
        ip_address = excluded.ip_address,
        user_agent = excluded.user_agent
  returning * into acceptance;

  return acceptance;
end;
$$;

revoke all on function public.accept_active_confidentiality(text, text) from public;
grant execute on function public.accept_active_confidentiality(text, text) to authenticated;

create or replace function public.activate_confidentiality_agreement(p_agreement_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select public.current_user_role()) <> 'admin' then
    raise exception 'Only admins can activate confidentiality agreements' using errcode = '42501';
  end if;
  update public.confidentiality_agreements set is_active = false where is_active;
  update public.confidentiality_agreements set is_active = true where id = p_agreement_id;
  if not found then raise exception 'Agreement not found'; end if;
end;
$$;

revoke all on function public.activate_confidentiality_agreement(uuid) from public;
grant execute on function public.activate_confidentiality_agreement(uuid) to authenticated;

alter table public.confidentiality_agreements
  alter column created_by set default auth.uid();

do $$
begin
  if not exists (select 1 from public.confidentiality_agreements where is_active) then
    insert into public.confidentiality_agreements (version, title, content, is_active)
    values (
      '2026.06-v1',
      'Compromiso de Confidencialidad',
      E'Este portal contiene información privada relacionada con tu marca, paquete contratado, entregables, solicitudes, facturación, recomendaciones estratégicas, diagnósticos, oportunidades detectadas, procesos internos y materiales desarrollados por Biem Digital.\n\nAl continuar, aceptas que esta información es de uso privado y no debe ser compartida, copiada, publicada, reenviada, fotografiada, grabada, expuesta en redes sociales ni utilizada fuera del contexto del servicio contratado sin autorización previa por escrito de Biem Digital.\n\nTambién aceptas no compartir tus accesos con terceros ni permitir que personas no autorizadas ingresen al portal.',
      true
    )
    on conflict (version) do update set is_active = true;
  end if;
end $$;
