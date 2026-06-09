# Supabase: autenticación, roles y RLS

## 1. Aplicar la migración

Las migraciones principales están en:

```text
supabase/migrations/202606060001_auth_roles_and_portal.sql
supabase/migrations/202606080001_admin_crud_policies.sql
```

La segunda migración refuerza las políticas CRUD administrativas para `clients`, `packages`, `invoices`, `deliverables`, `requests` y `extra_services`, usando `public.current_user_role()` como helper seguro basado en `public.profiles`.

Con Supabase CLI:

```bash
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

También puede ejecutarse como una única operación desde **Supabase Dashboard → SQL Editor**.

La migración crea:

- `profiles`, vinculada uno-a-uno con `auth.users`.
- `clients`, `packages`, `invoices`, `deliverables`, `requests` y `extra_services`.
- Validación de roles y enumeraciones para estados operativos.
- Trigger para crear el perfil de cada nuevo usuario.
- Funciones privadas para consultar rol y `client_id` desde RLS.
- Función pública `get_current_user_role()` para consultar el rol actual.
- Políticas RLS e índices de las columnas utilizadas para aislamiento.

## 2. Variables de entorno

Copia `.env.example` y configura en Vercel:

```text
SUPABASE_URL=https://TU_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Usa únicamente la publishable key —o la anon key heredada— en el frontend. **Nunca** expongas la `service_role` o secret key. El build genera `dist/config.js` con estas credenciales públicas.

Después de cambiar variables en Vercel, ejecuta un redeploy sin reutilizar el build cache.

## 3. Crear usuarios y asignar roles

Crea usuarios desde **Authentication → Users**. El trigger crea su perfil con rol `viewer` por defecto, que es la opción más restrictiva.

Asigna el rol desde SQL o desde una operación administrativa segura:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@biemdigital.com';
```

Para un cliente, crea primero el registro de `clients` y luego asigna el perfil:

```sql
update public.profiles
set role = 'client', client_id = 'UUID_DEL_CLIENTE'
where email = 'cliente@empresa.com';
```

Para miembros del equipo:

```sql
update public.profiles
set role = 'team', client_id = null
where email = 'equipo@biemdigital.com';
```

Los registros asignados al equipo deben guardar el UUID del usuario en `assigned_to`.

## 4. Rutas protegidas

| Ruta | Acceso |
|---|---|
| `/login` | Público; redirige si ya existe sesión |
| `/dashboard` | Cualquier usuario autenticado; muestra la experiencia según su rol |
| `/cliente` | `client` y `admin` |
| `/admin` | Solo `admin` |

La migración operativa más reciente reemplaza el rol genérico `team` por roles especializados. Un perfil `viewer` no recibe acceso operativo hasta que un administrador le asigne uno de esos roles. Las restricciones reales no dependen de la interfaz: PostgreSQL vuelve a validarlas en cada consulta mediante RLS.

## 5. Matriz de acceso RLS

- **admin:** lectura y escritura global en `clients`, `packages`, `invoices`, `deliverables`, `requests` y `extra_services`.
- **client:** lectura de filas cuyo `client_id` coincide con su perfil; sin permisos de escritura en las tablas administrativas.
- **Roles de equipo:** acceso limitado por `client_team_assignments`, visibilidad y tareas asignadas.
- **viewer:** perfil pendiente de clasificación, sin acceso operativo en la política más reciente.

Los paquetes asignados y servicios adicionales activos se exponen al cliente mediante funciones seguras. Las facturas no pueden ser modificadas por clientes ni colaboradores.

## 6. Función de rol

Desde SQL:

```sql
select public.current_user_role();
-- o también:
select public.get_current_user_role();
```

Desde JavaScript:

```js
const { data: role, error } = await supabase.rpc('get_current_user_role')
```

El frontend obtiene además el perfil completo mediante `profiles`, protegido por la política de perfil propio.

## 7. Recomendaciones de producción

- Desactiva registros públicos si las cuentas serán creadas exclusivamente por BIEM.
- Activa confirmación de email y MFA para usuarios administrativos.
- Crea usuarios privilegiados mediante un backend/Edge Function con la secret key; nunca desde el navegador.
- Prueba cada rol con usuarios separados antes de cargar datos reales.
- Añade políticas de Storage equivalentes antes de subir archivos de entregables.


## 8. SQL completo para reforzar CRUD admin

Si ya aplicaste la migración inicial y quieres ejecutar únicamente la corrección de políticas CRUD, usa el archivo:

```text
supabase/migrations/202606080001_admin_crud_policies.sql
```

Ese SQL recrea las políticas de acceso para que solo `role = 'admin'` pueda hacer `insert`, `update` y `delete` en:

- `clients`
- `packages`
- `invoices`
- `deliverables`
- `requests`
- `extra_services`

Los usuarios `viewer` y `client` no tienen políticas de actualización o eliminación. El frontend usa la publishable key y las políticas RLS como fuente final de autorización.

## 9. Corrección de CRUD administrativo (9 de junio de 2026)

Para habilitar CRUD completo de administradores, incluida la tabla `profiles`, aplica después de la migración inicial:

```text
supabase/migrations/202606090001_admin_full_crud_and_profile_policies.sql
```

La migración mantiene RLS activo, concede privilegios del Data API a usuarios autenticados y deja que las políticas autoricen las operaciones. Solo un usuario cuyo registro en `public.profiles` tenga `role = 'admin'` puede insertar, actualizar o eliminar.

Verifica el rol del usuario desde SQL Editor reemplazando el correo:

```sql
select u.id, u.email, p.full_name, p.role, p.client_id
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('tu-correo@empresa.com');
```

Si el perfil existe pero no tiene el rol correcto, realiza el cambio explícitamente desde SQL Editor con una cuenta autorizada:

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('tu-correo@empresa.com');
```

Cierra sesión y vuelve a entrar después de modificar el rol para que el frontend vuelva a cargar el perfil.

## 10. Pantalla privada de primer acceso y confidencialidad

Aplica esta migración después del esquema y las políticas administrativas:

```text
supabase/migrations/202606090002_client_confidentiality_gate.sql
```

La migración agrega `onboarding_type` y `onboarding_completed` a `clients`, crea las tablas `confidentiality_agreements` y `client_confidentiality_acceptances`, instala el compromiso inicial `2026.06-v1`, mantiene RLS activo y expone funciones seguras para aceptar o activar una versión.

El flujo del cliente queda protegido en `/client/first-access`, `/client/onboarding`, `/client/update-info` y `/client/dashboard`. Cualquier entrada directa al portal cliente vuelve a consultar el acuerdo activo y su aceptación en Supabase antes de renderizar el dashboard.

Para clasificar el siguiente paso de cada cliente:

```sql
update public.clients
set onboarding_type = 'new', onboarding_completed = false
where id = 'UUID_DEL_CLIENTE';

-- Cuando termine su configuración:
update public.clients
set onboarding_completed = true
where id = 'UUID_DEL_CLIENTE';
```

El administrador puede crear versiones, editar su texto, activar una nueva versión y consultar aceptaciones desde **Admin → Confidencialidad**. Al activar una versión nueva, los clientes que no tengan una aceptación para esa versión son bloqueados antes del dashboard.

## 11. Roles operativos, asignaciones y permisos del equipo

Aplica después de la migración de confidencialidad:

```text
supabase/migrations/202606090003_team_roles_permissions.sql
```

La migración reemplaza el rol genérico `team` por roles operativos y migra automáticamente los perfiles existentes con `role = 'team'` a `account_manager`:

- `admin`
- `client`
- `account_manager`
- `designer`
- `social_media`
- `video_editor`
- `viewer` se conserva como estado heredado sin acceso a datos operativos hasta que un admin le asigne un rol válido.

También crea:

- `client_team_assignments`: relación muchos-a-muchos entre clientes y colaboradores.
- `internal_tasks`: tareas asignables con estados, fechas, resultados y visibilidad.
- `internal_notes`: notas que nunca son visibles para clientes.
- `client_resources`: diagnósticos, recomendaciones, rutas de crecimiento, briefs y materiales con visibilidad por rol.

### Flujo para configurar un colaborador

1. Crea o invita el usuario desde Supabase Auth o mediante una Edge Function segura.
2. En **Admin → Equipo**, cambia su perfil al rol operativo correspondiente.
3. En **Admin → Asignaciones**, vincúlalo con uno o varios clientes. El rol de la asignación debe coincidir con el rol principal del perfil.
4. Crea tareas desde **Admin → Tareas internas** o, para agentes de cuenta, desde su espacio de equipo.

No se crea usuarios de Auth directamente desde el navegador porque eso requeriría una clave administrativa. Nunca agregues `SUPABASE_SERVICE_ROLE_KEY` a Vercel como variable pública ni al bundle del frontend.

### Matriz de acceso aplicada por RLS

- **Admin:** lectura y escritura total.
- **Cliente:** solo su `client_id`, entregables y recursos visibles; nunca notas internas. Facturas únicamente propias.
- **Agente de cuenta:** clientes asignados, solicitudes, entregables, tareas, notas permitidas y borradores estratégicos. Sin acceso a facturas mediante su dashboard ni a clientes no asignados.
- **Diseño:** tareas propias, entregables/materiales de diseño permitidos y clientes asignados mediante la función de resumen seguro. Sin finanzas.
- **Social media:** tareas propias, entregables/materiales permitidos y campos operativos de publicación. Sin finanzas.
- **Editor de video:** tareas propias, entregables/materiales de video permitidos. Sin finanzas.

Los datos básicos de clientes para colaboradores se entregan con `public.team_client_overview()`. Esta función no devuelve notas privadas, teléfono, email ni valores financieros. Las rutas del equipo son independientes de la vista cliente:

```text
/team/account-manager
/team/designer
/team/social-media
/team/video-editor
```

### Desplegar invitaciones de colaboradores

El botón **Admin → Equipo → Invitar colaborador** utiliza una Edge Function para que la `SUPABASE_SERVICE_ROLE_KEY` nunca llegue al navegador:

```bash
supabase secrets set SITE_URL=https://tu-portal.vercel.app
supabase functions deploy invite-team-member
```

Supabase inyecta automáticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en la función alojada. El endpoint vuelve a validar que el usuario que invoca tenga `profiles.role = 'admin'` antes de enviar la invitación y asignar el rol.

## 12. Corregir relaciones de asignaciones con `profiles`

Si Supabase muestra:

```text
Could not find a relationship between 'client_team_assignments' and 'profiles' in the schema cache
```

aplica la migración:

```text
supabase/migrations/202606090004_fix_profile_relationships.sql
```

La migración verifica las columnas de asignación, reemplaza las foreign keys anteriores —incluidas las que apuntaban a `auth.users`— por constraints estables hacia `public.profiles`, valida los datos existentes y ejecuta:

```sql
notify pgrst, 'reload schema';
```

Las relaciones disponibles para consultas PostgREST quedan nombradas así:

```text
client_team_assignments_client_id_fkey
client_team_assignments_user_id_fkey
client_team_assignments_assigned_by_fkey
```

El frontend utiliza aliases explícitos para evitar ambigüedad entre `user_id` y `assigned_by`:

```js
client:clients!client_team_assignments_client_id_fkey(...)
team_member:profiles!client_team_assignments_user_id_fkey(...)
assigned_by_profile:profiles!client_team_assignments_assigned_by_fkey(...)
```

Si la migración detecta una asignación cuyo usuario aún no tiene fila en `public.profiles`, se detendrá con un error descriptivo. Debes crear o reparar ese perfil antes de volver a ejecutarla; no se eliminan asignaciones automáticamente.

## 13. Perfil de marca, vista como cliente, correos y reuniones

Aplica `supabase/migrations/202606090005_brand_notifications_calendar.sql`. La migración añade:

- `client_brand_profiles`, con una fila por cliente y separación entre notas visibles e internas.
- `client_notification_preferences` y `email_notifications` para preferencias e historial auditable.
- `calendar_events` para el MVP de reuniones manuales y enlaces de Google Meet.
- El bucket público `client-brand-assets`, limitado a rutas `clients/{client_id}/brand/*` para escrituras de clientes.
- RPCs seguras para la ficha del cliente, sus reuniones, solicitudes de reagenda y la vista previa administrativa.

La vista previa se abre en `/admin/preview-client/{clientId}`. No cambia la sesión ni el rol del admin; los datos se obtienen mediante `admin_client_preview()` y se sanitizan antes de renderizarse.

### Envío de correos con Resend

Configura secretos únicamente en Supabase y despliega la función. Estas claves **no** deben existir en el frontend ni usar prefijos públicos:

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set EMAIL_FROM="Biem Digital <portal@tu-dominio.com>"
supabase secrets set SITE_URL=https://tu-portal.vercel.app
supabase functions deploy send-email-notification
```

El frontend autenticado invoca la Edge Function después de persistir la operación. La función vuelve a validar rol, `client_id` o asignación, respeta preferencias, envía mediante Resend y registra cada intento como `sent` o `failed`. Las solicitudes creadas por clientes generan confirmación al cliente y aviso a admins/agentes asignados.

### Calendario y Google Calendar

La primera fase guarda reuniones en `calendar_events`; el admin define fecha, zona horaria, asistentes y un enlace manual de Google Meet. No se guardan tokens OAuth en el navegador. Los campos `google_event_id` y la capa Edge Functions permiten añadir sincronización OAuth en una fase posterior sin cambiar el contrato visible del portal.
