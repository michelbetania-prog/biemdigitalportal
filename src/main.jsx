import { createElement, StrictMode } from './mini-react.js'
import { createRoot } from './mini-react.js'
import AuthApp from './AuthApp.jsx'

const path = window.location.pathname
document.title = path.startsWith('/admin') ? 'BIEM — Panel administrativo' : path.startsWith('/team') ? 'BIEM — Espacio de equipo' : 'BIEM — Portal cliente'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthApp />
  </StrictMode>,
)
