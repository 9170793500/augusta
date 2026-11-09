import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AppTopNav } from '../AppTopNav'
import { useAuth } from '../../lib/auth'

const LINKS = [
  { to: '/vrv', end: true, label: 'Overview', icon: '◫' },
  { to: '/vrv/contracts', label: 'AMC Contracts', icon: '📋' },
  { to: '/vrv/payments', label: 'Payments', icon: '₹' },
  { to: '/vrv/salary', label: 'Staff Salary', icon: '👷' },
  { to: '/vrv/materials', label: 'Materials', icon: '📦' },
  { to: '/vrv/cashbook', label: 'Cashbook', icon: '◎' },
]

type Props = { children: ReactNode; title: string; toolbar?: ReactNode }

export function VrvLayout({ children, title, toolbar }: Props) {
  const navigate = useNavigate()
  const { profile, user, signOut, isAdmin } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

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
      <AppTopNav
        activeSection="vrv"
        mobileNavOpen={mobileNavOpen}
        onMobileMenuToggle={() => setMobileNavOpen((open) => !open)}
      />

      {mobileNavOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="dash-layout">
        <aside className={`sidebar${mobileNavOpen ? ' open' : ''}`}>
          <div className="sidebar-section-head">
            <span className="sidebar-section-label">VRV SERVICING</span>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-nav-section">
              {LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className="nav-icon">{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          </nav>
          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-avatar">{(profile?.full_name || user?.email || 'U')[0].toUpperCase()}</div>
              <div className="user-info">
                <strong>{profile?.full_name || 'User'}</strong>
                <span>Administrator</span>
              </div>
            </div>
            <button type="button" className="btn btn-sidebar-out" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          </div>
        </aside>
        <div className="dash-main">
          <header className="dash-topbar vrv-topbar">
            <div className="dash-topbar-left">
              <h1>{title}</h1>
            </div>
            {toolbar ? <div className="dash-topbar-right vrv-topbar-tools">{toolbar}</div> : null}
          </header>
          <div className="dash-content vrv-module">{children}</div>
        </div>
      </div>
    </div>
  )
}
