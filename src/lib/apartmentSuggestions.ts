import { supabase } from './supabase'
import { buildApartmentNo, normalizeApartmentInput } from './apartmentUtils'

let cached: string[] | null = null
let loading: Promise<string[]> | null = null

export async function fetchApartmentSuggestions(): Promise<string[]> {
  if (cached) return cached
  if (loading) return loading

  loading = (async () => {
    const [flatsRes, residentsRes] = await Promise.all([
      supabase.from('flats').select('apartment_no').order('apartment_no'),
      supabase.from('flat_residents').select('apartment_no'),
    ])

    const nums = new Set<string>()
    for (const row of flatsRes.data || []) {
      const apt = normalizeApartmentInput(String(row.apartment_no || ''))
      if (apt) nums.add(apt)
    }
    for (const row of residentsRes.data || []) {
      const apt = normalizeApartmentInput(String(row.apartment_no || ''))
      if (apt) nums.add(apt)
    }

    cached = Array.from(nums).sort()
    loading = null
    return cached
  })()

  return loading
}

export function filterApartmentSuggestions(all: string[], suffix: string, limit = 8): string[] {
  const digits = suffix.replace(/\D/g, '')
  if (!digits) return all.slice(0, limit)

  const needle = buildApartmentNo(digits)
  return all
    .filter((apt) => apt.toUpperCase().startsWith(needle) || apt.toUpperCase().includes(digits))
    .slice(0, limit)
}

export function invalidateApartmentSuggestions() {
  cached = null
  loading = null
}
