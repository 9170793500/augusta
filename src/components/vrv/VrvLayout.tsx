import { type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

const LINKS = [
  { to: '/vrv', end: true, label: 'Overview' },
  { to: '/vrv/contracts', label: 'AMC Contracts' },
  { to: '/vrv/payments', label: 'Payments' },
  { to: '/vrv/salary', label: 'Staff Salary' },
  { to: '/vrv/materials', label: 'Materials' },
  { to: '/vrv/cashbook', label: 'Cashbook' },
]

type Props = { children: ReactNode; title: string }

export function VrvLayout({ children, title }: Props) {
  const navigate = useNavigate()
  const { profile, signOut, isAdmin } = useAuth()

  if (!isAdmin) {
    return (
      <div className="dash-content">
        <div className="alert alert-error">VRV Servicing is available to AOA administrators only.</div>
      </div>
    )
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dash-shell">
      <header className="dash-topnav">
        <div className="dash-topnav-brand">
          <div className="brand-logo-icon">A</div>
          <div>
            <strong>Augusta Golf Homes</strong>
            <span>VRV Servicing</span>
          </div>
        </div>
        <nav className="dash-topnav-menu" aria-label="Main">
          <button type="button" className="topnav-item" onClick={() => navigate('/dashboard')}>
            Portal
          </button>
          <button type="button" className="topnav-item active">
            VRV Servicing
          </button>
        </nav>
        <div className="dash-topnav-meta">
          <span className="role-pill admin">{profile?.role ?? 'admin'}</span>
        </div>
      </header>
      <div className="dash-layout">
        <aside className="sidebar open" style={{ position: 'relative' }}>
          <div className="sidebar-section-head">
            <span className="sidebar-section-label">VRV SERVICING</span>
          </div>
          <nav className="sidebar-nav">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button type="button" className="btn btn-sidebar-out" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          </div>
        </aside>
        <div className="dash-main">
          <header className="dash-topbar">
            <h1>{title}</h1>
          </header>
          <div className="dash-content vrv-module">{children}</div>
        </div>
      </div>
    </div>
  )
}
