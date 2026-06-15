-- Extend the existing packages table without deleting legacy data or relationships.
alter table public.packages
  add column if not exists subtitle text,
  add column if not exists price numeric(12,2),
  add column if not exists currency text,
  add column if not exists billing_period text,
  add column if not exists services_included jsonb,
  add column if not exists ideal_for text,
  add column if not exists is_featured boolean,
  add column if not exists display_order integer,
  add column if not exists button_text text;

update public.packages set
  price=coalesce(price,monthly_price,0),
  currency=coalesce(nullif(currency,''),'DOP'),
  billing_period=coalesce(nullif(billing_period,''),'Mensual'),
  services_included=coalesce(services_included,included_services,'[]'::jsonb),
  is_featured=coalesce(is_featured,false),
  display_order=coalesce(display_order,0),
  button_text=coalesce(nullif(button_text,''),'Solicitar este paquete');

alter table public.packages
  alter column price set default 0,
  alter column price set not null,
  alter column currency set default 'DOP',
  alter column currency set not null,
  alter column billing_period set default 'Mensual',
  alter column billing_period set not null,
  alter column services_included set default '[]'::jsonb,
  alter column services_included set not null,
  alter column is_featured set default false,
  alter column is_featured set not null,
  alter column display_order set default 0,
  alter column display_order set not null,
  alter column button_text set default 'Solicitar este paquete',
  alter column button_text set not null;

alter table public.packages drop constraint if exists packages_price_nonnegative;
alter table public.packages drop constraint if exists packages_display_order_nonnegative;
alter table public.packages drop constraint if exists packages_services_included_array;
alter table public.packages add constraint packages_price_nonnegative check (price >= 0);
alter table public.packages add constraint packages_display_order_nonnegative check (display_order >= 0);
alter table public.packages add constraint packages_services_included_array check (jsonb_typeof(services_included)='array');

create or replace function public.sync_package_legacy_fields()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' then
    if coalesce(new.price,0)=0 and coalesce(new.monthly_price,0)<>0 then new.price:=new.monthly_price;
    else new.monthly_price:=coalesce(new.price,0); end if;
    if coalesce(jsonb_array_length(new.services_included),0)=0 and coalesce(jsonb_array_length(new.included_services),0)>0 then new.services_included:=new.included_services;
    else new.included_services:=coalesce(new.services_included,'[]'::jsonb); end if;
  else
    if new.price is distinct from old.price then new.monthly_price:=new.price;
    elsif new.monthly_price is distinct from old.monthly_price then new.price:=new.monthly_price;
    end if;
    if new.services_included is distinct from old.services_included then new.included_services:=new.services_included;
    elsif new.included_services is distinct from old.included_services then new.services_included:=new.included_services;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists packages_sync_legacy_fields on public.packages;
create trigger packages_sync_legacy_fields before insert or update on public.packages
for each row execute function public.sync_package_legacy_fields();

insert into public.packages(name,subtitle,description,price,monthly_price,currency,billing_period,services_included,included_services,ideal_for,is_featured,is_active,display_order,button_text)
select seed.name,seed.subtitle,seed.description,seed.price,seed.price,'DOP',seed.billing_period,seed.services,seed.services,seed.ideal_for,seed.is_featured,true,seed.display_order,'Solicitar este paquete'
from (values
  ('Paquete Esencial','Presencia digital básica y profesional','Ideal para negocios que necesitan mantener sus redes activas, organizadas y con una imagen profesional.',8000::numeric,'Mensual',jsonb_build_array('Diagnóstico inicial de la marca','Calendario de contenido mensual','Diseño de 8 publicaciones estáticas','Diseño de 4 historias','Redacción de copies para publicaciones','Optimización básica del perfil','Recomendaciones básicas de contenido','1 reunión mensual de seguimiento'),'Emprendedores, marcas pequeñas y negocios que quieren iniciar con una presencia digital más organizada.',false,1),
  ('Paquete Crecimiento','Contenido estratégico para marcas en movimiento','Ideal para marcas que ya venden y necesitan mejorar su comunicación, presencia digital y constancia en redes.',14000::numeric,'Mensual',jsonb_build_array('Diagnóstico estratégico de redes','Calendario de contenido mensual','Diseño de 12 publicaciones','Diseño de hasta 2 carruseles','Edición de 2 reels simples con material enviado por el cliente','Diseño de 8 historias','Redacción de copies estratégicos','Optimización de perfil','Reporte mensual básico','1 reunión estratégica mensual'),'Negocios en crecimiento, marcas personales, tiendas, servicios profesionales y emprendimientos activos.',true,2),
  ('Paquete Estratégico','Gestión de contenido con enfoque comercial','Ideal para negocios que necesitan una comunicación digital más fuerte, constante y orientada a resultados.',22000::numeric,'Mensual',jsonb_build_array('Auditoría inicial de comunicación digital','Estrategia mensual de contenido','Calendario de publicaciones mensual','Diseño de 16 publicaciones','Diseño de hasta 4 carruseles','Edición de 4 reels con material enviado por el cliente','Diseño de 12 historias','Copywriting estratégico','Optimización avanzada del perfil','Reporte mensual de métricas','2 reuniones mensuales de seguimiento','Recomendaciones para mejorar ventas y comunicación'),'Marcas en crecimiento, clínicas, academias, eventos, tiendas y empresas de servicios.',false,3),
  ('Paquete Dirección Digital','Acompañamiento estratégico completo','Ideal para empresas, instituciones, eventos o marcas que necesitan dirección, contenido y acompañamiento digital constante.',35000::numeric,'Mensual',jsonb_build_array('Auditoría digital completa','Dirección estratégica mensual','Plan de campaña mensual','Calendario completo de contenido','Diseño de 20 publicaciones','Diseño de hasta 5 carruseles','Edición de 6 reels con material enviado por el cliente','Diseño de 16 historias','Copywriting completo','Optimización avanzada de perfil','Reporte mensual con análisis y recomendaciones','Hasta 3 reuniones mensuales','Supervisión básica de anuncios en Meta Ads','Soporte vía WhatsApp para consultas puntuales','Acompañamiento estratégico mensual'),'Empresas, eventos, instituciones, marcas con varios servicios y negocios que desean delegar su comunicación digital.',false,4)
) as seed(name,subtitle,description,price,billing_period,services,ideal_for,is_featured,display_order)
where not exists (select 1 from public.packages existing where lower(existing.name)=lower(seed.name));

-- Safe package catalog for the public site and authenticated client portal.
create or replace function public.active_packages()
returns table (
  id uuid,name text,subtitle text,description text,price numeric,currency text,billing_period text,
  services_included jsonb,ideal_for text,is_featured boolean,display_order integer,button_text text
)
language sql stable security definer set search_path='' as $$
  select p.id,p.name,p.subtitle,p.description,p.price,p.currency,p.billing_period,
         p.services_included,p.ideal_for,p.is_featured,p.display_order,p.button_text
  from public.packages p
  where p.is_active
  order by p.display_order,p.created_at;
$$;
revoke all on function public.active_packages() from public;
grant execute on function public.active_packages() to anon,authenticated;

notify pgrst,'reload schema';
