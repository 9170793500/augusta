import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { FormProps, LinkedTo, Vehicle } from '../lib/types'
import { ApartmentField } from './ApartmentField'

export function VehicleForm({ onSaved, apartmentNo, lockApartment, readOnly }: FormProps) {
  const [apt, setApt] = useState(apartmentNo || '')
  const [form, setForm] = useState({
    vehicle_no: '', make_model: '', colour: '', linked_to: 'owner' as LinkedTo,
    driver_name: '', driver_licence: '', driver_licence_validity: '',
    rc_number: '', puc_id: '', puc_validity: '', parking_slot: '', extra_parking: false,
  })
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const apartment_no = (lockApartment ? apartmentNo : apt)?.trim().toUpperCase()
    if (!apartment_no || !form.vehicle_no) return setError('Apartment and vehicle no required')
    const { error: err } = await supabase.from('vehicles').insert({
      apartment_no,
      vehicle_no: form.vehicle_no.trim().toUpperCase(),
      make_model: form.make_model || null,
      colour: form.colour || null,
      linked_to: form.linked_to,
      driver_name: form.driver_name || null,
      driver_licence: form.driver_licence || null,
      driver_licence_validity: form.driver_licence_validity || null,
      rc_number: form.rc_number || null,
      puc_id: form.puc_id || null,
      puc_validity: form.puc_validity || null,
      parking_slot: form.parking_slot || null,
      extra_parking: form.extra_parking,
    } as never)
    if (err) return setError(err.message)
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Vehicle Registration</h3>
      <p className="form-hint">BRD §5 — RC, PUC, driver and parking details.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <ApartmentField apartmentNo={apartmentNo} lockApartment={lockApartment} value={apt} onChange={setApt} />
      <div className="form-grid">
        <div className="field"><label>Vehicle No</label><input required disabled={readOnly} value={form.vehicle_no} onChange={(e) => setForm({ ...form, vehicle_no: e.target.value })} /></div>
        <div className="field"><label>Make / Model</label><input disabled={readOnly} value={form.make_model} onChange={(e) => setForm({ ...form, make_model: e.target.value })} /></div>
        <div className="field"><label>Colour</label><input disabled={readOnly} value={form.colour} onChange={(e) => setForm({ ...form, colour: e.target.value })} /></div>
        <div className="field"><label>Linked To</label>
          <select disabled={readOnly} value={form.linked_to} onChange={(e) => setForm({ ...form, linked_to: e.target.value as LinkedTo })}>
            <option value="owner">Owner</option><option value="tenant">Tenant</option>
          </select>
        </div>
        <div className="field"><label>RC Number</label><input disabled={readOnly} value={form.rc_number} onChange={(e) => setForm({ ...form, rc_number: e.target.value })} /></div>
        <div className="field"><label>PUC ID</label><input disabled={readOnly} value={form.puc_id} onChange={(e) => setForm({ ...form, puc_id: e.target.value })} /></div>
        <div className="field"><label>PUC Validity</label><input type="date" disabled={readOnly} value={form.puc_validity} onChange={(e) => setForm({ ...form, puc_validity: e.target.value })} /></div>
        <div className="field"><label>Parking Slot</label><input disabled={readOnly} value={form.parking_slot} onChange={(e) => setForm({ ...form, parking_slot: e.target.value })} /></div>
        <div className="field"><label>Driver Name</label><input disabled={readOnly} value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} /></div>
        <div className="field"><label>Licence No</label><input disabled={readOnly} value={form.driver_licence} onChange={(e) => setForm({ ...form, driver_licence: e.target.value })} /></div>
        <div className="field"><label>Licence Validity</label><input type="date" disabled={readOnly} value={form.driver_licence_validity} onChange={(e) => setForm({ ...form, driver_licence_validity: e.target.value })} /></div>
      </div>
      {!readOnly && <button className="btn btn-primary">Save vehicle</button>}
    </form>
  )
}

export function VehicleTable({ rows, onDelete, readOnly }: { rows: Vehicle[]; onDelete: (id: string) => void; readOnly?: boolean }) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Apartment</th><th>Vehicle</th><th>Model</th><th>Linked</th><th>PUC Till</th>{!readOnly && <th>Actions</th>}</tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={6} className="empty">No vehicles.</td></tr> : rows.map((r) => (
        <tr key={r.id}><td>{r.apartment_no}</td><td>{r.vehicle_no}</td><td>{r.make_model || '—'}</td><td>{r.linked_to}</td><td>{r.puc_validity || '—'}</td>
          {!readOnly && <td><button type="button" className="btn btn-danger" onClick={() => onDelete(r.id)}>Delete</button></td>}</tr>
      ))}</tbody>
    </table></div>
  )
}
