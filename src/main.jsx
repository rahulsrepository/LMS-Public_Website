import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { LmsProvider } from './lib/store'
import { ensureDemoAuth } from './lib/demoAuth'
import './index.css'

ensureDemoAuth()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LmsProvider>
        <App />
      </LmsProvider>
    </BrowserRouter>
  </StrictMode>,
)
