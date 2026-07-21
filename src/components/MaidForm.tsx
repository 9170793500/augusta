import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { EmploymentType, StaffGender } from '../lib/types'
import { ApartmentField } from './ApartmentField'
import { normalizeApartmentInput } from '../lib/apartmentUtils'

type Row = {
  key: string
  name: string
  age: string
  gender: '' | StaffGender
  employment_type: EmploymentType
  aadhar_number: string
  mobile: string
  card_number: string
  employment_valid_till: string
  notes: string
}

function blankRow(employment_type: EmploymentType = 'part_time'): Row {
  return {
    key: crypto.randomUUID(),
    name: '',
    age: '',
    gender: '',
    employment_type,
    aadhar_number: '',
    mobile: '',
    card_number: '',
    employment_valid_till: '',
    notes: '',
  }
}

type Props = {
  onSaved: () => void
  apartmentNo: string | null
  lockApartment: boolean
  isAdmin: boolean
}

export function MaidForm({ onSaved, apartmentNo, lockApartment, isAdmin }: Props) {
  const [apt, setApt] = useState(apartmentNo || '')
  const [rows, setRows] = useState<Row[]>([blankRow('full_time'), blankRow('part_time')])
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
        name: r.name.trim(),
        age: r.age ? Number(r.age) : null,
        gender: r.gender || null,
        employment_type: r.employment_type,
        aadhar_number: r.aadhar_number.trim(),
        mobile: r.mobile.trim() || null,
        card_number: r.card_number.trim(),
        employment_valid_till: r.employment_valid_till || null,
        notes: r.notes.trim() || null,
      }))
      .filter((r) => r.name && r.aadhar_number && r.card_number)

    if (payload.length === 0) {
      setError('Fill at least one maid with Name, Aadhar and Card Number. Remove empty rows if not needed.')
      return
    }

    setSaving(true)
    const { error: err } = await supabase.from('maids').insert(payload as never)
    setSaving(false)

    if (err) {
      setError(err.message)
      return
    }

    setOk(`${payload.length} maid record(s) saved.`)
    setRows([blankRow('full_time'), blankRow('part_time')])
    if (!lockApartment) setApt('')
    onSaved()
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="pane-title">Add Maids / Domestic Staff</h3>
      <p className="form-hint">
        Add full-time and part-time maids separately. Use “Add another maid” if there are more people.
      </p>
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
            <strong>
              Maid {index + 1}{' '}
              <span className="entry-tag">
                {row.employment_type === 'full_time' ? 'Full-time' : 'Part-time'}
              </span>
            </strong>
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
              <label>Employment Type</label>
              <select
                value={row.employment_type}
                onChange={(e) => updateRow(row.key, { employment_type: e.target.value as EmploymentType })}
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
              </select>
            </div>
            <div className="field">
              <label>Card Number</label>
              <input
                value={row.card_number}
                onChange={(e) => updateRow(row.key, { card_number: e.target.value })}
                placeholder="Gate pass / card no"
              />
            </div>
            <div className="field full">
              <label>Name</label>
              <input value={row.name} onChange={(e) => updateRow(row.key, { name: e.target.value })} />
            </div>
            <div className="field">
              <label>Age</label>
              <input
                type="number"
                min={18}
                max={80}
                value={row.age}
                onChange={(e) => updateRow(row.key, { age: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Gender</label>
              <select
                value={row.gender}
                onChange={(e) => updateRow(row.key, { gender: e.target.value as '' | StaffGender })}
              >
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label>Aadhar Number</label>
              <input
                value={row.aadhar_number}
                onChange={(e) => updateRow(row.key, { aadhar_number: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Mobile</label>
              <input value={row.mobile} onChange={(e) => updateRow(row.key, { mobile: e.target.value })} />
            </div>
            <div className="field">
              <label>Employment Valid Till</label>
              <input
                type="date"
                value={row.employment_valid_till}
                onChange={(e) => updateRow(row.key, { employment_valid_till: e.target.value })}
              />
            </div>
            <div className="field full">
              <label>Notes</label>
              <textarea value={row.notes} onChange={(e) => updateRow(row.key, { notes: e.target.value })} />
            </div>
          </div>
        </div>
      ))}

      <div className="add-more-row">
        <button
          type="button"
          className="btn btn-ghost add-more"
          onClick={() => setRows((list) => [...list, blankRow('full_time')])}
        >
          + Add full-time maid
        </button>
        <button
          type="button"
          className="btn btn-ghost add-more"
          onClick={() => setRows((list) => [...list, blankRow('part_time')])}
        >
          + Add part-time maid
        </button>
      </div>
      <button className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save all maids'}
      </button>
    </form>
  )
}
