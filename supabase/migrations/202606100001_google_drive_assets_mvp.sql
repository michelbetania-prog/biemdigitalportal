-- BIEM Google Drive MVP: manual links attached to deliverables.
-- OAuth tokens are intentionally out of scope and must never be stored in this table.

create table if not exists public.deliverable_drive_assets (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null default auth.uid(),
  name text not null,
  drive_url text not null,
  drive_item_id text,
  asset_type text not null default 'file' check (asset_type in ('file','folder','post','design','video','material','other')),
  mime_type text,
  visible_to_client boolean not null default false,
  is_primary boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deliverable_drive_assets_google_url check (
    drive_url ~* '^https://(drive|docs)\.google\.com/'
  )
);

create index if not exists drive_assets_deliverable_idx on public.deliverable_drive_assets(deliverable_id,sort_order,created_at);
create index if not exists drive_assets_client_idx on public.deliverable_drive_assets(client_id,created_at desc);
create unique index if not exists drive_assets_one_primary_idx on public.deliverable_drive_assets(deliverable_id) where is_primary and status='active';

drop trigger if exists deliverable_drive_assets_updated_at on public.deliverable_drive_assets;
create trigger deliverable_drive_assets_updated_at before update on public.deliverable_drive_assets
for each row execute function public.set_updated_at();

create or replace function public.validate_drive_asset_deliverable_client()
returns trigger language plpgsql security definer set search_path='' as $$
declare expected_client uuid;
begin
  select d.client_id into expected_client from public.deliverables d where d.id=new.deliverable_id;
  if expected_client is null then raise exception 'Deliverable not found' using errcode='23503'; end if;
  if new.client_id <> expected_client then raise exception 'Drive asset client must match deliverable client' using errcode='23514'; end if;
  return new;
end;
$$;

drop trigger if exists validate_drive_asset_client on public.deliverable_drive_assets;
create trigger validate_drive_asset_client before insert or update of deliverable_id,client_id on public.deliverable_drive_assets
for each row execute function public.validate_drive_asset_deliverable_client();

alter table public.deliverable_drive_assets enable row level security;

create policy drive_assets_admin_all on public.deliverable_drive_assets for all to authenticated
using ((select public.current_user_role())='admin')
with check ((select public.current_user_role())='admin');

create policy drive_assets_team_select on public.deliverable_drive_assets for select to authenticated
using (
  (select public.current_user_role()) in ('account_manager','designer','social_media','video_editor')
  and (select public.is_assigned_to_client(client_id))
  and exists (
    select 1 from public.deliverables d where d.id=deliverable_id and (
      d.assigned_to=(select auth.uid())
      or ((select public.current_user_role())='account_manager' and d.visible_to_account_manager)
      or ((select public.current_user_role())='designer' and d.visible_to_designer)
      or ((select public.current_user_role())='social_media' and d.visible_to_social_media)
      or ((select public.current_user_role())='video_editor' and d.visible_to_video_editor)
    )
  )
);

create policy drive_assets_team_insert on public.deliverable_drive_assets for insert to authenticated
with check (
  (select public.current_user_role()) in ('account_manager','designer','social_media','video_editor')
  and (select public.is_assigned_to_client(client_id))
  and exists (
    select 1 from public.deliverables d where d.id=deliverable_id and d.client_id=client_id and (
      ((select public.current_user_role())='account_manager' and (select public.has_client_role(client_id,'account_manager')))
      or d.assigned_to=(select auth.uid())
    )
  )
);

create policy drive_assets_team_update on public.deliverable_drive_assets for update to authenticated
using (added_by=(select auth.uid()) and (select public.is_assigned_to_client(client_id)))
with check (added_by=(select auth.uid()) and (select public.is_assigned_to_client(client_id)));

create policy drive_assets_team_delete on public.deliverable_drive_assets for delete to authenticated
using (added_by=(select auth.uid()) and (select public.is_assigned_to_client(client_id)));

grant select,insert,update,delete on public.deliverable_drive_assets to authenticated;

-- Client-safe RPC includes only active links explicitly marked visible.
drop function if exists public.client_deliverables();
create function public.client_deliverables()
returns table (
  id uuid, name text, content_type text, description text, status public.deliverable_status,
  priority text, due_date date, scheduled_at timestamptz, file_url text,
  publication_url text, client_comments text, drive_assets jsonb,
  created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path='' as $$
  select d.id,d.name,d.content_type,d.description,d.status,d.priority,d.due_date,d.scheduled_at,
    d.file_url,d.publication_url,d.client_comments,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'name',a.name,'drive_url',a.drive_url,'asset_type',a.asset_type,
        'mime_type',a.mime_type,'is_primary',a.is_primary,'sort_order',a.sort_order
      ) order by a.is_primary desc,a.sort_order,a.created_at)
      from public.deliverable_drive_assets a
      where a.deliverable_id=d.id and a.visible_to_client and a.status='active'
    ),'[]'::jsonb),
    d.created_at,d.updated_at
  from public.deliverables d
  where d.client_id=(select public.current_client_id()) and d.visible_to_client and not d.internal_only
    and (select public.current_user_role())='client';
$$;

revoke all on function public.client_deliverables() from public;
grant execute on function public.client_deliverables() to authenticated;

-- Refresh the existing admin preview contract with nested, client-safe Drive links.
create or replace function public.admin_client_preview(p_client_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if (select public.current_user_role()) <> 'admin' then raise exception 'Admin role required' using errcode='42501'; end if;
  select jsonb_build_object(
    'account',jsonb_build_object('id',c.id,'name',c.name,'brand_name',c.brand_name,'status',c.status,'start_date',c.start_date,'renewal_date',c.renewal_date,'package_usage',c.package_usage,'onboarding_type',c.onboarding_type,'onboarding_completed',c.onboarding_completed),
    'brand',to_jsonb(b)-'internal_notes',
    'deliverables',coalesce((select jsonb_agg((to_jsonb(d)-'internal_comments'-'assigned_to'-'created_by') || jsonb_build_object('drive_assets',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'drive_url',a.drive_url,'asset_type',a.asset_type,'mime_type',a.mime_type,'is_primary',a.is_primary,'sort_order',a.sort_order) order by a.is_primary desc,a.sort_order,a.created_at) from public.deliverable_drive_assets a where a.deliverable_id=d.id and a.visible_to_client and a.status='active'),'[]'::jsonb))) from public.deliverables d where d.client_id=c.id and d.visible_to_client and not d.internal_only),'[]'::jsonb),
    'invoices',coalesce((select jsonb_agg(to_jsonb(i)-'notes'-'assigned_to') from public.invoices i where i.client_id=c.id),'[]'::jsonb),
    'requests',coalesce((select jsonb_agg(to_jsonb(r)-'assigned_to') from public.requests r where r.client_id=c.id),'[]'::jsonb),
    'resources',coalesce((select jsonb_agg(to_jsonb(r)-'created_by') from public.client_resources r where r.client_id=c.id and r.visible_to_client and not r.internal_only),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(to_jsonb(e)-'created_by') from public.calendar_events e where e.client_id=c.id and e.visible_to_client),'[]'::jsonb),
    'confidentiality',jsonb_build_object('active_agreement',to_jsonb(a),'accepted',exists(select 1 from public.client_confidentiality_acceptances ca where ca.client_id=c.id and ca.agreement_id=a.id and ca.agreement_version=a.version))
  ) into result
  from public.clients c
  left join public.client_brand_profiles b on b.client_id=c.id
  left join public.confidentiality_agreements a on a.is_active
  where c.id=p_client_id;
  if result is null then raise exception 'Client not found'; end if;
  return result;
end;
$$;

revoke all on function public.admin_client_preview(uuid) from public;
grant execute on function public.admin_client_preview(uuid) to authenticated;

notify pgrst,'reload schema';
