import { useEffect, useState, type FormEvent } from 'react'
import { FormModal } from '../FormModal'
import { recordPayment } from '../../lib/vrv/data'
import { formatInr } from '../../lib/vrv/format'
import type { VrvContractComputed, VrvPaymentMode } from '../../lib/vrv/types'
import { VRV_PAYMENT_MODES } from '../../lib/vrv/types'

type Props = {
  open: boolean
  onClose: () => void
  contracts: VrvContractComputed[]
  preselectedId?: string
  onSaved: (message: string) => void
}

export function RecordPaymentModal({ open, onClose, contracts, preselectedId, onSaved }: Props) {
  const [contractId, setContractId] = useState(preselectedId ?? '')
  const [amount, setAmount] = useState('')
  const [payment_date, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [mode, setMode] = useState<VrvPaymentMode>('UPI')
  const [reference_no, setReferenceNo] = useState('')
  const [cheque_date, setChequeDate] = useState('')
  const [received_by, setReceivedBy] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open && preselectedId) setContractId(preselectedId)
  }, [open, preselectedId])

  if (!open) return null

  const selected = contracts.find((c) => c.id === contractId)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!contractId) return setError('Select an apartment')
    const amt = Math.round(Number(amount))
    if (!amt || amt <= 0) return setError('Enter a valid amount')
    setBusy(true)
    setError(null)
    try {
      await recordPayment({
        contract_id: contractId,
        payment_date,
        amount: amt,
        mode,
        reference_no: reference_no || undefined,
        cheque_date: mode === 'Cheque' && cheque_date ? cheque_date : undefined,
        received_by: received_by || undefined,
        remarks: remarks || undefined,
      })
      const apt = selected?.apartment_code ?? 'flat'
      const newBal = Math.max(0, (selected?.balance ?? 0) - amt)
      onSaved(`${formatInr(amt)} received from ${apt} — balance ${formatInr(newBal)}`)
      onClose()
      setAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormModal title="Record payment" onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="field">
          <label>Apartment</label>
          <select value={contractId} onChange={(e) => setContractId(e.target.value)} required>
            <option value="">Select…</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.apartment_code} — {c.owner_name || 'Owner TBD'} (bal {formatInr(c.balance)})
              </option>
            ))}
          </select>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Amount (₹)</label>
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            {selected && Number(amount) > selected.balance && (
              <p className="form-hint">Amount exceeds balance ({formatInr(selected.balance)}); you can still save.</p>
            )}
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={payment_date} onChange={(e) => setPaymentDate(e.target.value)} required />
          </div>
          <div className="field">
            <label>Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as VrvPaymentMode)}>
              {VRV_PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Reference no.</label>
            <input value={reference_no} onChange={(e) => setReferenceNo(e.target.value)} />
          </div>
          {mode === 'Cheque' && (
            <div className="field">
              <label>Cheque date</label>
              <input type="date" value={cheque_date} onChange={(e) => setChequeDate(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label>Received by</label>
            <input value={received_by} onChange={(e) => setReceivedBy(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Remarks</label>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save payment'}
          </button>
        </div>
      </form>
    </FormModal>
  )
}
