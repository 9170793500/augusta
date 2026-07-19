import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { SecurityEmployeeType, ShiftType } from '../lib/types'

const empty = {
  employee_type: 'security_guard' as SecurityEmployeeType,
  name: '',
  mobile: '',
  aadhar_number: '',
  employee_id: '',
  shift: 'day' as ShiftType,
  rfid_no: '',
  address: '',
  notes: '',
}

type Props = { onSaved: () => void }

export function SecurityForm({ onSaved }: Props) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)
    setSaving(true)

    const { error: err } = await supabase.from('security_staff').insert({
      employee_type: form.employee_type,
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      aadhar_number: form.aadhar_number.trim() || null,
      employee_id: form.employee_id.trim() || null,
      shift: form.shift,
      rfid_no: form.rfid_no.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    } as never)

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setOk('Security / FMG staff saved.')
    setForm(empty)
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Add Security / FMG Staff</h3>
      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}
      <div className="form-grid">
        <div className="field">
          <label>Employee Type</label>
          <select
            value={form.employee_type}
            onChange={(e) => set('employee_type', e.target.value as SecurityEmployeeType)}
          >
            <option value="security_guard">Security Guard</option>
            <option value="gardener">Gardener</option>
            <option value="cleaner">Cleaner</option>
            <option value="technician">Technician</option>
            <option value="other">Other FMG</option>
          </select>
        </div>
        <div className="field">
          <label>Shift</label>
          <select value={form.shift} onChange={(e) => set('shift', e.target.value as ShiftType)}>
            <option value="day">Day</option>
            <option value="night">Night</option>
            <option value="rotational">Rotational</option>
          </select>
        </div>
        <div className="field full">
          <label>Name</label>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="field">
          <label>Mobile</label>
          <input required value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
        </div>
        <div className="field">
          <label>Employee ID</label>
          <input value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} />
        </div>
        <div className="field">
          <label>Aadhar Number</label>
          <input value={form.aadhar_number} onChange={(e) => set('aadhar_number', e.target.value)} />
        </div>
        <div className="field">
          <label>RFID No</label>
          <input value={form.rfid_no} onChange={(e) => set('rfid_no', e.target.value)} />
        </div>
        <div className="field full">
          <label>Address</label>
          <input value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <div className="field full">
          <label>Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
      <button className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save Staff'}
      </button>
    </form>
  )
}
