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

export const SOCIETY_TOWERS = ['3', '4', '5'] as const

/** Tower digit from code — AUG0030505 → 3 (first digit after AUG00 prefix). */
export function apartmentTower(
  full: string | null | undefined,
  storedTower?: string | null
): string | null {
  const suffix = apartmentSuffix(full || '')
  if (suffix.length > 0) {
    const fromCode = suffix[0]
    if (SOCIETY_TOWERS.includes(fromCode as (typeof SOCIETY_TOWERS)[number])) return fromCode
  }
  const stored = storedTower?.trim().replace(/\D/g, '')
  if (stored && SOCIETY_TOWERS.includes(stored[0] as (typeof SOCIETY_TOWERS)[number])) return stored[0]
  return null
}

export function matchesTowerFilter(
  filter: string,
  apartmentNo: string | null | undefined,
  storedTower?: string | null
): boolean {
  if (!filter) return true
  return apartmentTower(apartmentNo, storedTower) === filter
}

/** Last 3 digits of apartment code for table display (e.g. AUG0050505 → 505). */
export function apartmentShortNo(full: string | null | undefined): string {
  if (!full?.trim()) return '—'
  const digits = full.trim().toUpperCase().replace(/\D/g, '')
  if (digits.length >= 3) return digits.slice(-3)
  const upper = full.trim().toUpperCase()
  return upper.length >= 3 ? upper.slice(-3) : upper || '—'
}
