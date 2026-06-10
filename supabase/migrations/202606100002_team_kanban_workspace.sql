-- BIEM internal team Kanban workspace.
-- Extends internal_tasks without exposing finance or admin-only notes.

alter table public.internal_tasks drop constraint if exists internal_tasks_task_type_check;
alter table public.internal_tasks drop constraint if exists internal_tasks_status_check;
alter table public.internal_tasks drop constraint if exists internal_tasks_priority_check;

-- Normalize legacy workflow values before installing the Kanban constraints.
update public.internal_tasks set status=case
  when status='pending' then 'todo'
  when status in ('ready_for_review','changes_requested','corrected') then 'in_review'
  when status='paused' then 'todo'
  else status end
where status in ('pending','ready_for_review','changes_requested','corrected','paused');

alter table public.internal_tasks alter column due_date type timestamptz using case when due_date is null then null else due_date::timestamp at time zone 'UTC' end;

alter table public.internal_tasks
  add column if not exists deliverable_id uuid references public.deliverables(id) on delete set null,
  add column if not exists completed_at timestamptz,
  add column if not exists labels jsonb not null default '[]'::jsonb,
  add column if not exists primary_text text,
  add column if not exists secondary_text text,
  add column if not exists call_to_action text,
  add column if not exists visual_instructions text;

update public.internal_tasks set deliverable_id=related_deliverable_id
where deliverable_id is null and related_deliverable_id is not null;

alter table public.internal_tasks
  add constraint internal_tasks_task_type_check check (task_type in ('design','video','copy','social_media','strategy','review','administration','meeting','publication','client_delivery')),
  add constraint internal_tasks_status_check check (status in ('todo','in_progress','in_review','completed')),
  add constraint internal_tasks_priority_check check (priority in ('low','medium','high','urgent'));

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.internal_tasks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  comment text not null check (length(trim(comment)) > 0),
  is_internal boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.internal_tasks(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null default auth.uid(),
  provider text not null default 'google_drive' check (provider in ('google_drive','external')),
  file_name text not null,
  file_url text not null,
  file_type text,
  visible_to_client boolean not null default false,
  created_at timestamptz not null default now(),
  constraint task_attachments_drive_url check (provider<>'google_drive' or file_url ~* '^https://(drive|docs)\.google\.com/')
);

create index if not exists task_comments_task_idx on public.task_comments(task_id,created_at);
create index if not exists task_attachments_task_idx on public.task_attachments(task_id,created_at);
create index if not exists internal_tasks_kanban_idx on public.internal_tasks(status,priority,due_date);

create or replace function public.validate_task_attachment_client()
returns trigger language plpgsql security definer set search_path='' as $$
declare expected_client uuid;
begin
  select client_id into expected_client from public.internal_tasks where id=new.task_id;
  if expected_client is null then raise exception 'Task not found' using errcode='23503'; end if;
  if new.client_id<>expected_client then raise exception 'Attachment client must match task client' using errcode='23514'; end if;
  return new;
end;
$$;
drop trigger if exists validate_task_attachment_client on public.task_attachments;
create trigger validate_task_attachment_client before insert or update of task_id,client_id on public.task_attachments
for each row execute function public.validate_task_attachment_client();

alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;

create or replace function public.can_access_team_task(p_task_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.internal_tasks t
    where t.id=p_task_id and public.is_assigned_to_client(t.client_id) and (
      public.current_user_role()='account_manager'
      or t.assigned_to=(select auth.uid())
      or (public.current_user_role()='designer' and t.task_type='design' and t.visible_to_designer)
      or (public.current_user_role()='video_editor' and t.task_type='video' and t.visible_to_video_editor)
      or (public.current_user_role()='social_media' and t.task_type in ('social_media','copy','publication','client_delivery') and t.visible_to_social_media)
    )
  );
$$;
grant execute on function public.can_access_team_task(uuid) to authenticated;

create policy task_comments_admin_all on public.task_comments for all to authenticated
using ((select public.current_user_role())='admin') with check ((select public.current_user_role())='admin');
create policy task_comments_team_select on public.task_comments for select to authenticated
using (is_internal and (select public.can_access_team_task(task_id)));
create policy task_comments_team_insert on public.task_comments for insert to authenticated
with check (user_id=(select auth.uid()) and is_internal and (select public.can_access_team_task(task_id)));
create policy task_comments_author_update on public.task_comments for update to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and is_internal);
create policy task_comments_author_delete on public.task_comments for delete to authenticated using (user_id=(select auth.uid()));

create policy task_attachments_admin_all on public.task_attachments for all to authenticated
using ((select public.current_user_role())='admin') with check ((select public.current_user_role())='admin');
create policy task_attachments_team_select on public.task_attachments for select to authenticated
using ((select public.can_access_team_task(task_id)));
create policy task_attachments_team_insert on public.task_attachments for insert to authenticated
with check (uploaded_by=(select auth.uid()) and (select public.can_access_team_task(task_id)) and exists(select 1 from public.internal_tasks t where t.id=task_id and t.client_id=client_id));
create policy task_attachments_author_update on public.task_attachments for update to authenticated
using (uploaded_by=(select auth.uid())) with check (uploaded_by=(select auth.uid()) and (select public.is_assigned_to_client(client_id)));
create policy task_attachments_author_delete on public.task_attachments for delete to authenticated using (uploaded_by=(select auth.uid()));

grant select,insert,update,delete on public.task_comments,public.task_attachments to authenticated;

-- Specialists can update workflow fields only; completion is reserved for account managers/admins.
create or replace function public.limit_specialist_task_updates()
returns trigger language plpgsql security definer set search_path='' as $$
declare actor_role text;
begin
  actor_role:=(select public.current_user_role());
  if actor_role not in ('designer','social_media','video_editor') then return new; end if;
  if old.assigned_to<>(select auth.uid()) then raise exception 'Task is not assigned to this user' using errcode='42501'; end if;
  if new.status='completed' then raise exception 'Specialists cannot complete tasks requiring review' using errcode='42501'; end if;
  if new.status not in ('todo','in_progress','in_review') then raise exception 'Invalid specialist status' using errcode='42501'; end if;
  if new.client_id is distinct from old.client_id or new.assigned_to is distinct from old.assigned_to or new.created_by is distinct from old.created_by
    or new.task_type is distinct from old.task_type or new.title is distinct from old.title or new.description is distinct from old.description
    or new.priority is distinct from old.priority or new.due_date is distinct from old.due_date or new.deliverable_id is distinct from old.deliverable_id
    or new.visible_to_client is distinct from old.visible_to_client or new.internal_only is distinct from old.internal_only
    or new.labels is distinct from old.labels or new.primary_text is distinct from old.primary_text or new.secondary_text is distinct from old.secondary_text
    or new.call_to_action is distinct from old.call_to_action or new.visual_instructions is distinct from old.visual_instructions
  then raise exception 'Specialists may only update task status, result and internal comment' using errcode='42501'; end if;
  return new;
end;
$$;

-- Maintain completion timestamp automatically.
create or replace function public.sync_task_completed_at()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.status='completed' and (tg_op='INSERT' or old.status is distinct from 'completed') then new.completed_at=now(); end if;
  if new.status<>'completed' then new.completed_at=null; end if;
  return new;
end;
$$;
drop trigger if exists sync_internal_task_completed_at on public.internal_tasks;
create trigger sync_internal_task_completed_at before insert or update on public.internal_tasks
for each row execute function public.sync_task_completed_at();


-- Kanban visibility: account managers see assigned clients; specialists see their own or role-relevant tasks for assigned brands.
drop policy if exists internal_tasks_select on public.internal_tasks;
create policy internal_tasks_select on public.internal_tasks for select to authenticated using (
  (select public.current_user_role())='admin'
  or ((select public.current_user_role())='account_manager' and (select public.has_client_role(client_id,'account_manager')) and visible_to_account_manager)
  or ((select public.current_user_role())='designer' and (select public.is_assigned_to_client(client_id)) and (assigned_to=(select auth.uid()) or (task_type='design' and visible_to_designer)))
  or ((select public.current_user_role())='video_editor' and (select public.is_assigned_to_client(client_id)) and (assigned_to=(select auth.uid()) or (task_type='video' and visible_to_video_editor)))
  or ((select public.current_user_role())='social_media' and (select public.is_assigned_to_client(client_id)) and (assigned_to=(select auth.uid()) or (task_type in ('social_media','copy','publication','client_delivery') and visible_to_social_media)))
);

create or replace function public.team_client_members()
returns table (client_id uuid,user_id uuid,full_name text,email text,role text,role_on_client text)
language sql stable security definer set search_path='' as $$
  select mine.client_id,member.user_id,p.full_name,p.email,p.role,member.role_on_client
  from public.client_team_assignments mine
  join public.client_team_assignments member on member.client_id=mine.client_id and member.is_active
  join public.profiles p on p.id=member.user_id
  where mine.user_id=(select auth.uid()) and mine.is_active
    and (select public.current_user_role()) in ('account_manager','designer','social_media','video_editor');
$$;
revoke all on function public.team_client_members() from public;
grant execute on function public.team_client_members() to authenticated;

-- Brand context for assigned collaborators without finance or admin-only notes.
create or replace function public.team_brand_context()
returns table (
  client_id uuid, brand_logo_url text, brand_name text, industry text, brand_summary text,
  brand_about text, target_audience text, value_proposition text, communication_tone text,
  brand_colors jsonb, typography text, website_url text, instagram_url text, facebook_url text,
  tiktok_url text, whatsapp_number text, location text, main_products_services text,
  important_links jsonb, visible_notes text
)
language sql stable security definer set search_path='' as $$
  select b.client_id,b.brand_logo_url,coalesce(b.brand_name,c.brand_name),b.industry,b.brand_summary,
    b.brand_about,b.target_audience,b.value_proposition,b.communication_tone,b.brand_colors,b.typography,
    b.website_url,b.instagram_url,b.facebook_url,b.tiktok_url,b.whatsapp_number,b.location,
    b.main_products_services,b.important_links,b.visible_notes
  from public.client_team_assignments a
  join public.clients c on c.id=a.client_id
  left join public.client_brand_profiles b on b.client_id=c.id
  where a.user_id=(select auth.uid()) and a.is_active
    and (select public.current_user_role()) in ('account_manager','designer','social_media','video_editor');
$$;
revoke all on function public.team_brand_context() from public;
grant execute on function public.team_brand_context() to authenticated;

notify pgrst,'reload schema';
