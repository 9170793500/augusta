import type { FormEvent } from 'react'
import { FormFieldLabel } from './FormFieldLabel'
import { PendingOrNumberField } from './PendingOrNumberField'
import { isPendingValue, sanitizeAadhaar, sanitizeMobile } from '../lib/fieldValidation'

export type DriverRow = {
  key: string
  vehicle_no: string
  driver_name: string
  mobile: string
  licence_number: string
  licence_valid_from: string
  licence_validity: string
  aadhar_number: string
  address: string
  notes: string
}

export function blankDriverRow(): DriverRow {
  return {
    key: crypto.randomUUID(),
    vehicle_no: '',
    driver_name: '',
    mobile: '',
    licence_number: '',
    licence_valid_from: '',
    licence_validity: '',
    aadhar_number: '',
    address: '',
    notes: '',
  }
}

type Props = {
  title: string
  hint: string
  rows: DriverRow[]
  onRowsChange: (rows: DriverRow[]) => void
  onSubmit: (e: FormEvent, payload: DriverRow[]) => void
  saving: boolean
  editing?: boolean
  onCancelEdit?: () => void
}

export function PublicDriverForm({
  title,
  hint,
  rows,
  onRowsChange,
  onSubmit,
  saving,
  editing = false,
  onCancelEdit,
}: Props) {
  function updateRow(key: string, patch: Partial<DriverRow>) {
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

      {rows.map((row, index) => {
        const licencePending = isPendingValue(row.licence_number)
        return (
          <div className="entry-block" key={row.key}>
            <div className="entry-head">
              <strong>Driver {index + 1}</strong>
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
                <FormFieldLabel required>Driver name</FormFieldLabel>
                <input
                  required
                  value={row.driver_name}
                  onChange={(e) => updateRow(row.key, { driver_name: e.target.value })}
                />
              </div>
              <div className="field">
                <FormFieldLabel>Vehicle no</FormFieldLabel>
                <input
                  value={row.vehicle_no}
                  onChange={(e) => updateRow(row.key, { vehicle_no: e.target.value.toUpperCase() })}
                  placeholder="Optional"
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
              <PendingOrNumberField
                label="Licence number"
                value={row.licence_number}
                onChange={(licence_number) =>
                  updateRow(row.key, {
                    licence_number,
                    ...(isPendingValue(licence_number)
                      ? { licence_valid_from: '', licence_validity: '' }
                      : {}),
                  })
                }
                numberPlaceholder="Driving licence number"
                numberLabel="Enter licence number"
              />
              {!licencePending && (
                <>
                  <div className="field">
                    <FormFieldLabel>Licence start date</FormFieldLabel>
                    <input
                      type="date"
                      value={row.licence_valid_from}
                      onChange={(e) => updateRow(row.key, { licence_valid_from: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <FormFieldLabel required>Licence expiry date</FormFieldLabel>
                    <input
                      type="date"
                      required
                      value={row.licence_validity}
                      onChange={(e) => updateRow(row.key, { licence_validity: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="field">
                <FormFieldLabel required>Aadhar</FormFieldLabel>
                <input
                  required
                  inputMode="numeric"
                  maxLength={12}
                  value={row.aadhar_number}
                  onChange={(e) => updateRow(row.key, { aadhar_number: sanitizeAadhaar(e.target.value) })}
                  placeholder="12-digit Aadhar"
                />
              </div>
              <div className="field full">
                <FormFieldLabel>Address</FormFieldLabel>
                <input
                  value={row.address}
                  onChange={(e) => updateRow(row.key, { address: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="field full">
                <FormFieldLabel>Notes</FormFieldLabel>
                <input
                  value={row.notes}
                  onChange={(e) => updateRow(row.key, { notes: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
        )
      })}

      {!editing && (
        <div className="add-more-row">
          <button
            type="button"
            className="btn btn-ghost add-more"
            onClick={() => onRowsChange([...rows, blankDriverRow()])}
          >
            + Add another driver
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
              ? 'Update driver'
              : 'Save all drivers'}
        </button>
      </div>
    </form>
  )
}

export function driverRowsToPayload(rows: DriverRow[]) {
  return rows
    .filter((r) => r.driver_name.trim())
    .map((r) => ({
      vehicle_no: r.vehicle_no.trim().toUpperCase() || null,
      driver_name: r.driver_name.trim(),
      mobile: r.mobile.trim() || null,
      licence_number: r.licence_number.trim() || null,
      licence_valid_from: isPendingValue(r.licence_number) ? null : r.licence_valid_from || null,
      licence_validity: isPendingValue(r.licence_number) ? null : r.licence_validity || null,
      aadhar_number: r.aadhar_number.trim() || null,
      address: r.address.trim() || null,
      notes: r.notes.trim() || null,
    }))
}
