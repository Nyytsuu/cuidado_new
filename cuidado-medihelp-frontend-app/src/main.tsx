import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { isNativeMobileRuntime } from './sharedBackendFetch'
import './index.css'
import App from './App.tsx'
import './responsive.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const isNativeRuntime = isNativeMobileRuntime()

if ('serviceWorker' in navigator && isNativeRuntime) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(
        registrations.map((registration) => registration.unregister()),
      ))
      .catch((error) => {
        console.error('Service worker cleanup failed:', error)
      })
  })
}

if ('serviceWorker' in navigator && import.meta.env.PROD && !isNativeRuntime) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error)
    })
  })
}
