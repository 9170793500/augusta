export type VehicleRegisteredTo = 'owner' | 'spouse'

export function normalizeVehicleRegisteredTo(raw: unknown): VehicleRegisteredTo {
  return raw === 'spouse' ? 'spouse' : 'owner'
}

export function defaultDriverNameForRegistration(
  registeredTo: VehicleRegisteredTo,
  primaryName: string,
  spouseName: string
): string {
  if (registeredTo === 'spouse') return spouseName.trim()
  return primaryName.trim()
}

export function registeredToLabel(
  registeredTo: VehicleRegisteredTo,
  primaryName: string,
  spouseName: string
): string {
  if (registeredTo === 'spouse') {
    return spouseName.trim() ? `Spouse — ${spouseName.trim()}` : 'Spouse'
  }
  return primaryName.trim() ? `Owner — ${primaryName.trim()}` : 'Owner (primary)'
}
