import { useEffect, useState } from 'react'
import { fetchContractForApartment, fetchPaymentsForContracts } from '../../lib/vrv/data'
import { formatInr } from '../../lib/vrv/format'
import { VRV_DEFAULT_PERIOD } from '../../lib/vrv/types'
import type { VrvPayment } from '../../lib/vrv/types'
import { ExpiryBadge, PaymentStatusBadge } from './VrvBadges'

type Props = { apartmentCode: string }

export function VrvOwnerCard({ apartmentCode }: Props) {
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [contract, setContract] = useState<Awaited<ReturnType<typeof fetchContractForApartment>>>(null)
  const [payments, setPayments] = useState<VrvPayment[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMissing(false)
    fetchContractForApartment(apartmentCode, VRV_DEFAULT_PERIOD)
      .then(async (c) => {
        if (cancelled) return
        if (!c) {
          setMissing(true)
          setContract(null)
          setPayments([])
          return
        }
        setContract(c)
        const pays = await fetchPaymentsForContracts([c.id])
        if (!cancelled) setPayments(pays)
      })
      .catch(() => {
        if (!cancelled) {
          setMissing(true)
          setContract(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [apartmentCode])

  if (loading) {
    return (
      <section className="flat-section card-section">
        <h4>VRV AMC ({VRV_DEFAULT_PERIOD})</h4>
        <p className="form-hint">Loading contract…</p>
      </section>
    )
  }

  if (missing || !contract) {
    return (
      <section className="flat-section card-section">
        <h4>VRV AMC</h4>
        <p className="form-hint">No VRV contract on file for this flat in {VRV_DEFAULT_PERIOD}.</p>
      </section>
    )
  }

  return (
    <section className="flat-section card-section">
      <div className="flat-section-head">
        <h4>VRV AMC — {contract.period_label}</h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <PaymentStatusBadge status={contract.payment_status} />
          <ExpiryBadge alert={contract.expiry_alert} />
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label>Annual amount</label>
          <div>{formatInr(contract.annual_amount)}</div>
        </div>
        <div className="field">
          <label>Received</label>
          <div>{formatInr(contract.total_received)}</div>
        </div>
        <div className="field">
          <label>Balance</label>
          <div>
            <strong>{formatInr(contract.balance)}</strong>
          </div>
        </div>
        <div className="field">
          <label>Start / expiry</label>
          <div>
            {contract.start_date || '—'} → {contract.expiry_date || '—'}
          </div>
        </div>
      </div>
      {payments.length > 0 && (
        <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.payment_date}</td>
                  <td>{formatInr(p.amount)}</td>
                  <td>{p.mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
