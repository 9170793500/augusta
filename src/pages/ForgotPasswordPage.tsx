import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { formatAuthError } from '../components/AuthFooter'

export function ForgotPasswordPage() {
  const { resetPassword, session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)
    setSubmitting(true)
    const { error: err } = await resetPassword(email)
    setSubmitting(false)
    if (err) {
      setError(formatAuthError(err))
      return
    }
    setOk('Password reset link sent to your email. Check inbox and spam folder.')
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand-logo">
          <div className="brand-logo-icon">A</div>
          <h1 className="brand-mark">Forgot Password</h1>
        </div>
        <p className="brand-sub">
          Enter your registered email. We will send a link to reset your password.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </div>
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
        <p className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}
