-- Repair and normalize the packages schema without deleting existing rows.
alter table public.packages
  add column if not exists monthly_price numeric(12,2) default 0,
  add column if not exists included_services jsonb default '[]'::jsonb,
  add column if not exists subtitle text,
  add column if not exists description text,
  add column if not exists price numeric(12,2),
  add column if not exists currency text,
  add column if not exists billing_period text,
  add column if not exists services_included jsonb,
  add column if not exists ideal_for text,
  add column if not exists is_featured boolean,
  add column if not exists is_active boolean,
  add column if not exists button_text text,
  add column if not exists display_order integer default 0,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- If an older installation created services_included as text, preserve every line
-- and convert it into the JSON array expected by the admin form and client cards.
do $$
declare column_type text;
begin
  select c.data_type into column_type
  from information_schema.columns c
  where c.table_schema='public' and c.table_name='packages' and c.column_name='services_included';

  if column_type in ('text','character varying','character') then
    alter table public.packages alter column services_included type jsonb using (
      to_jsonb(array_remove(regexp_split_to_array(coalesce(services_included::text,''), E'\\r?\\n'),''))
    );
  end if;
end;
$$;

update public.packages set
  price=coalesce(price,monthly_price,0),
  currency=coalesce(nullif(currency,''),'DOP'),
  billing_period=coalesce(nullif(billing_period,''),'Mensual'),
  services_included=coalesce(services_included,included_services,'[]'::jsonb),
  is_featured=coalesce(is_featured,false),
  is_active=coalesce(is_active,true),
  button_text=coalesce(nullif(button_text,''),'Solicitar este paquete'),
  display_order=coalesce(display_order,0),
  created_at=coalesce(created_at,now()),
  updated_at=coalesce(updated_at,now());

alter table public.packages
  alter column price set default 0,
  alter column currency set default 'DOP',
  alter column billing_period set default 'Mensual',
  alter column services_included set default '[]'::jsonb,
  alter column is_featured set default false,
  alter column is_active set default true,
  alter column button_text set default 'Solicitar este paquete',
  alter column display_order set default 0,
  alter column display_order set not null,
  alter column services_included set not null,
  alter column is_featured set not null,
  alter column is_active set not null,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.packages drop constraint if exists packages_display_order_nonnegative;
alter table public.packages drop constraint if exists packages_services_included_array;
alter table public.packages add constraint packages_display_order_nonnegative check (coalesce(display_order,0) >= 0);
alter table public.packages add constraint packages_services_included_array check (services_included is null or jsonb_typeof(services_included)='array');

-- Keep the legacy fields used by existing clients and invoices synchronized.
create or replace function public.sync_package_legacy_fields()
returns trigger language plpgsql set search_path='' as $$
begin
  new.display_order:=coalesce(new.display_order,0);
  if tg_op='INSERT' then
    if coalesce(new.price,0)=0 and coalesce(new.monthly_price,0)<>0 then new.price:=new.monthly_price;
    else new.monthly_price:=coalesce(new.price,0); end if;
    if coalesce(jsonb_array_length(new.services_included),0)=0 and coalesce(jsonb_array_length(new.included_services),0)>0 then new.services_included:=new.included_services;
    else new.included_services:=coalesce(new.services_included,'[]'::jsonb); end if;
  else
    if new.price is distinct from old.price then new.monthly_price:=new.price;
    elsif new.monthly_price is distinct from old.monthly_price then new.price:=new.monthly_price;
    else new.price:=coalesce(new.price,new.monthly_price,0); new.monthly_price:=new.price;
    end if;
    if new.services_included is distinct from old.services_included then new.included_services:=new.services_included;
    elsif new.included_services is distinct from old.included_services then new.services_included:=new.included_services;
    else new.services_included:=coalesce(new.services_included,new.included_services,'[]'::jsonb); new.included_services:=new.services_included;
    end if;
  end if;
  new.updated_at:=now();
  return new;
end;
$$;

drop trigger if exists packages_sync_legacy_fields on public.packages;
create trigger packages_sync_legacy_fields before insert or update on public.packages
for each row execute function public.sync_package_legacy_fields();

-- Only active packages are exposed, with null-safe ascending ordering.
create or replace function public.active_packages()
returns table (
  id uuid,name text,subtitle text,description text,price numeric,currency text,billing_period text,
  services_included jsonb,ideal_for text,is_featured boolean,display_order integer,button_text text
)
language sql stable security definer set search_path='' as $$
  select p.id,p.name,p.subtitle,p.description,coalesce(p.price,p.monthly_price,0),
         coalesce(nullif(p.currency,''),'DOP'),coalesce(nullif(p.billing_period,''),'Mensual'),
         coalesce(p.services_included,p.included_services,'[]'::jsonb),p.ideal_for,
         coalesce(p.is_featured,false),coalesce(p.display_order,0),
         coalesce(nullif(p.button_text,''),'Solicitar este paquete')
  from public.packages p
  where coalesce(p.is_active,true)
  order by coalesce(p.display_order,0) asc,p.created_at asc,p.name asc;
$$;

revoke all on function public.active_packages() from public;
grant execute on function public.active_packages() to anon,authenticated;

notify pgrst,'reload schema';
