import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured, supabaseProjectRef } from '../lib/supabase'
import { AuthFooter, formatAuthError } from '../components/AuthFooter'
import { fetchPublicNotifications, LoginNotificationsList } from '../components/NotificationsPanel'
import type { SocietyNotification } from '../lib/types'
import loginImage from '../augusta_login_image.jpg'

export function LoginPage() {
  const { signIn, session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [notices, setNotices] = useState<SocietyNotification[]>([])
  const projectRef = supabaseProjectRef()

  useEffect(() => {
    fetchPublicNotifications().then(setNotices)
  }, [])

  if (!loading && session && profile) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: err } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (err) {
      setError(formatAuthError(err))
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="login-landing">
      <img src={loginImage} alt="" className="login-landing-bg" aria-hidden />

      <header className="login-landing-header">
        <div className="login-landing-brand">
          <div className="brand-logo-icon">A</div>
          <div>
            <strong>Augusta Golf Homes</strong>
            <span>Society Portal</span>
          </div>
        </div>
        <button type="button" className="btn btn-light login-signin-btn" onClick={() => setShowLogin(true)}>
          Sign in
        </button>
      </header>

      <aside className="login-landing-notices" aria-label="Society notices">
        <LoginNotificationsList items={notices} />
      </aside>

      {showLogin && (
        <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
          <div className="modal-card login-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Sign in</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setShowLogin(false)}>
                Close
              </button>
            </div>
            <form onSubmit={onSubmit}>
              <p className="brand-sub">
                Sign in with credentials provided by the society administrator.
              </p>
              {!isSupabaseConfigured && (
                <div className="alert alert-error">
                  <strong>Server not configured.</strong> Set Supabase env variables on Vercel and redeploy.
                </div>
              )}
              {isSupabaseConfigured && projectRef && import.meta.env.DEV && (
                <p className="form-hint">Supabase project: <code>{projectRef}</code></p>
              )}
              {error && <div className="alert alert-error">{error}</div>}
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
              <AuthFooter />
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
