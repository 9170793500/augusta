import { useEffect, useState } from 'react'
import { FormFieldLabel } from './FormFieldLabel'
import {
  isPendingValue,
  PENDING_VALUE,
  type PendingFieldChoice,
} from '../lib/fieldValidation'

type Props = {
  label: string
  value: string
  onChange: (next: string) => void
  numberPlaceholder?: string
  pendingLabel?: string
  numberLabel?: string
}

export function PendingOrNumberField({
  label,
  value,
  onChange,
  numberPlaceholder = 'Enter number',
  pendingLabel = 'Pending',
  numberLabel = 'Enter number',
}: Props) {
  const pending = isPendingValue(value)
  const [enterMode, setEnterMode] = useState(() => !pending && Boolean(value.trim()))

  useEffect(() => {
    if (pending) setEnterMode(false)
    else if (value.trim()) setEnterMode(true)
  }, [pending, value])

  const choice: PendingFieldChoice = pending ? 'pending' : enterMode || value.trim() ? 'number' : ''

  function setChoice(next: PendingFieldChoice) {
    if (next === 'pending') {
      setEnterMode(false)
      onChange(PENDING_VALUE)
      return
    }
    if (next === 'number') {
      setEnterMode(true)
      onChange('')
      return
    }
    setEnterMode(false)
    onChange('')
  }

  return (
    <div className="field pending-or-number-field">
      <FormFieldLabel required>{label}</FormFieldLabel>
      <select
        required
        value={choice}
        title={pending ? 'Card or licence not issued yet — dates are not required.' : undefined}
        onChange={(e) => setChoice(e.target.value as PendingFieldChoice)}
      >
        <option value="">Select…</option>
        <option value="pending">{pendingLabel}</option>
        <option value="number">{numberLabel}</option>
      </select>
      {choice === 'number' && (
        <input
          required
          className="pending-or-number-input"
          value={pending ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={numberPlaceholder}
        />
      )}
    </div>
  )
}
