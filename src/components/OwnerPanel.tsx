import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Flat, FormProps } from '../lib/types'
import { ApartmentField } from './ApartmentField'
import type { FlatResidentRow } from './FlatResidentsForm'
import { emptyPerson, savePersonToFlat, type PersonFields } from '../lib/residentUtils'

type Props = FormProps & {
  flatResidents: FlatResidentRow[]
  selectedApartment: string | null
  onSelectApartment: (apt: string | null) => void
}

export function OwnerPanel({
  onSaved,
  apartmentNo,
  lockApartment,
  readOnly,
  flatResidents,
  selectedApartment,
  onSelectApartment,
}: Props) {
  const [apt, setApt] = useState(apartmentNo || selectedApartment || '')
  const [flat, setFlat] = useState({ tower: '', floor: '', family_members: '', occupancy_status: 'owner_occupied' })
  const [owner, setOwner] = useState<PersonFields>(emptyPerson('owner'))
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const activeApt = (lockApartment ? apartmentNo : apt)?.trim().toUpperCase() || ''

  useEffect(() => {
    if (selectedApartment) setApt(selectedApartment)
  }, [selectedApartment])

  useEffect(() => {
    if (!activeApt) {
      setFlat({ tower: '', floor: '', family_members: '', occupancy_status: 'owner_occupied' })
      setOwner(emptyPerson('owner'))
      return
    }

    async function load() {
      const { data: flatRow } = await supabase.from('flats').select('*').eq('apartment_no', activeApt).maybeSingle()
      if (flatRow) {
        setFlat({
          tower: flatRow.tower || '',
          floor: flatRow.floor || '',
          family_members: flatRow.family_members?.toString() || '',
          occupancy_status: flatRow.occupancy_status || 'owner_occupied',
        })
      }

      const ownerRow = flatResidents.find((r) => r.apartment_no === activeApt && r.occupancy_role === 'owner')
      if (ownerRow?.resident) {
        setOwner({
          id: ownerRow.resident.id,
          flatResidentId: ownerRow.id,
          full_name: ownerRow.resident.full_name,
          father_name: ownerRow.resident.father_name || '',
          aadhar_number: ownerRow.resident.aadhar_number || '',
          pan_number: ownerRow.resident.pan_number || '',
          email: ownerRow.resident.email || '',
          mobile: ownerRow.resident.mobile || '',
          alt_mobile: ownerRow.resident.alt_mobile || '',
          occupancy_role: 'owner',
          is_current: ownerRow.is_current,
        })
      } else {
        setOwner(emptyPerson('owner'))
      }
    }
    load()
  }, [activeApt, flatResidents])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const apartment_no = activeApt
    if (!apartment_no) return setError('Apartment No is required')
    if (!owner.full_name.trim()) return setError('Owner name is required')

    setSaving(true)
    setError(null)
    setOk(null)

    const { error: flatErr } = await supabase.from('flats').upsert(
      {
        apartment_no,
        tower: flat.tower || null,
        floor: flat.floor || null,
        family_members: flat.family_members ? Number(flat.family_members) : null,
        occupancy_status: flat.occupancy_status,
        status: flat.occupancy_status,
        owner_name: owner.full_name.trim(),
      } as never,
      { onConflict: 'apartment_no' }
    )
    if (flatErr) {
      setSaving(false)
      return setError(flatErr.message)
    }

    try {
      await savePersonToFlat(apartment_no, owner)
      setOk('Owner details saved.')
      onSaved()
      onSelectApartment(apartment_no)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={onSubmit} className="flat-master-form">
      <h3 className="pane-title">Owner</h3>
      <p className="form-hint">Flat owner — apartment, tower and owner personal / KYC details.</p>
      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      <div className="flat-section flat-section-flat">
        <h4>Flat Details</h4>
        <ApartmentField apartmentNo={apartmentNo} lockApartment={lockApartment} value={apt} onChange={setApt} />
        <div className="form-grid">
          <div className="field"><label>Tower / Block</label><input disabled={readOnly} value={flat.tower} onChange={(e) => setFlat({ ...flat, tower: e.target.value })} /></div>
          <div className="field"><label>Floor</label><input disabled={readOnly} value={flat.floor} onChange={(e) => setFlat({ ...flat, floor: e.target.value })} /></div>
          <div className="field"><label>Occupancy</label>
            <select disabled={readOnly} value={flat.occupancy_status} onChange={(e) => setFlat({ ...flat, occupancy_status: e.target.value })}>
              <option value="owner_occupied">Owner-occupied</option>
              <option value="rented">Rented</option>
              <option value="vacant">Vacant</option>
            </select>
          </div>
          <div className="field"><label>Family Members</label><input type="number" min={0} disabled={readOnly} value={flat.family_members} onChange={(e) => setFlat({ ...flat, family_members: e.target.value })} /></div>
        </div>
      </div>

      <div className="flat-section">
        <div className="flat-section-head">
          <h4>Owner Details</h4>
          <span className="badge owner">Owner</span>
        </div>
        <div className="form-grid">
          <div className="field full"><label>Full Name</label><input required disabled={readOnly} value={owner.full_name} onChange={(e) => setOwner({ ...owner, full_name: e.target.value })} /></div>
          <div className="field full"><label>Father Name</label><input disabled={readOnly} value={owner.father_name} onChange={(e) => setOwner({ ...owner, father_name: e.target.value })} /></div>
          <div className="field"><label>Aadhar</label><input disabled={readOnly} value={owner.aadhar_number} onChange={(e) => setOwner({ ...owner, aadhar_number: e.target.value })} /></div>
          <div className="field"><label>PAN</label><input disabled={readOnly} value={owner.pan_number} onChange={(e) => setOwner({ ...owner, pan_number: e.target.value })} /></div>
          <div className="field"><label>Email</label><input type="email" disabled={readOnly} value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} /></div>
          <div className="field"><label>Mobile</label><input disabled={readOnly} value={owner.mobile} onChange={(e) => setOwner({ ...owner, mobile: e.target.value })} /></div>
          <div className="field"><label>Alt. Mobile</label><input disabled={readOnly} value={owner.alt_mobile} onChange={(e) => setOwner({ ...owner, alt_mobile: e.target.value })} /></div>
        </div>
      </div>

      {!readOnly && (
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save owner'}
        </button>
      )}
    </form>
  )
}

export function OwnerTable({
  rows,
  flatResidents,
  onDelete,
  onSelect,
  selectedApartment,
  canDelete,
}: {
  rows: Flat[]
  flatResidents: FlatResidentRow[]
  onDelete: (id: string) => void
  onSelect: (apartmentNo: string) => void
  selectedApartment: string | null
  canDelete: boolean
}) {
  function ownerName(apt: string) {
    const o = flatResidents.find((r) => r.apartment_no === apt && r.occupancy_role === 'owner')
    return o?.resident?.full_name || '—'
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Apartment</th>
            <th>Tower</th>
            <th>Owner Name</th>
            <th>Mobile</th>
            {canDelete && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={canDelete ? 5 : 4} className="empty">No owners yet.</td></tr>
          ) : (
            rows.map((r) => {
              const o = flatResidents.find((fr) => fr.apartment_no === r.apartment_no && fr.occupancy_role === 'owner')
              return (
                <tr
                  key={r.id}
                  className={selectedApartment === r.apartment_no ? 'row-selected' : 'row-clickable'}
                  onClick={() => onSelect(r.apartment_no)}
                >
                  <td><strong>{r.apartment_no}</strong></td>
                  <td>{r.tower || '—'}</td>
                  <td>{ownerName(r.apartment_no)}</td>
                  <td>{o?.resident?.mobile || '—'}</td>
                  {canDelete && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="btn btn-danger" onClick={() => onDelete(r.id)}>Delete</button>
                    </td>
                  )}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
