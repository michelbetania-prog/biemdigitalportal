# Supabase: autenticación, roles y RLS

## 1. Aplicar la migración

La migración completa está en:

```text
supabase/migrations/202606060001_auth_roles_and_portal.sql
```

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

Los roles `team` y `viewer` usan el dashboard operativo. `viewer` se presenta en modo de solo lectura. Las restricciones reales no dependen de la interfaz: PostgreSQL vuelve a validarlas en cada consulta mediante RLS.

## 5. Matriz de acceso RLS

- **admin:** lectura y escritura global.
- **client:** lectura de filas cuyo `client_id` coincide con su perfil; puede crear solicitudes para su propia cuenta.
- **team:** lectura de clientes y registros donde `assigned_to = auth.uid()`; puede actualizar entregables y solicitudes asignadas.
- **viewer:** lectura global, sin políticas de escritura.

Los paquetes asignados y servicios adicionales activos se pueden leer desde el portal cliente. Las facturas no pueden ser modificadas por clientes ni por viewers.

## 6. Función de rol

Desde SQL:

```sql
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
