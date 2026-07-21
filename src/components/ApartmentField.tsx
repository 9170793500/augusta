import { useEffect, useMemo, useState } from 'react'
import { APARTMENT_PREFIX, apartmentSuffix, buildApartmentNo } from '../lib/apartmentUtils'
import { fetchApartmentSuggestions, filterApartmentSuggestions } from '../lib/apartmentSuggestions'

export function ApartmentField({
  apartmentNo,
  lockApartment,
  value,
  onChange,
  suggestions: externalSuggestions,
}: {
  apartmentNo: string | null
  lockApartment: boolean
  value: string
  onChange: (v: string) => void
  suggestions?: string[]
}) {
  const [loadedSuggestions, setLoadedSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  const fullValue = lockApartment ? apartmentNo || value : value
  const suffix = apartmentSuffix(fullValue)

  useEffect(() => {
    if (externalSuggestions?.length) return
    fetchApartmentSuggestions().then(setLoadedSuggestions)
  }, [externalSuggestions])

  const allSuggestions = externalSuggestions?.length ? externalSuggestions : loadedSuggestions

  const filtered = useMemo(
    () => filterApartmentSuggestions(allSuggestions, suffix),
    [allSuggestions, suffix]
  )

  function handleSuffixChange(raw: string) {
    const digits = raw.replace(/\D/g, '').toUpperCase()
    onChange(digits ? buildApartmentNo(digits) : '')
    setOpen(true)
  }

  function pickSuggestion(apt: string) {
    onChange(apt)
    setOpen(false)
  }

  if (lockApartment) {
    return (
      <div className="field">
        <label>Apartment No</label>
        <div className="apartment-input-group apartment-input-locked">
          <span className="apartment-prefix">{APARTMENT_PREFIX}</span>
          <input
            required
            className="apartment-suffix-input"
            value={suffix}
            readOnly
            disabled
          />
        </div>
      </div>
    )
  }

  return (
    <div className="field apartment-field">
      <label>Apartment No</label>
      <div className="apartment-input-group">
        <span className="apartment-prefix">{APARTMENT_PREFIX}</span>
        <input
          required
          className="apartment-suffix-input"
          value={suffix}
          onChange={(e) => handleSuffixChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="30406"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
        />
      </div>
      {suffix && (
        <p className="form-hint apartment-preview">Full number: {buildApartmentNo(suffix)}</p>
      )}
      {open && filtered.length > 0 && (
        <ul className="apartment-suggestions" role="listbox">
          {filtered.map((apt) => (
            <li key={apt}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pickSuggestion(apt)}>
                <span className="apartment-suggestion-prefix">{APARTMENT_PREFIX}</span>
                <span>{apartmentSuffix(apt)}</span>
                <span className="apartment-suggestion-full">{apt}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export type ModuleProps = import('../lib/types').FormProps & {
  search: string
  onEdit?: (row: unknown) => void
  onDelete?: (table: string, id: string) => void
}
