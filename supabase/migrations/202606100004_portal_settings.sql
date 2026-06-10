-- Global agency branding and visual theme configuration.
create table if not exists public.portal_settings (
  id boolean primary key default true check (id),
  agency_name text not null default 'Biem Digital',
  portal_name text not null default 'Portal Biem',
  commercial_name text not null default 'Biem Digital',
  main_logo_url text,
  icon_logo_url text,
  favicon_url text,
  welcome_message text not null default 'Tu trabajo. Tu equipo. En un solo lugar.',
  support_email text,
  support_whatsapp text,
  website_url text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  primary_color text not null default '#4B0082' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  soft_color text not null default '#E6E6FA' check (soft_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#C46A2D' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color text not null default '#F6F3FB' check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text not null default '#1F1A24' check (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  muted_text_color text not null default '#6B6472' check (muted_text_color ~ '^#[0-9A-Fa-f]{6}$'),
  border_color text not null default '#D8D2E6' check (border_color ~ '^#[0-9A-Fa-f]{6}$'),
  card_color text not null default '#FFFFFF' check (card_color ~ '^#[0-9A-Fa-f]{6}$'),
  border_radius integer not null default 12 check (border_radius between 0 and 32),
  card_style text not null default 'outlined' check (card_style in ('outlined','elevated','flat')),
  theme_mode text not null default 'light' check (theme_mode in ('light','dark')),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.portal_settings(id) values (true) on conflict (id) do nothing;

alter table public.portal_settings enable row level security;
drop policy if exists portal_settings_public_read on public.portal_settings;
drop policy if exists portal_settings_admin_insert on public.portal_settings;
drop policy if exists portal_settings_admin_update on public.portal_settings;
create policy portal_settings_public_read on public.portal_settings for select to anon, authenticated using (true);
create policy portal_settings_admin_insert on public.portal_settings for insert to authenticated
with check ((select public.current_user_role())='admin');
create policy portal_settings_admin_update on public.portal_settings for update to authenticated
using ((select public.current_user_role())='admin')
with check ((select public.current_user_role())='admin');

grant select on public.portal_settings to anon, authenticated;
grant insert,update on public.portal_settings to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('portal-brand-assets','portal-brand-assets',true,5242880,array['image/png','image/jpeg','image/webp','image/svg+xml','image/x-icon','image/vnd.microsoft.icon'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists portal_brand_assets_public_read on storage.objects;
drop policy if exists portal_brand_assets_admin_all on storage.objects;
create policy portal_brand_assets_public_read on storage.objects for select using (bucket_id='portal-brand-assets');
create policy portal_brand_assets_admin_all on storage.objects for all to authenticated
using (bucket_id='portal-brand-assets' and (select public.current_user_role())='admin')
with check (bucket_id='portal-brand-assets' and (select public.current_user_role())='admin');

notify pgrst,'reload schema';
