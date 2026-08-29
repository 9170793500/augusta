import { normalizeApartmentInput } from './apartmentUtils'
import type { ApartmentAutofillData } from './apartmentAutofill'
import { supabase } from './supabase'

type DbApartmentPayload = {
  owner?: Record<string, unknown> | null
  tenant?: Record<string, unknown> | null
  lease?: Record<string, unknown> | null
  maids?: unknown
  drivers?: unknown
  vehicles?: unknown
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
}

function hasName(details: Record<string, unknown> | null | undefined, key: string): boolean {
  return Boolean(details && String(details[key] || '').trim())
}

function autofillCount(data: ApartmentAutofillData): number {
  return (
    (data.owner ? 1 : 0) +
    (data.tenant ? 1 : 0) +
    (data.lease ? 1 : 0) +
    data.maids.length +
    data.drivers.length +
    data.vehicles.length
  )
}

/** Load saved society records from Supabase (security-definer RPC). */
export async function fetchApartmentDetailsFromDb(
  apartmentNo: string
): Promise<ApartmentAutofillData | null> {
  const apt = normalizeApartmentInput(apartmentNo)
  if (!apt) return null

  const { data, error } = await supabase.rpc('fetch_apartment_details', {
    p_apartment_no: apt,
  })

  if (error) return null

  const payload = (data || {}) as DbApartmentPayload
  const owner = hasName(payload.owner, 'full_name') ? payload.owner! : undefined
  const tenant = hasName(payload.tenant, 'full_name') ? payload.tenant! : undefined
  const lease = hasName(payload.lease, 'tenant_name') ? payload.lease! : undefined
  const maids = asRecordArray(payload.maids)
  const drivers = asRecordArray(payload.drivers)
  const vehicles = asRecordArray(payload.vehicles)

  const result: ApartmentAutofillData = {
    owner,
    tenant,
    lease,
    maids,
    drivers,
    vehicles,
    submitterName: String(owner?.full_name || tenant?.full_name || '').trim() || null,
    message: null,
  }

  const count = autofillCount(result)
  if (count === 0) return null

  result.message = `Society records loaded for ${apt} (${count} record${count > 1 ? 's' : ''}). Review each tab below.`
  return result
}
