export type VrvPaymentMode = 'Cash' | 'UPI' | 'Cheque' | 'Bank Transfer' | 'Credit'
export type VrvCashbookType = 'Income' | 'Expense'
export type VrvPaymentStatus = 'Paid' | 'Partial' | 'Pending'
export type VrvExpiryAlert = 'Not Started' | 'Active' | 'Expiring Soon' | 'Expired'

export type VrvAmcContract = {
  id: string
  apartment_code: string
  tower: number
  flat_no: string
  owner_name: string | null
  mobile: string | null
  service: string
  annual_amount: number
  period_label: string
  start_date: string | null
  preferred_payment_mode: VrvPaymentMode | null
  remarks: string | null
  legacy_id: string | null
  created_at: string
}

export type VrvPayment = {
  id: string
  contract_id: string
  payment_date: string
  amount: number
  mode: VrvPaymentMode
  reference_no: string | null
  cheque_date: string | null
  received_by: string | null
  remarks: string | null
  created_at: string
}

export type VrvSalaryPayment = {
  id: string
  employee_name: string
  role: string | null
  salary_month: string
  salary_due: number
  payment_date: string
  amount_paid: number
  mode: VrvPaymentMode
  reference_no: string | null
  paid_by: string | null
  remarks: string | null
  created_at: string
}

export type VrvMaterial = {
  id: string
  purchase_date: string
  material_name: string
  category: string | null
  qty: number
  unit: string
  rate: number
  paid_amount: number
  mode: VrvPaymentMode
  vendor: string | null
  bill_no: string | null
  bill_attachment: string | null
  created_at: string
}

export type VrvCashbookEntry = {
  id: string
  date: string
  type: VrvCashbookType
  description: string
  category: string | null
  amount: number
  mode: VrvPaymentMode
  reference: string | null
  created_at: string
}

export type VrvContractComputed = VrvAmcContract & {
  total_received: number
  balance: number
  payment_status: VrvPaymentStatus
  last_payment_date: string | null
  expiry_date: string | null
  expiry_alert: VrvExpiryAlert
  payments?: VrvPayment[]
}

export type VrvSummary = {
  period: string
  flatCount: number
  contractValue: number
  amcReceived: number
  amcOutstanding: number
  paidFlats: number
  partialFlats: number
  pendingFlats: number
  expiringSoon: number
  materialPurchaseTotal: number
  materialPaid: number
  vendorDues: number
  salaryPaid: number
  salaryPending: number
  otherIn: number
  otherOut: number
  openingBalance: number
  totalMoneyIn: number
  totalMoneyOut: number
  cashBalance: number
}

export const VRV_DEFAULT_PERIOD = '2026-2027'
export const VRV_DEFAULT_ANNUAL_AMOUNT = 35_000
export const VRV_PERIOD_OPTIONS = [VRV_DEFAULT_PERIOD] as const
export const VRV_PAYMENT_MODES: VrvPaymentMode[] = ['Cash', 'UPI', 'Cheque', 'Bank Transfer']
export const VRV_ALL_MODES: VrvPaymentMode[] = [...VRV_PAYMENT_MODES, 'Credit']
