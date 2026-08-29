import { FormFieldLabel } from './FormFieldLabel'
import { sanitizeAadhaar, sanitizeMobile, type ResidentFormFields } from '../lib/fieldValidation'

type Props = {
  form: ResidentFormFields
  onChange: (next: ResidentFormFields) => void
  roleLabel: string
}

export function ResidentDetailFields({ form, onChange, roleLabel }: Props) {
  function patch(partial: Partial<ResidentFormFields>) {
    onChange({ ...form, ...partial })
  }

  const guardianType = form.guardian_type === 'husband' ? 'husband' : 'father'
  const guardianLabel = guardianType === 'husband' ? 'Husband name' : 'Father name'

  return (
    <div className="form-grid">
      <div className="field full">
        <FormFieldLabel required>Full name</FormFieldLabel>
        <input
          required
          value={form.full_name}
          onChange={(e) => patch({ full_name: e.target.value })}
          placeholder={`${roleLabel} name as on Aadhar`}
        />
      </div>
      <div className="field full guardian-name-field">
        <div className="guardian-name-row">
          <select
            className="guardian-type-select"
            aria-label="Relation"
            value={guardianType}
            onChange={(e) =>
              patch({ guardian_type: e.target.value === 'husband' ? 'husband' : 'father' })
            }
          >
            <option value="father">Father name</option>
            <option value="husband">Husband name</option>
          </select>
          <input
            className="guardian-name-input"
            aria-label={guardianLabel}
            value={form.father_name}
            onChange={(e) => patch({ father_name: e.target.value })}
            placeholder={`${guardianLabel} (optional)`}
          />
        </div>
      </div>
      <div className="field">
        <FormFieldLabel required>Mobile</FormFieldLabel>
        <input
          required
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          value={form.mobile}
          onChange={(e) => patch({ mobile: sanitizeMobile(e.target.value) })}
          placeholder="10-digit mobile"
        />
      </div>
      <div className="field">
        <FormFieldLabel>Alt. mobile</FormFieldLabel>
        <input
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          value={form.alt_mobile}
          onChange={(e) => patch({ alt_mobile: sanitizeMobile(e.target.value) })}
          placeholder="Optional"
        />
      </div>
      <div className="field">
        <FormFieldLabel>Spouse name</FormFieldLabel>
        <input
          value={form.spouse_name}
          onChange={(e) => patch({ spouse_name: e.target.value })}
          placeholder="Husband / wife name (optional)"
        />
      </div>
      <div className="field">
        <FormFieldLabel>Spouse mobile</FormFieldLabel>
        <input
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          value={form.spouse_mobile}
          onChange={(e) => patch({ spouse_mobile: sanitizeMobile(e.target.value) })}
          placeholder="10-digit mobile (optional)"
        />
      </div>
      <div className="field">
        <FormFieldLabel required>Email</FormFieldLabel>
        <input
          required
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => patch({ email: e.target.value.trim() })}
          placeholder="name@gmail.com"
        />
      </div>
      <div className="field">
        <FormFieldLabel required>Aadhar</FormFieldLabel>
        <input
          required
          inputMode="numeric"
          maxLength={12}
          value={form.aadhar_number}
          onChange={(e) => patch({ aadhar_number: sanitizeAadhaar(e.target.value) })}
          placeholder="12-digit Aadhar"
        />
      </div>
      <div className="field">
        <FormFieldLabel>PAN</FormFieldLabel>
        <input
          value={form.pan_number}
          onChange={(e) => patch({ pan_number: e.target.value.toUpperCase().slice(0, 10) })}
          placeholder="ABCDE1234F (optional)"
          maxLength={10}
        />
      </div>
      <div className="field">
        <FormFieldLabel>Family members</FormFieldLabel>
        <input
          type="number"
          min={0}
          value={form.family_members}
          onChange={(e) => patch({ family_members: e.target.value })}
          placeholder="Number of family members"
        />
      </div>
    </div>
  )
}
