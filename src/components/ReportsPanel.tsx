import type { Alert, Driver, Flat, Lease, Maid, MaintenanceDue, NocCharge, RfidCard, SecurityStaff, Vehicle } from '../lib/types'

type Props = {
  flats: Flat[]
  leases: Lease[]
  vehicles: Vehicle[]
  rfids: RfidCard[]
  drivers: Driver[]
  maids: Maid[]
  security: SecurityStaff[]
  dues: MaintenanceDue[]
  noc: NocCharge[]
  alerts: Alert[]
}

export function ReportsPanel({ flats, leases, vehicles, rfids, drivers, maids, security, dues, noc, alerts }: Props) {
  const expiringLeases = leases.filter((l) => l.status === 'active')
  const activeRfid = rfids.filter((r) => r.status === 'active')

  return (
    <div className="reports-panel">
      <p className="form-hint">BRD §13 — Society-wide reports (admin only).</p>

      <div className="reports-grid">
        <div className="card-section">
          <h3>Flat Master Summary</h3>
          <p><strong>{flats.length}</strong> flats registered</p>
          <div className="table-wrap table-compact">
            <table>
              <thead><tr><th>Apartment</th><th>Owner</th><th>Status</th></tr></thead>
              <tbody>{flats.slice(0, 8).map((f) => (
                <tr key={f.id}><td>{f.apartment_no}</td><td>{f.owner_name || '—'}</td><td>{f.occupancy_status || '—'}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="card-section">
          <h3>Lease Expiry Report</h3>
          <div className="table-wrap table-compact">
            <table>
              <thead><tr><th>Apartment</th><th>Tenant</th><th>End Date</th></tr></thead>
              <tbody>{expiringLeases.slice(0, 8).map((l) => (
                <tr key={l.id}><td>{l.apartment_no}</td><td>{l.tenant_name}</td><td>{l.lease_end}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="card-section">
          <h3>Vehicle & RFID Status</h3>
          <p>{vehicles.length} vehicles · {activeRfid.length} active RFID</p>
          <div className="table-wrap table-compact">
            <table>
              <thead><tr><th>Apartment</th><th>Vehicle</th><th>RFID</th><th>Status</th></tr></thead>
              <tbody>{rfids.slice(0, 8).map((r) => (
                <tr key={r.id}><td>{r.apartment_no}</td><td>{r.vehicle_no}</td><td>{r.rfid_no}</td><td>{r.status}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="card-section">
          <h3>Drivers</h3>
          <div className="table-wrap table-compact">
            <table>
              <thead><tr><th>Apartment</th><th>Name</th><th>Licence Till</th></tr></thead>
              <tbody>{drivers.slice(0, 6).map((d) => (
                <tr key={d.id}><td>{d.apartment_no}</td><td>{d.driver_name}</td><td>{d.licence_validity || '—'}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="card-section">
          <h3>Maid Report</h3>
          <div className="table-wrap table-compact">
            <table>
              <thead><tr><th>Apartment</th><th>Name</th><th>Type</th><th>Card</th></tr></thead>
              <tbody>{maids.slice(0, 8).map((m) => (
                <tr key={m.id}><td>{m.apartment_no}</td><td>{m.name}</td><td>{m.employment_type}</td><td>{m.card_number}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="card-section">
          <h3>Security & FMG</h3>
          <div className="table-wrap table-compact">
            <table>
              <thead><tr><th>Name</th><th>Type</th><th>Shift</th></tr></thead>
              <tbody>{security.slice(0, 8).map((s) => (
                <tr key={s.id}><td>{s.name}</td><td>{s.employee_type}</td><td>{s.shift}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="card-section">
          <h3>Dues & NOC Collection</h3>
          <p>Total pending dues: <strong>{dues.reduce((s, d) => s + (d.pending_amount ?? d.annual_amount - d.paid_amount), 0)}</strong></p>
          <div className="table-wrap table-compact">
            <table>
              <thead><tr><th>Apartment</th><th>NOC Tenant</th><th>Amount</th><th>Paid</th></tr></thead>
              <tbody>{noc.slice(0, 6).map((n) => (
                <tr key={n.id}><td>{n.apartment_no}</td><td>{n.tenant_name}</td><td>{n.amount}</td><td>{n.paid ? 'Yes' : 'No'}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card-section" style={{ marginTop: '1rem' }}>
        <h3>Alerts (BRD §12)</h3>
        <div className="table-wrap table-compact">
          <table>
            <thead><tr><th>Apartment</th><th>Type</th><th>Message</th><th>Due Date</th></tr></thead>
            <tbody>{alerts.length === 0 ? <tr><td colSpan={4} className="empty">No upcoming alerts.</td></tr> : alerts.map((a) => (
              <tr key={a.id}><td>{a.apartment_no || '—'}</td><td>{a.alert_type}</td><td>{a.message}</td><td>{a.due_date || '—'}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
