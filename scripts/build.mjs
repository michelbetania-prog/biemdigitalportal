import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const compiled = path.join(root, '.compiled')
const output = path.join(root, 'dist')

await rm(output, { recursive: true, force: true })
await mkdir(path.join(output, 'src', 'data'), { recursive: true })
await cp(path.join(root, 'index.html'), path.join(output, 'index.html'))
await cp(path.join(root, 'src', 'styles.css'), path.join(output, 'src', 'styles.css'))
await cp(path.join(root, 'src', 'admin-styles.css'), path.join(output, 'src', 'admin-styles.css'))

for (const asset of ['App.js', 'AdminApp.js', 'icons.js', 'main.js', 'mini-react.js', 'data/account-data.js', 'data/admin-data.js']) {
  const source = await readFile(path.join(compiled, asset), 'utf8')
  const browserReady = source
    .replaceAll("'./App.jsx'", "'./App.js'")
    .replaceAll("'./icons.jsx'", "'./icons.js'")
    .replaceAll("'./AdminApp.jsx'", "'./AdminApp.js'")

  await writeFile(path.join(output, 'src', asset), browserReady)
}

await rm(compiled, { recursive: true, force: true })
console.log('BIEM portal compiled and built successfully in dist/')
