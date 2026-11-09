import type { VrvExpiryAlert, VrvPaymentStatus } from '../../lib/vrv/types'

export function PaymentStatusBadge({ status }: { status: VrvPaymentStatus }) {
  const cls =
    status === 'Paid' ? 'badge-ok' : status === 'Partial' ? 'badge-warn' : 'badge-muted'
  return <span className={`vrv-badge ${cls}`}>{status}</span>
}

export function ExpiryBadge({ alert }: { alert: VrvExpiryAlert }) {
  const cls =
    alert === 'Expired'
      ? 'badge-err'
      : alert === 'Expiring Soon'
        ? 'badge-warn'
        : alert === 'Active'
          ? 'badge-ok'
          : 'badge-muted'
  return <span className={`vrv-badge ${cls}`}>{alert}</span>
}
