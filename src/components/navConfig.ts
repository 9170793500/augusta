import type { TabId } from '../lib/types'

export type NavItem = {
  id: TabId
  label: string
  icon: string
  adminOnly?: boolean
  hideForTenant?: boolean
  ownerOnly?: boolean
}

export type NavGroup = {
  label: string
  items: NavItem[]
  adminOnly?: boolean
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Portal',
    items: [
      { id: 'overview', label: 'Overview', icon: '◫' },
      { id: 'notices', label: 'Community Events', icon: '🔔', adminOnly: true },
    ],
  },
  {
    label: 'Resident Directory',
    items: [
      { id: 'owner', label: 'Owner', icon: '👤', ownerOnly: true },
      { id: 'residents', label: 'Residents', icon: '🏠' },
      { id: 'leases', label: 'Leases', icon: '📄' },
    ],
  },
  {
    label: 'Access & Personnel',
    items: [
      { id: 'rfid', label: 'Vehicle RFID', icon: '⬡', hideForTenant: true },
      { id: 'vehicles', label: 'Vehicles', icon: '🚗', hideForTenant: true },
      { id: 'driver', label: 'Drivers', icon: '◉', hideForTenant: true },
      { id: 'maid', label: 'Domestic Help', icon: '◎', hideForTenant: true },
      { id: 'security', label: 'FMG & Security', icon: '⛨', adminOnly: true },
    ],
  },
  {
    label: 'Finance & Accounts',
    items: [
      { id: 'parking', label: 'Parking & Gym', icon: 'P' },
      { id: 'dues', label: 'Maintenance Dues', icon: '₹' },
      { id: 'noc', label: 'NOC Charges', icon: 'N', adminOnly: true },
    ],
  },
  {
    label: 'Documents & Governance',
    adminOnly: true,
    items: [
      { id: 'documents', label: 'Document Repository', icon: '📎' },
      { id: 'reports', label: 'Reports & Alerts', icon: '📊', adminOnly: true },
      { id: 'users', label: 'User Management', icon: '⊞', adminOnly: true },
    ],
  },
]

export const VRV_TOP_NAV_LABEL = 'VRV Servicing'

export function groupForTab(tabId: TabId): string {
  return NAV_GROUPS.find((g) => g.items.some((i) => i.id === tabId))?.label ?? 'Portal'
}

export function defaultTabForGroup(label: string): TabId {
  const group = NAV_GROUPS.find((g) => g.label === label)
  return group?.items[0]?.id ?? 'overview'
}

export const PAGE_TITLES: Record<TabId, string> = {
  overview: 'Resident Portal',
  notices: 'Community Events',
  owner: 'Owner Record',
  residents: 'Resident Directory',
  leases: 'Lease Agreements',
  vehicles: 'Vehicles & Parking',
  rfid: 'Vehicle RFID',
  driver: 'Drivers & Access',
  maid: 'Domestic Help',
  security: 'FMG & Security',
  parking: 'Parking & Gym Accounts',
  dues: 'Maintenance Dues',
  noc: 'NOC Charges',
  documents: 'Document Repository',
  reports: 'Reports & Alerts',
  users: 'User Management',
}
