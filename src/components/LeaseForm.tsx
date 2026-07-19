import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { FormProps, Lease, LeaseStatus } from '../lib/types'
import { ApartmentField } from './ApartmentField'

export function LeaseForm({ onSaved, apartmentNo, lockApartment, readOnly }: FormProps) {
  const [apt, setApt] = useState(apartmentNo || '')
  const [form, setForm] = useState({ tenant_name: '', lease_start: '', lease_end: '', status: 'active' as LeaseStatus, notes: '' })
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const apartment_no = (lockApartment ? apartmentNo : apt)?.trim().toUpperCase()
    if (!apartment_no) return setError('Apartment required')
    const { error: err } = await supabase.from('leases').insert({
      apartment_no, ...form, document_url: null,
    } as never)
    if (err) return setError(err.message)
    setForm({ tenant_name: '', lease_start: '', lease_end: '', status: 'active', notes: '' })
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Lease Management</h3>
      <p className="form-hint">BRD §4 — Track tenancy agreement and expiry.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <ApartmentField apartmentNo={apartmentNo} lockApartment={lockApartment} value={apt} onChange={setApt} />
      <div className="form-grid">
        <div className="field full"><label>Tenant Name</label><input required disabled={readOnly} value={form.tenant_name} onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} /></div>
        <div className="field"><label>Lease Start</label><input type="date" required disabled={readOnly} value={form.lease_start} onChange={(e) => setForm({ ...form, lease_start: e.target.value })} /></div>
        <div className="field"><label>Lease End</label><input type="date" required disabled={readOnly} value={form.lease_end} onChange={(e) => setForm({ ...form, lease_end: e.target.value })} /></div>
        <div className="field"><label>Status</label>
          <select disabled={readOnly} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeaseStatus })}>
            <option value="active">Active</option><option value="expired">Expired</option><option value="renewed">Renewed</option>
          </select>
        </div>
      </div>
      {!readOnly && <button className="btn btn-primary">Save lease</button>}
    </form>
  )
}

export function LeaseTable({ rows, onDelete, readOnly }: { rows: Lease[]; onDelete: (id: string) => void; readOnly?: boolean }) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Apartment</th><th>Tenant</th><th>Start</th><th>End</th><th>Status</th>{!readOnly && <th>Actions</th>}</tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={6} className="empty">No leases.</td></tr> : rows.map((r) => (
        <tr key={r.id}><td>{r.apartment_no}</td><td>{r.tenant_name}</td><td>{r.lease_start}</td><td>{r.lease_end}</td>
          <td><span className={`badge ${r.status === 'active' ? '' : 'expired'}`}>{r.status}</span></td>
          {!readOnly && <td><button type="button" className="btn btn-danger" onClick={() => onDelete(r.id)}>Delete</button></td>}</tr>
      ))}</tbody>
    </table></div>
  )
}
