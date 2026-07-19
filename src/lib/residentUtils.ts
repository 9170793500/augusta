import { supabase } from '../lib/supabase'
import type { OccupancyRole, ResidentMaster } from '../lib/types'

export type OwnerLink = {
  flatResidentId?: string
  resident?: ResidentMaster | null
}

export type PersonFields = {
  id?: string
  flatResidentId?: string
  full_name: string
  father_name: string
  aadhar_number: string
  pan_number: string
  email: string
  mobile: string
  alt_mobile: string
  occupancy_role: OccupancyRole
  is_current: boolean
}

export function emptyPerson(role: OccupancyRole = 'tenant'): PersonFields {
  return {
    full_name: '',
    father_name: '',
    aadhar_number: '',
    pan_number: '',
    email: '',
    mobile: '',
    alt_mobile: '',
    occupancy_role: role,
    is_current: true,
  }
}

export function personFromOwner(
  ownerLink: OwnerLink,
  is_current = true
): PersonFields {
  const r = ownerLink.resident
  return {
    id: r?.id,
    flatResidentId: ownerLink.flatResidentId,
    full_name: r?.full_name || '',
    father_name: r?.father_name || '',
    aadhar_number: r?.aadhar_number || '',
    pan_number: r?.pan_number || '',
    email: r?.email || '',
    mobile: r?.mobile || '',
    alt_mobile: r?.alt_mobile || '',
    occupancy_role: 'owner',
    is_current,
  }
}

/** Load flat owner from flat_residents + resident_master, fallback to flats table */
export async function fetchOwnerForApartment(
  apartment_no: string,
  cached?: OwnerLink | null
): Promise<PersonFields | null> {
  if (cached?.resident) {
    return personFromOwner(cached)
  }

  const { data: links } = await supabase
    .from('flat_residents')
    .select('id, is_current, resident:resident_master(*)')
    .eq('apartment_no', apartment_no)
    .eq('occupancy_role', 'owner')
    .order('created_at', { ascending: false })
    .limit(1)

  const link = links?.[0]
  if (link?.resident) {
    const resident = link.resident as unknown as ResidentMaster
    return personFromOwner({ flatResidentId: link.id, resident }, link.is_current ?? true)
  }

  const { data: flat } = await supabase
    .from('flats')
    .select('owner_name, owner_phone, owner_email, owner_aadhar')
    .eq('apartment_no', apartment_no)
    .maybeSingle()

  if (flat?.owner_name) {
    return {
      ...emptyPerson('owner'),
      full_name: flat.owner_name,
      mobile: flat.owner_phone || '',
      email: flat.owner_email || '',
      aadhar_number: flat.owner_aadhar || '',
    }
  }

  return null
}

/** One row per apartment+role+person — no duplicates in UI */
export function dedupeFlatResidents<T extends { id: string; apartment_no: string; occupancy_role: OccupancyRole; resident_id?: string; is_current?: boolean }>(
  rows: T[]
): T[] {
  const map = new Map<string, T>()
  for (const row of rows) {
    const key = `${row.apartment_no}|${row.occupancy_role}|${row.resident_id || row.id}`
    const prev = map.get(key)
    if (!prev || (row.is_current && !prev.is_current)) {
      map.set(key, row)
    }
  }
  return Array.from(map.values())
}

export async function savePersonToFlat(apartment_no: string, person: PersonFields) {
  if (!person.full_name.trim()) return null

  let residentId = person.id
  const masterPayload = {
    full_name: person.full_name.trim(),
    father_name: person.father_name.trim() || null,
    aadhar_number: person.aadhar_number.trim() || null,
    pan_number: person.pan_number.trim().toUpperCase() || null,
    email: person.email.trim() || null,
    mobile: person.mobile.trim() || null,
    alt_mobile: person.alt_mobile.trim() || null,
  }

  if (residentId) {
    const { error } = await supabase.from('resident_master').update(masterPayload as never).eq('id', residentId)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('resident_master').insert(masterPayload as never).select('id').single()
    if (error) throw error
    residentId = data.id
  }

  const linkPayload = {
    apartment_no,
    resident_id: residentId,
    occupancy_role: person.occupancy_role,
    is_current: person.is_current,
  }

  let linkId = person.flatResidentId

  // Owner: ek flat par sirf ek owner link — duplicate insert mat karo
  if (person.occupancy_role === 'owner') {
    if (!linkId) {
      const { data: existing } = await supabase
        .from('flat_residents')
        .select('id')
        .eq('apartment_no', apartment_no)
        .eq('occupancy_role', 'owner')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      linkId = existing?.id
    }
  }

  if (linkId) {
    const { error } = await supabase.from('flat_residents').update(linkPayload as never).eq('id', linkId)
    if (error) throw error
  } else {
    const { error } = await supabase.from('flat_residents').insert(linkPayload as never)
    if (error) throw error
  }

  return residentId
}
