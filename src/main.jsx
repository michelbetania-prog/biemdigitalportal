import { createElement, StrictMode } from './mini-react.js'
import { createRoot } from './mini-react.js'
import AuthApp from './AuthApp.jsx'

const isAdmin = window.location.pathname.startsWith('/admin')
document.title = isAdmin ? 'BIEM — Panel administrativo' : 'BIEM — Portal'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthApp />
  </StrictMode>,
)
