import { supabase } from '../supabase'
import { computeContract, computeSummary } from './compute'
import type {
  VrvAmcContract,
  VrvCashbookEntry,
  VrvContractComputed,
  VrvMaterial,
  VrvPayment,
  VrvSalaryPayment,
  VrvSummary,
} from './types'

export async function fetchVrvSettings() {
  const { data, error } = await supabase.from('vrv_settings').select('opening_balance').eq('id', 1).maybeSingle()
  if (error) throw error
  return data?.opening_balance ?? 0
}

export async function updateOpeningBalance(opening_balance: number) {
  const { error } = await supabase.from('vrv_settings').upsert({ id: 1, opening_balance } as never)
  if (error) throw error
}

export async function fetchContracts(period: string, tower?: number | 'all'): Promise<VrvAmcContract[]> {
  let q = supabase
    .from('vrv_amc_contracts')
    .select('*')
    .eq('period_label', period)
    .is('deleted_at', null)
    .order('apartment_code')
  if (tower && tower !== 'all') q = q.eq('tower', tower)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as VrvAmcContract[]
}

export async function fetchPaymentsForContracts(contractIds: string[]): Promise<VrvPayment[]> {
  if (contractIds.length === 0) return []
  const { data, error } = await supabase
    .from('vrv_payments')
    .select('*')
    .in('contract_id', contractIds)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as VrvPayment[]
}

export async function fetchContractForApartment(
  apartmentCode: string,
  period: string
): Promise<VrvContractComputed | null> {
  const { data, error } = await supabase
    .from('vrv_amc_contracts')
    .select('*')
    .eq('apartment_code', apartmentCode.trim().toUpperCase())
    .eq('period_label', period)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const payments = await fetchPaymentsForContracts([(data as VrvAmcContract).id])
  return computeContract(data as VrvAmcContract, payments)
}

export async function fetchContractsWithComputed(
  period: string,
  tower?: number | 'all'
): Promise<VrvContractComputed[]> {
  const contracts = await fetchContracts(period, tower)
  const ids = contracts.map((c) => c.id)
  const payments = await fetchPaymentsForContracts(ids)
  const byContract = new Map<string, VrvPayment[]>()
  payments.forEach((p) => {
    const list = byContract.get(p.contract_id) ?? []
    list.push(p)
    byContract.set(p.contract_id, list)
  })
  return contracts.map((c) => computeContract(c, byContract.get(c.id) ?? []))
}

export async function fetchAllPayments(limit?: number) {
  const { data: contracts } = await supabase
    .from('vrv_amc_contracts')
    .select('id, apartment_code, owner_name, period_label')
    .is('deleted_at', null)
  const contractMap = new Map((contracts ?? []).map((c) => [c.id, c]))
  let q = supabase
    .from('vrv_payments')
    .select('*')
    .is('deleted_at', null)
    .order('payment_date', { ascending: false })
  if (limit) q = q.limit(limit)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((p) => ({
    ...(p as VrvPayment),
    contract: contractMap.get((p as VrvPayment).contract_id),
  }))
}

export async function fetchSalary() {
  const { data, error } = await supabase
    .from('vrv_salary_payments')
    .select('*')
    .is('deleted_at', null)
    .order('salary_month', { ascending: false })
  if (error) throw error
  return (data ?? []) as VrvSalaryPayment[]
}

export async function fetchMaterials() {
  const { data, error } = await supabase
    .from('vrv_materials')
    .select('*')
    .is('deleted_at', null)
    .order('purchase_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as VrvMaterial[]
}

export async function fetchCashbook() {
  const { data, error } = await supabase
    .from('vrv_cashbook')
    .select('*')
    .is('deleted_at', null)
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []) as VrvCashbookEntry[]
}

export async function fetchVrvSummary(period: string, tower?: number | 'all'): Promise<VrvSummary> {
  const [contracts, materials, salary, cashbook, openingBalance] = await Promise.all([
    fetchContractsWithComputed(period, tower),
    fetchMaterials(),
    fetchSalary(),
    fetchCashbook(),
    fetchVrvSettings(),
  ])
  return computeSummary({ period, contracts, materials, salary, cashbook, openingBalance })
}

export async function recordPayment(input: {
  contract_id: string
  payment_date: string
  amount: number
  mode: VrvPayment['mode']
  reference_no?: string
  cheque_date?: string
  received_by?: string
  remarks?: string
}) {
  const { error } = await supabase.from('vrv_payments').insert(input as never)
  if (error) throw error
}

export async function upsertContract(row: Partial<VrvAmcContract> & { apartment_code: string; period_label: string }) {
  const { error } = await supabase.from('vrv_amc_contracts').upsert(row as never, {
    onConflict: 'apartment_code,period_label',
  })
  if (error) throw error
}
