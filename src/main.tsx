import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// El Service Worker se registra automáticamente gracias a vite-plugin-pwa (injectRegister: 'auto')
// Si necesitas manejo manual de actualizaciones, puedes usar registerSW de 'virtual:pwa-register'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
