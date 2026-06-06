import { cp, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'dist')
const source = path.join(root, 'src')

await rm(output, { recursive: true, force: true })
await mkdir(path.join(output, 'src'), { recursive: true })

await cp(path.join(root, 'index.html'), path.join(output, 'index.html'))

for (const asset of ['App.js', 'icons.js', 'main.js', 'mini-react.js', 'styles.css']) {
  await cp(path.join(source, asset), path.join(output, 'src', asset))
}

console.log('BIEM portal built successfully in dist/')
