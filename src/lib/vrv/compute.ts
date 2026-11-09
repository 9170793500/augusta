import type {
  VrvAmcContract,
  VrvCashbookEntry,
  VrvContractComputed,
  VrvExpiryAlert,
  VrvMaterial,
  VrvPayment,
  VrvPaymentStatus,
  VrvSalaryPayment,
  VrvSummary,
} from './types'

function addMonthsMinusOneDay(start: Date): Date {
  const end = new Date(start)
  end.setMonth(end.getMonth() + 12)
  end.setDate(end.getDate() - 1)
  return end
}

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function computeExpiryDate(startDate: string | null): string | null {
  if (!startDate) return null
  const start = new Date(`${startDate}T12:00:00`)
  if (Number.isNaN(start.getTime())) return null
  return isoDate(addMonthsMinusOneDay(start))
}

export function computeExpiryAlert(startDate: string | null, expiryDate: string | null): VrvExpiryAlert {
  if (!startDate) return 'Not Started'
  if (!expiryDate) return 'Not Started'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(`${expiryDate}T12:00:00`)
  if (expiry < today) return 'Expired'
  const soon = new Date(today)
  soon.setDate(soon.getDate() + 30)
  if (expiry <= soon) return 'Expiring Soon'
  return 'Active'
}

export type VrvOverviewAlert = {
  id: string
  apartment_code: string
  alert_type: string
  message: string
}

export function buildVrvOverviewAlerts(contracts: VrvContractComputed[]): VrvOverviewAlert[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const out: VrvOverviewAlert[] = []
  for (const c of contracts) {
    if (c.expiry_alert === 'Expired' || c.expiry_alert === 'Expiring Soon') {
      out.push({
        id: `vrv-expiry-${c.id}`,
        apartment_code: c.apartment_code,
        alert_type: 'VRV AMC',
        message: `${c.apartment_code}: contract ${c.expiry_alert.toLowerCase()}${c.expiry_date ? ` (${c.expiry_date})` : ''}`,
      })
    }
    if (c.start_date && c.balance > 0) {
      const cutoff = new Date(`${c.start_date}T12:00:00`)
      cutoff.setDate(cutoff.getDate() + 30)
      if (cutoff < today) {
        out.push({
          id: `vrv-overdue-${c.id}`,
          apartment_code: c.apartment_code,
          alert_type: 'VRV AMC',
          message: `${c.apartment_code}: ₹${c.balance.toLocaleString('en-IN')} outstanding 30+ days after AMC start`,
        })
      }
    }
  }
  return out
}

export function computeContract(
  contract: VrvAmcContract,
  payments: VrvPayment[]
): VrvContractComputed {
  const total_received = payments.reduce((s, p) => s + p.amount, 0)
  const balance = Math.max(0, contract.annual_amount - total_received)
  let payment_status: VrvPaymentStatus = 'Pending'
  if (total_received >= contract.annual_amount) payment_status = 'Paid'
  else if (total_received > 0) payment_status = 'Partial'
  const last_payment_date =
    payments.length === 0
      ? null
      : payments.reduce((max, p) => (p.payment_date > max ? p.payment_date : max), payments[0].payment_date)
  const expiry_date = computeExpiryDate(contract.start_date)
  const expiry_alert = computeExpiryAlert(contract.start_date, expiry_date)
  return {
    ...contract,
    total_received,
    balance,
    payment_status,
    last_payment_date,
    expiry_date,
    expiry_alert,
    payments,
  }
}

export function salaryGroupKey(row: VrvSalaryPayment) {
  return `${row.employee_name}\t${row.salary_month.slice(0, 7)}`
}

export function computeSalaryPending(rows: VrvSalaryPayment[]): number {
  const groups = new Map<string, { due: number; paid: number }>()
  for (const r of rows) {
    const k = salaryGroupKey(r)
    const g = groups.get(k) ?? { due: r.salary_due, paid: 0 }
    g.due = Math.max(g.due, r.salary_due)
    g.paid += r.amount_paid
    groups.set(k, g)
  }
  let pending = 0
  groups.forEach((g) => {
    pending += Math.max(0, g.due - g.paid)
  })
  return pending
}

export function computeSummary(opts: {
  period: string
  contracts: VrvContractComputed[]
  materials: VrvMaterial[]
  salary: VrvSalaryPayment[]
  cashbook: VrvCashbookEntry[]
  openingBalance: number
}): VrvSummary {
  const { period, contracts, materials, salary, cashbook, openingBalance } = opts
  const flatCount = contracts.length
  const contractValue = contracts.reduce((s, c) => s + c.annual_amount, 0)
  const amcReceived = contracts.reduce((s, c) => s + c.total_received, 0)
  const amcOutstanding = contracts.reduce((s, c) => s + c.balance, 0)
  const paidFlats = contracts.filter((c) => c.payment_status === 'Paid').length
  const partialFlats = contracts.filter((c) => c.payment_status === 'Partial').length
  const pendingFlats = contracts.filter((c) => c.payment_status === 'Pending').length
  const expiringSoon = contracts.filter((c) => c.expiry_alert === 'Expiring Soon').length
  const materialPurchaseTotal = materials.reduce((s, m) => s + Math.round(m.qty * m.rate), 0)
  const materialPaid = materials.reduce((s, m) => s + m.paid_amount, 0)
  const vendorDues = materialPurchaseTotal - materialPaid
  const salaryPaid = salary.reduce((s, r) => s + r.amount_paid, 0)
  const salaryPending = computeSalaryPending(salary)
  const otherIn = cashbook.filter((c) => c.type === 'Income').reduce((s, c) => s + c.amount, 0)
  const otherOut = cashbook.filter((c) => c.type === 'Expense').reduce((s, c) => s + c.amount, 0)
  const totalMoneyIn = openingBalance + amcReceived + otherIn
  const totalMoneyOut = salaryPaid + materialPaid + otherOut
  const cashBalance = totalMoneyIn - totalMoneyOut
  return {
    period,
    flatCount,
    contractValue,
    amcReceived,
    amcOutstanding,
    paidFlats,
    partialFlats,
    pendingFlats,
    expiringSoon,
    materialPurchaseTotal,
    materialPaid,
    vendorDues,
    salaryPaid,
    salaryPending,
    otherIn,
    otherOut,
    openingBalance,
    totalMoneyIn,
    totalMoneyOut,
    cashBalance,
  }
}

export function buildApartmentCode(tower: number, flatNo: string) {
  const flat = flatNo.trim().replace(/^0+/, '') || '0'
  const padded = flat.padStart(4, '0')
  return `AUG0${tower}${padded}`
}
