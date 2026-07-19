import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Flat, FormProps } from '../lib/types'
import { ApartmentField } from './ApartmentField'

export function FlatForm({ onSaved, apartmentNo, lockApartment, readOnly }: FormProps) {
  const [apt, setApt] = useState(apartmentNo || '')
  const [form, setForm] = useState({
    tower: '',
    floor: '',
    family_members: '',
    occupancy_status: 'owner_occupied',
  })
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const apartment_no = (lockApartment ? apartmentNo : apt)?.trim().toUpperCase()
    if (!apartment_no) return setError('Apartment No required')
    setError(null)
    const payload = {
      apartment_no,
      tower: form.tower || null,
      floor: form.floor || null,
      family_members: form.family_members ? Number(form.family_members) : null,
      occupancy_status: form.occupancy_status,
      status: form.occupancy_status,
    }
    const { error: err } = await supabase.from('flats').upsert(payload as never, { onConflict: 'apartment_no' })
    if (err) return setError(err.message)
    setOk('Flat saved.')
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Flat Master</h3>
      <p className="form-hint">Apartment / tower details only. Owner & tenant details are in Resident Master and Flat Residents.</p>
      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}
      <ApartmentField apartmentNo={apartmentNo} lockApartment={lockApartment} value={apt} onChange={setApt} />
      <div className="form-grid">
        <div className="field"><label>Tower / Block</label><input value={form.tower} disabled={readOnly} onChange={(e) => setForm({ ...form, tower: e.target.value })} /></div>
        <div className="field"><label>Floor</label><input value={form.floor} disabled={readOnly} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
        <div className="field"><label>Occupancy</label>
          <select value={form.occupancy_status} disabled={readOnly} onChange={(e) => setForm({ ...form, occupancy_status: e.target.value })}>
            <option value="owner_occupied">Owner-occupied</option>
            <option value="rented">Rented</option>
            <option value="vacant">Vacant</option>
          </select>
        </div>
        <div className="field"><label>Family Members</label><input type="number" min={0} disabled={readOnly} value={form.family_members} onChange={(e) => setForm({ ...form, family_members: e.target.value })} /></div>
      </div>
      {!readOnly && <button className="btn btn-primary">Save flat</button>}
    </form>
  )
}

export function FlatTable({ rows, onDelete, canDelete }: { rows: Flat[]; onDelete: (id: string) => void; canDelete: boolean }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Apartment</th><th>Tower</th><th>Floor</th><th>Status</th>{canDelete && <th>Actions</th>}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={canDelete ? 5 : 4} className="empty">No flats yet.</td></tr> : rows.map((r) => (
            <tr key={r.id}><td>{r.apartment_no}</td><td>{r.tower || '—'}</td><td>{r.floor || '—'}</td><td>{r.occupancy_status || '—'}</td>
              {canDelete && <td><button type="button" className="btn btn-danger" onClick={() => onDelete(r.id)}>Delete</button></td>}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
