import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

declare global {
  interface Window {
    appConfig?: {
      demoMode?: boolean;
      isProduction?: boolean;
    }
  }
}

fetch('/api/config')
  .then(res => res.json())
  .then(config => {
    window.appConfig = config
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch(err => {
    console.error('Failed to load app config:', err)
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
