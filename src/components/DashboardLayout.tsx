import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import type { TabId } from '../lib/types'

type NavItem = {
  id: TabId
  label: string
  icon: string
  adminOnly?: boolean
  hideForTenant?: boolean
  ownerOnly?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
  adminOnly?: boolean
}

function groupForTab(tabId: TabId): string {
  return NAV_GROUPS.find((g) => g.items.some((i) => i.id === tabId))?.label ?? 'Dashboard'
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Dashboard',
    items: [
      { id: 'overview', label: 'Overview', icon: '◫' },
      { id: 'notices', label: 'Society Notice', icon: '🔔', adminOnly: true },
    ],
  },
  {
    label: 'Flat & Tenancy',
    items: [
      { id: 'owner', label: 'Owner', icon: '👤', ownerOnly: true },
      { id: 'residents', label: 'Resident', icon: '🏠' },
      { id: 'leases', label: 'Leases', icon: '📄' },
    ],
  },
  {
    label: 'People & Access',
    items: [
      { id: 'rfid', label: 'Vehicle RFID', icon: '⬡', hideForTenant: true },
      { id: 'vehicles', label: 'Vehicles', icon: '🚗', hideForTenant: true },
      { id: 'driver', label: 'Drivers', icon: '◉', hideForTenant: true },
      { id: 'maid', label: 'Maids', icon: '◎', hideForTenant: true },
      { id: 'security', label: 'Security Staff', icon: '⛨', adminOnly: true },
    ],
  },
  {
    label: 'Finance & Amenities',
    items: [
      { id: 'parking', label: 'Parking & Gym', icon: 'P' },
      { id: 'dues', label: 'Maintenance Dues', icon: '₹' },
      { id: 'noc', label: 'NOC Charges', icon: 'N', adminOnly: true },
    ],
  },
  {
    label: 'Documents & Reports',
    adminOnly: true,
    items: [
      { id: 'documents', label: 'KYC Documents', icon: '📎' },
      { id: 'reports', label: 'Reports', icon: '📊', adminOnly: true },
      { id: 'users', label: 'User Management', icon: '⊞', adminOnly: true },
    ],
  },
]

const PAGE_TITLES: Record<TabId, string> = {
  overview: 'Dashboard Overview',
  notices: 'Society Notice',
  owner: 'Owner',
  residents: 'Resident',
  leases: 'Lease Management',
  vehicles: 'Vehicle Registration',
  rfid: 'Vehicle RFID',
  driver: 'Drivers',
  maid: 'Domestic Staff',
  security: 'Security & FMG',
  parking: 'Parking & Gym',
  dues: 'Maintenance Dues',
  noc: 'NOC Charges',
  documents: 'KYC Documents',
  reports: 'Reports & Alerts',
  users: 'User Management',
}

type Props = {
  tab: TabId
  onTabChange: (tab: TabId) => void
  onRefresh?: () => void
  busy?: boolean
  children: ReactNode
}

export function DashboardLayout({ tab, onTabChange, onRefresh, busy, children }: Props) {
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

  useEffect(() => {
    setActiveGroup(groupForTab(tab))
  }, [tab])

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
    if (group?.items[0]) onTabChange(group.items[0].id)
  }

  const roleLabel = isAdmin ? 'Administrator' : isTenant ? 'Tenant' : isOwner ? 'Owner' : apartmentNo || 'User'

  return (
    <div className="dash-shell">
      <header className="dash-topnav">
        <div className="dash-topnav-brand">
          <div className="brand-logo-icon">A</div>
          <div>
            <strong>Augusta Golf Homes</strong>
            <span>Society Portal</span>
          </div>
        </div>

        <nav className="dash-topnav-menu" aria-label="Main navigation">
          {isAdmin &&
            navGroups.map((group) => (
              <button
                key={group.label}
                type="button"
                className={`topnav-item${activeGroup === group.label ? ' active' : ''}`}
                onClick={() => selectCategory(group.label)}
              >
                {group.label}
              </button>
            ))}
        </nav>

        <div className="dash-topnav-meta">
          {apartmentNo && !isAdmin && <span className="role-pill">{apartmentNo}</span>}
          {profile?.role && (
            <span className={`role-pill${isAdmin ? ' admin' : ''}`}>{profile.role}</span>
          )}
        </div>
      </header>

      <div className="dash-layout">
        <aside className="sidebar">
          {!isAdmin && (
            <div className="sidebar-section-head">
              <span className="sidebar-section-label">Menu</span>
            </div>
          )}
          {isAdmin && (
            <div className="sidebar-section-head">
              <span className="sidebar-section-label">{activeGroup}</span>
            </div>
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
                    onClick={() => onTabChange(item.id)}
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
            <button type="button" className="btn btn-sidebar-out" onClick={() => signOut()}>
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

export { PAGE_TITLES }
