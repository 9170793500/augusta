import { FormFieldLabel } from './FormFieldLabel'
import {
  MIN_PAST_YEAR,
  MONTH_OPTIONS,
  buildIsoDate,
  daysInMonth,
  parseIsoDate,
  yearRange,
} from '../lib/dateFieldLimits'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  minYear?: number
  maxYear?: number
}

export function FlexibleDateField({
  label,
  value,
  onChange,
  required,
  minYear = MIN_PAST_YEAR,
  maxYear = new Date().getFullYear() + 20,
}: Props) {
  const parts = parseIsoDate(value)
  const yearNum = parts.year ? Number(parts.year) : 0
  const monthNum = parts.month ? Number(parts.month) : 0
  const dayMax = yearNum && monthNum ? daysInMonth(yearNum, monthNum) : 31
  const years = yearRange(minYear, maxYear)

  function update(part: 'year' | 'month' | 'day', next: string) {
    const nextParts = { ...parts, [part]: next }
    if (part === 'year' || part === 'month') {
      const y = Number(nextParts.year)
      const m = Number(nextParts.month)
      const d = Number(nextParts.day)
      if (y && m && d && d > daysInMonth(y, m)) {
        nextParts.day = String(daysInMonth(y, m))
      }
    }
    onChange(buildIsoDate(nextParts.year, nextParts.month, nextParts.day))
  }

  return (
    <div className="field flexible-date-field">
      <FormFieldLabel required={required}>{label}</FormFieldLabel>
      <div className="flexible-date-row">
        <select
          required={required}
          aria-label={`${label} day`}
          value={parts.day}
          onChange={(e) => update('day', e.target.value)}
        >
          <option value="">Day</option>
          {Array.from({ length: dayMax }, (_, i) => {
            const day = String(i + 1).padStart(2, '0')
            return (
              <option key={day} value={day}>
                {i + 1}
              </option>
            )
          })}
        </select>
        <select
          required={required}
          aria-label={`${label} month`}
          value={parts.month}
          onChange={(e) => update('month', e.target.value)}
        >
          <option value="">Month</option>
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          required={required}
          aria-label={`${label} year`}
          value={parts.year}
          onChange={(e) => update('year', e.target.value)}
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
