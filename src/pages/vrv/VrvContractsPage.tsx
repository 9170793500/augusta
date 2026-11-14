import { useCallback, useEffect, useMemo, useState } from 'react'
import { VrvLayout } from '../../components/vrv/VrvLayout'
import { RecordPaymentModal } from '../../components/vrv/RecordPaymentModal'
import { VrvContractModal, type VrvContractModalMode } from '../../components/vrv/VrvContractModal'
import { ExpiryBadge, PaymentStatusBadge } from '../../components/vrv/VrvBadges'
import { RowActionsMenu } from '../../components/RowActionsMenu'
import { fetchContractsWithComputed } from '../../lib/vrv/data'
import { formatInr, formatUiDate } from '../../lib/vrv/format'
import type { VrvContractComputed } from '../../lib/vrv/types'
import { VRV_DEFAULT_PERIOD } from '../../lib/vrv/types'

export function VrvContractsPage() {
  const [contracts, setContracts] = useState<VrvContractComputed[]>([])
  const [q, setQ] = useState('')
  const [tower, setTower] = useState<number | 'all'>('all')
  const [status, setStatus] = useState<string>('all')
  const [payOpen, setPayOpen] = useState(false)
  const [payId, setPayId] = useState<string>()
  const [toast, setToast] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<VrvContractModalMode | null>(null)
  const [activeContract, setActiveContract] = useState<VrvContractComputed | null>(null)

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

  function openModal(mode: VrvContractModalMode, contract: VrvContractComputed | null) {
    setModalMode(mode)
    setActiveContract(contract)
  }

  function closeModal() {
    setModalMode(null)
    setActiveContract(null)
  }

  return (
    <VrvLayout title="AMC Contracts">
      {toast && <div className="alert alert-ok">{toast}</div>}
      <div className="vrv-list-toolbar">
        <div className="vrv-list-toolbar-left">
          <input
            className="vrv-search-input"
            placeholder="Search flat / owner / mobile"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="vrv-filter-select"
            value={String(tower)}
            onChange={(e) => setTower(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">All towers</option>
            <option value="3">Tower 3</option>
            <option value="4">Tower 4</option>
            <option value="5">Tower 5</option>
          </select>
          <select className="vrv-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All status</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
        <button type="button" className="btn btn-primary btn-sm vrv-toolbar-add" onClick={() => openModal('add', null)}>
          + Add flat
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
              <th>Action</th>
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
                      <RowActionsMenu
                        onView={() => openModal('view', c)}
                        onEdit={() => openModal('edit', c)}
                        extra={[
                          {
                            label: 'Record payment',
                            onClick: () => {
                              setPayId(c.id)
                              setPayOpen(true)
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {modalMode && (
        <VrvContractModal
          mode={modalMode}
          contract={activeContract}
          onClose={closeModal}
          onSaved={(msg) => {
            setToast(msg)
            void load()
          }}
          onRecordPayment={(id) => {
            setPayId(id)
            setPayOpen(true)
          }}
        />
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