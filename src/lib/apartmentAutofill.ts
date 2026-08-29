import { apartmentsMatch } from './apartmentUtils'
import type { LivingAs, PublicDetailCategory, PublicSubmission } from './publicSubmission'
import { existingSubmissionsForCategory } from './publicSubmission'

export type ApartmentAutofillData = {
  owner?: Record<string, unknown>
  tenant?: Record<string, unknown>
  lease?: Record<string, unknown>
  maids: Record<string, unknown>[]
  drivers: Record<string, unknown>[]
  vehicles: Record<string, unknown>[]
  submitterName?: string | null
  message: string | null
}

export function buildApartmentAutofillData(
  apartmentNo: string,
  submissions: PublicSubmission[]
): ApartmentAutofillData {
  const apt = apartmentNo.trim().toUpperCase()
  if (!apt) {
    return { maids: [], drivers: [], vehicles: [], message: null }
  }

  const forApt = submissions.filter((row) => apartmentsMatch(row.apartment_no, apt))
  if (forApt.length === 0) {
    return { maids: [], drivers: [], vehicles: [], message: null }
  }

  const owner = existingSubmissionsForCategory(submissions, apt, 'owner')[0]
  const tenant = existingSubmissionsForCategory(submissions, apt, 'tenant')[0]
  const lease = existingSubmissionsForCategory(submissions, apt, 'lease')[0]
  const maids = existingSubmissionsForCategory(submissions, apt, 'maid').map((row) => row.details)
  const drivers = existingSubmissionsForCategory(submissions, apt, 'driver').map((row) => row.details)
  const vehicles = existingSubmissionsForCategory(submissions, apt, 'vehicle').map((row) => row.details)
  const submitterName = forApt.find((row) => row.submitter_name)?.submitter_name ?? null

  return {
    owner: owner?.details,
    tenant: tenant?.details,
    lease: lease?.details,
    maids,
    drivers,
    vehicles,
    submitterName,
    message: `Saved details loaded for ${apt} (${forApt.length} record${forApt.length > 1 ? 's' : ''}). Review any tab below.`,
  }
}

export function inferLivingAsFromSubmissions(
  submissions: PublicSubmission[],
  apartmentNo: string,
  fallback: LivingAs
): LivingAs {
  const apt = apartmentNo.trim().toUpperCase()
  if (!apt) return fallback
  const forApt = submissions.filter((row) => apartmentsMatch(row.apartment_no, apt))
  if (forApt.some((row) => row.category === 'tenant' || row.category === 'lease')) {
    return 'tenant_resident'
  }
  if (forApt.some((row) => row.category === 'owner')) {
    return 'owner_resident'
  }
  return fallback
}

export function inferLivingAsFromAutofill(data: ApartmentAutofillData, fallback: LivingAs): LivingAs {
  if (data.tenant || data.lease) return 'tenant_resident'
  if (data.owner) {
    const raw = data.owner.is_resident
    const isResident = raw !== false && raw !== 'false'
    return isResident ? 'owner_resident' : 'owner_non_resident'
  }
  return fallback
}

function autofillRecordCount(data: ApartmentAutofillData): number {
  return (
    (data.owner ? 1 : 0) +
    (data.tenant ? 1 : 0) +
    (data.lease ? 1 : 0) +
    data.maids.length +
    data.drivers.length +
    data.vehicles.length
  )
}

/** Prefer this device's submissions; fill gaps from society DB records. */
export function mergeAutofillData(
  apartmentNo: string,
  local: ApartmentAutofillData,
  db: ApartmentAutofillData | null
): ApartmentAutofillData {
  if (!db) return local
  if (!local.message) return db

  const merged: ApartmentAutofillData = {
    owner: local.owner ?? db.owner,
    tenant: local.tenant ?? db.tenant,
    lease: local.lease ?? db.lease,
    maids: local.maids.length > 0 ? local.maids : db.maids,
    drivers: local.drivers.length > 0 ? local.drivers : db.drivers,
    vehicles: local.vehicles.length > 0 ? local.vehicles : db.vehicles,
    submitterName: local.submitterName ?? db.submitterName,
    message: null,
  }

  const count = autofillRecordCount(merged)
  if (count === 0) return { maids: [], drivers: [], vehicles: [], message: null }

  const apt = apartmentNo.trim().toUpperCase()
  merged.message = `Details loaded for ${apt} (${count} record${count > 1 ? 's' : ''}). Review each tab below.`
  return merged
}

export function categoriesWithData(
  submissions: PublicSubmission[],
  apartmentNo: string
): PublicDetailCategory[] {
  const apt = apartmentNo.trim().toUpperCase()
  return [
    ...new Set(submissions.filter((row) => apartmentsMatch(row.apartment_no, apt)).map((row) => row.category)),
  ]
}
