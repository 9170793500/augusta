import { useEffect, useState, type FormEvent } from 'react'
import { VrvLayout } from '../../components/vrv/VrvLayout'
import { fetchAllPayments, fetchCashbook, fetchMaterials, fetchSalary, updateOpeningBalance } from '../../lib/vrv/data'
import { formatInr, formatUiDate } from '../../lib/vrv/format'
import { VRV_ALL_MODES, VRV_PAYMENT_MODES } from '../../lib/vrv/types'
import { supabase } from '../../lib/supabase'

export function VrvPaymentsPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchAllPayments>>>([])
  useEffect(() => {
    void fetchAllPayments().then(setRows).catch(console.error)
  }, [])
  const total = rows.reduce((s, r) => s + r.amount, 0)
  return (
    <VrvLayout title="Payments">
      <p className="form-hint">AMC flat receipts (tower, flat, owner via contract).</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Apartment</th>
              <th>Owner</th>
              <th>Amount</th>
              <th>Mode</th>
              <th>Ref</th>
              <th>Received by</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">
                  No records yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatUiDate(r.payment_date)}</td>
                  <td>{r.contract?.apartment_code ?? '—'}</td>
                  <td>{r.contract?.owner_name ?? '—'}</td>
                  <td>{formatInr(r.amount)}</td>
                  <td>{r.mode}</td>
                  <td>{r.reference_no || '—'}</td>
                  <td>{r.received_by || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>
                <strong>Total</strong>
              </td>
              <td colSpan={4}>
                <strong>{formatInr(total)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </VrvLayout>
  )
}

export function VrvSalaryPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchSalary>>>([])
  const [form, setForm] = useState({
    employee_name: '',
    salary_month: new Date().toISOString().slice(0, 7) + '-01',
    salary_due: '',
    amount_paid: '',
    payment_date: new Date().toISOString().slice(0, 10),
    mode: 'UPI',
  })
  const load = () => void fetchSalary().then(setRows).catch(console.error)
  useEffect(() => {
    load()
  }, [])
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await supabase.from('vrv_salary_payments').insert({
      employee_name: form.employee_name.trim(),
      salary_month: form.salary_month,
      salary_due: Number(form.salary_due),
      amount_paid: Number(form.amount_paid),
      payment_date: form.payment_date,
      mode: form.mode,
    } as never)
    load()
  }
  return (
    <VrvLayout title="Staff Salary">
      <form onSubmit={onSubmit} className="form-grid card-pane">
        <div className="field">
          <label>Employee</label>
          <input value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} required />
        </div>
        <div className="field">
          <label>Month</label>
          <input type="month" value={form.salary_month.slice(0, 7)} onChange={(e) => setForm({ ...form, salary_month: `${e.target.value}-01` })} />
        </div>
        <div className="field">
          <label>Salary due (₹)</label>
          <input type="number" value={form.salary_due} onChange={(e) => setForm({ ...form, salary_due: e.target.value })} required />
        </div>
        <div className="field">
          <label>Amount paid (₹)</label>
          <input type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} required />
        </div>
        <div className="field">
          <label>Payment date</label>
          <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
        </div>
        <div className="field">
          <label>Mode</label>
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            {VRV_PAYMENT_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <button type="submit" className="btn btn-primary">
            Pay salary
          </button>
        </div>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Employee</th>
              <th>Due</th>
              <th>Paid</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatUiDate(r.salary_month)}</td>
                <td>{r.employee_name}</td>
                <td>{formatInr(r.salary_due)}</td>
                <td>{formatInr(r.amount_paid)}</td>
                <td>{formatUiDate(r.payment_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VrvLayout>
  )
}

export function VrvMaterialsPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchMaterials>>>([])
  const [form, setForm] = useState({
    purchase_date: new Date().toISOString().slice(0, 10),
    material_name: '',
    qty: '1',
    unit: 'pcs',
    rate: '',
    paid_amount: '',
    mode: 'Cash',
    vendor: '',
  })
  const load = () => void fetchMaterials().then(setRows).catch(console.error)
  useEffect(() => {
    load()
  }, [])
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await supabase.from('vrv_materials').insert({
      ...form,
      qty: Number(form.qty),
      rate: Number(form.rate),
      paid_amount: Number(form.paid_amount),
    } as never)
    load()
  }
  const purchaseTotal = rows.reduce((s, m) => s + Math.round(m.qty * m.rate), 0)
  const paidTotal = rows.reduce((s, m) => s + m.paid_amount, 0)
  return (
    <VrvLayout title="Materials">
      <form onSubmit={onSubmit} className="form-grid card-pane">
        <div className="field">
          <label>Date</label>
          <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
        </div>
        <div className="field">
          <label>Material</label>
          <input value={form.material_name} onChange={(e) => setForm({ ...form, material_name: e.target.value })} required />
        </div>
        <div className="field">
          <label>Qty × unit</label>
          <input type="number" step="0.001" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        </div>
        <div className="field">
          <label>Rate (₹)</label>
          <input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
        </div>
        <div className="field">
          <label>Paid (₹)</label>
          <input type="number" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} />
        </div>
        <div className="field">
          <label>Mode</label>
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            {VRV_ALL_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Vendor</label>
          <input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
        </div>
        <button type="submit" className="btn btn-primary">
          Add purchase
        </button>
      </form>
      <p className="form-hint">
        Purchase {formatInr(purchaseTotal)} · Paid {formatInr(paidTotal)} · Vendor due {formatInr(purchaseTotal - paidTotal)}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Material</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Vendor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatUiDate(r.purchase_date)}</td>
                <td>
                  {r.material_name} ({r.qty} {r.unit})
                </td>
                <td>{formatInr(Math.round(r.qty * r.rate))}</td>
                <td>{formatInr(r.paid_amount)}</td>
                <td>{r.vendor || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VrvLayout>
  )
}

export function VrvCashbookPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchCashbook>>>([])
  const [opening, setOpening] = useState(0)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'Income' as 'Income' | 'Expense',
    description: '',
    amount: '',
    mode: 'Cash',
  })
  const load = async () => {
    const [cb, ob] = await Promise.all([fetchCashbook(), import('../../lib/vrv/data').then((m) => m.fetchVrvSettings())])
    setRows(cb)
    setOpening(ob)
  }
  useEffect(() => {
    void load()
  }, [])
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await supabase.from('vrv_cashbook').insert({
      ...form,
      amount: Number(form.amount),
    } as never)
    void load()
  }
  return (
    <VrvLayout title="Cashbook">
      <p className="form-hint">
        Flat payments, salary and material purchases are recorded on their own pages — don&apos;t enter them here again.
      </p>
      <div className="stat-card">
        <span>Opening balance</span>
        <strong>{formatInr(opening)}</strong>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            const v = window.prompt('Opening balance (₹)', String(opening))
            if (v != null) void updateOpeningBalance(Number(v)).then(load)
          }}
        >
          Edit
        </button>
      </div>
      <form onSubmit={onSubmit} className="form-grid card-pane">
        <div className="field">
          <label>Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'Income' | 'Expense' })}>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </select>
        </div>
        <div className="field">
          <label>Description</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div className="field">
          <label>Amount (₹)</label>
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div className="field">
          <label>Mode</label>
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            {VRV_PAYMENT_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Add entry
        </button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>In</th>
              <th>Out</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatUiDate(r.date)}</td>
                <td>{r.type}</td>
                <td>{r.description}</td>
                <td>{r.type === 'Income' ? formatInr(r.amount) : '—'}</td>
                <td>{r.type === 'Expense' ? formatInr(r.amount) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VrvLayout>
  )
}
