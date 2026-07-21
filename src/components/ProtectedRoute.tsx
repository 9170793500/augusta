import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <div className="loading-screen">Loading Augusta Golf Homes…</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    return (
      <div className="loading-screen">
        <p>Could not load your profile for this email.</p>
        <p className="form-hint" style={{ maxWidth: '22rem', textAlign: 'center' }}>
          Admin, owner, and tenant accounts must be created in User Management. Contact the society administrator if you cannot sign in.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: 'auto', marginTop: '1rem' }}
          onClick={() => {
            void supabase.auth.signOut({ scope: 'local' }).then(() => {
              window.location.href = '/login'
            })
          }}
        >
          Return to login
        </button>
      </div>
    )
  }

  return <>{children}</>
}
