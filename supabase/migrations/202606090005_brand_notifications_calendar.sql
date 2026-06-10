-- BIEM phase 1-3: brand profile, admin preview, email history/preferences and calendar MVP.
-- Apply after 202606090004_fix_profile_relationships.sql.

create table if not exists public.client_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  brand_logo_url text,
  brand_cover_image_url text,
  brand_name text,
  industry text,
  brand_summary text,
  brand_about text,
  target_audience text,
  value_proposition text,
  communication_tone text,
  brand_colors jsonb not null default '[]'::jsonb,
  typography text,
  website_url text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  whatsapp_number text,
  location text,
  main_products_services text,
  important_links jsonb not null default '[]'::jsonb,
  visible_notes text,
  internal_notes text,
  client_suggestions_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  request_updates boolean not null default true,
  deliverable_updates boolean not null default true,
  invoice_updates boolean not null default true,
  recommendation_updates boolean not null default true,
  calendar_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id,user_id)
);

create table if not exists public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  notification_type text not null check (notification_type in ('client_registered','request_created','request_updated','deliverable_ready','invoice_created','invoice_reminder','recommendation_created','calendar_invitation','calendar_updated')),
  recipient_email text not null,
  subject text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  related_entity_type text,
  related_entity_id uuid,
  sent_at timestamptz,
  error_message text,
  provider_message_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  google_event_id text,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text not null default 'America/New_York',
  location text,
  google_meet_link text,
  attendees jsonb not null default '[]'::jsonb,
  status text not null default 'scheduled' check (status in ('scheduled','reschedule_requested','cancelled','completed')),
  visible_to_client boolean not null default true,
  reschedule_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists brand_profiles_client_idx on public.client_brand_profiles(client_id);
create index if not exists notification_preferences_client_idx on public.client_notification_preferences(client_id,user_id);
create index if not exists email_notifications_client_idx on public.email_notifications(client_id,created_at desc);
create index if not exists email_notifications_status_idx on public.email_notifications(status,created_at);
create index if not exists calendar_events_client_start_idx on public.calendar_events(client_id,start_time);

drop trigger if exists client_brand_profiles_updated_at on public.client_brand_profiles;
create trigger client_brand_profiles_updated_at before update on public.client_brand_profiles for each row execute function public.set_updated_at();
drop trigger if exists client_notification_preferences_updated_at on public.client_notification_preferences;
create trigger client_notification_preferences_updated_at before update on public.client_notification_preferences for each row execute function public.set_updated_at();
drop trigger if exists calendar_events_updated_at on public.calendar_events;
create trigger calendar_events_updated_at before update on public.calendar_events for each row execute function public.set_updated_at();

alter table public.client_brand_profiles enable row level security;
alter table public.client_notification_preferences enable row level security;
alter table public.email_notifications enable row level security;
alter table public.calendar_events enable row level security;

create policy brand_profiles_admin_all on public.client_brand_profiles for all to authenticated
using ((select public.current_user_role())='admin') with check ((select public.current_user_role())='admin');
create policy brand_profiles_team_select on public.client_brand_profiles for select to authenticated
using ((select public.is_assigned_to_client(client_id)) and (select public.current_user_role()) in ('account_manager','designer','social_media','video_editor'));
create policy brand_profiles_account_manager_update on public.client_brand_profiles for update to authenticated
using ((select public.current_user_role())='account_manager' and (select public.has_client_role(client_id,'account_manager')))
with check ((select public.current_user_role())='account_manager' and (select public.has_client_role(client_id,'account_manager')));

create policy notification_preferences_admin_all on public.client_notification_preferences for all to authenticated
using ((select public.current_user_role())='admin') with check ((select public.current_user_role())='admin');
create policy notification_preferences_own_select on public.client_notification_preferences for select to authenticated
using (user_id=(select auth.uid()) and client_id=(select public.current_client_id()));
create policy notification_preferences_own_insert on public.client_notification_preferences for insert to authenticated
with check (user_id=(select auth.uid()) and client_id=(select public.current_client_id()));
create policy notification_preferences_own_update on public.client_notification_preferences for update to authenticated
using (user_id=(select auth.uid()) and client_id=(select public.current_client_id()))
with check (user_id=(select auth.uid()) and client_id=(select public.current_client_id()));

create policy email_notifications_admin_select on public.email_notifications for select to authenticated
using ((select public.current_user_role())='admin');
create policy email_notifications_own_select on public.email_notifications for select to authenticated
using (user_id=(select auth.uid()) and client_id=(select public.current_client_id()));

create policy calendar_events_admin_all on public.calendar_events for all to authenticated
using ((select public.current_user_role())='admin') with check ((select public.current_user_role())='admin');
create policy calendar_events_client_select on public.calendar_events for select to authenticated
using ((select public.current_user_role())='client' and client_id=(select public.current_client_id()) and visible_to_client);
create policy calendar_events_account_manager_select on public.calendar_events for select to authenticated
using ((select public.current_user_role())='account_manager' and (select public.has_client_role(client_id,'account_manager')));
create policy calendar_events_account_manager_insert on public.calendar_events for insert to authenticated
with check ((select public.current_user_role())='account_manager' and (select public.has_client_role(client_id,'account_manager')));
create policy calendar_events_account_manager_update on public.calendar_events for update to authenticated
using ((select public.current_user_role())='account_manager' and (select public.has_client_role(client_id,'account_manager')))
with check ((select public.current_user_role())='account_manager' and (select public.has_client_role(client_id,'account_manager')));

-- Client-safe brand profile, calendar and preferences contracts.
create or replace function public.client_brand_profile()
returns table (
  id uuid, client_id uuid, brand_logo_url text, brand_cover_image_url text, brand_name text,
  industry text, brand_summary text, brand_about text, target_audience text,
  value_proposition text, communication_tone text, brand_colors jsonb, typography text,
  website_url text, instagram_url text, facebook_url text, tiktok_url text,
  whatsapp_number text, location text, main_products_services text, important_links jsonb,
  visible_notes text, client_suggestions_enabled boolean, updated_at timestamptz
)
language sql stable security definer set search_path='' as $$
  select b.id,b.client_id,b.brand_logo_url,b.brand_cover_image_url,coalesce(b.brand_name,c.brand_name),
    b.industry,b.brand_summary,b.brand_about,b.target_audience,b.value_proposition,b.communication_tone,
    b.brand_colors,b.typography,b.website_url,b.instagram_url,b.facebook_url,b.tiktok_url,b.whatsapp_number,
    b.location,b.main_products_services,b.important_links,b.visible_notes,b.client_suggestions_enabled,b.updated_at
  from public.clients c left join public.client_brand_profiles b on b.client_id=c.id
  where c.id=(select public.current_client_id()) and (select public.current_user_role())='client';
$$;

create or replace function public.client_calendar_events()
returns table (id uuid,title text,description text,start_time timestamptz,end_time timestamptz,timezone text,location text,google_meet_link text,attendees jsonb,status text,reschedule_note text)
language sql stable security definer set search_path='' as $$
  select e.id,e.title,e.description,e.start_time,e.end_time,e.timezone,e.location,e.google_meet_link,e.attendees,e.status,e.reschedule_note
  from public.calendar_events e where e.client_id=(select public.current_client_id()) and e.visible_to_client and (select public.current_user_role())='client'
  order by e.start_time;
$$;

create or replace function public.admin_client_preview(p_client_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if (select public.current_user_role()) <> 'admin' then raise exception 'Admin role required' using errcode='42501'; end if;
  select jsonb_build_object(
    'account',jsonb_build_object('id',c.id,'name',c.name,'brand_name',c.brand_name,'status',c.status,'start_date',c.start_date,'renewal_date',c.renewal_date,'package_usage',c.package_usage,'onboarding_type',c.onboarding_type,'onboarding_completed',c.onboarding_completed),
    'brand',to_jsonb(b)-'internal_notes',
    'deliverables',coalesce((select jsonb_agg(to_jsonb(d)-'internal_comments'-'assigned_to'-'created_by') from public.deliverables d where d.client_id=c.id and d.visible_to_client and not d.internal_only),'[]'::jsonb),
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

create or replace function public.update_client_brand_basics(p_payload jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare target_id uuid;
begin
  if (select public.current_user_role()) <> 'client' then raise exception 'Client role required' using errcode='42501'; end if;
  if not exists(select 1 from public.clients where id=(select public.current_client_id()) and not onboarding_completed) then
    raise exception 'Brand basics can only be updated during onboarding or account update' using errcode='42501';
  end if;
  insert into public.client_brand_profiles(client_id,brand_logo_url,brand_name,industry,brand_summary,brand_about,website_url,instagram_url,facebook_url,tiktok_url,whatsapp_number,location,main_products_services)
  values ((select public.current_client_id()),p_payload->>'brand_logo_url',p_payload->>'brand_name',p_payload->>'industry',p_payload->>'brand_summary',p_payload->>'brand_about',p_payload->>'website_url',p_payload->>'instagram_url',p_payload->>'facebook_url',p_payload->>'tiktok_url',p_payload->>'whatsapp_number',p_payload->>'location',p_payload->>'main_products_services')
  on conflict(client_id) do update set
    brand_logo_url=coalesce(excluded.brand_logo_url,client_brand_profiles.brand_logo_url),brand_name=coalesce(excluded.brand_name,client_brand_profiles.brand_name),industry=excluded.industry,
    brand_summary=excluded.brand_summary,brand_about=excluded.brand_about,website_url=excluded.website_url,instagram_url=excluded.instagram_url,facebook_url=excluded.facebook_url,tiktok_url=excluded.tiktok_url,
    whatsapp_number=excluded.whatsapp_number,location=excluded.location,main_products_services=excluded.main_products_services;
end;
$$;

create or replace function public.request_calendar_reschedule(p_event_id uuid,p_note text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if (select public.current_user_role()) <> 'client' then raise exception 'Client role required' using errcode='42501'; end if;
  update public.calendar_events set status='reschedule_requested',reschedule_note=nullif(trim(p_note),'')
  where id=p_event_id and client_id=(select public.current_client_id()) and visible_to_client and status='scheduled';
  if not found then raise exception 'Event not available'; end if;
end;
$$;

revoke all on function public.client_brand_profile() from public;
revoke all on function public.client_calendar_events() from public;
revoke all on function public.admin_client_preview(uuid) from public;
revoke all on function public.update_client_brand_basics(jsonb) from public;
revoke all on function public.request_calendar_reschedule(uuid,text) from public;
grant execute on function public.client_brand_profile(),public.client_calendar_events(),public.update_client_brand_basics(jsonb),public.request_calendar_reschedule(uuid,text) to authenticated;
grant execute on function public.admin_client_preview(uuid) to authenticated;

grant select,insert,update,delete on public.client_brand_profiles,public.client_notification_preferences,public.email_notifications,public.calendar_events to authenticated;

-- Public brand assets. Object paths must begin with clients/{client_id}/brand/.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('client-brand-assets','client-brand-assets',true,10485760,array['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists brand_assets_public_read on storage.objects;
drop policy if exists brand_assets_admin_all on storage.objects;
drop policy if exists brand_assets_client_insert on storage.objects;
drop policy if exists brand_assets_client_update on storage.objects;
create policy brand_assets_public_read on storage.objects for select using (bucket_id='client-brand-assets');
create policy brand_assets_admin_all on storage.objects for all to authenticated
using (bucket_id='client-brand-assets' and (select public.current_user_role())='admin')
with check (bucket_id='client-brand-assets' and (select public.current_user_role())='admin');
create policy brand_assets_client_insert on storage.objects for insert to authenticated
with check (bucket_id='client-brand-assets' and (select public.current_user_role())='client' and (storage.foldername(name))[1]='clients' and (storage.foldername(name))[2]=(select public.current_client_id())::text and (storage.foldername(name))[3]='brand');
create policy brand_assets_client_update on storage.objects for update to authenticated
using (bucket_id='client-brand-assets' and (storage.foldername(name))[1]='clients' and (storage.foldername(name))[2]=(select public.current_client_id())::text and (storage.foldername(name))[3]='brand')
with check (bucket_id='client-brand-assets' and (storage.foldername(name))[1]='clients' and (storage.foldername(name))[2]=(select public.current_client_id())::text and (storage.foldername(name))[3]='brand');

notify pgrst,'reload schema';
