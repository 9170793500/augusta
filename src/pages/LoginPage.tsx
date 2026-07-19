import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { AuthFooter, formatAuthError } from '../components/AuthFooter'

function BrandHeader() {
  return (
    <div className="brand-logo">
      <div className="brand-logo-icon">A</div>
      <h1 className="brand-mark">Augusta Wishtown</h1>
    </div>
  )
}

export function LoginPage() {
  const { signIn, session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: err } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (err) setError(formatAuthError(err))
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <BrandHeader />
        <p className="brand-sub">
          Sign in with credentials provided by the society administrator. Accounts are created by admin only.
        </p>
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
  )
}
