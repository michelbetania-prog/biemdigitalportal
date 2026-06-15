import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const vercel = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'))
const outputDirectory = vercel.outputDirectory
const catchAll = vercel.rewrites?.find(
  rewrite => rewrite.source === '/(.*)' && rewrite.destination === '/index.html',
)

if (outputDirectory !== 'dist') {
  throw new Error(`Vercel outputDirectory must be "dist", received "${outputDirectory}"`)
}

if (!catchAll) {
  throw new Error('Vercel must rewrite /(.*) to /index.html for SPA route refreshes')
}

const output = path.join(root, outputDirectory)
const outputStats = await stat(output)
if (!outputStats.isDirectory()) throw new Error('The build output must be a directory')

const requiredAssets = [
  'index.html',
  'config.js',
  'src/main.js',
  'src/AuthApp.js',
  'src/App.js',
  'src/AdminApp.js',
  'src/TeamApp.js',
  'src/lib/team-api.js',
  'src/lib/client-api.js',
  'src/lib/portal-settings.js',
  'src/styles.css',
  'src/admin-styles.css',
]

await Promise.all(requiredAssets.map(asset => access(path.join(output, asset))))

const index = await readFile(path.join(output, 'index.html'), 'utf8')
for (const reference of ['/config.js', '/src/main.js', '/src/styles.css', '/src/admin-styles.css']) {
  if (!index.includes(reference)) throw new Error(`dist/index.html is missing ${reference}`)
}

console.log('SPA output and Vercel catch-all rewrite validated')
