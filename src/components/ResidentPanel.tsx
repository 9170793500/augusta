import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { FormProps, OccupancyRole } from '../lib/types'
import { ApartmentField } from './ApartmentField'
import type { FlatResidentRow } from './FlatResidentsForm'
import {
  dedupeFlatResidents,
  emptyPerson,
  fetchOwnerForApartment,
  savePersonToFlat,
  type PersonFields,
} from '../lib/residentUtils'

type Props = FormProps & {
  flatResidents: FlatResidentRow[]
  selectedApartment: string | null
  onSelectApartment: (apt: string | null) => void
  editingId: string | null
  onEdit: (id: string | null) => void
}

export function ResidentPanel({
  onSaved,
  apartmentNo,
  lockApartment,
  readOnly,
  flatResidents,
  selectedApartment,
  onSelectApartment,
  editingId,
  onEdit,
}: Props) {
  const [apt, setApt] = useState(apartmentNo || selectedApartment || '')
  const [person, setPerson] = useState<PersonFields>(emptyPerson('tenant'))
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadingOwner, setLoadingOwner] = useState(false)

  const activeApt = (lockApartment ? apartmentNo : apt)?.trim().toUpperCase() || ''

  useEffect(() => {
    if (selectedApartment) setApt(selectedApartment)
  }, [selectedApartment])

  const fillOwnerData = useCallback(
    async (apartment_no: string) => {
      const owners = flatResidents.filter((r) => r.apartment_no === apartment_no && r.occupancy_role === 'owner')
      const cached = owners[0]
      setLoadingOwner(true)
      const loaded = await fetchOwnerForApartment(apartment_no, cached)
      setLoadingOwner(false)
      if (loaded) {
        setPerson(loaded)
        setOk('Owner data loaded — save karo to living status update hoga (duplicate nahi banega).')
      } else {
        setPerson({ ...emptyPerson('owner'), full_name: '' })
        setError('No owner found for this flat. Add owner in Owner tab first.')
      }
    },
    [flatResidents]
  )

  useEffect(() => {
    if (!editingId) return
    const row = flatResidents.find((r) => r.id === editingId)
    if (!row?.resident) return
    setApt(row.apartment_no)
    setPerson({
      id: row.resident.id,
      flatResidentId: row.id,
      full_name: row.resident.full_name,
      father_name: row.resident.father_name || '',
      aadhar_number: row.resident.aadhar_number || '',
      pan_number: row.resident.pan_number || '',
      email: row.resident.email || '',
      mobile: row.resident.mobile || '',
      alt_mobile: row.resident.alt_mobile || '',
      occupancy_role: row.occupancy_role,
      is_current: row.is_current,
    })
    setError(null)
    setOk(null)
  }, [editingId, flatResidents])

  function handleAptChange(value: string) {
    setApt(value)
    setError(null)
    setOk(null)
    const apartment_no = value.trim().toUpperCase()
    onSelectApartment(apartment_no || null)
    if (person.occupancy_role === 'owner' && apartment_no && !editingId) {
      fillOwnerData(apartment_no)
    }
  }

  function handleRoleChange(role: OccupancyRole) {
    setError(null)
    setOk(null)
    if (role === 'owner') {
      setPerson((p) => ({ ...p, occupancy_role: 'owner' }))
      if (activeApt && !editingId) fillOwnerData(activeApt)
    } else {
      setPerson(emptyPerson('tenant'))
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const apartment_no = activeApt
    if (!apartment_no) return setError('Apartment No is required')
    if (!person.full_name.trim()) return setError('Resident name is required')

    setSaving(true)
    setError(null)
    setOk(null)

    try {
      await savePersonToFlat(apartment_no, person)
      setOk('Resident saved.')
      onEdit(null)
      onSaved()
      onSelectApartment(apartment_no)
      if (person.occupancy_role === 'tenant') {
        setPerson(emptyPerson('tenant'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  function roleLabel(role: OccupancyRole) {
    return role === 'owner' ? 'Owner' : 'Tenant'
  }

  return (
    <form onSubmit={onSubmit} className="flat-master-form">
      <h3 className="pane-title">Resident</h3>
      <p className="form-hint">
        Flat number dalo aur Owner choose karo — owner ka data automatically aa jayega.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}
      {loadingOwner && <div className="alert alert-warn">Loading owner data…</div>}

      <ApartmentField
        apartmentNo={apartmentNo}
        lockApartment={lockApartment}
        value={apt}
        onChange={handleAptChange}
      />

      <div className="flat-section">
        <div className="flat-section-head">
          <h4>Resident Details</h4>
          <span className={`badge ${person.occupancy_role}`}>{roleLabel(person.occupancy_role)}</span>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Living as</label>
            <select
              disabled={readOnly}
              value={person.occupancy_role}
              onChange={(e) => handleRoleChange(e.target.value as OccupancyRole)}
            >
              <option value="tenant">Tenant</option>
              <option value="owner">Owner (living here)</option>
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select disabled={readOnly} value={person.is_current ? 'yes' : 'no'} onChange={(e) => setPerson({ ...person, is_current: e.target.value === 'yes' })}>
              <option value="yes">Currently living</option>
              <option value="no">Moved out</option>
            </select>
          </div>
          <div className="field full"><label>Full Name</label><input required disabled={readOnly} value={person.full_name} onChange={(e) => setPerson({ ...person, full_name: e.target.value })} /></div>
          <div className="field full"><label>Father Name</label><input disabled={readOnly} value={person.father_name} onChange={(e) => setPerson({ ...person, father_name: e.target.value })} /></div>
          <div className="field"><label>Aadhar</label><input disabled={readOnly} value={person.aadhar_number} onChange={(e) => setPerson({ ...person, aadhar_number: e.target.value })} /></div>
          <div className="field"><label>PAN</label><input disabled={readOnly} value={person.pan_number} onChange={(e) => setPerson({ ...person, pan_number: e.target.value })} /></div>
          <div className="field"><label>Email</label><input type="email" disabled={readOnly} value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} /></div>
          <div className="field"><label>Mobile</label><input disabled={readOnly} value={person.mobile} onChange={(e) => setPerson({ ...person, mobile: e.target.value })} /></div>
          <div className="field"><label>Alt. Mobile</label><input disabled={readOnly} value={person.alt_mobile} onChange={(e) => setPerson({ ...person, alt_mobile: e.target.value })} /></div>
        </div>
      </div>

      {!readOnly && (
        <div className="form-actions-row">
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={() => { onEdit(null); setPerson(emptyPerson('tenant')); setError(null); setOk(null) }}>
              Cancel edit
            </button>
          )}
          <button className="btn btn-primary" disabled={saving || loadingOwner}>
            {saving ? 'Saving…' : editingId ? 'Update resident' : 'Save resident'}
          </button>
        </div>
      )}
    </form>
  )
}

export function ResidentsTable({
  rows,
  onDelete,
  onSelect,
  selectedId,
  readOnly,
}: {
  rows: FlatResidentRow[]
  onDelete: (id: string) => void
  onSelect: (id: string, apartmentNo: string) => void
  selectedId: string | null
  readOnly?: boolean
}) {
  const living = dedupeFlatResidents(rows)
    .filter((r) => r.occupancy_role === 'tenant' || (r.occupancy_role === 'owner' && r.is_current))

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Apartment</th>
            <th>Name</th>
            <th>Father</th>
            <th>Role</th>
            <th>Mobile</th>
            <th>Status</th>
            {!readOnly && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {living.length === 0 ? (
            <tr><td colSpan={readOnly ? 6 : 7} className="empty">No residents yet.</td></tr>
          ) : (
            living.map((r) => (
              <tr
                key={r.id}
                className={selectedId === r.id ? 'row-selected' : 'row-clickable'}
                onClick={() => onSelect(r.id, r.apartment_no)}
              >
                <td>{r.apartment_no}</td>
                <td>{r.resident?.full_name || '—'}</td>
                <td>{r.resident?.father_name || '—'}</td>
                <td><span className={`badge ${r.occupancy_role}`}>{r.occupancy_role === 'owner' ? 'Owner' : 'Tenant'}</span></td>
                <td>{r.resident?.mobile || '—'}</td>
                <td>{r.is_current ? 'Living' : 'Moved out'}</td>
                {!readOnly && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="btn btn-danger" onClick={() => onDelete(r.id)}>Delete</button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
