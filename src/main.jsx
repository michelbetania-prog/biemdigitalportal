import { createElement, StrictMode } from './mini-react.js'
import { createRoot } from './mini-react.js'
import AuthApp from './AuthApp.jsx'
import { getPortalSettings, loadPortalSettings } from './lib/portal-settings.js'

await loadPortalSettings()

const path = window.location.pathname
const portalSettings=getPortalSettings()
document.title = path.startsWith('/admin') ? `${portalSettings.agency_name} — Panel administrativo` : path.startsWith('/team') ? `${portalSettings.agency_name} — Espacio de equipo` : `${portalSettings.agency_name} — ${portalSettings.portal_name}`

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthApp />
  </StrictMode>,
)
