import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { ApartmentField } from './ApartmentField'
import { normalizeApartmentInput } from '../lib/apartmentUtils'

type Row = {
  key: string
  vehicle_no: string
  driver_name: string
  mobile: string
  licence_number: string
  licence_validity: string
  aadhar_number: string
  address: string
  notes: string
}

function blankRow(): Row {
  return {
    key: crypto.randomUUID(),
    vehicle_no: '',
    driver_name: '',
    mobile: '',
    licence_number: '',
    licence_validity: '',
    aadhar_number: '',
    address: '',
    notes: '',
  }
}

type Props = {
  onSaved: () => void
  apartmentNo: string | null
  lockApartment: boolean
  isAdmin: boolean
}

export function DriverForm({ onSaved, apartmentNo, lockApartment, isAdmin }: Props) {
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
    setError(null)
    setOk(null)

    const aptNo = normalizeApartmentInput(lockApartment ? apartmentNo || '' : apt)
    if (!aptNo) {
      setError(isAdmin ? 'Apartment No is required.' : 'Your apartment is not set on your profile. Contact admin.')
      return
    }

    const payload = rows
      .map((r) => ({
        apartment_no: aptNo,
        vehicle_no: r.vehicle_no.trim().toUpperCase() || null,
        driver_name: r.driver_name.trim(),
        mobile: r.mobile.trim() || null,
        licence_number: r.licence_number.trim() || null,
        licence_validity: r.licence_validity || null,
        aadhar_number: r.aadhar_number.trim() || null,
        address: r.address.trim() || null,
        notes: r.notes.trim() || null,
      }))
      .filter((r) => r.driver_name)

    if (payload.length === 0) {
      setError('Add at least one driver with a name.')
      return
    }

    setSaving(true)
    const { error: err } = await supabase.from('drivers').insert(payload as never)
    setSaving(false)

    if (err) {
      setError(err.message)
      return
    }

    setOk(`${payload.length} driver(s) saved.`)
    setRows([blankRow()])
    if (!lockApartment) setApt('')
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Add Drivers</h3>
      <p className="form-hint">If the flat has more than one driver, click “Add another driver” to add more fields.</p>
      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      <ApartmentField
        apartmentNo={apartmentNo}
        lockApartment={lockApartment}
        value={apt}
        onChange={setApt}
      />

      {rows.map((row, index) => (
        <div className="entry-block" key={row.key}>
          <div className="entry-head">
            <strong>Driver {index + 1}</strong>
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
            <div className="field full">
              <label>Driver Name</label>
              <input
                required
                value={row.driver_name}
                onChange={(e) => updateRow(row.key, { driver_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Vehicle No</label>
              <input value={row.vehicle_no} onChange={(e) => updateRow(row.key, { vehicle_no: e.target.value })} />
            </div>
            <div className="field">
              <label>Mobile</label>
              <input value={row.mobile} onChange={(e) => updateRow(row.key, { mobile: e.target.value })} />
            </div>
            <div className="field">
              <label>Licence Number</label>
              <input
                value={row.licence_number}
                onChange={(e) => updateRow(row.key, { licence_number: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Licence Validity</label>
              <input
                type="date"
                value={row.licence_validity}
                onChange={(e) => updateRow(row.key, { licence_validity: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Aadhar Number</label>
              <input
                value={row.aadhar_number}
                onChange={(e) => updateRow(row.key, { aadhar_number: e.target.value })}
              />
            </div>
            <div className="field full">
              <label>Address</label>
              <input value={row.address} onChange={(e) => updateRow(row.key, { address: e.target.value })} />
            </div>
            <div className="field full">
              <label>Notes</label>
              <textarea value={row.notes} onChange={(e) => updateRow(row.key, { notes: e.target.value })} />
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-ghost add-more" onClick={() => setRows((list) => [...list, blankRow()])}>
        + Add another driver
      </button>
      <button className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save all drivers'}
      </button>
    </form>
  )
}
