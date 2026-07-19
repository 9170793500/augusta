import type { FormProps } from '../lib/types'

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
}) {
  return (
    <div className="field">
      <label>Apartment No</label>
      <input
        required
        value={lockApartment ? apartmentNo || '' : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="AUG0010201"
        readOnly={lockApartment}
        disabled={lockApartment}
      />
    </div>
  )
}

export type ModuleProps = FormProps & {
  search: string
  onEdit?: (row: unknown) => void
  onDelete?: (table: string, id: string) => void
}
