import { normalizeApartmentInput } from './apartmentUtils'
import { supabase } from './supabase'
import { submitPublicDetailDirect } from './publicSubmitDirect'

const TOKEN_KEY = 'augusta_public_submission_token'
const CONTACT_KEY = 'augusta_public_contact'
const CACHE_KEY = 'augusta_public_submissions_cache'

export type PublicDetailCategory = 'owner' | 'tenant' | 'lease' | 'maid' | 'driver' | 'vehicle'

export type LivingAs = 'owner_resident' | 'owner_non_resident' | 'tenant_resident'

export type PublicContact = {
  apartmentNo: string
  submitterName: string
  /** Kept for older cached data; no longer collected in UI */
  submitterMobile: string
  livingAs: LivingAs
}

export type PublicSubmission = {
  id: string
  submission_token: string
  apartment_no: string
  submitter_mobile: string
  submitter_name: string | null
  category: PublicDetailCategory
  details: Record<string, unknown>
  status: string
  created_at: string
}

const OWNER_RESIDENT_TABS: PublicDetailCategory[] = ['owner', 'maid', 'driver', 'vehicle']
const OWNER_NON_RESIDENT_TABS: PublicDetailCategory[] = ['owner', 'vehicle']
const TENANT_RESIDENT_TABS: PublicDetailCategory[] = ['tenant', 'lease', 'maid', 'driver', 'vehicle']

export function normalizeLivingAs(raw: unknown): LivingAs {
  if (raw === 'tenant' || raw === 'tenant_resident') return 'tenant_resident'
  if (raw === 'owner_non_resident') return 'owner_non_resident'
  return 'owner_resident'
}

export function tabsForLivingAs(livingAs: LivingAs): PublicDetailCategory[] {
  if (livingAs === 'tenant_resident') return TENANT_RESIDENT_TABS
  if (livingAs === 'owner_non_resident') return OWNER_NON_RESIDENT_TABS
  return OWNER_RESIDENT_TABS
}

export function defaultTabForLivingAs(livingAs: LivingAs): PublicDetailCategory {
  return livingAs === 'tenant_resident' ? 'tenant' : 'owner'
}

export function livingAsLabel(livingAs: LivingAs): string {
  if (livingAs === 'tenant_resident') return 'Tenant Resident'
  if (livingAs === 'owner_non_resident') return 'Owner Non-Resident'
  return 'Owner Resident'
}

export function vehicleLinkedTo(livingAs: LivingAs): 'owner' | 'tenant' {
  return livingAs === 'tenant_resident' ? 'tenant' : 'owner'
}

export function getSubmissionToken(): string {
  let token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem(TOKEN_KEY, token)
  }
  return token
}

export function loadPublicContact(): PublicContact {
  try {
    const raw = localStorage.getItem(CONTACT_KEY)
    if (!raw) return { apartmentNo: '', submitterName: '', submitterMobile: '', livingAs: 'owner_resident' }
    const parsed = JSON.parse(raw) as Partial<PublicContact>
    const apartmentRaw = parsed.apartmentNo || ''
    return {
      apartmentNo: normalizeApartmentInput(apartmentRaw) || apartmentRaw.trim().toUpperCase(),
      submitterName: parsed.submitterName || '',
      submitterMobile: parsed.submitterMobile || '',
      livingAs: normalizeLivingAs(parsed.livingAs),
    }
  } catch {
    return { apartmentNo: '', submitterName: '', submitterMobile: '', livingAs: 'owner_resident' }
  }
}

export function savePublicContact(contact: PublicContact) {
  localStorage.setItem(CONTACT_KEY, JSON.stringify(contact))
}

function loadLocalCache(): PublicSubmission[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as PublicSubmission[]).map((row) => ({
      ...row,
      apartment_no:
        normalizeApartmentInput(row.apartment_no) || row.apartment_no.trim().toUpperCase(),
    }))
  } catch {
    return []
  }
}

function saveLocalCache(rows: PublicSubmission[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(rows.slice(0, 300)))
}

function localForToken(token: string) {
  return loadLocalCache().filter((r) => r.submission_token === token)
}

export function cacheSubmissionLocally(
  contact: PublicContact,
  category: PublicDetailCategory,
  details: Record<string, unknown>,
  id?: string
) {
  const token = getSubmissionToken()
  const entry: PublicSubmission = {
    id: id || crypto.randomUUID(),
    submission_token: token,
    apartment_no: normalizeApartmentInput(contact.apartmentNo) || contact.apartmentNo.trim().toUpperCase(),
    submitter_mobile: contact.submitterMobile.trim(),
    submitter_name: contact.submitterName.trim() || null,
    category,
    details,
    status: 'saved',
    created_at: new Date().toISOString(),
  }
  const merged = [entry, ...loadLocalCache().filter((r) => r.id !== entry.id)]
  saveLocalCache(merged)
  return entry
}

export function nextTabAfterSubmit(
  current: PublicDetailCategory,
  livingAs: LivingAs = 'owner_resident'
): PublicDetailCategory | 'view' {
  const seq = tabsForLivingAs(livingAs)
  const idx = seq.indexOf(current)
  if (idx >= 0 && idx < seq.length - 1) return seq[idx + 1]
  return 'view'
}

function isMissingRpc(error: { code?: string; message?: string; status?: number } | null) {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  return (
    error.code === 'PGRST202' ||
    error.status === 404 ||
    msg.includes('404') ||
    msg.includes('not find') ||
    msg.includes('could not find the function') ||
    msg.includes('schema cache')
  )
}

/**
 * Saves into real tables via security-definer RPC (avoids 401 RLS).
 * Falls back to direct insert only if RPC is not installed yet.
 */
export async function submitPublicDetail(
  category: PublicDetailCategory,
  details: Record<string, unknown>,
  contact: PublicContact
) {
  savePublicContact(contact)
  const token = getSubmissionToken()

  const { data, error } = await supabase.rpc('submit_public_detail', {
    p_token: token,
    p_apartment_no: normalizeApartmentInput(contact.apartmentNo) || contact.apartmentNo.trim().toUpperCase(),
    p_submitter_mobile: (contact.submitterMobile || (details.mobile as string) || '').toString().trim() || 'public',
    p_submitter_name: contact.submitterName.trim() || null,
    p_category: category,
    p_details: details,
  })

  if (!error) {
    const entry = cacheSubmissionLocally(contact, category, details, data as string)
    return entry.id
  }

  if (isMissingRpc(error)) {
    throw new Error(
      'Database function missing (401/404). Open Supabase → SQL Editor → run the full file supabase/public_details_submissions.sql, then try again.'
    )
  }

  // Auth/RLS on RPC itself should be rare; show clear message
  const msg = error.message || 'Submit failed'
  if (msg.includes('401') || msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('unauthorized')) {
    throw new Error(
      'Unauthorized (401). Re-run supabase/public_details_submissions.sql in Supabase SQL Editor (grants execute to anon).'
    )
  }

  // Last resort: try direct (needs open policies) — usually fails with 401 without SQL
  try {
    await submitPublicDetailDirect(category, details, contact)
    return cacheSubmissionLocally(contact, category, details).id
  } catch {
    throw new Error(msg)
  }
}

export async function updatePublicDetail(
  recordId: string,
  category: PublicDetailCategory,
  details: Record<string, unknown>,
  contact: PublicContact
) {
  savePublicContact(contact)

  const { data, error } = await supabase.rpc('update_public_detail', {
    p_record_id: recordId,
    p_category: category,
    p_apartment_no: normalizeApartmentInput(contact.apartmentNo) || contact.apartmentNo.trim().toUpperCase(),
    p_details: details,
  })

  if (error) {
    const msg = error.message || 'Update failed'
    if (isMissingRpc(error) || msg.toLowerCase().includes('could not find')) {
      throw new Error(
        'Update function missing. Run supabase/public_details_submissions.sql in Supabase SQL Editor, then try again.'
      )
    }
    throw new Error(msg)
  }

  const all = loadLocalCache().map((row) =>
    row.id === recordId
      ? {
          ...row,
          apartment_no: normalizeApartmentInput(contact.apartmentNo) || contact.apartmentNo.trim().toUpperCase(),
          submitter_mobile: contact.submitterMobile.trim(),
          submitter_name: contact.submitterName.trim() || null,
          details,
          status: 'saved',
        }
      : row
  )
  saveLocalCache(all)
  return (data as string) || recordId
}

export type FetchSubmissionsResult = {
  rows: PublicSubmission[]
  message: string | null
}

export async function fetchPublicSubmissions(): Promise<FetchSubmissionsResult> {
  return {
    rows: localForToken(getSubmissionToken()),
    message: null,
  }
}

export async function submitPublicDetailBatch(
  category: PublicDetailCategory,
  detailsList: Record<string, unknown>[],
  contact: PublicContact
) {
  if (detailsList.length === 0) {
    throw new Error('Fill at least one record with Name, Aadhar and Card Number.')
  }
  for (const details of detailsList) {
    await submitPublicDetail(category, details, contact)
  }
}

export function categoryLabel(category: PublicDetailCategory | string) {
  const labels: Record<string, string> = {
    owner: 'Owner',
    tenant: 'Tenant',
    lease: 'Lease',
    maid: 'Domestic Help',
    driver: 'Driver',
    vehicle: 'Vehicle',
    servant: 'Domestic Help',
  }
  return labels[category] || category
}

export function detailSummary(details: Record<string, unknown>): string {
  const name =
    (details.full_name as string) ||
    (details.name as string) ||
    (details.driver_name as string) ||
    (details.tenant_name as string) ||
    (details.vehicle_no as string) ||
    ''
  const mobile = (details.mobile as string) || ''
  const lease =
    details.lease_start && details.lease_end
      ? `${details.lease_start} → ${details.lease_end}`
      : ''
  return [name, mobile, lease].filter(Boolean).join(' · ') || 'Details submitted'
}

const DETAIL_FIELD_LABELS: Record<string, string> = {
  full_name: 'Full name',
  father_name: 'Father / husband name',
  guardian_type: 'Relation',
  spouse_name: 'Spouse name',
  spouse_mobile: 'Spouse mobile',
  tenant_name: 'Tenant name',
  name: 'Name',
  driver_name: 'Driver name',
  mobile: 'Mobile',
  alt_mobile: 'Alt. mobile',
  email: 'Email',
  aadhar_number: 'Aadhar',
  pan_number: 'PAN',
  family_members: 'Family members',
  lease_start: 'Lease start',
  lease_end: 'Lease end',
  status: 'Status',
  notes: 'Notes',
  vehicle_no: 'Vehicle no',
  make_model: 'Make / model',
  colour: 'Colour',
  licence_number: 'Licence number',
  licence_valid_from: 'Licence valid from',
  licence_validity: 'Licence valid till',
  card_number: 'Card number',
  card_valid_from: 'Card valid from',
  card_validity: 'Card valid till',
  employment_type: 'Employment type',
  gender: 'Gender',
  address: 'Address',
  linked_to: 'Linked to',
  is_resident: 'Owner resident',
}

export function formatSubmissionDetailRows(
  details: Record<string, unknown>
): { label: string; value: string }[] {
  return Object.entries(details)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([key, value]) => ({
      label: DETAIL_FIELD_LABELS[key] || key.replace(/_/g, ' '),
      value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value),
    }))
}

export function existingSubmissionsForCategory(
  submissions: PublicSubmission[],
  apartmentNo: string,
  category: PublicDetailCategory
): PublicSubmission[] {
  const apt = normalizeApartmentInput(apartmentNo)
  if (!apt) return []
  return submissions
    .filter(
      (row) =>
        (normalizeApartmentInput(row.apartment_no) || row.apartment_no.trim().toUpperCase()) ===
          apt && row.category === category
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
