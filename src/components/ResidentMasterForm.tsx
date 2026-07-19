import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { FormProps, ResidentMaster } from '../lib/types'

export function ResidentMasterForm({ onSaved, readOnly }: FormProps) {
  const [form, setForm] = useState({
    full_name: '',
    father_name: '',
    aadhar_number: '',
    pan_number: '',
    email: '',
    mobile: '',
    alt_mobile: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    if (!form.full_name.trim()) return setError('Name is required')
    setError(null)
    const { error: err } = await supabase.from('resident_master').insert({
      full_name: form.full_name.trim(),
      father_name: form.father_name.trim() || null,
      aadhar_number: form.aadhar_number.trim() || null,
      pan_number: form.pan_number.trim().toUpperCase() || null,
      email: form.email.trim() || null,
      mobile: form.mobile.trim() || null,
      alt_mobile: form.alt_mobile.trim() || null,
      notes: form.notes.trim() || null,
    } as never)
    if (err) return setError(err.message)
    setOk('Resident saved.')
    setForm({ full_name: '', father_name: '', aadhar_number: '', pan_number: '', email: '', mobile: '', alt_mobile: '', notes: '' })
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Resident Master</h3>
      <p className="form-hint">Personal & KYC details — name, father name, Aadhar, PAN, email and mobile numbers.</p>
      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}
      <div className="form-grid">
        <div className="field full"><label>Full Name</label><input required disabled={readOnly} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div className="field full"><label>Father Name</label><input disabled={readOnly} value={form.father_name} onChange={(e) => setForm({ ...form, father_name: e.target.value })} /></div>
        <div className="field"><label>Aadhar Number</label><input disabled={readOnly} value={form.aadhar_number} onChange={(e) => setForm({ ...form, aadhar_number: e.target.value })} placeholder="12 digit" /></div>
        <div className="field"><label>PAN Number</label><input disabled={readOnly} value={form.pan_number} onChange={(e) => setForm({ ...form, pan_number: e.target.value })} placeholder="ABCDE1234F" /></div>
        <div className="field"><label>Email</label><input type="email" disabled={readOnly} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="field"><label>Mobile Number</label><input disabled={readOnly} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
        <div className="field"><label>Alternative Mobile</label><input disabled={readOnly} value={form.alt_mobile} onChange={(e) => setForm({ ...form, alt_mobile: e.target.value })} /></div>
        <div className="field full"><label>Notes</label><input disabled={readOnly} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      {!readOnly && <button className="btn btn-primary">Save resident</button>}
    </form>
  )
}

export function ResidentMasterTable({ rows, onDelete, canDelete }: { rows: ResidentMaster[]; onDelete: (id: string) => void; canDelete: boolean }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Father</th>
            <th>Mobile</th>
            <th>Aadhar</th>
            <th>PAN</th>
            {canDelete && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={canDelete ? 6 : 5} className="empty">No residents in master yet.</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>{r.full_name}</td>
                <td>{r.father_name || '—'}</td>
                <td>{r.mobile || '—'}{r.alt_mobile ? ` / ${r.alt_mobile}` : ''}</td>
                <td>{r.aadhar_number || '—'}</td>
                <td>{r.pan_number || '—'}</td>
                {canDelete && (
                  <td><button type="button" className="btn btn-danger" onClick={() => onDelete(r.id)}>Delete</button></td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
