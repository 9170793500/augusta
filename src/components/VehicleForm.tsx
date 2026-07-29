import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { FormProps, LinkedTo, Vehicle } from '../lib/types'
import { normalizeApartmentInput } from '../lib/apartmentUtils'
import { ApartmentField } from './ApartmentField'

type Row = {
  key: string
  vehicle_no: string
  make_model: string
  colour: string
  linked_to: LinkedTo
  driver_name: string
  driver_licence: string
  driver_licence_validity: string
  rc_number: string
  puc_id: string
  puc_validity: string
  parking_slot: string
  extra_parking: boolean
}

function blankRow(linkedTo: LinkedTo = 'owner'): Row {
  return {
    key: crypto.randomUUID(),
    vehicle_no: '',
    make_model: '',
    colour: '',
    linked_to: linkedTo,
    driver_name: '',
    driver_licence: '',
    driver_licence_validity: '',
    rc_number: '',
    puc_id: '',
    puc_validity: '',
    parking_slot: '',
    extra_parking: false,
  }
}

export function VehicleForm({ onSaved, apartmentNo, lockApartment, readOnly }: FormProps) {
  const [apt, setApt] = useState(apartmentNo || '')
  const [rows, setRows] = useState<Row[]>([blankRow()])
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    setError(null)
    setOk(null)

    const apartment_no = normalizeApartmentInput(lockApartment ? apartmentNo || '' : apt)
    if (!apartment_no) return setError('Apartment and vehicle no required')

    const payload = rows
      .map((r) => ({
        apartment_no,
        vehicle_no: r.vehicle_no.trim().toUpperCase(),
        make_model: r.make_model.trim() || null,
        colour: r.colour.trim() || null,
        linked_to: r.linked_to,
        driver_name: r.driver_name.trim() || null,
        driver_licence: r.driver_licence.trim() || null,
        driver_licence_validity: r.driver_licence_validity || null,
        rc_number: r.rc_number.trim() || null,
        puc_id: r.puc_id.trim() || null,
        puc_validity: r.puc_validity || null,
        parking_slot: r.parking_slot.trim() || null,
        extra_parking: r.extra_parking,
      }))
      .filter((r) => r.vehicle_no)

    if (payload.length === 0) {
      setError('Fill at least one vehicle with Vehicle No. Remove empty rows if not needed.')
      return
    }

    setSaving(true)
    const { error: err } = await supabase.from('vehicles').insert(payload as never)
    setSaving(false)

    if (err) return setError(err.message)

    setOk(`${payload.length} vehicle record(s) saved.`)
    setRows([blankRow()])
    if (!lockApartment) setApt('')
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Vehicle Registration</h3>
      <p className="form-hint">Add multiple vehicles for the flat — RC, PUC, driver and parking details.</p>
      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}
      <ApartmentField apartmentNo={apartmentNo} lockApartment={lockApartment} value={apt} onChange={setApt} />

      {rows.map((row, index) => (
        <div className="entry-block" key={row.key}>
          <div className="entry-head">
            <strong>Vehicle {index + 1}</strong>
            {rows.length > 1 && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setRows((list) => list.filter((r) => r.key !== row.key))}
              >
                Remove
              </button>
            )}
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Vehicle No</label>
              <input
                required
                disabled={readOnly}
                value={row.vehicle_no}
                onChange={(e) => updateRow(row.key, { vehicle_no: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Make / Model</label>
              <input disabled={readOnly} value={row.make_model} onChange={(e) => updateRow(row.key, { make_model: e.target.value })} />
            </div>
            <div className="field">
              <label>Colour</label>
              <input disabled={readOnly} value={row.colour} onChange={(e) => updateRow(row.key, { colour: e.target.value })} />
            </div>
            <div className="field">
              <label>Linked To</label>
              <select
                disabled={readOnly}
                value={row.linked_to}
                onChange={(e) => updateRow(row.key, { linked_to: e.target.value as LinkedTo })}
              >
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
              </select>
            </div>
            <div className="field">
              <label>RC Number</label>
              <input disabled={readOnly} value={row.rc_number} onChange={(e) => updateRow(row.key, { rc_number: e.target.value })} />
            </div>
            <div className="field">
              <label>PUC ID</label>
              <input disabled={readOnly} value={row.puc_id} onChange={(e) => updateRow(row.key, { puc_id: e.target.value })} />
            </div>
            <div className="field">
              <label>PUC Validity</label>
              <input
                type="date"
                disabled={readOnly}
                value={row.puc_validity}
                onChange={(e) => updateRow(row.key, { puc_validity: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Parking Slot</label>
              <input disabled={readOnly} value={row.parking_slot} onChange={(e) => updateRow(row.key, { parking_slot: e.target.value })} />
            </div>
            <div className="field">
              <label>Driver Name</label>
              <input disabled={readOnly} value={row.driver_name} onChange={(e) => updateRow(row.key, { driver_name: e.target.value })} />
            </div>
            <div className="field">
              <label>Licence No</label>
              <input disabled={readOnly} value={row.driver_licence} onChange={(e) => updateRow(row.key, { driver_licence: e.target.value })} />
            </div>
            <div className="field">
              <label>Licence Validity</label>
              <input
                type="date"
                disabled={readOnly}
                value={row.driver_licence_validity}
                onChange={(e) => updateRow(row.key, { driver_licence_validity: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}

      {!readOnly && (
        <>
          <div className="add-more-row">
            <button type="button" className="btn btn-ghost add-more" onClick={() => setRows((list) => [...list, blankRow()])}>
              + Add another vehicle
            </button>
          </div>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save all vehicles'}
          </button>
        </>
      )}
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
