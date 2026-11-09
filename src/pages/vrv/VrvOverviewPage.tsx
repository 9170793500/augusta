import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { VrvLayout } from '../../components/vrv/VrvLayout'
import { RecordPaymentModal } from '../../components/vrv/RecordPaymentModal'
import { ExpiryBadge, PaymentStatusBadge } from '../../components/vrv/VrvBadges'
import { fetchAllPayments, fetchContractsWithComputed, fetchVrvSummary } from '../../lib/vrv/data'
import { formatInr, formatUiDate } from '../../lib/vrv/format'
import type { VrvContractComputed, VrvSummary } from '../../lib/vrv/types'
import { VRV_DEFAULT_PERIOD } from '../../lib/vrv/types'

export function VrvOverviewPage() {
  const [period] = useState(VRV_DEFAULT_PERIOD)
  const [tower, setTower] = useState<number | 'all'>('all')
  const [summary, setSummary] = useState<VrvSummary | null>(null)
  const [contracts, setContracts] = useState<VrvContractComputed[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [recent, setRecent] = useState<Awaited<ReturnType<typeof fetchAllPayments>>>([])

  const load = useCallback(async () => {
    const [s, c, r] = await Promise.all([
      fetchVrvSummary(period, tower),
      fetchContractsWithComputed(period, tower),
      fetchAllPayments(5),
    ])
    setSummary(s)
    setContracts(c)
    setRecent(r)
  }, [period, tower])

  useEffect(() => {
    void load().catch((e) => console.error(e))
  }, [load])

  const attention = contracts.filter(
    (c) =>
      c.payment_status === 'Pending' ||
      c.expiry_alert === 'Expiring Soon' ||
      c.expiry_alert === 'Expired' ||
      !c.owner_name
  )

  return (
    <VrvLayout title="VRV Servicing">
      <div className="vrv-hero">
        <div>
          <h2>VRV Servicing — AMC {period}</h2>
          <p>Towers 3, 4 and 5 · {summary?.flatCount ?? '—'} flats under contract</p>
        </div>
        <div className="vrv-hero-actions">
          <button type="button" className="btn btn-primary" onClick={() => setPayOpen(true)}>
            + Record Payment
          </button>
          <Link to="/vrv/contracts" className="btn btn-ghost">
            + Add Flat
          </Link>
        </div>
      </div>
      {toast && <div className="alert alert-ok">{toast}</div>}
      <div className="filter-row">
        <label>
          Tower{' '}
          <select
            value={String(tower)}
            onChange={(e) => setTower(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">All</option>
            <option value="3">Tower 3</option>
            <option value="4">Tower 4</option>
            <option value="5">Tower 5</option>
          </select>
        </label>
      </div>
      {summary && (
        <>
          <div className="stats">
            <div className="stat">
              <span>Contract value</span>
              <strong>{formatInr(summary.contractValue)}</strong>
            </div>
            <div className="stat">
              <span>Received</span>
              <strong>{formatInr(summary.amcReceived)}</strong>
            </div>
            <div className="stat">
              <span>Outstanding</span>
              <strong>{formatInr(summary.amcOutstanding)}</strong>
            </div>
            <div className="stat stat-highlight">
              <span>Cash balance</span>
              <strong>{formatInr(summary.cashBalance)}</strong>
            </div>
          </div>
          <div className="stats">
            <div className="stat">
              <span>Paid flats</span>
              <strong>{summary.paidFlats}</strong>
            </div>
            <div className="stat">
              <span>Partial</span>
              <strong>{summary.partialFlats}</strong>
            </div>
            <div className="stat">
              <span>Pending</span>
              <strong>{summary.pendingFlats}</strong>
            </div>
            <div className="stat">
              <span>Expiring ≤30d</span>
              <strong>{summary.expiringSoon}</strong>
            </div>
          </div>
          <div className="vrv-cashflow">
            <div className="card-pane">
              <h3>Money in</h3>
              <ul className="vrv-line-list">
                <li>
                  <span>Opening</span>
                  <strong>{formatInr(summary.openingBalance)}</strong>
                </li>
                <li>
                  <span>AMC receipts</span>
                  <strong>{formatInr(summary.amcReceived)}</strong>
                </li>
                <li>
                  <span>Other in</span>
                  <strong>{formatInr(summary.otherIn)}</strong>
                </li>
              </ul>
              <p className="vrv-total">
                Total in <strong>{formatInr(summary.totalMoneyIn)}</strong>
              </p>
            </div>
            <div className="card-pane">
              <h3>Money out</h3>
              <ul className="vrv-line-list">
                <li>
                  <span>Salary paid</span>
                  <strong>{formatInr(summary.salaryPaid)}</strong>
                </li>
                <li>
                  <span>Material paid</span>
                  <strong>{formatInr(summary.materialPaid)}</strong>
                </li>
                <li>
                  <span>Other out</span>
                  <strong>{formatInr(summary.otherOut)}</strong>
                </li>
              </ul>
              <p className="vrv-total">
                Total out <strong>{formatInr(summary.totalMoneyOut)}</strong>
              </p>
            </div>
          </div>
        </>
      )}
      <div className="vrv-split">
        <div className="card-pane">
          <h3>Recent payments</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Flat</th>
                  <th>Amount</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty">
                      No records yet.
                    </td>
                  </tr>
                ) : (
                  recent.map((p) => (
                    <tr key={p.id}>
                      <td>{formatUiDate(p.payment_date)}</td>
                      <td>{p.contract?.apartment_code ?? '—'}</td>
                      <td>{formatInr(p.amount)}</td>
                      <td>{p.mode}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-pane">
          <h3>Needs attention</h3>
          <ul className="vrv-attn-list">
            {attention.length === 0 ? (
              <li className="empty">All clear.</li>
            ) : (
              attention.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <span>{c.apartment_code}</span>
                  <PaymentStatusBadge status={c.payment_status} /> <ExpiryBadge alert={c.expiry_alert} />
                  {!c.owner_name && <span className="form-hint"> Missing owner</span>}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      <RecordPaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        contracts={contracts}
        onSaved={(msg) => {
          setToast(msg)
          void load()
        }}
      />
    </VrvLayout>
  )
}
