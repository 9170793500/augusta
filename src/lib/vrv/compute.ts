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

export type VrvTowerCollection = {
  tower: number
  received: number
  contractValue: number
  flatCount: number
}

export type VrvAttentionItem = {
  id: string
  message: string
  detail?: string
  severity: 'high' | 'normal'
}

export function buildTowerCollection(contracts: VrvContractComputed[]): VrvTowerCollection[] {
  const towers = [3, 4, 5]
  return towers.map((tower) => {
    const rows = contracts.filter((c) => c.tower === tower)
    return {
      tower,
      received: rows.reduce((s, c) => s + c.total_received, 0),
      contractValue: rows.reduce((s, c) => s + c.annual_amount, 0),
      flatCount: rows.length,
    }
  })
}

export function buildVrvAttentionItems(contracts: VrvContractComputed[]): VrvAttentionItem[] {
  const items: VrvAttentionItem[] = []
  const noPayment = contracts.filter((c) => c.total_received === 0)
  if (noPayment.length > 0) {
    items.push({
      id: 'no-payment',
      message: `${noPayment.length} flat${noPayment.length > 1 ? 's have' : ' has'} no payment yet`,
      severity: 'high',
    })
  }
  const noStart = contracts.filter((c) => !c.start_date)
  if (noStart.length > 0) {
    items.push({
      id: 'no-start',
      message: `${noStart.length} contract${noStart.length > 1 ? 's have' : ' has'} no start date`,
      severity: 'normal',
    })
  }
  const missingOwner = contracts.filter((c) => !c.owner_name?.trim())
  if (missingOwner.length > 0) {
    const codes = missingOwner.map((c) => c.apartment_code).slice(0, 6)
    items.push({
      id: 'missing-owner',
      message: `${missingOwner.length} flat${missingOwner.length > 1 ? 's' : ''} missing owner name`,
      detail: codes.join(', ') + (missingOwner.length > codes.length ? '…' : ''),
      severity: 'normal',
    })
  }
  const missingMobile = contracts.filter((c) => !c.mobile?.trim())
  if (missingMobile.length > 0) {
    items.push({
      id: 'missing-mobile',
      message: `${missingMobile.length} flat${missingMobile.length > 1 ? 's' : ''} missing mobile number`,
      severity: 'normal',
    })
  }
  const expiring = contracts.filter((c) => c.expiry_alert === 'Expiring Soon' || c.expiry_alert === 'Expired')
  if (expiring.length > 0) {
    items.push({
      id: 'expiry',
      message: `${expiring.length} contract${expiring.length > 1 ? 's' : ''} expired or expiring soon`,
      severity: 'high',
    })
  }
  return items
}

export function buildApartmentCode(tower: number, flatNo: string) {
  const flat = flatNo.trim().replace(/^0+/, '') || '0'
  const padded = flat.padStart(4, '0')
  return `AUG0${tower}${padded}`
}
