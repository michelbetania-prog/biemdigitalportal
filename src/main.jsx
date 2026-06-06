import { createElement, StrictMode } from './mini-react.js'
import { createRoot } from './mini-react.js'
import App from './App.jsx'
import AdminApp from './AdminApp.jsx'

const isAdmin = window.location.pathname.startsWith('/admin')
document.title = isAdmin ? 'BIEM — Panel administrativo' : 'BIEM — Portal cliente'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? <AdminApp /> : <App />}
  </StrictMode>,
)
