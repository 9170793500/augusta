import { supabase } from './supabase'
import type { DocumentType, OccupancyRole } from './types'
import type { PersonFields } from './residentUtils'

const SYNC_NOTE_PREFIX = 'auto:profile:'

function syncNote(role: OccupancyRole, residentId: string, field: 'aadhar' | 'pan') {
  return `${SYNC_NOTE_PREFIX}${role}:${residentId}:${field}`
}

function aadharDocType(role: OccupancyRole): DocumentType {
  return role === 'owner' ? 'owner_aadhar' : 'tenant_aadhar'
}

function panDocType(role: OccupancyRole): DocumentType {
  return role === 'owner' ? 'owner_pan' : 'tenant_pan'
}

async function upsertAutoKyc(params: {
  apartment_no: string
  document_type: DocumentType
  holder_name: string
  reference_no: string
  notes: string
}) {
  const { data: existing } = await supabase
    .from('kyc_documents')
    .select('id')
    .eq('notes', params.notes)
    .maybeSingle()

  const ref = params.reference_no.trim()
  if (!ref) {
    if (existing?.id) {
      await supabase.from('kyc_documents').delete().eq('id', existing.id)
    }
    return
  }

  const payload = {
    apartment_no: params.apartment_no,
    document_type: params.document_type,
    holder_name: params.holder_name,
    reference_no: ref,
    notes: params.notes,
  }

  if (existing?.id) {
    const { error } = await supabase.from('kyc_documents').update(payload as never).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('kyc_documents').insert(payload as never)
    if (error) throw error
  }
}

/** Sync Aadhar & PAN from owner/resident profile into kyc_documents. */
export async function syncResidentKycDocuments(
  apartment_no: string,
  person: PersonFields,
  residentId: string
) {
  const holder = person.full_name.trim()
  if (!holder) return

  await upsertAutoKyc({
    apartment_no,
    document_type: aadharDocType(person.occupancy_role),
    holder_name: holder,
    reference_no: person.aadhar_number,
    notes: syncNote(person.occupancy_role, residentId, 'aadhar'),
  })

  await upsertAutoKyc({
    apartment_no,
    document_type: panDocType(person.occupancy_role),
    holder_name: holder,
    reference_no: person.pan_number,
    notes: syncNote(person.occupancy_role, residentId, 'pan'),
  })
}

type ResidentRow = {
  id: string
  apartment_no: string
  occupancy_role: OccupancyRole
  is_current: boolean
  resident?: {
    id: string
    full_name: string
    father_name?: string | null
    aadhar_number?: string | null
    pan_number?: string | null
    email?: string | null
    mobile?: string | null
    alt_mobile?: string | null
  } | null
}

/** Backfill KYC rows for all linked residents (admin refresh). */
export async function syncAllResidentsKyc(rows: ResidentRow[]) {
  for (const row of rows) {
    const r = row.resident
    if (!r?.full_name?.trim() || !row.apartment_no) continue

    await syncResidentKycDocuments(
      row.apartment_no,
      {
        id: r.id,
        flatResidentId: row.id,
        full_name: r.full_name,
        father_name: r.father_name || '',
        aadhar_number: r.aadhar_number || '',
        pan_number: r.pan_number || '',
        email: r.email || '',
        mobile: r.mobile || '',
        alt_mobile: r.alt_mobile || '',
        occupancy_role: row.occupancy_role,
        is_current: row.is_current,
      },
      r.id
    )
  }
}
