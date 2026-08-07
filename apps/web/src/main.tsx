import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthModalProvider } from './components/AuthModal'
import { getBootHero, preloadHeroImage } from './data/homeHero'
import './index.css'
import App from './App.tsx'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
if (path === '/') {
  preloadHeroImage(getBootHero().src)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthModalProvider>
      <App />
    </AuthModalProvider>
  </StrictMode>,
)
