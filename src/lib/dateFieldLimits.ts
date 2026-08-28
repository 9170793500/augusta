export const MIN_PAST_YEAR = 2008

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function yearRange(minYear: number, maxYear: number): number[] {
  const years: number[] = []
  for (let y = maxYear; y >= minYear; y--) years.push(y)
  return years
}

export function parseIsoDate(value: string): { year: string; month: string; day: string } {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { year: '', month: '', day: '' }
  }
  const [year, month, day] = value.split('-')
  return { year, month, day }
}

export function buildIsoDate(year: string, month: string, day: string): string {
  if (!year || !month || !day) return ''
  const y = Number(year)
  const m = Number(month)
  const d = Number(day)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ''
  const maxDay = new Date(y, m, 0).getDate()
  if (d < 1 || d > maxDay) return ''
  return `${year}-${month.padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function daysInMonth(year: number, month: number): number {
  if (!year || !month) return 31
  return new Date(year, month, 0).getDate()
}

export const MONTH_OPTIONS = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'May' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
]
