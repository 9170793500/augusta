import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type {
  Alert,
  Driver,
  Flat,
  KycDocument,
  Lease,
  Maid,
  MaintenanceDue,
  NocCharge,
  ParkingAmenity,
  RfidCard,
  SecurityStaff,
  TabId,
  Vehicle,
} from '../lib/types'
import { RfidForm } from '../components/RfidForm'
import { DriverForm } from '../components/DriverForm'
import { MaidForm } from '../components/MaidForm'
import { SecurityForm } from '../components/SecurityForm'
import { OwnerPanel, OwnerTable } from '../components/OwnerPanel'
import { ResidentPanel, ResidentsTable } from '../components/ResidentPanel'
import { dedupeFlatResidents } from '../lib/residentUtils'
import { syncAllResidentsKyc } from '../lib/kycSync'
import { invalidateApartmentSuggestions } from '../lib/apartmentSuggestions'
import {
  roleScopeOpts,
  scopeByApartment,
  scopeDocumentsForRole,
  scopeHouseholdForRole,
  scopeLeasesForRole,
  scopeNocForRole,
  scopeResidentsForRole,
} from '../lib/apartmentScope'
import type { FlatResidentRow } from '../components/FlatResidentsForm'
import { LeaseForm, LeaseTable } from '../components/LeaseForm'
import { VehicleForm, VehicleTable } from '../components/VehicleForm'
import {
  ParkingForm,
  ParkingTable,
  DuesForm,
  DuesTable,
  NocForm,
  NocTable,
} from '../components/FinanceForms'
import { DocumentsForm, DocumentsTable } from '../components/DocumentsForm'
import { ReportsPanel } from '../components/ReportsPanel'
import { OverviewNoticesAdmin } from '../components/NotificationsPanel'
import { AdminUsersPanel } from '../components/AdminUsersPanel'
import { EditRecordModal, type EditTarget } from '../components/EditRecordModal'
import { FormModal } from '../components/FormModal'
import { DashboardLayout } from '../components/DashboardLayout'

const ADMIN_TABS: TabId[] = ['security', 'users', 'reports', 'documents', 'noc', 'notices']
const SPLIT_TABS: TabId[] = [
  'owner',
  'residents',
  'leases',
  'vehicles',
  'rfid',
  'driver',
  'maid',
  'security',
  'parking',
  'dues',
  'noc',
  'documents',
]

const FORM_TABS: TabId[] = SPLIT_TABS

const FORM_LABELS: Partial<Record<TabId, string>> = {
  owner: 'Owner',
  residents: 'Resident',
  leases: 'Lease',
  vehicles: 'Vehicle',
  rfid: 'Vehicle RFID',
  driver: 'Driver',
  maid: 'Maid',
  security: 'Security Staff',
  parking: 'Parking & Gym',
  dues: 'Maintenance Due',
  noc: 'NOC Charge',
  documents: 'KYC Document',
}

function formModalTitle(tab: TabId, isEdit: boolean) {
  const label = FORM_LABELS[tab] || 'Record'
  return isEdit ? `Edit ${label}` : `Add ${label}`
}

export function DashboardPage() {
  const { profile, isAdmin, isOwner, isTenant, apartmentNo } = useAuth()
  const lockApartment = !isAdmin
  const [tab, setTab] = useState<TabId>('overview')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const [flats, setFlats] = useState<Flat[]>([])
  const [flatResidents, setFlatResidents] = useState<FlatResidentRow[]>([])
  const [selectedFlat, setSelectedFlat] = useState<string | null>(null)
  const [editingResidentId, setEditingResidentId] = useState<string | null>(null)
  const [leases, setLeases] = useState<Lease[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [rfids, setRfids] = useState<RfidCard[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [maids, setMaids] = useState<Maid[]>([])
  const [security, setSecurity] = useState<SecurityStaff[]>([])
  const [parking, setParking] = useState<ParkingAmenity[]>([])
  const [dues, setDues] = useState<MaintenanceDue[]>([])
  const [noc, setNoc] = useState<NocCharge[]>([])
  const [documents, setDocuments] = useState<KycDocument[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

  const refresh = useCallback(async () => {
    setBusy(true)
    invalidateApartmentSuggestions()
    const apt = apartmentNo?.trim().toUpperCase()
    const scoped = !isAdmin && !!apt

    const qFlats = scoped
      ? supabase.from('flats').select('*').eq('apartment_no', apt)
      : supabase.from('flats').select('*').order('apartment_no')
    const qResidents = scoped
      ? supabase.from('flat_residents').select('*, resident:resident_master(*)').eq('apartment_no', apt)
      : supabase.from('flat_residents').select('*, resident:resident_master(*)').order('apartment_no')
    const qLeases = scoped
      ? supabase.from('leases').select('*').eq('apartment_no', apt).order('lease_end', { ascending: false })
      : supabase.from('leases').select('*').order('lease_end', { ascending: false })
    const qVehicles = scoped
      ? supabase.from('vehicles').select('*').eq('apartment_no', apt).order('created_at', { ascending: false })
      : supabase.from('vehicles').select('*').order('created_at', { ascending: false })
    const qRfids = scoped
      ? supabase.from('rfid_cards').select('*').eq('apartment_no', apt).order('created_at', { ascending: false })
      : supabase.from('rfid_cards').select('*').order('created_at', { ascending: false })
    const qDrivers = scoped
      ? supabase.from('drivers').select('*').eq('apartment_no', apt).order('created_at', { ascending: false })
      : supabase.from('drivers').select('*').order('created_at', { ascending: false })
    const qMaids = scoped
      ? supabase.from('maids').select('*').eq('apartment_no', apt).order('created_at', { ascending: false })
      : supabase.from('maids').select('*').order('created_at', { ascending: false })
    const qParking = scoped
      ? supabase.from('parking_amenities').select('*').eq('apartment_no', apt)
      : supabase.from('parking_amenities').select('*').order('apartment_no')
    const qDues = scoped
      ? supabase.from('maintenance_dues').select('*').eq('apartment_no', apt).order('year', { ascending: false })
      : supabase.from('maintenance_dues').select('*').order('year', { ascending: false })
    const qNoc = isAdmin
      ? scoped
        ? supabase.from('noc_charges').select('*').eq('apartment_no', apt).order('created_at', { ascending: false })
        : supabase.from('noc_charges').select('*').order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as NocCharge[], error: null })
    const qDocs = scoped
      ? supabase.from('kyc_documents').select('*').eq('apartment_no', apt).order('created_at', { ascending: false })
      : supabase.from('kyc_documents').select('*').order('created_at', { ascending: false })
    const qAlerts = scoped
      ? supabase.from('alerts').select('*').eq('apartment_no', apt).order('due_date')
      : supabase.from('alerts').select('*').order('due_date')

    const results = await Promise.all([
      qFlats,
      qResidents,
      qLeases,
      qVehicles,
      qRfids,
      qDrivers,
      qMaids,
      qParking,
      qDues,
      qNoc,
      qDocs,
      qAlerts,
    ])
    const [fRes, frRes, lRes, vRes, rRes, dRes, mRes, pRes, duesRes, nocRes, docRes, alertRes] = results

    if (fRes.data) setFlats(fRes.data)
    const residentRows = (frRes.data || []) as FlatResidentRow[]
    if (frRes.data) setFlatResidents(residentRows)
    if (lRes.data) setLeases(lRes.data)
    if (vRes.data) setVehicles(vRes.data)
    if (rRes.data) setRfids(rRes.data)
    if (dRes.data) setDrivers(dRes.data)
    if (mRes.data) setMaids(mRes.data)
    if (pRes.data) setParking(pRes.data)
    if (duesRes.data) setDues(duesRes.data)
    if (nocRes.data) setNoc(nocRes.data)
    if (isAdmin && residentRows.length > 0) {
      try {
        await syncAllResidentsKyc(residentRows)
        const { data: syncedDocs } = await supabase
          .from('kyc_documents')
          .select('*')
          .order('created_at', { ascending: false })
        if (syncedDocs) setDocuments(syncedDocs)
      } catch {
        if (docRes.data) setDocuments(docRes.data)
      }
    } else if (docRes.data) {
      setDocuments(docRes.data)
    }
    if (alertRes.data) setAlerts(alertRes.data)

    if (isAdmin) {
      const { data } = await supabase
        .from('security_staff')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setSecurity(data)
    } else {
      setSecurity([])
    }
    setBusy(false)
  }, [isAdmin, apartmentNo])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!isAdmin && ADMIN_TABS.includes(tab)) setTab('overview')
    if (isTenant && (tab === 'owner' || tab === 'vehicles' || tab === 'rfid' || tab === 'driver' || tab === 'maid')) {
      setTab('residents')
    }
  }, [isAdmin, isTenant, tab])

  const q = search.trim().toLowerCase()
  const match = (parts: (string | number | null | undefined | boolean)[]) =>
    parts.filter(Boolean).join(' ').toLowerCase().includes(q)

  const scopeOpts = useMemo(
    () => roleScopeOpts(isAdmin, isOwner, isTenant, apartmentNo, profile?.full_name),
    [isAdmin, isOwner, isTenant, apartmentNo, profile?.full_name]
  )

  const scopedFlats = useMemo(
    () => scopeByApartment(flats, apartmentNo, isAdmin),
    [flats, apartmentNo, isAdmin]
  )
  const scopedFlatResidents = useMemo(
    () => scopeResidentsForRole(flatResidents, scopeOpts),
    [flatResidents, scopeOpts]
  )
  const scopedLeases = useMemo(() => scopeLeasesForRole(leases, scopeOpts), [leases, scopeOpts])
  const scopedVehicles = useMemo(() => scopeHouseholdForRole(vehicles, scopeOpts), [vehicles, scopeOpts])
  const scopedRfids = useMemo(() => scopeHouseholdForRole(rfids, scopeOpts), [rfids, scopeOpts])
  const scopedDrivers = useMemo(() => scopeHouseholdForRole(drivers, scopeOpts), [drivers, scopeOpts])
  const scopedMaids = useMemo(() => scopeHouseholdForRole(maids, scopeOpts), [maids, scopeOpts])
  const scopedParking = useMemo(() => scopeByApartment(parking, apartmentNo, isAdmin), [parking, apartmentNo, isAdmin])
  const scopedDues = useMemo(() => scopeByApartment(dues, apartmentNo, isAdmin), [dues, apartmentNo, isAdmin])
  const scopedNoc = useMemo(() => scopeNocForRole(noc, scopeOpts), [noc, scopeOpts])
  const scopedDocs = useMemo(() => scopeDocumentsForRole(documents, scopeOpts), [documents, scopeOpts])

  const filteredRfids = useMemo(() => scopedRfids.filter((r) => match([r.apartment_no, r.vehicle_no, r.rfid_no, r.status])), [scopedRfids, q])
  const filteredDrivers = useMemo(() => scopedDrivers.filter((r) => match([r.apartment_no, r.vehicle_no, r.driver_name, r.mobile])), [scopedDrivers, q])
  const filteredMaids = useMemo(() => scopedMaids.filter((r) => match([r.apartment_no, r.name, r.card_number, r.employment_type])), [scopedMaids, q])
  const filteredSecurity = useMemo(() => security.filter((r) => match([r.name, r.mobile, r.employee_type])), [security, q])
  useEffect(() => {
    if (lockApartment && apartmentNo) setSelectedFlat(apartmentNo)
  }, [lockApartment, apartmentNo])

  const filteredFlats = useMemo(
    () =>
      scopedFlats.filter((r) => {
        const owner = scopedFlatResidents.find((fr) => fr.apartment_no === r.apartment_no && fr.occupancy_role === 'owner')
        return match([r.apartment_no, r.tower, owner?.resident?.full_name, owner?.resident?.mobile])
      }),
    [scopedFlats, scopedFlatResidents, q]
  )
  const filteredResidents = useMemo(
    () =>
      dedupeFlatResidents(scopedFlatResidents).filter((r) =>
        match([
          r.apartment_no,
          r.occupancy_role,
          r.resident?.full_name,
          r.resident?.mobile,
          r.resident?.father_name,
        ])
      ),
    [scopedFlatResidents, q]
  )
  const filteredLeases = useMemo(() => scopedLeases.filter((r) => match([r.apartment_no, r.tenant_name, r.status])), [scopedLeases, q])
  const filteredVehicles = useMemo(() => scopedVehicles.filter((r) => match([r.apartment_no, r.vehicle_no, r.make_model])), [scopedVehicles, q])
  const filteredParking = useMemo(() => scopedParking.filter((r) => match([r.apartment_no, r.parking_slot])), [scopedParking, q])
  const filteredDues = useMemo(() => scopedDues.filter((r) => match([r.apartment_no, r.year, r.receipt_no])), [scopedDues, q])
  const filteredNoc = useMemo(() => scopedNoc.filter((r) => match([r.apartment_no, r.tenant_name, r.receipt_no])), [scopedNoc, q])
  const filteredDocs = useMemo(() => scopedDocs.filter((r) => match([r.apartment_no, r.document_type, r.holder_name])), [scopedDocs, q])

  async function removeRow(table: string, id: string) {
    if (!confirm('Delete this record?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    refresh()
  }

  const viewOnly = !isAdmin
  const formProps = {
    onSaved: refresh,
    apartmentNo,
    lockApartment,
    isAdmin,
    readOnly: viewOnly,
  }

  function handleTabChange(next: TabId) {
    setTab(next)
    setSearch('')
    setFormOpen(false)
  }

  function openAddForm() {
    setSelectedFlat(null)
    setEditingResidentId(null)
    setFormOpen(true)
  }

  function closeFormModal() {
    setFormOpen(false)
    setEditingResidentId(null)
  }

  function handleFormSaved() {
    refresh()
    setFormOpen(false)
    setEditingResidentId(null)
  }

  const formModalEdit =
    (tab === 'owner' && !!selectedFlat) || (tab === 'residents' && !!editingResidentId)

  const quickLinks: { id: TabId; label: string; count: number | string; desc: string }[] = [
    ...(isOwner || isAdmin ? [{ id: 'owner' as TabId, label: 'Owner', count: scopedFlats.length, desc: 'Your flat owner record' }] : []),
    {
      id: 'residents',
      label: 'Resident',
      count: scopedFlatResidents.length,
      desc: isOwner ? 'You & tenant — full personal details' : 'Your personal details',
    },
    ...(isTenant
      ? [
          { id: 'leases' as TabId, label: 'Lease', count: scopedLeases.length, desc: 'Your lease agreement' },
          { id: 'dues' as TabId, label: 'Dues', count: scopedDues.length, desc: 'Your maintenance records' },
        ]
      : [
          { id: 'leases' as TabId, label: 'Leases', count: scopedLeases.length, desc: 'Tenant lease details' },
          { id: 'vehicles' as TabId, label: 'Vehicles', count: scopedVehicles.length, desc: 'Flat vehicles' },
          { id: 'maid' as TabId, label: 'Maids', count: scopedMaids.length, desc: 'Domestic staff' },
          { id: 'dues' as TabId, label: 'Dues', count: scopedDues.length, desc: 'Maintenance records' },
        ]),
  ]
  if (isAdmin) {
    quickLinks.unshift({ id: 'users', label: 'Users', count: '→', desc: 'Manage accounts' })
    quickLinks.push({ id: 'reports', label: 'Reports', count: alerts.length, desc: 'Alerts & summaries' })
  }

  const showSplit = SPLIT_TABS.includes(tab)

  return (
    <>
      <DashboardLayout tab={tab} onTabChange={handleTabChange} onRefresh={refresh} busy={busy}>
        {tab === 'overview' && (
          <div className="overview">
            <div className="welcome-banner">
              <div>
                <h2>Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}</h2>
                <p>
                  {isAdmin
                    ? 'Full administrator access to all Augusta Golf Homes society records.'
                    : isOwner
                      ? `View-only access for flat ${apartmentNo || '—'} — your record and tenant details (lease, staff, vehicles).`
                      : `View-only access for apartment ${apartmentNo || '—'} — your records only.`}
                </p>
              </div>
              {!isAdmin && apartmentNo && <div className="welcome-apartment">{apartmentNo}</div>}
            </div>

            {alerts.length > 0 && (
              <section className="overview-alerts-section card-section">
                <div className="overview-alerts-head">
                  <div>
                    <h3>Reports & Alerts</h3>
                    <p className="overview-alerts-sub">
                      {alerts.length} upcoming alert{alerts.length > 1 ? 's' : ''} need attention
                    </p>
                  </div>
                  {isAdmin && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleTabChange('reports')}>
                      Full reports →
                    </button>
                  )}
                </div>
                <div className="alert-cards">
                  {alerts.slice(0, 6).map((a) => (
                    <div key={a.id} className={`alert-card${a.due_date ? '' : ' alert-card-info'}`}>
                      <div className="alert-card-top">
                        <span className="alert-type-badge">{a.alert_type}</span>
                        {a.apartment_no && <span className="alert-apt">{a.apartment_no}</span>}
                      </div>
                      <p className="alert-card-msg">{a.message}</p>
                      {a.due_date && (
                        <span className="alert-card-date">Due: {a.due_date}</span>
                      )}
                    </div>
                  ))}
                </div>
                {alerts.length > 6 && isAdmin && (
                  <button type="button" className="link-btn" onClick={() => handleTabChange('reports')}>
                    View all {alerts.length} alerts →
                  </button>
                )}
              </section>
            )}

            {alerts.length === 0 && isAdmin && (
              <section className="overview-alerts-section card-section overview-alerts-empty">
                <div className="overview-alerts-head">
                  <div>
                    <h3>Reports & Alerts</h3>
                    <p className="overview-alerts-sub">No upcoming alerts — society records look good.</p>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleTabChange('reports')}>
                    Open reports →
                  </button>
                </div>
              </section>
            )}

            <div className="stats stats-overview">
              {quickLinks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="stat stat-clickable"
                  onClick={() => handleTabChange(item.id)}
                >
                  <strong>{item.count}</strong>
                  <span className="stat-label">{item.label}</span>
                  <span className="stat-desc">{item.desc}</span>
                </button>
              ))}
            </div>

            <div className="overview-grid">
              <div className="card-section">
                <h3>Recent Leases</h3>
                <div className="table-wrap table-compact">
                  <table>
                    <thead><tr><th>Apartment</th><th>Tenant</th><th>Ends</th></tr></thead>
                    <tbody>
                      {scopedLeases.slice(0, 5).map((row) => (
                        <tr key={row.id}><td>{row.apartment_no}</td><td>{row.tenant_name}</td><td>{row.lease_end}</td></tr>
                      ))}
                      {scopedLeases.length === 0 && <tr><td colSpan={3} className="empty">No leases yet</td></tr>}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="link-btn" onClick={() => handleTabChange('leases')}>View leases →</button>
              </div>
              <div className="card-section">
                <h3>Recent Vehicle RFID</h3>
                <div className="table-wrap table-compact">
                  <table>
                    <thead><tr><th>Apartment</th><th>Vehicle</th><th>RFID</th></tr></thead>
                    <tbody>
                      {scopedRfids.slice(0, 5).map((row) => (
                        <tr key={row.id}><td>{row.apartment_no}</td><td>{row.vehicle_no}</td><td>{row.rfid_no}</td></tr>
                      ))}
                      {scopedRfids.length === 0 && <tr><td colSpan={3} className="empty">No records yet</td></tr>}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="link-btn" onClick={() => handleTabChange('rfid')}>View all RFID →</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'notices' && isAdmin && (
          <div className="content-panel">
            <div className="list-pane list-pane-full card-section overview-notices-admin">
              <OverviewNoticesAdmin />
            </div>
          </div>
        )}

        {tab === 'reports' && isAdmin && (
          <ReportsPanel
            flats={flats}
            leases={leases}
            vehicles={vehicles}
            rfids={rfids}
            drivers={drivers}
            maids={maids}
            security={security}
            dues={dues}
            noc={noc}
            alerts={alerts}
          />
        )}

        {tab === 'users' && isAdmin && <AdminUsersPanel onSaved={refresh} />}

        {showSplit && (
          <div className="content-panel">
            <div className="list-pane list-pane-full">
              {!isAdmin && !apartmentNo && (
                <div className="alert alert-warn" style={{ marginBottom: '1rem' }}>
                  Your profile has no apartment assigned. Contact admin to link your flat number.
                </div>
              )}
              {viewOnly && apartmentNo && (
                <div className="view-only-banner">
                  <span className="view-only-icon">👁</span>
                  <div>
                    <strong>View only — {apartmentNo}</strong>
                    <p>
                      {isOwner
                        ? 'Your flat data only — your owner record plus tenant details in Resident, Leases, Maids, and Drivers.'
                        : 'Only your own data is shown. Only the administrator can update records.'}
                    </p>
                  </div>
                </div>
              )}
              <div className="list-toolbar">
                <div className="search-field">
                  <svg className="search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M9 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <input
                    type="search"
                    className="search"
                    placeholder="Search records…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {isAdmin && FORM_TABS.includes(tab) && (
                  <button type="button" className="btn btn-primary btn-add" onClick={openAddForm}>
                    + Add
                  </button>
                )}
              </div>

              {tab === 'owner' && (
                <OwnerTable
                  rows={filteredFlats}
                    flatResidents={scopedFlatResidents}
                  selectedApartment={selectedFlat}
                  onSelect={(apt) => {
                    setSelectedFlat(apt)
                    if (isAdmin) setFormOpen(true)
                  }}
                  onDelete={(id) => removeRow('flats', id)}
                  canDelete={isAdmin}
                />
              )}
              {tab === 'residents' && (
                <ResidentsTable
                  rows={filteredResidents}
                  selectedId={editingResidentId}
                  onSelect={(id, apt) => {
                    setEditingResidentId(id)
                    setSelectedFlat(apt)
                    if (isAdmin) setFormOpen(true)
                  }}
                  onDelete={(id) => removeRow('flat_residents', id)}
                  readOnly={viewOnly}
                />
              )}
                {tab === 'leases' && (
                  <LeaseTable rows={filteredLeases} onDelete={(id) => removeRow('leases', id)} readOnly={viewOnly} />
                )}
                {tab === 'vehicles' && (
                  <VehicleTable rows={filteredVehicles} onDelete={(id) => removeRow('vehicles', id)} readOnly={viewOnly} />
                )}
                {tab === 'parking' && <ParkingTable rows={filteredParking} />}
                {tab === 'dues' && <DuesTable rows={filteredDues} />}
                {tab === 'noc' && <NocTable rows={filteredNoc} />}
                {tab === 'documents' && (
                  <DocumentsTable
                    rows={filteredDocs}
                    flatResidents={scopedFlatResidents}
                    onDelete={(id) => removeRow('kyc_documents', id)}
                    readOnly={viewOnly}
                  />
                )}

                {tab === 'rfid' && (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Apartment</th><th>Vehicle</th><th>RFID</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
                      <tbody>
                        {filteredRfids.length === 0 ? (
                          <tr><td colSpan={isAdmin ? 5 : 4} className="empty">No vehicle RFID records yet.</td></tr>
                        ) : (
                          filteredRfids.map((row) => (
                            <tr key={row.id}>
                              <td>{row.apartment_no}</td>
                              <td>{row.vehicle_no || '—'}</td>
                              <td>{row.rfid_no}</td>
                              <td><span className={`badge ${row.status}`}>{row.status}</span></td>
                              {isAdmin && (
                                <td className="actions">
                                  <button type="button" className="btn btn-edit" onClick={() => setEditTarget({ kind: 'rfid', row })}>Edit</button>
                                  <button type="button" className="btn btn-danger" onClick={() => removeRow('rfid_cards', row.id)}>Delete</button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {tab === 'driver' && (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Apartment</th><th>Name</th><th>Vehicle</th><th>Mobile</th>{isAdmin && <th>Actions</th>}</tr></thead>
                      <tbody>
                        {filteredDrivers.length === 0 ? (
                          <tr><td colSpan={isAdmin ? 5 : 4} className="empty">No drivers yet.</td></tr>
                        ) : (
                          filteredDrivers.map((row) => (
                            <tr key={row.id}>
                              <td>{row.apartment_no}</td>
                              <td>{row.driver_name}</td>
                              <td>{row.vehicle_no || '—'}</td>
                              <td>{row.mobile || '—'}</td>
                              {isAdmin && (
                                <td className="actions">
                                  <button type="button" className="btn btn-edit" onClick={() => setEditTarget({ kind: 'driver', row })}>Edit</button>
                                  <button type="button" className="btn btn-danger" onClick={() => removeRow('drivers', row.id)}>Delete</button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {tab === 'maid' && (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Apartment</th><th>Name</th><th>Type</th><th>Card No</th>{isAdmin && <th>Actions</th>}</tr></thead>
                      <tbody>
                        {filteredMaids.length === 0 ? (
                          <tr><td colSpan={isAdmin ? 5 : 4} className="empty">No maid records yet.</td></tr>
                        ) : (
                          filteredMaids.map((row) => (
                            <tr key={row.id}>
                              <td>{row.apartment_no}</td>
                              <td>{row.name}</td>
                              <td>{row.employment_type === 'full_time' ? 'Full-time' : 'Part-time'}</td>
                              <td>{row.card_number || '—'}</td>
                              {isAdmin && (
                                <td className="actions">
                                  <button type="button" className="btn btn-edit" onClick={() => setEditTarget({ kind: 'maid', row })}>Edit</button>
                                  <button type="button" className="btn btn-danger" onClick={() => removeRow('maids', row.id)}>Delete</button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {tab === 'security' && isAdmin && (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Name</th><th>Type</th><th>Mobile</th><th>Shift</th><th>Actions</th></tr></thead>
                      <tbody>
                        {filteredSecurity.length === 0 ? (
                          <tr><td colSpan={5} className="empty">No security / FMG staff yet.</td></tr>
                        ) : (
                          filteredSecurity.map((row) => (
                            <tr key={row.id}>
                              <td>{row.name}</td>
                              <td>{row.employee_type.replace('_', ' ')}</td>
                              <td>{row.mobile}</td>
                              <td>{row.shift}</td>
                              <td className="actions">
                                <button type="button" className="btn btn-edit" onClick={() => setEditTarget({ kind: 'security', row })}>Edit</button>
                                <button type="button" className="btn btn-danger" onClick={() => removeRow('security_staff', row.id)}>Delete</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
          </div>
        )}
      </DashboardLayout>

      {isAdmin && editTarget && (
        <EditRecordModal
          target={editTarget}
          isAdmin={isAdmin}
          lockApartment={lockApartment}
          onClose={() => setEditTarget(null)}
          onSaved={refresh}
        />
      )}

      {isAdmin && formOpen && FORM_TABS.includes(tab) && (
        <FormModal
          key={`${tab}-${editingResidentId ?? 'add'}`}
          title={formModalTitle(tab, formModalEdit)}
          wide={tab === 'owner' || tab === 'residents'}
          onClose={closeFormModal}
        >
          {tab === 'owner' && (
            <OwnerPanel
              {...formProps}
              onSaved={handleFormSaved}
                    flatResidents={scopedFlatResidents}
              selectedApartment={selectedFlat}
              onSelectApartment={setSelectedFlat}
            />
          )}
          {tab === 'residents' && (
            <ResidentPanel
              {...formProps}
              onSaved={handleFormSaved}
                    flatResidents={scopedFlatResidents}
              selectedApartment={selectedFlat}
              onSelectApartment={setSelectedFlat}
              editingId={editingResidentId}
              onEdit={setEditingResidentId}
            />
          )}
          {tab === 'leases' && <LeaseForm {...formProps} onSaved={handleFormSaved} />}
          {tab === 'vehicles' && <VehicleForm {...formProps} onSaved={handleFormSaved} />}
          {tab === 'rfid' && <RfidForm {...formProps} onSaved={handleFormSaved} />}
          {tab === 'driver' && <DriverForm {...formProps} onSaved={handleFormSaved} />}
          {tab === 'maid' && <MaidForm {...formProps} onSaved={handleFormSaved} />}
          {tab === 'security' && <SecurityForm onSaved={handleFormSaved} />}
          {tab === 'parking' && <ParkingForm {...formProps} onSaved={handleFormSaved} />}
          {tab === 'dues' && <DuesForm {...formProps} onSaved={handleFormSaved} />}
          {tab === 'noc' && <NocForm {...formProps} onSaved={handleFormSaved} />}
          {tab === 'documents' && <DocumentsForm {...formProps} onSaved={handleFormSaved} />}
        </FormModal>
      )}
    </>
  )
}
