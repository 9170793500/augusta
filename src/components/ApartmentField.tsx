import { useEffect, useMemo, useState } from 'react'
import {
  buildSocietyApartmentNo,
  isSocietyTower,
  parseTowerFlatSelection,
  SOCIETY_FLAT_CODES,
  TOWER_OPTIONS,
  type SocietyTower,
} from '../lib/societyFlats'

export function ApartmentField({
  apartmentNo,
  lockApartment,
  value,
  onChange,
}: {
  apartmentNo: string | null
  lockApartment: boolean
  value: string
  onChange: (v: string) => void
  suggestions?: string[]
}) {
  const fullValue = lockApartment ? apartmentNo || value : value
  const parsed = parseTowerFlatSelection(fullValue)
  const [tower, setTower] = useState<SocietyTower | ''>(parsed.tower)
  const [flatCode, setFlatCode] = useState(parsed.flatCode)

  useEffect(() => {
    const next = parseTowerFlatSelection(value)
    setTower(next.tower)
    setFlatCode(next.flatCode)
  }, [value])

  const flatOptions = useMemo(() => {
    if (!tower) return []
    return SOCIETY_FLAT_CODES[tower].map((code) => buildSocietyApartmentNo(tower, code))
  }, [tower])

  function handleTowerChange(nextTower: string) {
    if (!isSocietyTower(nextTower)) {
      setTower('')
      setFlatCode('')
      onChange('')
      return
    }
    setTower(nextTower)
    setFlatCode('')
    onChange('')
  }

  function handleFlatChange(nextCode: string) {
    setFlatCode(nextCode)
    onChange(tower && nextCode ? buildSocietyApartmentNo(tower, nextCode) : '')
  }

  if (lockApartment) {
    const lockedTower = parseTowerFlatSelection(fullValue).tower
    return (
      <div className="field apartment-field apartment-picker-field">
        <div className="apartment-picker-grid apartment-picker-locked">
          <div className="field apartment-tower-field">
            <label>Tower</label>
            <input value={lockedTower ? `Tower ${lockedTower}` : '—'} readOnly disabled />
          </div>
          <div className="field apartment-flat-field">
            <label>Apartment No</label>
            <input value={fullValue || ''} readOnly disabled />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="field apartment-field apartment-picker-field">
      <div className="apartment-picker-grid">
        <div className="field apartment-tower-field">
          <label>Tower</label>
          <select required value={tower} onChange={(e) => handleTowerChange(e.target.value)}>
            <option value="">Select tower</option>
            {TOWER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field apartment-flat-field">
          <label>Apartment No</label>
          <select
            required
            value={flatCode}
            disabled={!tower}
            onChange={(e) => handleFlatChange(e.target.value)}
          >
            <option value="">{tower ? 'Select apartment' : 'Choose tower first'}</option>
            {flatOptions.map((apt) => (
              <option key={apt} value={apt.slice(5)}>
                {apt}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
