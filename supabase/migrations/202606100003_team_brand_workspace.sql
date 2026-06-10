-- Assigned-brand directory for BIEM collaborators.
-- Extends the internal team workspace without exposing financial or admin-only fields.

create or replace function public.team_brand_directory()
returns table (
  id uuid,
  name text,
  brand_name text,
  status public.record_status,
  onboarding_type text,
  onboarding_completed boolean,
  role_on_client text,
  contact_email text,
  contact_phone text
)
language sql stable security definer set search_path='' as $$
  select c.id,c.name,c.brand_name,c.status,c.onboarding_type,c.onboarding_completed,
    assignment.role_on_client,c.email,c.phone
  from public.client_team_assignments assignment
  join public.clients c on c.id=assignment.client_id
  where assignment.user_id=(select auth.uid())
    and assignment.is_active
    and (select public.current_user_role()) in ('account_manager','designer','social_media','video_editor');
$$;
revoke all on function public.team_brand_directory() from public;
grant execute on function public.team_brand_directory() to authenticated;

-- Every assigned collaborator may see upcoming meetings for operational context.
drop policy if exists calendar_events_team_select on public.calendar_events;
create policy calendar_events_team_select on public.calendar_events for select to authenticated
using (
  (select public.current_user_role()) in ('account_manager','designer','social_media','video_editor')
  and (select public.is_assigned_to_client(client_id))
);

notify pgrst,'reload schema';
