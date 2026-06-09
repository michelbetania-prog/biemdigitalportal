import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const requiredFiles = [
  'index.html',
  'src/App.js',
  'src/App.jsx',
  'src/AdminApp.jsx',
  'src/AuthApp.jsx',
  'src/FirstLoginConfidentialityScreen.jsx',
  'src/ClientSetupScreen.jsx',
  'src/lib/auth.js',
  'src/lib/supabase.js',
  'src/lib/admin-api.js',
  'src/lib/confidentiality.js',
  'src/data/account-data.js',
  'src/icons.js',
  'src/main.js',
  'src/mini-react.js',
  'src/styles.css',
  'src/admin-styles.css',
]

await Promise.all(requiredFiles.map(file => access(path.join(root, file))))

const index = await readFile(path.join(root, 'index.html'), 'utf8')
if (!index.includes('/src/main.js') || !index.includes('/src/styles.css') || !index.includes('/src/admin-styles.css') || !index.includes('/config.js')) {
  throw new Error('index.html must reference the compiled JavaScript and stylesheet')
}

console.log('Deployment assets are present and index.html references them correctly')
