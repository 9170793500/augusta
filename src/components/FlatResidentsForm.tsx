import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { FlatResident, FormProps, OccupancyRole, ResidentMaster } from '../lib/types'
import { ApartmentField } from './ApartmentField'

type Props = FormProps & {
  residents: ResidentMaster[]
}

export function FlatResidentsForm({ onSaved, apartmentNo, lockApartment, readOnly, residents }: Props) {
  const [apt, setApt] = useState(apartmentNo || '')
  const [form, setForm] = useState({
    resident_id: '',
    occupancy_role: 'owner' as OccupancyRole,
    move_in_date: '',
    is_current: true,
  })
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const apartment_no = (lockApartment ? apartmentNo : apt)?.trim().toUpperCase()
    if (!apartment_no || !form.resident_id) return setError('Apartment and resident are required')
    setError(null)
    const { error: err } = await supabase.from('flat_residents').insert({
      apartment_no,
      resident_id: form.resident_id,
      occupancy_role: form.occupancy_role,
      is_current: form.is_current,
      move_in_date: form.move_in_date || null,
    } as never)
    if (err) return setError(err.message)
    setForm({ resident_id: '', occupancy_role: 'owner', move_in_date: '', is_current: true })
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Flat Residents</h3>
      <p className="form-hint">Assign who lives in which flat — as Owner or Tenant.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <ApartmentField apartmentNo={apartmentNo} lockApartment={lockApartment} value={apt} onChange={setApt} />
      <div className="form-grid">
        <div className="field full">
          <label>Resident (from Master)</label>
          <select
            required
            disabled={readOnly}
            value={form.resident_id}
            onChange={(e) => setForm({ ...form, resident_id: e.target.value })}
          >
            <option value="">— Select resident —</option>
            {residents.map((r) => (
              <option key={r.id} value={r.id}>{r.full_name}{r.mobile ? ` (${r.mobile})` : ''}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Living as</label>
          <select disabled={readOnly} value={form.occupancy_role} onChange={(e) => setForm({ ...form, occupancy_role: e.target.value as OccupancyRole })}>
            <option value="owner">Owner</option>
            <option value="tenant">Tenant</option>
          </select>
        </div>
        <div className="field">
          <label>Move-in Date</label>
          <input type="date" disabled={readOnly} value={form.move_in_date} onChange={(e) => setForm({ ...form, move_in_date: e.target.value })} />
        </div>
        <div className="field">
          <label>Currently Living</label>
          <select disabled={readOnly} value={form.is_current ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, is_current: e.target.value === 'yes' })}>
            <option value="yes">Yes</option>
            <option value="no">No (moved out)</option>
          </select>
        </div>
      </div>
      {!readOnly && <button className="btn btn-primary">Assign to flat</button>}
    </form>
  )
}

export type FlatResidentRow = FlatResident & {
  resident?: ResidentMaster | null
}

export function FlatResidentsTable({
  rows,
  onDelete,
  readOnly,
}: {
  rows: FlatResidentRow[]
  onDelete: (id: string) => void
  readOnly?: boolean
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Apartment</th>
            <th>Name</th>
            <th>Father</th>
            <th>Role</th>
            <th>Mobile</th>
            <th>Status</th>
            {!readOnly && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={readOnly ? 6 : 7} className="empty">No flat assignments yet.</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>{r.apartment_no}</td>
                <td>{r.resident?.full_name || '—'}</td>
                <td>{r.resident?.father_name || '—'}</td>
                <td><span className={`badge ${r.occupancy_role}`}>{r.occupancy_role}</span></td>
                <td>{r.resident?.mobile || '—'}</td>
                <td>{r.is_current ? 'Living' : 'Moved out'}</td>
                {!readOnly && (
                  <td><button type="button" className="btn btn-danger" onClick={() => onDelete(r.id)}>Remove</button></td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
