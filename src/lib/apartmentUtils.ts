export const APARTMENT_PREFIX = 'AUG0'

/** Society flat code pattern: AUG030005 (AUG0 + tower + 4-digit flat). */
export const SOCIETY_APARTMENT_RE = /^AUG0[345]\d{4}$/

/** Digits after the AUG0 prefix (tower + flat code). */
export function apartmentSuffix(full: string): string {
  const upper = full.trim().toUpperCase()
  if (SOCIETY_APARTMENT_RE.test(upper)) {
    return upper.slice(APARTMENT_PREFIX.length).replace(/\D/g, '')
  }
  if (upper.startsWith('AUG00')) {
    return upper.slice(5).replace(/\D/g, '')
  }
  if (upper.startsWith('AUG')) {
    return upper.slice(3).replace(/\D/g, '')
  }
  return upper.replace(/\D/g, '')
}

export function buildApartmentNo(towerOrSuffix: string, flatCode?: string): string {
  if (flatCode) {
    return `${APARTMENT_PREFIX}${towerOrSuffix.replace(/\D/g, '')}${flatCode.replace(/\D/g, '').padStart(4, '0')}`
  }
  const digits = towerOrSuffix.replace(/\D/g, '').toUpperCase()
  if (digits.length === 5) {
    return `${APARTMENT_PREFIX}${digits[0]}${digits.slice(1).padStart(4, '0')}`
  }
  return `${APARTMENT_PREFIX}${digits}`
}

export function normalizeApartmentInput(full: string): string {
  const upper = full.trim().toUpperCase()
  if (!upper) return ''

  if (SOCIETY_APARTMENT_RE.test(upper)) return upper

  const legacy = upper.match(/^AUG00([345])(\d{4,5})$/)
  if (legacy) {
    const tower = legacy[1]
    const rest = legacy[2].padStart(4, '0').slice(-4)
    return `${APARTMENT_PREFIX}${tower}${rest}`
  }

  if (upper.startsWith('AUG')) return upper
  return buildApartmentNo(upper)
}

/** Compare stored vs selected apartment codes after normalizing legacy formats. */
export function apartmentsMatch(stored: string, selected: string): boolean {
  const a = normalizeApartmentInput(stored)
  const b = normalizeApartmentInput(selected)
  return a !== '' && b !== '' && a === b
}

export const SOCIETY_TOWERS = ['3', '4', '5'] as const

/** Tower digit from code — AUG030505 → 3. */
export function apartmentTower(
  full: string | null | undefined,
  storedTower?: string | null
): string | null {
  const upper = (full || '').trim().toUpperCase()
  if (SOCIETY_APARTMENT_RE.test(upper)) {
    const fromCode = upper[4]
    if (SOCIETY_TOWERS.includes(fromCode as (typeof SOCIETY_TOWERS)[number])) return fromCode
  }

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

/** Last 3 digits of apartment code for table display (e.g. AUG030505 → 505). */
export function apartmentShortNo(full: string | null | undefined): string {
  if (!full?.trim()) return '—'
  const digits = full.trim().toUpperCase().replace(/\D/g, '')
  if (digits.length >= 3) return digits.slice(-3)
  const upper = full.trim().toUpperCase()
  return upper.length >= 3 ? upper.slice(-3) : upper || '—'
}
