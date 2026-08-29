export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export const PENDING_VALUE = 'Pending'

export function isPendingValue(value: string): boolean {
  return value.trim().toLowerCase() === 'pending'
}

export type PendingFieldChoice = '' | 'pending' | 'number'

export function pendingFieldChoice(value: string): PendingFieldChoice {
  if (!value.trim()) return ''
  if (isPendingValue(value)) return 'pending'
  return 'number'
}

export function sanitizeMobile(value: string): string {
  return digitsOnly(value).slice(0, 10)
}

export function sanitizeAadhaar(value: string): string {
  return digitsOnly(value).slice(0, 12)
}

export function isValidMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(digitsOnly(value))
}

export function isValidOptionalMobile(value: string): boolean {
  if (!value.trim()) return true
  return isValidMobile(value)
}

export function isValidAadhaar(value: string): boolean {
  return /^\d{12}$/.test(digitsOnly(value))
}

export function isValidOptionalAadhaar(value: string): boolean {
  if (!value.trim()) return true
  return isValidAadhaar(value)
}

export function isValidEmail(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export function isValidOptionalEmail(value: string): boolean {
  if (!value.trim()) return true
  return isValidEmail(value)
}

export function isValidPan(value: string): boolean {
  if (!value.trim()) return true
  return /^[A-Z]{5}\d{4}[A-Z]$/i.test(value.trim())
}

export type ResidentFormFields = {
  full_name: string
  father_name: string
  guardian_type: 'father' | 'husband'
  mobile: string
  alt_mobile: string
  spouse_name: string
  spouse_mobile: string
  email: string
  aadhar_number: string
  pan_number: string
  family_members: string
}

export function validateResidentForm(form: ResidentFormFields, roleLabel: string): string | null {
  if (!form.full_name.trim()) return `${roleLabel} full name is required.`
  if (!isValidMobile(form.mobile)) {
    return `${roleLabel} mobile is required — enter a valid 10-digit Indian number (starts with 6–9).`
  }
  if (!isValidOptionalMobile(form.alt_mobile)) {
    return `${roleLabel} alternate mobile must be a valid 10-digit number, or leave it blank.`
  }
  if (!isValidOptionalMobile(form.spouse_mobile)) {
    return `${roleLabel} spouse mobile must be a valid 10-digit number, or leave it blank.`
  }
  if (!isValidEmail(form.email)) {
    return `${roleLabel} email is required — enter a valid address with @ (e.g. name@gmail.com).`
  }
  if (!isValidAadhaar(form.aadhar_number)) {
    return `${roleLabel} Aadhar is required — enter exactly 12 digits.`
  }
  if (!isValidPan(form.pan_number)) {
    return `${roleLabel} PAN must be in format ABCDE1234F, or leave it blank.`
  }
  return null
}

export type LeaseFormFields = {
  tenant_name: string
  lease_start: string
  lease_end: string
}

export function validateLeaseForm(form: LeaseFormFields, fallbackTenantName: string): string | null {
  const tenant = form.tenant_name.trim() || fallbackTenantName.trim()
  if (!tenant) return 'Tenant name is required.'
  if (!form.lease_start) return 'Lease start date is required.'
  if (!form.lease_end) return 'Lease end date is required.'
  if (form.lease_end < form.lease_start) return 'Lease end date must be on or after the start date.'
  return null
}

export type DriverFormFields = {
  driver_name: string
  mobile: string
  aadhar_number: string
  licence_number: string
  licence_validity: string
}

export function validateDriverForm(form: DriverFormFields): string | null {
  if (!form.driver_name.trim()) return 'Driver name is required.'
  if (!isValidMobile(form.mobile)) {
    return 'Driver mobile is required — enter a valid 10-digit Indian number (starts with 6–9).'
  }
  if (!isValidAadhaar(form.aadhar_number)) {
    return 'Driver Aadhar is required — enter exactly 12 digits.'
  }
  if (!form.licence_number.trim()) return 'Driver licence number is required — enter the number or choose Pending.'
  if (!isPendingValue(form.licence_number) && !form.licence_validity) {
    return 'Driver licence expiry date is required when licence number is not Pending.'
  }
  return null
}

export function driverRowHasPartialData(row: DriverFormFields & { vehicle_no?: string }): boolean {
  return Boolean(
    row.driver_name.trim() ||
      row.mobile.trim() ||
      row.aadhar_number.trim() ||
      row.licence_number.trim() ||
      row.vehicle_no?.trim()
  )
}

export function validateDriverRow(row: DriverFormFields, label: string): string | null {
  const err = validateDriverForm(row)
  if (!err) return null
  return err.replace(/^Driver /, `${label}: `)
}

export type StaffFormFields = {
  name: string
  aadhar_number: string
  mobile: string
  card_number: string
}

export function validateStaffRow(row: StaffFormFields, label: string): string | null {
  if (!row.name.trim()) return `${label}: name is required.`
  if (!isValidAadhaar(row.aadhar_number)) {
    return `${label}: Aadhar is required — enter exactly 12 digits.`
  }
  if (!row.card_number.trim()) {
    return `${label}: card number is required — enter the number or choose Pending.`
  }
  if (!isValidMobile(row.mobile)) {
    return `${label}: mobile is required — enter a valid 10-digit Indian number (starts with 6–9).`
  }
  return null
}

export function staffRowHasPartialData(row: StaffFormFields): boolean {
  return Boolean(
    row.name.trim() ||
      row.aadhar_number.trim() ||
      row.mobile.trim() ||
      row.card_number.trim()
  )
}

export function validateVehicleNo(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Vehicle number is required.'
  if (v.length < 4) return 'Vehicle number looks too short — enter the full registration number.'
  return null
}
