import { buildApartmentNo, normalizeApartmentInput, SOCIETY_TOWERS } from './apartmentUtils'

export type SocietyTower = (typeof SOCIETY_TOWERS)[number]

export type TowerOption = {
  value: SocietyTower
  label: string
}

export const TOWER_OPTIONS: TowerOption[] = [
  { value: '3', label: 'Tower 3' },
  { value: '4', label: 'Tower 4' },
  { value: '5', label: 'Tower 5' },
]

/** 4-digit flat code per tower (12 flats each). */
export const SOCIETY_FLAT_CODES: Record<SocietyTower, readonly string[]> = {
  '3': ['0005', '0006', '0105', '0106', '0205', '0206', '0305', '0306', '0405', '0406', '0505', '0506'],
  '4': ['0007', '0008', '0107', '0108', '0207', '0208', '0307', '0308', '0407', '0408', '0507', '0508'],
  '5': ['0008', '0009', '0108', '0109', '0208', '0209', '0308', '0309', '0408', '0409', '0508', '0509'],
}

export function buildSocietyApartmentNo(tower: SocietyTower, flatCode: string): string {
  return buildApartmentNo(tower, flatCode)
}

export const ALL_SOCIETY_APARTMENTS: string[] = SOCIETY_TOWERS.flatMap((tower) =>
  SOCIETY_FLAT_CODES[tower].map((flatCode) => buildSocietyApartmentNo(tower, flatCode))
)

export function isSocietyTower(value: string): value is SocietyTower {
  return SOCIETY_TOWERS.includes(value as SocietyTower)
}

export function flatsForTower(tower: SocietyTower): string[] {
  return SOCIETY_FLAT_CODES[tower].map((flatCode) => buildSocietyApartmentNo(tower, flatCode))
}

export function parseTowerFlatSelection(apartmentNo: string): { tower: SocietyTower | ''; flatCode: string } {
  const upper = normalizeApartmentInput(apartmentNo)
  if (!upper.startsWith('AUG0') || upper.length < 9) return { tower: '', flatCode: '' }

  const tower = upper[4]
  const flatCode = upper.slice(5)
  if (!isSocietyTower(tower)) return { tower: '', flatCode: '' }

  if (SOCIETY_FLAT_CODES[tower].includes(flatCode)) {
    return { tower, flatCode }
  }

  return { tower, flatCode: '' }
}

export function floorFromFlatCode(flatCode: string): string {
  if (flatCode.length < 4) return ''
  return String(Math.floor(Number(flatCode) / 100))
}
