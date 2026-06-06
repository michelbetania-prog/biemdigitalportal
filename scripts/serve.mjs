import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const port = Number(process.env.PORT || 4173)
const types = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript' }

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname)
  let file = path.join(root, pathname === '/' ? 'index.html' : pathname)

  if (!file.startsWith(root)) {
    response.writeHead(403).end('Forbidden')
    return
  }

  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html')
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
    createReadStream(file).pipe(response)
  } catch {
    response.writeHead(404).end('Not found')
  }
}).listen(port, '0.0.0.0', () => console.log(`BIEM portal available at http://localhost:${port}`))
