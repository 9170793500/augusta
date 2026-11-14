import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppTopNav } from './AppTopNav'
import { groupForTab, NAV_GROUPS, PAGE_TITLES, type NavItem } from './navConfig'
import { useAuth } from '../lib/auth'
import type { TabId } from '../lib/types'

type Props = {
  tab: TabId
  onTabChange: (tab: TabId) => void
  onRefresh?: () => void
  busy?: boolean
  children: ReactNode
}

export function DashboardLayout({ tab, onTabChange, onRefresh, busy, children }: Props) {
  const navigate = useNavigate()
  const { profile, user, signOut, isAdmin, isOwner, isTenant, apartmentNo } = useAuth()
  const pageTitle = PAGE_TITLES[tab]

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

  const [activeGroup, setActiveGroup] = useState(() => groupForTab(tab))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setActiveGroup(groupForTab(tab))
  }, [tab])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [tab])

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  function goTab(next: TabId) {
    onTabChange(next)
    setMobileNavOpen(false)
  }

  const sidebarSections = useMemo(() => {
    if (isAdmin) {
      const group = navGroups.find((g) => g.label === activeGroup)
      return group ? [{ label: group.label, items: group.items }] : []
    }
    return navGroups.map((g) => ({ label: g.label, items: g.items }))
  }, [navGroups, activeGroup, isAdmin])

  function selectCategory(label: string) {
    setActiveGroup(label)
    const group = navGroups.find((g) => g.label === label)
    if (group?.items[0]) goTab(group.items[0].id)
  }

  const roleLabel = isAdmin ? 'Administrator' : isTenant ? 'Tenant' : isOwner ? 'Owner' : apartmentNo || 'User'

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dash-shell">
      <AppTopNav
        activeSection={activeGroup}
        onSelectPortalGroup={selectCategory}
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
          {!isAdmin && (
            <div className="sidebar-section-head">
              <span className="sidebar-section-label">Menu</span>
            </div>
          )}
          {isAdmin && (
            <>
              <div className="sidebar-section-head">
                <span className="sidebar-section-label">{activeGroup}</span>
              </div>
              <div className="sidebar-mobile-categories" aria-label="Module categories">
                {navGroups.map((group) => (
                  <button
                    key={group.label}
                    type="button"
                    className={`sidebar-category-btn${activeGroup === group.label ? ' active' : ''}`}
                    onClick={() => selectCategory(group.label)}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <nav className="sidebar-nav">
            {sidebarSections.map((section) => (
              <div key={section.label} className="sidebar-nav-section">
                {!isAdmin && <div className="sidebar-group-label">{section.label}</div>}
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-item${tab === item.id ? ' active' : ''}`}
                    onClick={() => goTab(item.id)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-avatar">{(profile?.full_name || user?.email || 'U')[0].toUpperCase()}</div>
              <div className="user-info">
                <strong>{profile?.full_name || 'User'}</strong>
                <span>{roleLabel}</span>
              </div>
            </div>
            <button type="button" className="btn btn-sidebar-out" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          </div>
        </aside>

        <div className="dash-main">
          <header className="dash-topbar">
            <div className="dash-topbar-left">
              <h1>{pageTitle}</h1>
            </div>
            <div className="dash-topbar-right">
              {onRefresh && tab !== 'overview' && tab !== 'users' && (
                <button type="button" className="btn btn-ghost" onClick={onRefresh} disabled={busy}>
                  {busy ? 'Refreshing…' : 'Refresh'}
                </button>
              )}
            </div>
          </header>

          <div className="dash-content">{children}</div>
        </div>
      </div>
    </div>
  )
}
