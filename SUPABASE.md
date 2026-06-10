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

## 14. Registro controlado de clientes desde Admin

La pantalla **Admin → Clientes → Crear cliente** llama a la Edge Function `create-client-with-auth-user`. El navegador envía los datos y la contraseña únicamente a esta función autenticada; la contraseña se entrega directamente a Supabase Auth y nunca se inserta en `profiles`, `clients` ni otra tabla pública.

La función valida que quien invoca tenga `profiles.role = 'admin'` y realiza este flujo:

1. Comprueba los campos, la seguridad de la contraseña, el paquete y posibles duplicados.
2. Crea la fila de `clients` con onboarding pendiente.
3. Crea el usuario con Supabase Admin API y acceso confirmado.
4. Vincula `profiles.id` con Auth, asigna `role = client` y `client_id`.
5. Crea `client_brand_profiles` con los datos iniciales de marca.
6. Si se solicita, envía el correo de bienvenida sin incluir la contraseña.
7. Si una operación crítica falla, elimina el usuario de Auth y el cliente creado para evitar registros parciales.

Despliega la función con:

```bash
supabase functions deploy create-client-with-auth-user
```

Para el correo opcional utiliza los mismos secretos `RESEND_API_KEY`, `EMAIL_FROM` y `SITE_URL` documentados anteriormente. `SUPABASE_SERVICE_ROLE_KEY` es inyectada por Supabase dentro de la función y no debe configurarse en Vercel ni exponerse en `config.js`.

## 15. Google Drive MVP para entregables

Aplica `supabase/migrations/202606100001_google_drive_assets_mvp.sql`. Esta fase implementa únicamente vínculos manuales y no utiliza OAuth ni almacena tokens de Google.

La tabla `deliverable_drive_assets` permite asociar varios archivos o carpetas a un entregable con:

- Nombre y enlace de Google Drive/Docs.
- Tipo: archivo, carpeta, post, diseño, video, material u otro.
- Visibilidad independiente para el cliente.
- Enlace principal, orden y estado activo/archivado.
- Campos `drive_item_id` y `mime_type` preparados para una futura integración con Drive API.

El admin gestiona los vínculos en **Admin → Archivos Google Drive**. Los colaboradores pueden vincular Drive desde sus entregables asignados. El cliente solo recibe, mediante `client_deliverables()`, los vínculos activos marcados como `visible_to_client`; no puede consultar la tabla interna directamente.

Los enlaces admitidos deben comenzar con:

```text
https://drive.google.com/
https://docs.google.com/
```

La aprobación y solicitud de cambios continúan realizándose sobre el entregable. Los archivos permanecen alojados y compartidos por Google Drive, por lo que también debes configurar en Drive los permisos de acceso apropiados para cada cliente.

Esta estructura deja preparado `drive_item_id` para una fase posterior con Google Drive API, pero no requiere credenciales Google, OAuth, refresh tokens ni cambios en Vercel durante el MVP.

## 16. Espacio de colaboradores con tablero Kanban

Aplica `supabase/migrations/202606100002_team_kanban_workspace.sql`. La migración amplía `internal_tasks` sin duplicarla y normaliza los estados anteriores al flujo:

```text
todo → in_progress → in_review → completed
```

También añade prioridad `urgent`, nuevos tipos operativos, `completed_at`, contenido creativo, etiquetas, relación directa con entregables, comentarios internos y adjuntos de Google Drive.

Las nuevas tablas son:

- `task_comments`: conversaciones internas vinculadas a una tarea.
- `task_attachments`: enlaces y materiales, inicialmente Google Drive, con validación de cliente y tarea.

Los colaboradores acceden a `/team/dashboard` y disponen de Resumen, Tablero, Lista, Calendario, Mis clientes y Documentos. La ruta `/team/tasks/{taskId}` abre el detalle de tarea sin utilizar el dashboard cliente.

### Permisos del tablero

- El agente de cuenta ve tareas de sus clientes asignados, puede crear tareas, asignarlas al equipo del cliente, moverlas, cambiar prioridad y completarlas.
- Diseño y video ven sus tareas y trabajo relevante de marcas asignadas; solo pueden mover tareas propias entre `todo`, `in_progress` e `in_review`.
- Social media recibe trabajo de social media, copy, publicación y entrega al cliente según visibilidad y asignación.
- Los colaboradores solo reciben contexto de marca mediante `team_brand_context()` y miembros mediante `team_client_members()`; estas funciones no devuelven facturación, pagos ni notas `admin_only`.
- Los clientes no reciben estas tareas porque permanecen con `internal_only = true` y `visible_to_client = false`.

La migración conserva compatibilidad con tareas existentes, convierte sus estados y mantiene las políticas administrativas actuales.

## 17. Ejemplos guía en estados vacíos

Los módulos de cliente, administración y colaboradores utilizan `src/GuideExample.jsx` para mostrar referencias visuales cuando una consulta real no devuelve registros.

- Cada referencia está identificada de forma explícita como **“Ejemplo · Guía visual”**.
- No se inserta en Supabase, no participa en métricas y no se mezcla con registros reales.
- En cuanto el módulo recibe información real, el ejemplo deja de renderizarse automáticamente.
- En pantallas administrativas y en la vista previa del cliente, el admin puede usar **Eliminar guía**. La preferencia se guarda únicamente en `localStorage` y puede restablecerse eliminando la clave `biem-guide-dismissed:{sección}`.
- Los textos están centralizados en `src/GuideExample.jsx`, por lo que pueden reemplazarse sin modificar las consultas ni los componentes CRUD.

## 18. Mis marcas para colaboradores

Aplica `supabase/migrations/202606100003_team_brand_workspace.sql` después de las migraciones del Kanban. Esta migración añade el RPC seguro `team_brand_directory()` y permite a los colaboradores consultar reuniones de clientes donde tienen una asignación activa.

La ruta `/team/brands` muestra únicamente las marcas vinculadas al usuario mediante `client_team_assignments`. Desde cada tarjeta se puede abrir `/team/brands/{clientId}` para consultar:

- rol del colaborador, estado del cliente y agente de cuenta;
- conteos de tareas por estado, vencidas y próxima entrega;
- próxima reunión;
- información de contacto y perfil de marca;
- redes sociales, web, WhatsApp y enlaces importantes;
- carpeta principal de Google Drive cuando exista un vínculo de carpeta o un archivo principal visible para el equipo;
- entregables, materiales y contexto operativo de la marca.

El RPC no devuelve paquetes, facturación, pagos ni notas `admin_only`. La política de calendario exige una asignación activa mediante `is_assigned_to_client(client_id)`.
