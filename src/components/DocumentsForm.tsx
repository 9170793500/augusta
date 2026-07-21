import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { DocumentType, FormProps, KycDocument } from '../lib/types'
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

export function DocumentsForm({ onSaved, apartmentNo, lockApartment, readOnly }: FormProps) {
  const [apt, setApt] = useState(apartmentNo || '')
  const [form, setForm] = useState({ document_type: 'owner_aadhar' as DocumentType, holder_name: '', reference_no: '', file_url: '', valid_till: '' })
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
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

export function DocumentsTable({ rows, onDelete, readOnly }: { rows: KycDocument[]; onDelete: (id: string) => void; readOnly?: boolean }) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Apartment</th><th>Type</th><th>Holder</th><th>Reference</th>{!readOnly && <th>Actions</th>}</tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={5} className="empty">No documents.</td></tr> : rows.map((r) => (
        <tr key={r.id}><td>{r.apartment_no || '—'}</td><td>{r.document_type.replace(/_/g, ' ')}</td><td>{r.holder_name || '—'}</td><td>{r.reference_no || '—'}</td>
          {!readOnly && <td><button type="button" className="btn btn-danger" onClick={() => onDelete(r.id)}>Delete</button></td>}</tr>
      ))}</tbody>
    </table></div>
  )
}
