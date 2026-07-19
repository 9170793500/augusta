import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type {
  Driver,
  EmploymentType,
  Maid,
  RfidCard,
  RfidStatus,
  SecurityEmployeeType,
  SecurityStaff,
  ShiftType,
  StaffGender,
} from '../lib/types'

type EditTarget =
  | { kind: 'rfid'; row: RfidCard }
  | { kind: 'driver'; row: Driver }
  | { kind: 'maid'; row: Maid }
  | { kind: 'security'; row: SecurityStaff }

type Props = {
  target: EditTarget
  isAdmin: boolean
  lockApartment: boolean
  onClose: () => void
  onSaved: () => void
}

export function EditRecordModal({ target, isAdmin, lockApartment, onClose, onSaved }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [rfid, setRfid] = useState(target.kind === 'rfid' ? { ...target.row } : null)
  const [driver, setDriver] = useState(target.kind === 'driver' ? { ...target.row } : null)
  const [maid, setMaid] = useState(target.kind === 'maid' ? { ...target.row } : null)
  const [security, setSecurity] = useState(target.kind === 'security' ? { ...target.row } : null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    let errMsg: string | null = null

    if (target.kind === 'rfid' && rfid) {
      const { error: err } = await supabase
        .from('rfid_cards')
        .update({
          apartment_no: rfid.apartment_no.trim().toUpperCase(),
          vehicle_no: rfid.vehicle_no?.trim().toUpperCase() || '',
          rfid_no: rfid.rfid_no.trim(),
          status: rfid.status,
          valid_till: rfid.valid_till || null,
          notes: rfid.notes || null,
        } as never)
        .eq('id', rfid.id)
      errMsg = err?.message ?? null
    }

    if (target.kind === 'driver' && driver) {
      const { error: err } = await supabase
        .from('drivers')
        .update({
          apartment_no: driver.apartment_no.trim().toUpperCase(),
          vehicle_no: driver.vehicle_no?.trim().toUpperCase() || null,
          driver_name: driver.driver_name.trim(),
          mobile: driver.mobile || null,
          licence_number: driver.licence_number || null,
          licence_validity: driver.licence_validity || null,
          aadhar_number: driver.aadhar_number || null,
          address: driver.address || null,
          notes: driver.notes || null,
        } as never)
        .eq('id', driver.id)
      errMsg = err?.message ?? null
    }

    if (target.kind === 'maid' && maid) {
      const { error: err } = await supabase
        .from('maids')
        .update({
          apartment_no: maid.apartment_no.trim().toUpperCase(),
          name: maid.name.trim(),
          age: maid.age,
          gender: maid.gender,
          employment_type: maid.employment_type,
          aadhar_number: maid.aadhar_number.trim(),
          mobile: maid.mobile || null,
          card_number: maid.card_number?.trim() || '',
          employment_valid_till: maid.employment_valid_till || null,
          notes: maid.notes || null,
        } as never)
        .eq('id', maid.id)
      errMsg = err?.message ?? null
    }

    if (target.kind === 'security' && security) {
      const { error: err } = await supabase
        .from('security_staff')
        .update({
          employee_type: security.employee_type,
          name: security.name.trim(),
          mobile: security.mobile.trim(),
          aadhar_number: security.aadhar_number || null,
          employee_id: security.employee_id || null,
          shift: security.shift,
          rfid_no: security.rfid_no || null,
          address: security.address || null,
          notes: security.notes || null,
        } as never)
        .eq('id', security.id)
      errMsg = err?.message ?? null
    }

    setSaving(false)
    if (errMsg) {
      setError(errMsg)
      return
    }
    onSaved()
    onClose()
  }

  const title =
    target.kind === 'rfid'
      ? 'Edit Vehicle RFID'
      : target.kind === 'driver'
        ? 'Edit Driver'
        : target.kind === 'maid'
          ? 'Edit Maid'
          : 'Edit Security Staff'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <form onSubmit={onSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          {rfid && (
            <div className="form-grid">
              <div className="field">
                <label>Apartment No</label>
                <input
                  required
                  value={rfid.apartment_no}
                  onChange={(e) => setRfid({ ...rfid, apartment_no: e.target.value })}
                  disabled={lockApartment && !isAdmin}
                />
              </div>
              <div className="field">
                <label>Vehicle No</label>
                <input
                  required
                  value={rfid.vehicle_no || ''}
                  onChange={(e) => setRfid({ ...rfid, vehicle_no: e.target.value })}
                />
              </div>
              <div className="field">
                <label>RFID No</label>
                <input
                  required
                  value={rfid.rfid_no}
                  onChange={(e) => setRfid({ ...rfid, rfid_no: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Status</label>
                <select
                  value={rfid.status}
                  onChange={(e) => setRfid({ ...rfid, status: e.target.value as RfidStatus })}
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
                  value={rfid.valid_till || ''}
                  onChange={(e) => setRfid({ ...rfid, valid_till: e.target.value })}
                />
              </div>
              <div className="field full">
                <label>Notes</label>
                <textarea
                  value={rfid.notes || ''}
                  onChange={(e) => setRfid({ ...rfid, notes: e.target.value })}
                />
              </div>
            </div>
          )}

          {driver && (
            <div className="form-grid">
              <div className="field">
                <label>Apartment No</label>
                <input
                  required
                  value={driver.apartment_no}
                  onChange={(e) => setDriver({ ...driver, apartment_no: e.target.value })}
                  disabled={lockApartment && !isAdmin}
                />
              </div>
              <div className="field">
                <label>Vehicle No</label>
                <input
                  value={driver.vehicle_no || ''}
                  onChange={(e) => setDriver({ ...driver, vehicle_no: e.target.value })}
                />
              </div>
              <div className="field full">
                <label>Driver Name</label>
                <input
                  required
                  value={driver.driver_name}
                  onChange={(e) => setDriver({ ...driver, driver_name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Mobile</label>
                <input
                  value={driver.mobile || ''}
                  onChange={(e) => setDriver({ ...driver, mobile: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Licence Number</label>
                <input
                  value={driver.licence_number || ''}
                  onChange={(e) => setDriver({ ...driver, licence_number: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Licence Validity</label>
                <input
                  type="date"
                  value={driver.licence_validity || ''}
                  onChange={(e) => setDriver({ ...driver, licence_validity: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Aadhar Number</label>
                <input
                  value={driver.aadhar_number || ''}
                  onChange={(e) => setDriver({ ...driver, aadhar_number: e.target.value })}
                />
              </div>
              <div className="field full">
                <label>Address</label>
                <input
                  value={driver.address || ''}
                  onChange={(e) => setDriver({ ...driver, address: e.target.value })}
                />
              </div>
            </div>
          )}

          {maid && (
            <div className="form-grid">
              <div className="field">
                <label>Apartment No</label>
                <input
                  required
                  value={maid.apartment_no}
                  onChange={(e) => setMaid({ ...maid, apartment_no: e.target.value })}
                  disabled={lockApartment && !isAdmin}
                />
              </div>
              <div className="field">
                <label>Employment Type</label>
                <select
                  value={maid.employment_type}
                  onChange={(e) => setMaid({ ...maid, employment_type: e.target.value as EmploymentType })}
                >
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                </select>
              </div>
              <div className="field full">
                <label>Name</label>
                <input required value={maid.name} onChange={(e) => setMaid({ ...maid, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Card Number</label>
                <input
                  required
                  value={maid.card_number || ''}
                  onChange={(e) => setMaid({ ...maid, card_number: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Aadhar Number</label>
                <input
                  required
                  value={maid.aadhar_number}
                  onChange={(e) => setMaid({ ...maid, aadhar_number: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Mobile</label>
                <input value={maid.mobile || ''} onChange={(e) => setMaid({ ...maid, mobile: e.target.value })} />
              </div>
              <div className="field">
                <label>Age</label>
                <input
                  type="number"
                  value={maid.age ?? ''}
                  onChange={(e) => setMaid({ ...maid, age: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="field">
                <label>Gender</label>
                <select
                  value={maid.gender || ''}
                  onChange={(e) => setMaid({ ...maid, gender: (e.target.value || null) as StaffGender | null })}
                >
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}

          {security && (
            <div className="form-grid">
              <div className="field">
                <label>Employee Type</label>
                <select
                  value={security.employee_type}
                  onChange={(e) =>
                    setSecurity({ ...security, employee_type: e.target.value as SecurityEmployeeType })
                  }
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
                <select
                  value={security.shift || 'day'}
                  onChange={(e) => setSecurity({ ...security, shift: e.target.value as ShiftType })}
                >
                  <option value="day">Day</option>
                  <option value="night">Night</option>
                  <option value="rotational">Rotational</option>
                </select>
              </div>
              <div className="field full">
                <label>Name</label>
                <input
                  required
                  value={security.name}
                  onChange={(e) => setSecurity({ ...security, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Mobile</label>
                <input
                  required
                  value={security.mobile}
                  onChange={(e) => setSecurity({ ...security, mobile: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Employee ID</label>
                <input
                  value={security.employee_id || ''}
                  onChange={(e) => setSecurity({ ...security, employee_id: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Aadhar Number</label>
                <input
                  value={security.aadhar_number || ''}
                  onChange={(e) => setSecurity({ ...security, aadhar_number: e.target.value })}
                />
              </div>
              <div className="field">
                <label>RFID No</label>
                <input
                  value={security.rfid_no || ''}
                  onChange={(e) => setSecurity({ ...security, rfid_no: e.target.value })}
                />
              </div>
            </div>
          )}

          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export type { EditTarget }
