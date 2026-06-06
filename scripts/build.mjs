import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const compiled = path.join(root, '.compiled')
const output = path.join(root, 'dist')

await rm(output, { recursive: true, force: true })
await mkdir(path.join(output, 'src', 'data'), { recursive: true })
await mkdir(path.join(output, 'src', 'lib'), { recursive: true })
await cp(path.join(root, 'index.html'), path.join(output, 'index.html'))
const browserConfig = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
}
await writeFile(path.join(output, 'config.js'), `globalThis.__BIEM_CONFIG__ = ${JSON.stringify(browserConfig)};\n`)
await cp(path.join(root, 'src', 'styles.css'), path.join(output, 'src', 'styles.css'))
await cp(path.join(root, 'src', 'admin-styles.css'), path.join(output, 'src', 'admin-styles.css'))

for (const asset of ['App.js', 'AdminApp.js', 'AuthApp.js', 'icons.js', 'main.js', 'mini-react.js', 'data/account-data.js', 'data/admin-data.js', 'lib/auth.js', 'lib/supabase.js']) {
  const source = await readFile(path.join(compiled, asset), 'utf8')
  const browserReady = source
    .replaceAll("'./App.jsx'", "'./App.js'")
    .replaceAll("'./icons.jsx'", "'./icons.js'")
    .replaceAll("'./AdminApp.jsx'", "'./AdminApp.js'")
    .replaceAll("'./AuthApp.jsx'", "'./AuthApp.js'")

  await writeFile(path.join(output, 'src', asset), browserReady)
}

await rm(compiled, { recursive: true, force: true })
console.log('BIEM portal compiled and built successfully in dist/')
