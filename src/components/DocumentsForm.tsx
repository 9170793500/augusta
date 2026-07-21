import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DocumentType, FormProps, KycDocument, OccupancyRole } from '../lib/types'
import type { FlatResidentRow } from './FlatResidentsForm'
import { ApartmentField } from './ApartmentField'

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'owner_aadhar', label: 'Owner Aadhar' },
  { value: 'owner_pan', label: 'Owner PAN' },
  { value: 'tenant_aadhar', label: 'Tenant Aadhar' },
  { value: 'tenant_pan', label: 'Tenant PAN' },
  { value: 'lease_copy', label: 'Lease Copy' },
  { value: 'maid_aadhar', label: 'Maid Aadhar' },
  { value: 'maid_photo', label: 'Maid Photo' },
  { value: 'security_aadhar', label: 'Security Aadhar' },
  { value: 'vehicle_rc', label: 'Vehicle RC' },
  { value: 'vehicle_licence', label: 'Vehicle Licence' },
  { value: 'vehicle_puc', label: 'Vehicle PUC' },
  { value: 'other', label: 'Other' },
]

function roleFromDocType(type: DocumentType): OccupancyRole | null {
  if (type.startsWith('owner_')) return 'owner'
  if (type.startsWith('tenant_')) return 'tenant'
  return null
}

function pickResidentRow(doc: KycDocument, rows: FlatResidentRow[]): FlatResidentRow | null {
  const apt = doc.apartment_no?.trim().toUpperCase()
  if (!apt) return null

  const role = roleFromDocType(doc.document_type)
  let matches = rows.filter((r) => r.apartment_no.toUpperCase() === apt)
  if (role) matches = matches.filter((r) => r.occupancy_role === role)

  if (doc.holder_name) {
    const holder = doc.holder_name.trim().toLowerCase()
    const byName = matches.find((r) => r.resident?.full_name?.trim().toLowerCase() === holder)
    if (byName) return byName
  }

  return matches[0] || null
}

async function fetchResidentForDoc(doc: KycDocument): Promise<FlatResidentRow | null> {
  const apt = doc.apartment_no?.trim().toUpperCase()
  if (!apt) return null

  const role = roleFromDocType(doc.document_type)
  let query = supabase
    .from('flat_residents')
    .select('*, resident:resident_master(*)')
    .eq('apartment_no', apt)

  if (role) query = query.eq('occupancy_role', role)

  const { data, error } = await query
  if (error || !data?.length) return null

  return pickResidentRow(doc, data as FlatResidentRow[])
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value?.trim() || '—'}</span>
    </div>
  )
}

function KycViewModal({
  doc,
  person,
  loading,
  onClose,
}: {
  doc: KycDocument
  person: FlatResidentRow | null
  loading: boolean
  onClose: () => void
}) {
  const r = person?.resident
  const role = person?.occupancy_role || roleFromDocType(doc.document_type)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>KYC — {doc.holder_name || doc.apartment_no || 'Details'}</h3>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {loading ? (
          <p className="form-hint">Loading resident details…</p>
        ) : (
          <>
            <section className="detail-section">
              <h4 className="detail-section-title">Person details</h4>
              {r ? (
                <div className="detail-grid">
                  <DetailItem label="Apartment" value={doc.apartment_no} />
                  <DetailItem label="Role" value={role === 'owner' ? 'Owner' : role === 'tenant' ? 'Tenant' : '—'} />
                  <DetailItem label="Full name" value={r.full_name} />
                  <DetailItem label="Father name" value={r.father_name} />
                  <DetailItem label="Aadhar" value={r.aadhar_number} />
                  <DetailItem label="PAN" value={r.pan_number} />
                  <DetailItem label="Email" value={r.email} />
                  <DetailItem label="Mobile" value={r.mobile} />
                  <DetailItem label="Alt. mobile" value={r.alt_mobile} />
                  <DetailItem label="Currently living" value={person?.is_current ? 'Yes' : 'No'} />
                </div>
              ) : (
                <div className="alert alert-warn">
                  No linked owner/resident record found for this document. Showing document info only.
                </div>
              )}
            </section>

            <section className="detail-section">
              <h4 className="detail-section-title">Document</h4>
              <div className="detail-grid">
                <DetailItem label="Type" value={doc.document_type.replace(/_/g, ' ')} />
                <DetailItem label="Holder" value={doc.holder_name} />
                <DetailItem label="Reference / ID" value={doc.reference_no} />
                <DetailItem label="Valid till" value={doc.valid_till} />
                <DetailItem label="File link" value={doc.file_url} />
              </div>
              {doc.file_url && (
                <a className="link-btn" href={doc.file_url} target="_blank" rel="noreferrer">
                  Open document →
                </a>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export function DocumentsForm({ onSaved, apartmentNo, lockApartment, readOnly }: FormProps) {
  const [apt, setApt] = useState(apartmentNo || '')
  const [form, setForm] = useState({ document_type: 'owner_aadhar' as DocumentType, holder_name: '', reference_no: '', file_url: '', valid_till: '' })
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const apartment_no = (lockApartment ? apartmentNo : apt)?.trim().toUpperCase()
    const { error: err } = await supabase.from('kyc_documents').insert({
      apartment_no: apartment_no || null,
      document_type: form.document_type,
      holder_name: form.holder_name || null,
      reference_no: form.reference_no || null,
      file_url: form.file_url || null,
      valid_till: form.valid_till || null,
    } as never)
    if (err) return setError(err.message)
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">KYC / Documents</h3>
      <p className="form-hint">BRD §11 — Store Aadhar, PAN, RC, licence and other proofs.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <ApartmentField apartmentNo={apartmentNo} lockApartment={lockApartment} value={apt} onChange={setApt} />
      <div className="form-grid">
        <div className="field full"><label>Document Type</label>
          <select disabled={readOnly} value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value as DocumentType })}>
            {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="field"><label>Holder Name</label><input disabled={readOnly} value={form.holder_name} onChange={(e) => setForm({ ...form, holder_name: e.target.value })} /></div>
        <div className="field"><label>Reference / ID No</label><input disabled={readOnly} value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} /></div>
        <div className="field full"><label>File URL / Link</label><input disabled={readOnly} placeholder="https://..." value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} /></div>
        <div className="field"><label>Valid Till</label><input type="date" disabled={readOnly} value={form.valid_till} onChange={(e) => setForm({ ...form, valid_till: e.target.value })} /></div>
      </div>
      {!readOnly && <button className="btn btn-primary">Save document</button>}
    </form>
  )
}

export function DocumentsTable({
  rows,
  flatResidents = [],
  onDelete,
  readOnly,
}: {
  rows: KycDocument[]
  flatResidents?: FlatResidentRow[]
  onDelete: (id: string) => void
  readOnly?: boolean
}) {
  const [viewDoc, setViewDoc] = useState<KycDocument | null>(null)
  const [viewPerson, setViewPerson] = useState<FlatResidentRow | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  async function openView(doc: KycDocument) {
    setViewDoc(doc)
    setViewLoading(true)
    setViewPerson(null)

    const cached = pickResidentRow(doc, flatResidents)
    if (cached) {
      setViewPerson(cached)
      setViewLoading(false)
      return
    }

    const fetched = await fetchResidentForDoc(doc)
    setViewPerson(fetched)
    setViewLoading(false)
  }

  function closeView() {
    setViewDoc(null)
    setViewPerson(null)
    setViewLoading(false)
  }

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Apartment</th>
              <th>Type</th>
              <th>Holder</th>
              <th>Reference</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="empty">No documents.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.apartment_no || '—'}</td>
                  <td>{r.document_type.replace(/_/g, ' ')}</td>
                  <td>{r.holder_name || '—'}</td>
                  <td>{r.reference_no || '—'}</td>
                  <td className="actions">
                    <button type="button" className="btn btn-view" onClick={() => openView(r)}>
                      View
                    </button>
                    {!readOnly && (
                      <button type="button" className="btn btn-danger" onClick={() => onDelete(r.id)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewDoc && (
        <KycViewModal doc={viewDoc} person={viewPerson} loading={viewLoading} onClose={closeView} />
      )}
    </>
  )
}
