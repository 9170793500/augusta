import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { defaultTabForGroup, NAV_GROUPS, VRV_TOP_NAV_LABEL, type NavItem } from './navConfig'

type Props = {
  /** Active portal group label, or `"vrv"` when on VRV Servicing */
  activeSection: string | 'vrv'
  onSelectPortalGroup?: (label: string) => void
  mobileNavOpen?: boolean
  onMobileMenuToggle?: () => void
}

export function AppTopNav({ activeSection, onSelectPortalGroup, mobileNavOpen, onMobileMenuToggle }: Props) {
  const navigate = useNavigate()
  const { profile, isAdmin, isTenant, apartmentNo } = useAuth()

  function visibleItems(items: NavItem[]) {
    return items.filter((n) => {
      if (n.adminOnly && !isAdmin) return false
      if (n.hideForTenant && isTenant) return false
      if (n.ownerOnly && isTenant) return false
      return true
    })
  }

  const navGroups = useMemo(
    () =>
      NAV_GROUPS.filter((group) => isAdmin || !group.adminOnly)
        .map((group) => ({
          ...group,
          items: visibleItems(group.items),
        }))
        .filter((group) => group.items.length > 0),
    [isAdmin, isTenant]
  )

  function openPortalGroup(label: string) {
    if (onSelectPortalGroup) {
      onSelectPortalGroup(label)
      return
    }
    navigate('/dashboard', { state: { tab: defaultTabForGroup(label) } })
  }

  return (
    <header className="dash-topnav">
      {onMobileMenuToggle && (
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileNavOpen}
          onClick={onMobileMenuToggle}
        >
          {mobileNavOpen ? '✕' : '☰'}
        </button>
      )}
      <div className="dash-topnav-brand">
        <div className="brand-logo-icon">A</div>
        <div>
          <strong>Augusta Golf Homes</strong>
          <span>Towers III · IV · V</span>
        </div>
      </div>

      <nav className="dash-topnav-menu" aria-label="Main navigation">
        {isAdmin &&
          navGroups.map((group) => (
            <button
              key={group.label}
              type="button"
              className={`topnav-item${activeSection === group.label ? ' active' : ''}`}
              onClick={() => openPortalGroup(group.label)}
            >
              {group.label}
            </button>
          ))}
        {isAdmin && (
          <button
            type="button"
            className={`topnav-item${activeSection === 'vrv' ? ' active' : ''}`}
            onClick={() => navigate('/vrv')}
          >
            {VRV_TOP_NAV_LABEL}
          </button>
        )}
      </nav>

      <div className="dash-topnav-meta">
        {apartmentNo && !isAdmin && <span className="role-pill">{apartmentNo}</span>}
        {profile?.role && (
          <span className={`role-pill${isAdmin ? ' admin' : ''}`}>{profile.role}</span>
        )}
      </div>
    </header>
  )
}
