import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import Speaker from './Speaker'

const params = new URLSearchParams(window.location.search)
const speaker =
  params.has('speaker') || window.location.pathname.endsWith('/speaker.html')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{speaker ? <Speaker /> : <App />}</StrictMode>,
)
