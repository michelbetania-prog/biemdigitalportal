# Despliegue en Vercel

Este proyecto usa **npm**, identificado por `package-lock.json` y por el campo `packageManager` de `package.json`.

## Configuración

En **Project Settings → Build and Deployment** usa:

- **Framework Preset:** Other
- **Install Command:** `npm ci --include=dev`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Root Directory:** la raíz del repositorio

Los mismos valores están versionados en `vercel.json`.

## TypeScript

El build ejecuta el binario local `tsc` instalado mediante la `devDependency` `typescript`. El modificador `--include=dev` del comando de instalación evita que una variable como `NODE_ENV=production` o `NPM_CONFIG_OMIT=dev` deje fuera TypeScript durante la fase de build.

## Si Vercel todavía menciona `scripts/build.sh`

El repositorio actual no contiene ese archivo. Ese mensaje significa que el deployment está usando un commit anterior o un Build Command antiguo configurado como override en el dashboard.

1. Confirma que el deployment utiliza el commit más reciente.
2. Elimina cualquier override que invoque `bash scripts/build.sh`.
3. Guarda los comandos indicados arriba.
4. Ejecuta **Redeploy** desactivando el build cache.

## Rutas de la aplicación

- Portal del cliente: `/cliente`
- Panel privado del equipo: `/admin`

Vercel redirige ambas rutas a la SPA mediante las reglas de `vercel.json`. La ruta `/admin` incluye una pantalla de acceso mock; debe conectarse a un proveedor de autenticación antes de producción.

## Supabase Auth

Configura `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en Vercel. La migración, creación de usuarios, roles y matriz RLS están documentadas en `SUPABASE.md`.
