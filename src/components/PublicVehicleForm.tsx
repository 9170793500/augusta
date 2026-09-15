import type { FormEvent } from 'react'
import { FormFieldLabel } from './FormFieldLabel'
import {
  defaultDriverNameForRegistration,
  normalizeVehicleRegisteredTo,
  registeredToLabel,
  type VehicleRegisteredTo,
} from '../lib/vehicleRegistration'

export type VehicleRow = {
  key: string
  vehicle_no: string
  make_model: string
  colour: string
  linked_to: string
  registered_to: VehicleRegisteredTo
  rc_number: string
  puc_id: string
  puc_validity: string
  parking_slot: string
  driver_name: string
  driver_licence: string
  hired_driver: boolean
}

export function blankVehicleRow(linkedTo = 'owner'): VehicleRow {
  return {
    key: crypto.randomUUID(),
    vehicle_no: '',
    make_model: '',
    colour: '',
    linked_to: linkedTo,
    registered_to: 'owner',
    rc_number: '',
    puc_id: '',
    puc_validity: '',
    parking_slot: '',
    driver_name: '',
    driver_licence: '',
    hired_driver: false,
  }
}

type Props = {
  title: string
  hint: string
  rows: VehicleRow[]
  primaryResidentName: string
  spouseName: string
  onRowsChange: (rows: VehicleRow[]) => void
  onSubmit: (e: FormEvent, payload: VehicleRow[]) => void
  saving: boolean
  editing?: boolean
  onCancelEdit?: () => void
}

export function PublicVehicleForm({
  title,
  hint,
  rows,
  primaryResidentName,
  spouseName,
  onRowsChange,
  onSubmit,
  saving,
  editing = false,
  onCancelEdit,
}: Props) {
  function updateRow(key: string, patch: Partial<VehicleRow>) {
    onRowsChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function handleRegisteredToChange(key: string, row: VehicleRow, registeredTo: VehicleRegisteredTo) {
    const patch: Partial<VehicleRow> = { registered_to: registeredTo, hired_driver: false }
    if (!row.hired_driver) {
      patch.driver_name = defaultDriverNameForRegistration(registeredTo, primaryResidentName, spouseName)
    }
    updateRow(key, patch)
  }

  function handleHiredDriverToggle(key: string, row: VehicleRow, hired: boolean) {
    if (hired) {
      updateRow(key, { hired_driver: true, driver_name: '' })
      return
    }
    updateRow(key, {
      hired_driver: false,
      driver_name: defaultDriverNameForRegistration(row.registered_to, primaryResidentName, spouseName),
    })
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
            <strong>Vehicle {index + 1}</strong>
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
              <FormFieldLabel required>Vehicle no</FormFieldLabel>
              <input
                required
                value={row.vehicle_no}
                onChange={(e) => updateRow(row.key, { vehicle_no: e.target.value.toUpperCase() })}
                placeholder="Registration number"
              />
            </div>
            <div className="field">
              <label>Make / model</label>
              <input value={row.make_model} onChange={(e) => updateRow(row.key, { make_model: e.target.value })} />
            </div>
            <div className="field">
              <label>Colour</label>
              <input value={row.colour} onChange={(e) => updateRow(row.key, { colour: e.target.value })} />
            </div>
            <div className="field">
              <label>Household</label>
              <select value={row.linked_to} onChange={(e) => updateRow(row.key, { linked_to: e.target.value })}>
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
              </select>
            </div>
            <div className="field full">
              <FormFieldLabel>Registered in name of</FormFieldLabel>
              <select
                value={row.registered_to}
                onChange={(e) =>
                  handleRegisteredToChange(row.key, row, normalizeVehicleRegisteredTo(e.target.value))
                }
              >
                <option value="owner">{registeredToLabel('owner', primaryResidentName, spouseName)}</option>
                <option value="spouse" disabled={!spouseName.trim()}>
                  {registeredToLabel('spouse', primaryResidentName, spouseName)}
                  {!spouseName.trim() ? ' (add spouse name in Owner/Tenant tab)' : ''}
                </option>
              </select>
              <p className="field-hint">
                RC registered name — choose Spouse for wife/husband&apos;s second car.
              </p>
            </div>
            <div className="field full vehicle-driver-section">
              <p className="vehicle-section-label">Who drives this vehicle?</p>
              <label className="vehicle-toggle-row">
                <input
                  type="checkbox"
                  checked={row.hired_driver}
                  onChange={(e) => handleHiredDriverToggle(row.key, row, e.target.checked)}
                />
                <span className="vehicle-toggle-copy">
                  <strong>Hired chauffeur</strong>
                  <span className="field-hint">
                    Tick only if someone other than the owner or spouse drives this car.
                  </span>
                </span>
              </label>
              <div className="vehicle-driver-fields">
                <div className="field">
                  <label>{row.hired_driver ? 'Chauffeur name' : 'Driven by (name)'}</label>
                  <input
                    value={row.driver_name}
                    onChange={(e) => updateRow(row.key, { driver_name: e.target.value })}
                    placeholder={
                      row.hired_driver
                        ? 'Name from Driver tab or enter here'
                        : 'Usually same as registered person'
                    }
                  />
                </div>
                <div className="field">
                  <label>{row.hired_driver ? 'Chauffeur licence' : 'Driver licence'}</label>
                  <input
                    value={row.driver_licence}
                    onChange={(e) => updateRow(row.key, { driver_licence: e.target.value })}
                    placeholder={row.hired_driver ? 'Optional' : 'If self-drive'}
                  />
                </div>
              </div>
              {row.hired_driver && (
                <p className="field-hint vehicle-driver-tab-hint">
                  Add full chauffeur details (Aadhar, licence dates) in the <strong>Driver</strong> tab.
                </p>
              )}
            </div>
            <div className="field">
              <label>PUC ID</label>
              <input value={row.puc_id} onChange={(e) => updateRow(row.key, { puc_id: e.target.value })} />
            </div>
            <div className="field">
              <label>PUC validity</label>
              <input
                type="date"
                value={row.puc_validity}
                onChange={(e) => updateRow(row.key, { puc_validity: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Parking slot</label>
              <input value={row.parking_slot} onChange={(e) => updateRow(row.key, { parking_slot: e.target.value })} />
            </div>
          </div>
        </div>
      ))}

      {!editing && (
        <div className="add-more-row">
          <button
            type="button"
            className="btn btn-ghost add-more"
            onClick={() => onRowsChange([...rows, blankVehicleRow(rows[0]?.linked_to || 'owner')])}
          >
            + Add another vehicle
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
              ? 'Update vehicle'
              : 'Save all vehicles'}
        </button>
      </div>
    </form>
  )
}

export function vehicleRowsToPayload(
  rows: VehicleRow[],
  primaryResidentName: string,
  spouseName: string
) {
  return rows
    .filter((r) => r.vehicle_no.trim())
    .map((r) => {
      const registered_to = normalizeVehicleRegisteredTo(r.registered_to)
      const registered_to_name =
        registered_to === 'spouse' ? spouseName.trim() : primaryResidentName.trim()
      const defaultDriver = defaultDriverNameForRegistration(registered_to, primaryResidentName, spouseName)
      return {
        vehicle_no: r.vehicle_no.trim().toUpperCase(),
        make_model: r.make_model.trim() || null,
        colour: r.colour.trim() || null,
        linked_to: r.linked_to === 'tenant' ? 'tenant' : 'owner',
        registered_to,
        registered_to_name: registered_to_name || null,
        puc_id: r.puc_id.trim() || null,
        puc_validity: r.puc_validity || null,
        parking_slot: r.parking_slot.trim() || null,
        driver_name: (r.driver_name.trim() || defaultDriver) || null,
        driver_licence: r.driver_licence.trim() || null,
      }
    })
}
