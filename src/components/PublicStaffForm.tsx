import type { FormEvent } from 'react'
import type { EmploymentType, StaffGender } from '../lib/types'
import { FormFieldLabel } from './FormFieldLabel'
import { sanitizeAadhaar, sanitizeMobile } from '../lib/fieldValidation'

export type StaffRow = {
  key: string
  name: string
  role: string
  age: string
  gender: '' | StaffGender
  employment_type: EmploymentType
  aadhar_number: string
  mobile: string
  card_number: string
  card_valid_from: string
  employment_valid_till: string
  notes: string
}

export function blankStaffRow(employment_type: EmploymentType = 'part_time'): StaffRow {
  return {
    key: crypto.randomUUID(),
    name: '',
    role: '',
    age: '',
    gender: '',
    employment_type,
    aadhar_number: '',
    mobile: '',
    card_number: '',
    card_valid_from: '',
    employment_valid_till: '',
    notes: '',
  }
}

type Props = {
  title: string
  hint: string
  entityLabel: string
  showRole?: boolean
  rows: StaffRow[]
  onRowsChange: (rows: StaffRow[]) => void
  onSubmit: (e: FormEvent, payload: StaffRow[]) => void
  saving: boolean
  editing?: boolean
  onCancelEdit?: () => void
}

export function PublicStaffForm({
  title,
  hint,
  entityLabel,
  showRole = false,
  rows,
  onRowsChange,
  onSubmit,
  saving,
  editing = false,
  onCancelEdit,
}: Props) {
  function updateRow(key: string, patch: Partial<StaffRow>) {
    onRowsChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(e, rows)
  }

  return (
    <form className="add-details-form card-section" onSubmit={handleSubmit}>
      <h3>{title}</h3>
      <p className="form-hint">{hint}</p>

      {rows.map((row, index) => (
        <div className="entry-block" key={row.key}>
          <div className="entry-head">
            <strong>
              {entityLabel} {index + 1}{' '}
              <span className="entry-tag">
                {row.employment_type === 'full_time' ? 'Full-time' : 'Part-time'}
              </span>
            </strong>
            {rows.length > 1 && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => onRowsChange(rows.filter((r) => r.key !== row.key))}
              >
                Remove
              </button>
            )}
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Employment type</label>
              <select
                value={row.employment_type}
                onChange={(e) => updateRow(row.key, { employment_type: e.target.value as EmploymentType })}
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
              </select>
            </div>
            <div className="field">
              <FormFieldLabel required>Card number</FormFieldLabel>
              <input
                required
                value={row.card_number}
                onChange={(e) => updateRow(row.key, { card_number: e.target.value })}
                placeholder="Gate pass / card no"
              />
            </div>
            <div className="field full">
              <FormFieldLabel required>Name</FormFieldLabel>
              <input required value={row.name} onChange={(e) => updateRow(row.key, { name: e.target.value })} />
            </div>
            {showRole && (
              <div className="field full">
                <label>Role / job</label>
                <input
                  placeholder="Cook, cleaner, nanny, driver…"
                  value={row.role}
                  onChange={(e) => updateRow(row.key, { role: e.target.value })}
                />
              </div>
            )}
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
              <FormFieldLabel required>Aadhar number</FormFieldLabel>
              <input
                required
                inputMode="numeric"
                maxLength={12}
                value={row.aadhar_number}
                onChange={(e) => updateRow(row.key, { aadhar_number: sanitizeAadhaar(e.target.value) })}
                placeholder="12-digit Aadhar"
              />
            </div>
            <div className="field">
              <FormFieldLabel required>Mobile</FormFieldLabel>
              <input
                required
                inputMode="numeric"
                maxLength={10}
                value={row.mobile}
                onChange={(e) => updateRow(row.key, { mobile: sanitizeMobile(e.target.value) })}
                placeholder="10-digit mobile"
              />
            </div>
            <div className="field">
              <label>Card start date</label>
              <input
                type="date"
                value={row.card_valid_from}
                onChange={(e) => updateRow(row.key, { card_valid_from: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Card expiry date</label>
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

      {!editing && (
        <div className="add-more-row">
          <button
            type="button"
            className="btn btn-ghost add-more"
            onClick={() => onRowsChange([...rows, blankStaffRow('full_time')])}
          >
            + Add full-time {entityLabel.toLowerCase()}
          </button>
          <button
            type="button"
            className="btn btn-ghost add-more"
            onClick={() => onRowsChange([...rows, blankStaffRow('part_time')])}
          >
            + Add part-time {entityLabel.toLowerCase()}
          </button>
        </div>
      )}

      <div className="form-actions-row">
        {editing && onCancelEdit && (
          <button type="button" className="btn btn-ghost" onClick={onCancelEdit}>
            Cancel edit
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving
            ? editing
              ? 'Updating…'
              : 'Submitting…'
            : editing
              ? `Update ${entityLabel.toLowerCase()}`
              : `Save all ${entityLabel.toLowerCase()}s`}
        </button>
      </div>
    </form>
  )
}

export function staffRowsToPayload(rows: StaffRow[]) {
  return rows.filter(
    (r) => r.name.trim() && r.aadhar_number.trim() && r.card_number.trim() && r.mobile.trim()
  )
}
