import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { VrvLayout } from '../../components/vrv/VrvLayout'
import { RecordPaymentModal } from '../../components/vrv/RecordPaymentModal'
import { buildTowerCollection, buildVrvAttentionItems } from '../../lib/vrv/compute'
import { fetchAllPayments, fetchContractsWithComputed, fetchVrvSummary } from '../../lib/vrv/data'
import { formatInr, formatUiDate } from '../../lib/vrv/format'
import type { VrvContractComputed, VrvSummary } from '../../lib/vrv/types'
import { VRV_DEFAULT_PERIOD, VRV_PERIOD_OPTIONS } from '../../lib/vrv/types'

export default function VrvOverviewPage() {
  const [period, setPeriod] = useState(VRV_DEFAULT_PERIOD)
  const [tower, setTower] = useState<number | 'all'>('all')
  const [summary, setSummary] = useState<VrvSummary | null>(null)
  const [allContracts, setAllContracts] = useState<VrvContractComputed[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [recent, setRecent] = useState<Awaited<ReturnType<typeof fetchAllPayments>>>([])

  const load = useCallback(async () => {
    const [s, all, r] = await Promise.all([
      fetchVrvSummary(period, tower),
      fetchContractsWithComputed(period, 'all'),
      fetchAllPayments(8),
    ])
    setSummary(s)
    setAllContracts(all)
    setRecent(r.filter((p) => p.contract?.period_label === period))
  }, [period, tower])

  useEffect(() => {
    void load().catch((e) => console.error(e))
  }, [load])

  const towerCollection = useMemo(() => buildTowerCollection(allContracts), [allContracts])
  const attentionItems = useMemo(() => buildVrvAttentionItems(allContracts), [allContracts])

  const annualPerFlat = allContracts[0]?.annual_amount ?? 35_000
  const collectedPct =
    summary && summary.contractValue > 0
      ? Math.min(100, (summary.amcReceived / summary.contractValue) * 100)
      : 0

  const toolbar = (
    <div className="vrv-filter-group">
      <label>
        AMC period{' '}
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {VRV_PERIOD_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tower{' '}
        <select
          value={String(tower)}
          onChange={(e) => setTower(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value="all">All towers</option>
          <option value="3">Tower 3</option>
          <option value="4">Tower 4</option>
          <option value="5">Tower 5</option>
        </select>
      </label>
    </div>
  )

  return (
    <VrvLayout title="VRV Servicing" toolbar={toolbar}>
      <div className="vrv-hero">
        <div>
          <h2>
            AMC {period} · {allContracts[0]?.service ?? 'VRV Service & Repair'}
          </h2>
          <p>
            {summary?.flatCount ?? allContracts.length} flats under contract across Towers 3, 4 and 5 ·{' '}
            {formatInr(annualPerFlat)} per flat per year
          </p>
        </div>
        <div className="vrv-hero-actions">
          <button type="button" className="btn btn-primary" onClick={() => setPayOpen(true)}>
            + Record payment
          </button>
          <Link to="/vrv/contracts" className="btn btn-ghost">
            + Add flat
          </Link>
        </div>
      </div>
      {toast && <div className="alert alert-ok">{toast}</div>}

      {summary && (
        <>
          <div className="vrv-kpi-grid">
            <div className="vrv-kpi">
              <span className="vrv-kpi-label">Contract value</span>
              <strong className="vrv-kpi-value">{formatInr(summary.contractValue)}</strong>
              <span className="vrv-kpi-sub">
                {summary.flatCount} flats × {formatInr(annualPerFlat)}
              </span>
            </div>
            <div className="vrv-kpi">
              <span className="vrv-kpi-label">Received</span>
              <strong className="vrv-kpi-value">{formatInr(summary.amcReceived)}</strong>
              <span className="vrv-kpi-sub">{collectedPct.toFixed(1)}% collected</span>
              <div className="vrv-progress vrv-progress-kpi" aria-hidden>
                <span style={{ width: `${collectedPct}%` }} />
              </div>
            </div>
            <div className="vrv-kpi vrv-kpi-outstanding">
              <span className="vrv-kpi-label">Outstanding</span>
              <strong className="vrv-kpi-value">{formatInr(summary.amcOutstanding)}</strong>
              <span className="vrv-kpi-sub">From {summary.flatCount} flats</span>
            </div>
            <div className="vrv-kpi vrv-kpi-cash">
              <span className="vrv-kpi-label">Cash / bank balance</span>
              <strong className="vrv-kpi-value">{formatInr(summary.cashBalance)}</strong>
              <span className="vrv-kpi-sub">Money in − money out</span>
            </div>
          </div>

          <div className="vrv-status-pills">
            <div className="vrv-pill">
              <span className="vrv-dot vrv-dot-ok" aria-hidden />
              <strong>{summary.paidFlats}</strong>
              <span>Paid flats</span>
            </div>
            <div className="vrv-pill">
              <span className="vrv-dot vrv-dot-warn" aria-hidden />
              <strong>{summary.partialFlats}</strong>
              <span>Partial</span>
            </div>
            <div className="vrv-pill">
              <span className="vrv-dot vrv-dot-err" aria-hidden />
              <strong>{summary.pendingFlats}</strong>
              <span>Pending</span>
            </div>
            <div className="vrv-pill">
              <span className="vrv-dot vrv-dot-muted" aria-hidden />
              <strong>{summary.expiringSoon}</strong>
              <span>Expiring ≤ 30 days</span>
            </div>
          </div>

          <div className="vrv-cashflow">
            <div className="card-pane vrv-cashflow-pane">
              <h3>Cash flow</h3>
              <div className="vrv-cashflow-cols">
                <div>
                  <h4 className="vrv-section-tag">Money in</h4>
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
                <div>
                  <h4 className="vrv-section-tag">Money out</h4>
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
            </div>
            <div className="card-pane vrv-tower-pane">
              <h3>Collection by tower</h3>
              {towerCollection.map((row) => {
                const pct = row.contractValue > 0 ? Math.min(100, (row.received / row.contractValue) * 100) : 0
                return (
                  <div key={row.tower} className="vrv-tower-row">
                    <div className="vrv-tower-head">
                      <span>Tower {row.tower}</span>
                      <span>
                        {formatInr(row.received)} of {formatInr(row.contractValue)}
                      </span>
                    </div>
                    <div className="vrv-progress" aria-hidden>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
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
                  <th>Apartment</th>
                  <th>Owner</th>
                  <th>Mode</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      No records yet.
                    </td>
                  </tr>
                ) : (
                  recent.map((p) => (
                    <tr key={p.id}>
                      <td>{formatUiDate(p.payment_date)}</td>
                      <td>
                        <strong>{p.contract?.apartment_code ?? '—'}</strong>
                      </td>
                      <td>{p.contract?.owner_name ?? '—'}</td>
                      <td>{p.mode}</td>
                      <td>{formatInr(p.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-pane vrv-attn-pane">
          <h3>Needs attention</h3>
          <ul className="vrv-attn-list">
            {attentionItems.length === 0 ? (
              <li className="empty">All clear.</li>
            ) : (
              attentionItems.map((item) => (
                <li key={item.id} className={item.severity === 'high' ? 'vrv-attn-high' : undefined}>
                  <p className="vrv-attn-msg">{item.message}</p>
                  {item.detail ? <p className="vrv-attn-detail">{item.detail}</p> : null}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      <RecordPaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        contracts={allContracts}
        onSaved={(msg) => {
          setToast(msg)
          void load()
        }}
      />
    </VrvLayout>
  )
}
