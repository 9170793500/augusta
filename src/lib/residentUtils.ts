import type { FlatResidentRow } from '../components/FlatResidentsForm'
import { supabase } from '../lib/supabase'
import { syncResidentKycDocuments } from './kycSync'
import type { Flat, OccupancyRole, ResidentMaster } from '../lib/types'

function normApt(apt: string) {
  return apt.trim().toUpperCase()
}

/** Old flats.owner_name / tenant_name rows that were never linked in flat_residents. */
export function mergeLegacyFlatsResidents(
  flatResidents: FlatResidentRow[],
  flats: Flat[]
): FlatResidentRow[] {
  const merged = [...flatResidents]

  for (const flat of flats) {
    const apt = flat.apartment_no
    const aptNorm = normApt(apt)

    const hasOwnerLink = flatResidents.some(
      (r) => normApt(r.apartment_no) === aptNorm && r.occupancy_role === 'owner'
    )
    if (!hasOwnerLink && flat.owner_name?.trim()) {
      merged.push({
        id: `legacy:${flat.id}:owner`,
        apartment_no: apt,
        resident_id: '',
        occupancy_role: 'owner',
        is_current: true,
        move_in_date: null,
        move_out_date: null,
        notes: null,
        created_at: flat.created_at,
        resident: {
          id: '',
          full_name: flat.owner_name.trim(),
          father_name: null,
          aadhar_number: flat.owner_aadhar,
          pan_number: null,
          email: flat.owner_email,
          mobile: flat.owner_phone,
          alt_mobile: null,
          notes: null,
          created_at: flat.created_at,
        },
      })
    }

    const hasTenantLink = flatResidents.some(
      (r) => normApt(r.apartment_no) === aptNorm && r.occupancy_role === 'tenant'
    )
    if (!hasTenantLink && flat.tenant_name?.trim()) {
      merged.push({
        id: `legacy:${flat.id}:tenant`,
        apartment_no: apt,
        resident_id: '',
        occupancy_role: 'tenant',
        is_current: true,
        move_in_date: null,
        move_out_date: null,
        notes: null,
        created_at: flat.created_at,
        resident: {
          id: '',
          full_name: flat.tenant_name.trim(),
          father_name: null,
          aadhar_number: flat.tenant_aadhar,
          pan_number: flat.tenant_pan,
          email: flat.tenant_email,
          mobile: flat.tenant_phone,
          alt_mobile: null,
          notes: null,
          created_at: flat.created_at,
        },
      })
    }
  }

  return merged
}

/** Include owner apartments that exist only in flat_residents (no flats row yet). */
export function mergeOwnerFlats(flats: Flat[], flatResidents: FlatResidentRow[]): Flat[] {
  const byApt = new Map<string, Flat>()
  for (const flat of flats) {
    byApt.set(normApt(flat.apartment_no), flat)
  }

  for (const row of flatResidents) {
    if (row.occupancy_role !== 'owner') continue
    const aptNorm = normApt(row.apartment_no)
    if (byApt.has(aptNorm)) continue
    byApt.set(aptNorm, {
      id: `resident-flat:${row.id}`,
      apartment_no: row.apartment_no,
      tower: null,
      floor: null,
      owner_name: row.resident?.full_name || null,
      owner_phone: row.resident?.mobile || null,
      owner_email: row.resident?.email || null,
      owner_aadhar: row.resident?.aadhar_number || null,
      tenant_name: null,
      tenant_phone: null,
      tenant_email: null,
      tenant_aadhar: null,
      tenant_pan: null,
      family_members: null,
      occupancy_status: null,
      status: null,
      created_at: row.created_at,
    })
  }

  return Array.from(byApt.values()).sort((a, b) => a.apartment_no.localeCompare(b.apartment_no))
}

export function isLegacyResidentId(id: string) {
  return id.startsWith('legacy:')
}

export function isSyntheticFlatId(id: string) {
  return id.startsWith('resident-flat:') || id.startsWith('legacy:')
}

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

  // Owner: one owner link per flat — avoid duplicate inserts
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

  if (residentId) {
    await syncResidentKycDocuments(apartment_no, person, residentId)
  }

  return residentId
}
