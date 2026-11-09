import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initSupabase } from './lib/supabase'
import './index.css'

const root = document.getElementById('root')!

function showBootError(message: string) {
  root.innerHTML = `<div style="font-family:system-ui;padding:2rem;color:#7f1d1d;max-width:32rem;margin:2rem auto">
    <strong>Could not start app</strong><p>${message}</p>
  </div>`
}

initSupabase()
  .then(() => import('./App'))
  .then(({ default: App }) => {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown startup error'
    showBootError(message)
    console.error(err)
  })
