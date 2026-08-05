import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthModalProvider } from './components/AuthModal'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthModalProvider>
      <App />
    </AuthModalProvider>
  </StrictMode>,
)
