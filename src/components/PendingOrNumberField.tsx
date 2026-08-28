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
  onPendingChange?: () => void
  numberPlaceholder?: string
  pendingHint?: string
}

export function PendingOrNumberField({
  label,
  value,
  onChange,
  onPendingChange,
  numberPlaceholder = 'Enter number',
  pendingHint = 'Start and expiry dates are not needed while Pending.',
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
      onPendingChange?.()
      return
    }
    if (next === 'number') {
      setEnterMode(true)
      onChange('')
      return
    }
    setEnterMode(false)
    onChange('')
    onPendingChange?.()
  }

  return (
    <>
      <FormFieldLabel required>{label}</FormFieldLabel>
      <select
        required
        value={choice}
        onChange={(e) => setChoice(e.target.value as PendingFieldChoice)}
      >
        <option value="">Select…</option>
        <option value="pending">Pending (not issued yet)</option>
        <option value="number">Enter number</option>
      </select>
      {choice === 'number' && (
        <input
          required
          value={pending ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={numberPlaceholder}
        />
      )}
      {choice === 'pending' && <p className="form-hint pending-field-hint">{pendingHint}</p>}
    </>
  )
}
