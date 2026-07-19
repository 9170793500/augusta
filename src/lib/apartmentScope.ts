/** Non-admin users only see records for their assigned apartment. */
export function normalizeApt(apt: string | null | undefined) {
  return apt?.trim().toUpperCase() || null
}

export function normalizeName(name: string | null | undefined) {
  return name?.trim().toLowerCase() || null
}

export function isMyApartment(
  recordApt: string | null | undefined,
  myApt: string | null | undefined,
  isAdmin: boolean
) {
  if (isAdmin) return true
  const mine = normalizeApt(myApt)
  if (!mine) return false
  return normalizeApt(recordApt) === mine
}

export function scopeByApartment<T extends { apartment_no: string | null }>(
  rows: T[],
  myApt: string | null | undefined,
  isAdmin: boolean
) {
  if (isAdmin) return rows
  const mine = normalizeApt(myApt)
  if (!mine) return []
  return rows.filter((r) => normalizeApt(r.apartment_no) === mine)
}

export type FlatResidentLike = {
  apartment_no: string
  occupancy_role: 'owner' | 'tenant'
  is_current?: boolean
  resident?: { full_name?: string | null; father_name?: string | null } | null
}

type RoleScopeOpts = {
  isAdmin: boolean
  isOwner: boolean
  isTenant: boolean
  apartmentNo: string | null | undefined
  profileName?: string | null
}

/** Owner: apna owner record + flat ke saare tenant. Tenant: sirf apna record. */
export function scopeResidentsForRole<T extends FlatResidentLike>(
  rows: T[],
  opts: RoleScopeOpts
): T[] {
  let scoped = scopeByApartment(rows, opts.apartmentNo, opts.isAdmin)
  if (opts.isAdmin) return scoped

  const myName = normalizeName(opts.profileName)

  if (opts.isTenant) {
    scoped = scoped.filter((r) => r.occupancy_role === 'tenant')
    if (myName) {
      const mine = scoped.filter((r) => normalizeName(r.resident?.full_name) === myName)
      if (mine.length > 0) return mine
    }
    return scoped
  }

  if (opts.isOwner) {
    return scoped.filter((r) => {
      if (r.occupancy_role === 'tenant') return true
      if (r.occupancy_role === 'owner') {
        if (r.is_current === false) return false
        if (myName) return normalizeName(r.resident?.full_name) === myName
        return true
      }
      return false
    })
  }

  return scoped
}

/** Tenant: sirf apni lease. Owner: flat ki saari leases (tenant ki poori history). */
export function scopeLeasesForRole<T extends { apartment_no: string; tenant_name?: string | null }>(
  rows: T[],
  opts: RoleScopeOpts
): T[] {
  const scoped = scopeByApartment(rows, opts.apartmentNo, opts.isAdmin)
  if (opts.isAdmin || opts.isOwner) return scoped
  if (opts.isTenant) {
    const myName = normalizeName(opts.profileName)
    if (!myName) return scoped
    return scoped.filter((r) => normalizeName(r.tenant_name) === myName)
  }
  return scoped
}

/** Tenant: sirf apna NOC. Owner: flat ke saare NOC (tenant related). */
export function scopeNocForRole<T extends { apartment_no: string; tenant_name?: string | null }>(
  rows: T[],
  opts: RoleScopeOpts
): T[] {
  const scoped = scopeByApartment(rows, opts.apartmentNo, opts.isAdmin)
  if (opts.isAdmin || opts.isOwner) return scoped
  if (opts.isTenant) {
    const myName = normalizeName(opts.profileName)
    if (!myName) return scoped
    return scoped.filter((r) => normalizeName(r.tenant_name) === myName)
  }
  return scoped
}

/** Tenant: sirf apne naam ke documents. Owner: flat ke saare. */
export function scopeDocumentsForRole<T extends { apartment_no: string | null; holder_name?: string | null }>(
  rows: T[],
  opts: RoleScopeOpts
): T[] {
  const scoped = scopeByApartment(rows, opts.apartmentNo, opts.isAdmin)
  if (opts.isAdmin || opts.isOwner) return scoped
  if (opts.isTenant) {
    const myName = normalizeName(opts.profileName)
    if (!myName) return scoped
    return scoped.filter((r) => normalizeName(r.holder_name) === myName)
  }
  return scoped
}

/** Tenant ko vehicles/rfid/drivers/maids nahi — owner flat ka poora household dekhe. */
export function scopeHouseholdForRole<T extends { apartment_no: string | null }>(
  rows: T[],
  opts: RoleScopeOpts
): T[] {
  if (opts.isTenant && !opts.isAdmin) return []
  return scopeByApartment(rows, opts.apartmentNo, opts.isAdmin)
}

export function roleScopeOpts(
  isAdmin: boolean,
  isOwner: boolean,
  isTenant: boolean,
  apartmentNo: string | null | undefined,
  profileName?: string | null
): RoleScopeOpts {
  return { isAdmin, isOwner, isTenant, apartmentNo, profileName }
}
