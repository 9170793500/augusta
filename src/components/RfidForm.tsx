import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { RfidStatus } from '../lib/types'

type Row = {
  key: string
  vehicle_no: string
  rfid_no: string
  status: RfidStatus
  valid_till: string
  notes: string
}

function blankRow(): Row {
  return {
    key: crypto.randomUUID(),
    vehicle_no: '',
    rfid_no: '',
    status: 'active',
    valid_till: '',
    notes: '',
  }
}

type Props = {
  onSaved: () => void
  apartmentNo: string | null
  lockApartment: boolean
  isAdmin: boolean
}

export function RfidForm({ onSaved, apartmentNo, lockApartment, isAdmin }: Props) {
  const [apartment, setApartment] = useState(apartmentNo || '')
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

    const apt = (lockApartment ? apartmentNo : apartment)?.trim().toUpperCase()
    if (!apt) {
      setError(isAdmin ? 'Apartment No is required.' : 'Your apartment is not set on your profile. Contact admin.')
      return
    }

    const payload = rows
      .map((r) => ({
        apartment_no: apt,
        vehicle_no: r.vehicle_no.trim().toUpperCase(),
        rfid_no: r.rfid_no.trim(),
        holder_type: 'vehicle' as const,
        status: r.status,
        valid_till: r.valid_till || null,
        notes: r.notes.trim() || null,
      }))
      .filter((r) => r.vehicle_no && r.rfid_no)

    if (payload.length === 0) {
      setError('Add at least one vehicle with Vehicle No and RFID No.')
      return
    }

    setSaving(true)
    const { error: err } = await supabase.from('rfid_cards').insert(payload as never)
    setSaving(false)

    if (err) {
      setError(err.message)
      return
    }

    setOk(`${payload.length} vehicle RFID record(s) saved.`)
    setRows([blankRow()])
    if (!lockApartment) setApartment('')
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Add Vehicle RFID</h3>
      <p className="form-hint">RFID is for vehicles only. Click “Add another vehicle” if the flat has more cars.</p>
      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      <div className="field">
        <label>Apartment No</label>
        <input
          required
          value={lockApartment ? apartmentNo || '' : apartment}
          onChange={(e) => setApartment(e.target.value)}
          placeholder="AUG0010201"
          readOnly={lockApartment}
          disabled={lockApartment}
        />
      </div>

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
                value={row.vehicle_no}
                onChange={(e) => updateRow(row.key, { vehicle_no: e.target.value })}
                placeholder="DL9CBC8354"
              />
            </div>
            <div className="field">
              <label>RFID No</label>
              <input
                required
                value={row.rfid_no}
                onChange={(e) => updateRow(row.key, { rfid_no: e.target.value })}
                placeholder="14258616"
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select
                value={row.status}
                onChange={(e) => updateRow(row.key, { status: e.target.value as RfidStatus })}
              >
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="expired">Expired</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div className="field">
              <label>Valid Till</label>
              <input
                type="date"
                value={row.valid_till}
                onChange={(e) => updateRow(row.key, { valid_till: e.target.value })}
              />
            </div>
            <div className="field full">
              <label>Notes</label>
              <textarea value={row.notes} onChange={(e) => updateRow(row.key, { notes: e.target.value })} />
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-ghost add-more" onClick={() => setRows((list) => [...list, blankRow()])}>
        + Add another vehicle
      </button>
      <button className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save all vehicles'}
      </button>
    </form>
  )
}
