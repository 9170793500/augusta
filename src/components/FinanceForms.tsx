import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { FormProps, MaintenanceDue, NocCharge, ParkingAmenity } from '../lib/types'
import { ApartmentField } from './ApartmentField'

export function ParkingForm({ onSaved, apartmentNo, lockApartment, readOnly }: FormProps) {
  const [apt, setApt] = useState(apartmentNo || '')
  const [form, setForm] = useState({ parking_slot: '', extra_parking: false, extra_parking_charge: '', gym_access: false, gym_valid_till: '' })
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const apartment_no = (lockApartment ? apartmentNo : apt)?.trim().toUpperCase()
    if (!apartment_no) return setError('Apartment required')
    const { error: err } = await supabase.from('parking_amenities').upsert({
      apartment_no, parking_slot: form.parking_slot || null,
      extra_parking: form.extra_parking,
      extra_parking_charge: form.extra_parking_charge ? Number(form.extra_parking_charge) : 0,
      gym_access: form.gym_access,
      gym_valid_till: form.gym_valid_till || null,
    } as never, { onConflict: 'apartment_no' })
    if (err) return setError(err.message)
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Parking & Gym</h3>
      <p className="form-hint">BRD §9 — Extra parking and gym access.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <ApartmentField apartmentNo={apartmentNo} lockApartment={lockApartment} value={apt} onChange={setApt} />
      <div className="form-grid">
        <div className="field"><label>Parking Slot</label><input disabled={readOnly} value={form.parking_slot} onChange={(e) => setForm({ ...form, parking_slot: e.target.value })} /></div>
        <div className="field"><label>Extra Parking Charge</label><input type="number" disabled={readOnly} value={form.extra_parking_charge} onChange={(e) => setForm({ ...form, extra_parking_charge: e.target.value })} /></div>
        <div className="field"><label>Extra Parking</label><select disabled={readOnly} value={form.extra_parking ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, extra_parking: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes</option></select></div>
        <div className="field"><label>Gym Access</label><select disabled={readOnly} value={form.gym_access ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, gym_access: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes</option></select></div>
        <div className="field"><label>Gym Valid Till</label><input type="date" disabled={readOnly} value={form.gym_valid_till} onChange={(e) => setForm({ ...form, gym_valid_till: e.target.value })} /></div>
      </div>
      {!readOnly && <button className="btn btn-primary">Save amenities</button>}
    </form>
  )
}

export function ParkingTable({ rows }: { rows: ParkingAmenity[] }) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Apartment</th><th>Slot</th><th>Extra</th><th>Gym</th><th>Gym Till</th></tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={5} className="empty">No records.</td></tr> : rows.map((r) => (
        <tr key={r.id}><td>{r.apartment_no}</td><td>{r.parking_slot || '—'}</td><td>{r.extra_parking ? 'Yes' : 'No'}</td><td>{r.gym_access ? 'Yes' : 'No'}</td><td>{r.gym_valid_till || '—'}</td></tr>
      ))}</tbody>
    </table></div>
  )
}

export function DuesForm({ onSaved, apartmentNo, lockApartment, readOnly }: FormProps) {
  const [apt, setApt] = useState(apartmentNo || '')
  const [form, setForm] = useState({ year: new Date().getFullYear().toString(), annual_amount: '', paid_amount: '', payment_date: '', payment_mode: '', receipt_no: '' })
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const apartment_no = (lockApartment ? apartmentNo : apt)?.trim().toUpperCase()
    const { error: err } = await supabase.from('maintenance_dues').insert({
      apartment_no, year: Number(form.year), annual_amount: Number(form.annual_amount),
      paid_amount: Number(form.paid_amount || 0), payment_date: form.payment_date || null,
      payment_mode: form.payment_mode || null, receipt_no: form.receipt_no || null,
    } as never)
    if (err) return setError(err.message)
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Maintenance Dues</h3>
      <p className="form-hint">BRD §10 — Yearly maintenance ledger.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <ApartmentField apartmentNo={apartmentNo} lockApartment={lockApartment} value={apt} onChange={setApt} />
      <div className="form-grid">
        <div className="field"><label>Year</label><input type="number" required disabled={readOnly} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
        <div className="field"><label>Annual Amount</label><input type="number" required disabled={readOnly} value={form.annual_amount} onChange={(e) => setForm({ ...form, annual_amount: e.target.value })} /></div>
        <div className="field"><label>Paid Amount</label><input type="number" disabled={readOnly} value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} /></div>
        <div className="field"><label>Payment Date</label><input type="date" disabled={readOnly} value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
        <div className="field"><label>Receipt No</label><input disabled={readOnly} value={form.receipt_no} onChange={(e) => setForm({ ...form, receipt_no: e.target.value })} /></div>
      </div>
      {!readOnly && <button className="btn btn-primary">Save dues</button>}
    </form>
  )
}

export function DuesTable({ rows }: { rows: MaintenanceDue[] }) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Apartment</th><th>Year</th><th>Annual</th><th>Paid</th><th>Pending</th></tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={5} className="empty">No dues.</td></tr> : rows.map((r) => (
        <tr key={r.id}><td>{r.apartment_no}</td><td>{r.year}</td><td>{r.annual_amount}</td><td>{r.paid_amount}</td><td>{r.pending_amount ?? r.annual_amount - r.paid_amount}</td></tr>
      ))}</tbody>
    </table></div>
  )
}

export function NocForm({ onSaved, apartmentNo, lockApartment, readOnly }: FormProps) {
  const [apt, setApt] = useState(apartmentNo || '')
  const [form, setForm] = useState({ tenant_name: '', amount: '', paid: false, payment_date: '', receipt_no: '' })
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const apartment_no = (lockApartment ? apartmentNo : apt)?.trim().toUpperCase()
    const { error: err } = await supabase.from('noc_charges').insert({
      apartment_no, tenant_name: form.tenant_name, amount: Number(form.amount),
      paid: form.paid, payment_date: form.payment_date || null, receipt_no: form.receipt_no || null,
    } as never)
    if (err) return setError(err.message)
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">NOC Entry (Tenant)</h3>
      <p className="form-hint">BRD §10 — NOC charge when tenant moves in.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <ApartmentField apartmentNo={apartmentNo} lockApartment={lockApartment} value={apt} onChange={setApt} />
      <div className="form-grid">
        <div className="field full"><label>Tenant Name</label><input required disabled={readOnly} value={form.tenant_name} onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} /></div>
        <div className="field"><label>Amount</label><input type="number" required disabled={readOnly} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        <div className="field"><label>Paid</label><select disabled={readOnly} value={form.paid ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, paid: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes</option></select></div>
        <div className="field"><label>Receipt No</label><input disabled={readOnly} value={form.receipt_no} onChange={(e) => setForm({ ...form, receipt_no: e.target.value })} /></div>
      </div>
      {!readOnly && <button className="btn btn-primary">Save NOC</button>}
    </form>
  )
}

export function NocTable({ rows }: { rows: NocCharge[] }) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Apartment</th><th>Tenant</th><th>Amount</th><th>Paid</th><th>Receipt</th></tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={5} className="empty">No NOC records.</td></tr> : rows.map((r) => (
        <tr key={r.id}><td>{r.apartment_no}</td><td>{r.tenant_name}</td><td>{r.amount}</td><td>{r.paid ? 'Yes' : 'No'}</td><td>{r.receipt_no || '—'}</td></tr>
      ))}</tbody>
    </table></div>
  )
}
