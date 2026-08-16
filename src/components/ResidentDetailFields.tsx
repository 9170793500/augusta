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
      <div className="field full">
        <FormFieldLabel>Father name</FormFieldLabel>
        <input
          value={form.father_name}
          onChange={(e) => patch({ father_name: e.target.value })}
          placeholder="Optional"
        />
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
