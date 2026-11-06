import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'  // Tailwind + base
import App from './App.jsx'
import './styles/darkmode.css';  

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
