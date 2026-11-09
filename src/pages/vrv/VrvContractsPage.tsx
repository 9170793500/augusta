import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { VrvLayout } from '../../components/vrv/VrvLayout'
import { RecordPaymentModal } from '../../components/vrv/RecordPaymentModal'
import { ExpiryBadge, PaymentStatusBadge } from '../../components/vrv/VrvBadges'
import { fetchContractsWithComputed, upsertContract } from '../../lib/vrv/data'
import { buildApartmentCode } from '../../lib/vrv/compute'
import { formatInr, formatUiDate } from '../../lib/vrv/format'
import type { VrvContractComputed } from '../../lib/vrv/types'
import { VRV_DEFAULT_PERIOD } from '../../lib/vrv/types'
import { supabase } from '../../lib/supabase'

export function VrvContractsPage() {
  const [contracts, setContracts] = useState<VrvContractComputed[]>([])
  const [q, setQ] = useState('')
  const [tower, setTower] = useState<number | 'all'>('all')
  const [status, setStatus] = useState<string>('all')
  const [payOpen, setPayOpen] = useState(false)
  const [payId, setPayId] = useState<string>()
  const [toast, setToast] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [towerIn, setTowerIn] = useState(3)
  const [flatNo, setFlatNo] = useState('')
  const [startDate, setStartDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const rows = await fetchContractsWithComputed(VRV_DEFAULT_PERIOD, 'all')
    setContracts(rows)
  }, [])

  useEffect(() => {
    void load().catch(console.error)
  }, [load])

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      if (tower !== 'all' && c.tower !== tower) return false
      if (status !== 'all' && c.payment_status !== status) return false
      if (!q.trim()) return true
      const hay = `${c.apartment_code} ${c.owner_name ?? ''} ${c.mobile ?? ''}`.toLowerCase()
      return hay.includes(q.trim().toLowerCase())
    })
  }, [contracts, q, tower, status])

  async function onAddFlat(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const apartment_code = buildApartmentCode(towerIn, flatNo)
    const { data: flat } = await supabase.from('flats').select('owner_name, owner_phone').eq('apartment_no', apartment_code).maybeSingle()
    try {
      await upsertContract({
        apartment_code,
        tower: towerIn,
        flat_no: flatNo.trim(),
        period_label: VRV_DEFAULT_PERIOD,
        annual_amount: 35000,
        service: 'VRV Service & Repair',
        start_date: startDate || null,
        owner_name: (flat as { owner_name?: string } | null)?.owner_name ?? null,
        mobile: (flat as { owner_phone?: string } | null)?.owner_phone ?? null,
      })
      setAddOpen(false)
      setFlatNo('')
      setToast(`Added ${apartment_code}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <VrvLayout title="AMC Contracts">
      {toast && <div className="alert alert-ok">{toast}</div>}
      <div className="toolbar-row">
        <input placeholder="Search flat / owner / mobile" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={String(tower)} onChange={(e) => setTower(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">All towers</option>
          <option value="3">Tower 3</option>
          <option value="4">Tower 4</option>
          <option value="5">Tower 5</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All status</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Pending">Pending</option>
        </select>
        <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
          + Add Flat
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Apartment</th>
              <th>Owner</th>
              <th>Annual</th>
              <th>Received</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Start → Expiry</th>
              <th>Alert</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty">
                  No records yet.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const pct = c.annual_amount ? Math.min(100, Math.round((c.total_received / c.annual_amount) * 100)) : 0
                return (
                  <tr key={c.id}>
                    <td>{c.apartment_code}</td>
                    <td>
                      {c.owner_name || '—'}
                      <br />
                      <span className="form-hint">{c.mobile || ''}</span>
                    </td>
                    <td>{formatInr(c.annual_amount)}</td>
                    <td>
                      {formatInr(c.total_received)}
                      <div className="vrv-progress" aria-hidden>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td>{formatInr(c.balance)}</td>
                    <td>
                      <PaymentStatusBadge status={c.payment_status} />
                    </td>
                    <td>
                      {formatUiDate(c.start_date)} → {formatUiDate(c.expiry_date)}
                    </td>
                    <td>
                      <ExpiryBadge alert={c.expiry_alert} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setPayId(c.id)
                          setPayOpen(true)
                        }}
                      >
                        Record payment
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {addOpen && (
        <div className="card-pane">
          <h3>Add flat to AMC</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={onAddFlat} className="form-grid">
            <div className="field">
              <label>Tower</label>
              <select value={towerIn} onChange={(e) => setTowerIn(Number(e.target.value))}>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
            <div className="field">
              <label>Flat no.</label>
              <input value={flatNo} onChange={(e) => setFlatNo(e.target.value)} required />
            </div>
            <div className="field">
              <label>Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="field form-actions-inline">
              <button type="submit" className="btn btn-primary">
                Save
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      <RecordPaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        contracts={contracts}
        preselectedId={payId}
        onSaved={(msg) => {
          setToast(msg)
          void load()
        }}
      />
    </VrvLayout>
  )
}
