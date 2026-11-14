import { useEffect, useState, type FormEvent } from 'react'
import { FormModal } from '../FormModal'
import { ExpiryBadge, PaymentStatusBadge } from './VrvBadges'
import { buildApartmentCode } from '../../lib/vrv/compute'
import { formatInr, formatUiDate } from '../../lib/vrv/format'
import { upsertContract } from '../../lib/vrv/data'
import type { VrvContractComputed } from '../../lib/vrv/types'
import { VRV_DEFAULT_ANNUAL_AMOUNT, VRV_DEFAULT_PERIOD } from '../../lib/vrv/types'
import { supabase } from '../../lib/supabase'

export type VrvContractModalMode = 'add' | 'view' | 'edit'

type Props = {
  mode: VrvContractModalMode
  contract: VrvContractComputed | null
  onClose: () => void
  onSaved: (message: string) => void
  onRecordPayment?: (contractId: string) => void
}

export function VrvContractModal({ mode, contract, onClose, onSaved, onRecordPayment }: Props) {
  const readOnly = mode === 'view'
  const period = contract?.period_label ?? VRV_DEFAULT_PERIOD
  const [tower, setTower] = useState(contract?.tower ?? 3)
  const [flatNo, setFlatNo] = useState(contract?.flat_no ?? '')
  const [ownerName, setOwnerName] = useState(contract?.owner_name ?? '')
  const [mobile, setMobile] = useState(contract?.mobile ?? '')
  const [annualAmount, setAnnualAmount] = useState(String(contract?.annual_amount ?? VRV_DEFAULT_ANNUAL_AMOUNT))
  const [startDate, setStartDate] = useState(contract?.start_date ?? '')
  const [remarks, setRemarks] = useState(contract?.remarks ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (mode !== 'add' || !flatNo.trim()) return
    const code = buildApartmentCode(tower, flatNo)
    let cancelled = false
    supabase
      .from('flats')
      .select('owner_name, owner_phone')
      .eq('apartment_no', code)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return
        const flat = data as { owner_name?: string; owner_phone?: string }
        setOwnerName((prev) => prev.trim() || flat.owner_name || '')
        setMobile((prev) => prev.trim() || flat.owner_phone || '')
      })
    return () => {
      cancelled = true
    }
  }, [tower, flatNo, mode])

  const title =
    mode === 'add' ? 'Add flat to AMC' : mode === 'edit' ? 'Edit AMC contract' : 'View AMC contract'

  const apartmentCode =
    mode === 'add' ? (flatNo.trim() ? buildApartmentCode(tower, flatNo) : null) : contract?.apartment_code ?? null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    setError(null)
    const amount = Math.round(Number(annualAmount))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Annual amount must be greater than zero.')
      return
    }
    if (!flatNo.trim()) {
      setError('Flat no. is required.')
      return
    }
    const apartment_code = buildApartmentCode(tower, flatNo)
    setSaving(true)
    try {
      await upsertContract({
        ...(contract?.id ? { id: contract.id } : {}),
        apartment_code,
        tower,
        flat_no: flatNo.trim(),
        period_label: period,
        annual_amount: amount,
        service: contract?.service ?? 'VRV Service & Repair',
        start_date: startDate || null,
        owner_name: ownerName.trim() || null,
        mobile: mobile.trim() || null,
        remarks: remarks.trim() || null,
      })
      onSaved(mode === 'add' ? `Added ${apartment_code}` : `Updated ${apartment_code}`)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
    setSaving(false)
  }

  const flatLocked = readOnly || mode === 'edit'

  return (
    <FormModal title={title} onClose={onClose}>
      <div className="vrv-contract-summary">
        <span className="vrv-contract-chip">AMC {period}</span>
        {apartmentCode ? (
          <span className="vrv-contract-chip vrv-contract-chip-strong">{apartmentCode}</span>
        ) : (
          <span className="form-hint">Enter tower and flat to generate apartment code</span>
        )}
      </div>

      {mode === 'view' && contract && (
        <div className="vrv-contract-view-meta">
          <span>
            <PaymentStatusBadge status={contract.payment_status} /> <ExpiryBadge alert={contract.expiry_alert} />
          </span>
          <span className="form-hint">
            Received {formatInr(contract.total_received)} · Balance {formatInr(contract.balance)}
            {contract.expiry_date ? ` · Expiry ${formatUiDate(contract.expiry_date)}` : ''}
          </span>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={onSubmit} className="vrv-contract-form">
        <section className="vrv-form-section">
          <h4 className="vrv-form-section-title">Flat</h4>
          <div className="vrv-form-section-grid">
            <div className="field">
              <label>Tower</label>
              <select disabled={flatLocked} value={tower} onChange={(e) => setTower(Number(e.target.value))}>
                <option value={3}>Tower 3</option>
                <option value={4}>Tower 4</option>
                <option value={5}>Tower 5</option>
              </select>
            </div>
            <div className="field">
              <label>Flat no.</label>
              <input
                disabled={flatLocked}
                required={!readOnly}
                value={flatNo}
                onChange={(e) => setFlatNo(e.target.value)}
                placeholder="e.g. 405"
              />
            </div>
          </div>
        </section>

        <section className="vrv-form-section">
          <h4 className="vrv-form-section-title">Owner</h4>
          <div className="vrv-form-section-grid">
            <div className="field">
              <label>Owner name</label>
              <input
                readOnly={readOnly}
                disabled={readOnly}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="field">
              <label>Mobile</label>
              <input
                readOnly={readOnly}
                disabled={readOnly}
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile"
                inputMode="tel"
              />
            </div>
          </div>
        </section>

        <section className="vrv-form-section">
          <h4 className="vrv-form-section-title">Contract</h4>
          <div className="vrv-form-section-grid">
            <div className="field">
              <label>Annual amount (₹)</label>
              <input
                type="number"
                min={1}
                step={1}
                readOnly={readOnly}
                disabled={readOnly}
                required={!readOnly}
                value={annualAmount}
                onChange={(e) => setAnnualAmount(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Start date</label>
              <input
                type="date"
                readOnly={readOnly}
                disabled={readOnly}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="vrv-form-section">
          <h4 className="vrv-form-section-title">Remarks</h4>
          <div className="field">
            <textarea
              readOnly={readOnly}
              disabled={readOnly}
              value={readOnly && !remarks ? '—' : remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Optional notes"
            />
          </div>
        </section>

        <div className="vrv-form-actions vrv-modal-actions">
          {mode === 'view' && contract && onRecordPayment && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                onRecordPayment(contract.id)
                onClose()
              }}
            >
              Record payment
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </form>
    </FormModal>
  )
}