export const APARTMENT_PREFIX = 'AUG00'

/** Digits typed after the fixed AUG00 prefix */
export function apartmentSuffix(full: string): string {
  const upper = full.trim().toUpperCase()
  if (upper.startsWith(APARTMENT_PREFIX)) {
    return upper.slice(APARTMENT_PREFIX.length).replace(/\D/g, '')
  }
  if (upper.startsWith('AUG')) {
    return upper.slice(3).replace(/\D/g, '')
  }
  return upper.replace(/\D/g, '')
}

export function buildApartmentNo(suffix: string): string {
  return APARTMENT_PREFIX + suffix.replace(/\D/g, '').toUpperCase()
}

export function normalizeApartmentInput(full: string): string {
  const upper = full.trim().toUpperCase()
  if (!upper) return ''
  if (upper.startsWith(APARTMENT_PREFIX)) return upper
  if (upper.startsWith('AUG')) return 'AUG' + upper.slice(3).replace(/\D/g, '')
  return buildApartmentNo(upper)
}
