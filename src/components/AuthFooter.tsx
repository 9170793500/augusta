import { Link } from 'react-router-dom'

export function AuthFooter() {
  return (
    <p className="auth-footer">
      <Link to="/forgot-password">Forgot password?</Link>
    </p>
  )
}

export function formatAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('rate limit') || lower.includes('email rate')) {
    return 'Too many emails sent. Please wait and try again, or contact admin.'
  }
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'This email is already registered. Contact admin or use Forgot password.'
  }
  if (lower.includes('invalid login credentials')) {
    return 'Wrong email or password. Please try again.'
  }
  if (lower.includes('no profile found')) {
    return 'This email has no society account profile. Contact admin to create your login in User Management.'
  }
  return message
}
