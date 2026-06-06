import { createElement, StrictMode } from './mini-react.js'
import { createRoot } from './mini-react.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
