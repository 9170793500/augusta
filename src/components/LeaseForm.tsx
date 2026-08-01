import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { FormProps, Lease, LeaseStatus } from '../lib/types'
import { normalizeApartmentInput } from '../lib/apartmentUtils'
import { ApartmentField } from './ApartmentField'
import {
  LeaseDocumentUpload,
  LeaseFieldsSection,
  type LeaseFieldValues,
} from './LeaseDocumentUpload'
import type { ParsedLeaseFields } from '../lib/leaseDocumentParse'

function emptyLeaseForm(): LeaseFieldValues {
  return {
    tenant_name: '',
    lease_start: '',
    lease_end: '',
    status: 'active',
    notes: '',
    document_url: '',
  }
}

function mergeParsedFields(current: LeaseFieldValues, parsed: ParsedLeaseFields): LeaseFieldValues {
  const lease_end = parsed.lease_end || current.lease_end
  return {
    ...current,
    tenant_name: parsed.tenant_name || current.tenant_name,
    lease_start: parsed.lease_start || current.lease_start,
    lease_end,
    status: parsed.status || current.status,
  }
}

export function LeaseForm({ onSaved, apartmentNo, lockApartment, readOnly }: FormProps) {
  const [apt, setApt] = useState(apartmentNo || '')
  const [form, setForm] = useState<LeaseFieldValues>(emptyLeaseForm)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const activeApt = normalizeApartmentInput(lockApartment ? apartmentNo || '' : apt)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const apartment_no = activeApt
    if (!apartment_no) return setError('Apartment is required')
    if (!form.tenant_name.trim()) return setError('Tenant name is required')
    if (!form.lease_start || !form.lease_end) return setError('Lease start and end dates are required')

    const { error: err } = await supabase.from('leases').insert({
      apartment_no,
      tenant_name: form.tenant_name.trim(),
      lease_start: form.lease_start,
      lease_end: form.lease_end,
      status: form.status as LeaseStatus,
      notes: form.notes.trim() || null,
      document_url: form.document_url || null,
    } as never)
    if (err) return setError(err.message)
    setForm(emptyLeaseForm())
    setFileName('')
    if (!lockApartment) setApt('')
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Lease Management</h3>
      <p className="form-hint">Upload a lease copy to auto-fill fields, or enter details manually.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <ApartmentField apartmentNo={apartmentNo} lockApartment={lockApartment} value={apt} onChange={setApt} />

      {!readOnly && (
        <LeaseDocumentUpload
          apartmentNo={activeApt}
          documentUrl={form.document_url}
          fileName={fileName}
          onDocumentUrl={(url) => setForm((f) => ({ ...f, document_url: url }))}
          onFileName={setFileName}
          onParsed={(parsed) => setForm((f) => mergeParsedFields(f, parsed))}
          disabled={!activeApt || readOnly}
        />
      )}

      {!activeApt && !readOnly && (
        <div className="alert alert-warn">Enter apartment number before uploading a lease document.</div>
      )}

      <LeaseFieldsSection value={form} onChange={setForm} readOnly={readOnly} />

      {!readOnly && <button className="btn btn-primary">Save lease</button>}
    </form>
  )
}

export function LeaseTable({ rows, onDelete, readOnly }: { rows: Lease[]; onDelete: (id: string) => void; readOnly?: boolean }) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Apartment</th><th>Tenant</th><th>Start</th><th>End</th><th>Status</th><th>Document</th>{!readOnly && <th>Actions</th>}</tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={readOnly ? 6 : 7} className="empty">No leases.</td></tr> : rows.map((r) => (
        <tr key={r.id}><td>{r.apartment_no}</td><td>{r.tenant_name}</td><td>{r.lease_start}</td><td>{r.lease_end}</td>
          <td><span className={`badge ${r.status === 'active' ? '' : 'expired'}`}>{r.status}</span></td>
          <td>{r.document_url ? <a href={r.document_url} target="_blank" rel="noreferrer">View</a> : '—'}</td>
          {!readOnly && <td><button type="button" className="btn btn-danger" onClick={() => onDelete(r.id)}>Delete</button></td>}</tr>
      ))}</tbody>
    </table></div>
  )
}
