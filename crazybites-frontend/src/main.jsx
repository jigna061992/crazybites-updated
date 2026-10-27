// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import DotWave from './components/DotWave.jsx'

// Fonts: Orbitron (titles) + Space Grotesk (headings) + Inter (body). If they fail to load, Segoe UI / the system font will be used.
if (!document.getElementById('cb-font')) {
  const link = document.createElement('link')
  link.id = 'cb-font'
  link.rel = 'stylesheet'
  // link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Orbitron:wght@600;700;800&display=swap'
  link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap'
  document.head.appendChild(link)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DotWave />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)