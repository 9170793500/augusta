import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApartmentField } from '../components/ApartmentField'
import { PublicStaffForm, blankStaffRow, staffRowsToPayload, type StaffRow } from '../components/PublicStaffForm'
import { normalizeApartmentInput } from '../lib/apartmentUtils'
import {
  categoryLabel,
  detailSummary,
  fetchPublicSubmissions,
  loadPublicContact,
  nextTabAfterSubmit,
  savePublicContact,
  submitPublicDetail,
  submitPublicDetailBatch,
  tabsForLivingAs,
  updatePublicDetail,
  type LivingAs,
  type PublicContact,
  type PublicDetailCategory,
  type PublicSubmission,
} from '../lib/publicSubmission'

type TabId = PublicDetailCategory | 'view'

const TAB_LABELS: Record<PublicDetailCategory, string> = {
  owner: 'Owner',
  tenant: 'Tenant',
  lease: 'Lease',
  maid: 'Maid',
  driver: 'Driver',
  servant: 'Servant',
  vehicle: 'Vehicle',
}

function emptyResident(role: 'owner' | 'tenant') {
  return {
    full_name: '',
    father_name: '',
    mobile: '',
    alt_mobile: '',
    email: '',
    aadhar_number: '',
    pan_number: '',
    occupancy_role: role,
  }
}

function strDetail(details: Record<string, unknown>, key: string) {
  const v = details[key]
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function detailsToStaffRow(details: Record<string, unknown>): StaffRow {
  const emp = strDetail(details, 'employment_type') === 'full_time' ? 'full_time' : 'part_time'
  const genderRaw = strDetail(details, 'gender')
  return {
    ...blankStaffRow(emp),
    name: strDetail(details, 'name'),
    role: strDetail(details, 'role'),
    age: strDetail(details, 'age'),
    gender: genderRaw === 'male' || genderRaw === 'female' || genderRaw === 'other' ? genderRaw : '',
    employment_type: emp,
    aadhar_number: strDetail(details, 'aadhar_number'),
    mobile: strDetail(details, 'mobile'),
    card_number: strDetail(details, 'card_number'),
    employment_valid_till: strDetail(details, 'employment_valid_till'),
    notes: strDetail(details, 'notes'),
  }
}

export function AddDetailsPage() {
  const [contact, setContact] = useState<PublicContact>(() => loadPublicContact())
  const [tab, setTab] = useState<TabId>(() => (loadPublicContact().livingAs === 'tenant' ? 'tenant' : 'owner'))
  const [submissions, setSubmissions] = useState<PublicSubmission[]>([])
  const [viewNotice, setViewNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [editing, setEditing] = useState<PublicSubmission | null>(null)

  const [ownerForm, setOwnerForm] = useState(emptyResident('owner'))
  const [tenantForm, setTenantForm] = useState(emptyResident('tenant'))
  const [leaseForm, setLeaseForm] = useState({
    tenant_name: '',
    lease_start: '',
    lease_end: '',
    status: 'active',
    notes: '',
  })
  const [maidRows, setMaidRows] = useState<StaffRow[]>([blankStaffRow('full_time'), blankStaffRow('part_time')])
  const [driverForm, setDriverForm] = useState({
    vehicle_no: '',
    driver_name: '',
    mobile: '',
    licence_number: '',
    licence_validity: '',
    aadhar_number: '',
    address: '',
    notes: '',
  })
  const [servantRows, setServantRows] = useState<StaffRow[]>([blankStaffRow('full_time'), blankStaffRow('part_time')])
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_no: '',
    make_model: '',
    colour: '',
    linked_to: 'owner' as string,
    rc_number: '',
    puc_id: '',
    puc_validity: '',
    parking_slot: '',
    driver_name: '',
    driver_licence: '',
  })

  const visibleTabs = tabsForLivingAs(contact.livingAs)

  useEffect(() => {
    if (tab !== 'view' && !visibleTabs.includes(tab)) {
      setTab(visibleTabs[0])
    }
  }, [contact.livingAs, tab, visibleTabs])

  function setLivingAs(livingAs: LivingAs) {
    const next = { ...contact, livingAs }
    setContact(next)
    savePublicContact(next)
    setEditing(null)
    setError(null)
    setOk(null)
    setTab(livingAs === 'tenant' ? 'tenant' : 'owner')
    setVehicleForm((v) => ({ ...v, linked_to: livingAs }))
  }

  const refreshSubmissions = useCallback(async (showLoadError = false) => {
    setLoading(true)
    if (showLoadError) setViewNotice(null)
    try {
      const { rows, message } = await fetchPublicSubmissions()
      setSubmissions(rows)
      setViewNotice(message)
    } catch (err) {
      if (showLoadError) {
        setViewNotice(err instanceof Error ? err.message : 'Could not load submissions.')
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPublicSubmissions()
      .then(({ rows }) => setSubmissions(rows))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 'view') refreshSubmissions(true)
  }, [tab, refreshSubmissions])

  function validateContact(): string | null {
    const apt = normalizeApartmentInput(contact.apartmentNo)
    if (!apt) return 'Apartment number is required.'
    if (!contact.submitterName.trim()) return 'Your full name is required.'
    if (contact.livingAs !== 'owner' && contact.livingAs !== 'tenant') {
      return 'Select whether you are Owner or Tenant.'
    }
    return null
  }

  function clearEditing() {
    setEditing(null)
    setOwnerForm(emptyResident('owner'))
    setTenantForm(emptyResident('tenant'))
    setLeaseForm({
      tenant_name: '',
      lease_start: '',
      lease_end: '',
      status: 'active',
      notes: '',
    })
    setMaidRows([blankStaffRow('full_time'), blankStaffRow('part_time')])
    setServantRows([blankStaffRow('full_time'), blankStaffRow('part_time')])
    setDriverForm({
      vehicle_no: '',
      driver_name: '',
      mobile: '',
      licence_number: '',
      licence_validity: '',
      aadhar_number: '',
      address: '',
      notes: '',
    })
    setVehicleForm({
      vehicle_no: '',
      make_model: '',
      colour: '',
      linked_to: contact.livingAs === 'tenant' ? 'tenant' : 'owner',
      rc_number: '',
      puc_id: '',
      puc_validity: '',
      parking_slot: '',
      driver_name: '',
      driver_licence: '',
    })
  }

  function startEdit(row: PublicSubmission) {
    setError(null)
    setOk(null)
    setEditing(row)
    setContact({
      apartmentNo: row.apartment_no,
      submitterName: row.submitter_name || contact.submitterName,
      submitterMobile: row.submitter_mobile || contact.submitterMobile,
      livingAs:
        row.category === 'tenant' || row.category === 'lease'
          ? 'tenant'
          : row.category === 'owner'
            ? 'owner'
            : contact.livingAs,
    })

    const d = row.details
    if (row.category === 'owner') {
      setOwnerForm({
        ...emptyResident('owner'),
        full_name: strDetail(d, 'full_name'),
        father_name: strDetail(d, 'father_name'),
        mobile: strDetail(d, 'mobile'),
        alt_mobile: strDetail(d, 'alt_mobile'),
        email: strDetail(d, 'email'),
        aadhar_number: strDetail(d, 'aadhar_number'),
        pan_number: strDetail(d, 'pan_number'),
      })
    } else if (row.category === 'tenant') {
      setTenantForm({
        ...emptyResident('tenant'),
        full_name: strDetail(d, 'full_name'),
        father_name: strDetail(d, 'father_name'),
        mobile: strDetail(d, 'mobile'),
        alt_mobile: strDetail(d, 'alt_mobile'),
        email: strDetail(d, 'email'),
        aadhar_number: strDetail(d, 'aadhar_number'),
        pan_number: strDetail(d, 'pan_number'),
      })
    } else if (row.category === 'lease') {
      setLeaseForm({
        tenant_name: strDetail(d, 'tenant_name'),
        lease_start: strDetail(d, 'lease_start'),
        lease_end: strDetail(d, 'lease_end'),
        status: strDetail(d, 'status') || 'active',
        notes: strDetail(d, 'notes'),
      })
    } else if (row.category === 'maid') {
      setMaidRows([detailsToStaffRow(d)])
    } else if (row.category === 'servant') {
      setServantRows([detailsToStaffRow(d)])
    } else if (row.category === 'driver') {
      setDriverForm({
        vehicle_no: strDetail(d, 'vehicle_no'),
        driver_name: strDetail(d, 'driver_name'),
        mobile: strDetail(d, 'mobile'),
        licence_number: strDetail(d, 'licence_number'),
        licence_validity: strDetail(d, 'licence_validity'),
        aadhar_number: strDetail(d, 'aadhar_number'),
        address: strDetail(d, 'address'),
        notes: strDetail(d, 'notes'),
      })
    } else if (row.category === 'vehicle') {
      setVehicleForm({
        vehicle_no: strDetail(d, 'vehicle_no'),
        make_model: strDetail(d, 'make_model'),
        colour: strDetail(d, 'colour'),
        linked_to: strDetail(d, 'linked_to') || 'owner',
        rc_number: strDetail(d, 'rc_number'),
        puc_id: strDetail(d, 'puc_id'),
        puc_validity: strDetail(d, 'puc_validity'),
        parking_slot: strDetail(d, 'parking_slot'),
        driver_name: strDetail(d, 'driver_name'),
        driver_licence: strDetail(d, 'driver_licence'),
      })
    }

    setTab(row.category)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function afterSuccessfulSubmit(category: PublicDetailCategory, message: string, goNext: boolean) {
    setOk(message)
    const { rows } = await fetchPublicSubmissions()
    setSubmissions(rows)
    setError(null)
    if (goNext) {
      const next = nextTabAfterSubmit(category, contact.livingAs)
      setTab(next)
    } else {
      clearEditing()
      setTab('view')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: FormEvent, category: PublicDetailCategory, details: Record<string, unknown>) {
    e.preventDefault()
    setError(null)
    setOk(null)

    const contactErr = validateContact()
    if (contactErr) {
      setError(contactErr)
      return
    }

    const apt = normalizeApartmentInput(contact.apartmentNo)
    const normalizedContact = { ...contact, apartmentNo: apt }
    savePublicContact(normalizedContact)
    setContact(normalizedContact)

    setSaving(true)
    try {
      if (editing && editing.category === category) {
        await updatePublicDetail(editing.id, category, details, normalizedContact)
        await afterSuccessfulSubmit(category, `${categoryLabel(category)} updated successfully.`, false)
      } else {
        await submitPublicDetail(category, details, normalizedContact)
        const next = nextTabAfterSubmit(category, normalizedContact.livingAs)
        const nextLabel = next === 'view' ? 'My Submissions' : categoryLabel(next)
        await afterSuccessfulSubmit(
          category,
          `${categoryLabel(category)} saved! Continue with ${nextLabel}.`,
          true
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed.')
    }
    setSaving(false)
  }

  async function handleStaffBatchSubmit(
    e: FormEvent,
    category: 'maid' | 'servant',
    rows: StaffRow[],
    resetRows: () => void
  ) {
    e.preventDefault()
    setError(null)
    setOk(null)

    const contactErr = validateContact()
    if (contactErr) {
      setError(contactErr)
      return
    }

    const filled = staffRowsToPayload(rows)
    if (filled.length === 0) {
      setError('Fill at least one person with Name, Aadhar and Card Number. Remove empty rows if not needed.')
      return
    }

    const apt = normalizeApartmentInput(contact.apartmentNo)
    const normalizedContact = { ...contact, apartmentNo: apt }
    savePublicContact(normalizedContact)
    setContact(normalizedContact)

    setSaving(true)
    try {
      if (editing && editing.category === category) {
        await updatePublicDetail(editing.id, category, filled[0], normalizedContact)
        resetRows()
        await afterSuccessfulSubmit(category, `${categoryLabel(category)} updated successfully.`, false)
      } else {
        await submitPublicDetailBatch(category, filled, normalizedContact)
        resetRows()
        const next = nextTabAfterSubmit(category, normalizedContact.livingAs)
        const nextLabel = next === 'view' ? 'My Submissions' : categoryLabel(next)
        await afterSuccessfulSubmit(
          category,
          `${filled.length} ${categoryLabel(category).toLowerCase()} record(s) saved! Continue with ${nextLabel}.`,
          true
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed.')
    }
    setSaving(false)
  }

  return (
    <div className="public-site add-details-page">
      <header className="public-header">
        <div className="public-nav-wrap">
          <Link to="/login" className="public-brand public-brand-link">
            <span className="public-brand-name">AUGUSTA GOLF HOMES</span>
            <span className="public-brand-towers">Towers III · IV · V</span>
          </Link>
          <nav className="public-nav-links" aria-label="Sections">
            <Link to="/login">Home</Link>
            <span className="public-nav-active">Add Details</span>
          </nav>
          <Link to="/login" className="public-login-btn public-login-btn-link">
            Resident Login
          </Link>
        </div>
      </header>

      <main className="add-details-main">
        <div className="add-details-hero">
          <div className="public-tag">Public submission</div>
          <h1>Add your details</h1>
          <p>
            Owners, tenants and residents can add personal, maid, driver, servant and vehicle records here —
            no login required. Data goes directly into the same Supabase tables the admin uses
            (flats, residents, maids, drivers, vehicles).
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}
        {editing && (
          <div className="alert alert-warn">
            Editing {categoryLabel(editing.category)} — change fields and click Update. Or{' '}
            <button type="button" className="link-btn" onClick={() => { clearEditing(); setTab('view') }}>
              cancel
            </button>
            .
          </div>
        )}

        <section className="add-details-contact card-section">
          <h2>Your contact</h2>
          <p className="form-hint">Required for every submission — saved on this device only.</p>
          <div className="form-grid">
            <div className="field full">
              <ApartmentField
                apartmentNo={null}
                lockApartment={false}
                value={contact.apartmentNo}
                onChange={(v) => setContact({ ...contact, apartmentNo: v })}
              />
            </div>
            <div className="field">
              <label>Your full name</label>
              <input
                required
                value={contact.submitterName}
                onChange={(e) => setContact({ ...contact, submitterName: e.target.value })}
                placeholder="As on Aadhar / lease"
              />
            </div>
            <div className="field">
              <label>Living as</label>
              <select
                value={contact.livingAs}
                onChange={(e) => setLivingAs(e.target.value as LivingAs)}
                aria-label="Owner or Tenant"
              >
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
              </select>
            </div>
          </div>
        </section>

        <div className="add-details-tabs" role="tablist">
          {visibleTabs.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`add-details-tab${tab === id ? ' active' : ''}`}
              onClick={() => { setTab(id); setError(null); setOk(null); if (editing && editing.category !== id) clearEditing() }}
            >
              {TAB_LABELS[id]}
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'view'}
            className={`add-details-tab add-details-tab-view${tab === 'view' ? ' active' : ''}`}
            onClick={() => { setTab('view'); setError(null); setOk(null); clearEditing() }}
          >
            My Submissions ({submissions.length})
          </button>
        </div>

        {tab === 'owner' && (
          <form className="add-details-form card-section" onSubmit={(e) => handleSubmit(e, 'owner', ownerForm)}>
            <h3>{editing?.category === 'owner' ? 'Edit owner details' : 'Owner details'}</h3>
            <p className="form-hint">Saved to Flats + Owner records (same as admin dashboard).</p>
            <div className="form-grid">
              <div className="field full"><label>Full name</label><input required value={ownerForm.full_name} onChange={(e) => setOwnerForm({ ...ownerForm, full_name: e.target.value })} /></div>
              <div className="field full"><label>Father name</label><input value={ownerForm.father_name} onChange={(e) => setOwnerForm({ ...ownerForm, father_name: e.target.value })} /></div>
              <div className="field"><label>Mobile</label><input value={ownerForm.mobile} onChange={(e) => setOwnerForm({ ...ownerForm, mobile: e.target.value })} /></div>
              <div className="field"><label>Alt. mobile</label><input value={ownerForm.alt_mobile} onChange={(e) => setOwnerForm({ ...ownerForm, alt_mobile: e.target.value })} /></div>
              <div className="field"><label>Email</label><input type="email" value={ownerForm.email} onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })} /></div>
              <div className="field"><label>Aadhar</label><input value={ownerForm.aadhar_number} onChange={(e) => setOwnerForm({ ...ownerForm, aadhar_number: e.target.value })} /></div>
              <div className="field"><label>PAN</label><input value={ownerForm.pan_number} onChange={(e) => setOwnerForm({ ...ownerForm, pan_number: e.target.value })} /></div>
            </div>
            <div className="form-actions-row">
              {editing?.category === 'owner' && (
                <button type="button" className="btn btn-ghost" onClick={() => { clearEditing(); setTab('view') }}>Cancel edit</button>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? editing?.category === 'owner' ? 'Updating…' : 'Submitting…'
                  : editing?.category === 'owner' ? 'Update owner' : 'Submit owner details'}
              </button>
            </div>
          </form>
        )}

        {tab === 'tenant' && (
          <form className="add-details-form card-section" onSubmit={(e) => handleSubmit(e, 'tenant', tenantForm)}>
            <h3>{editing?.category === 'tenant' ? 'Edit tenant details' : 'Tenant details'}</h3>
            <p className="form-hint">Saved to Resident Directory (same as admin dashboard).</p>
            <div className="form-grid">
              <div className="field full"><label>Full name</label><input required value={tenantForm.full_name} onChange={(e) => setTenantForm({ ...tenantForm, full_name: e.target.value })} /></div>
              <div className="field full"><label>Father name</label><input value={tenantForm.father_name} onChange={(e) => setTenantForm({ ...tenantForm, father_name: e.target.value })} /></div>
              <div className="field"><label>Mobile</label><input value={tenantForm.mobile} onChange={(e) => setTenantForm({ ...tenantForm, mobile: e.target.value })} /></div>
              <div className="field"><label>Alt. mobile</label><input value={tenantForm.alt_mobile} onChange={(e) => setTenantForm({ ...tenantForm, alt_mobile: e.target.value })} /></div>
              <div className="field"><label>Email</label><input type="email" value={tenantForm.email} onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })} /></div>
              <div className="field"><label>Aadhar</label><input value={tenantForm.aadhar_number} onChange={(e) => setTenantForm({ ...tenantForm, aadhar_number: e.target.value })} /></div>
              <div className="field"><label>PAN</label><input value={tenantForm.pan_number} onChange={(e) => setTenantForm({ ...tenantForm, pan_number: e.target.value })} /></div>
            </div>
            <div className="form-actions-row">
              {editing?.category === 'tenant' && (
                <button type="button" className="btn btn-ghost" onClick={() => { clearEditing(); setTab('view') }}>Cancel edit</button>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? editing?.category === 'tenant' ? 'Updating…' : 'Submitting…'
                  : editing?.category === 'tenant' ? 'Update tenant' : 'Submit tenant details'}
              </button>
            </div>
          </form>
        )}

        {tab === 'lease' && (
          <form
            className="add-details-form card-section"
            onSubmit={(e) =>
              handleSubmit(e, 'lease', {
                ...leaseForm,
                tenant_name: leaseForm.tenant_name || tenantForm.full_name || contact.submitterName,
              })
            }
          >
            <h3>{editing?.category === 'lease' ? 'Edit lease details' : 'Lease details'}</h3>
            <p className="form-hint">Saved to Leases table (same as admin dashboard). Only for tenants.</p>
            <div className="form-grid">
              <div className="field full">
                <label>Tenant name</label>
                <input
                  required
                  value={leaseForm.tenant_name || tenantForm.full_name || contact.submitterName}
                  onChange={(e) => setLeaseForm({ ...leaseForm, tenant_name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Lease start</label>
                <input
                  type="date"
                  required
                  value={leaseForm.lease_start}
                  onChange={(e) => setLeaseForm({ ...leaseForm, lease_start: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Lease end</label>
                <input
                  type="date"
                  required
                  value={leaseForm.lease_end}
                  onChange={(e) => setLeaseForm({ ...leaseForm, lease_end: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Status</label>
                <select
                  value={leaseForm.status}
                  onChange={(e) => setLeaseForm({ ...leaseForm, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="renewed">Renewed</option>
                </select>
              </div>
              <div className="field full">
                <label>Notes</label>
                <input
                  value={leaseForm.notes}
                  onChange={(e) => setLeaseForm({ ...leaseForm, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="form-actions-row">
              {editing?.category === 'lease' && (
                <button type="button" className="btn btn-ghost" onClick={() => { clearEditing(); setTab('view') }}>Cancel edit</button>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? editing?.category === 'lease' ? 'Updating…' : 'Submitting…'
                  : editing?.category === 'lease' ? 'Update lease' : 'Submit lease details'}
              </button>
            </div>
          </form>
        )}

        {tab === 'maid' && (
          <PublicStaffForm
            title={editing?.category === 'maid' ? 'Edit maid details' : 'Maid details'}
            hint="Add full-time and part-time maids separately — same as admin Maid form. Saved to Maids table."
            entityLabel="Maid"
            rows={maidRows}
            onRowsChange={setMaidRows}
            saving={saving}
            editing={editing?.category === 'maid'}
            onCancelEdit={() => { clearEditing(); setTab('view') }}
            onSubmit={(e, rows) =>
              handleStaffBatchSubmit(e, 'maid', rows, () =>
                setMaidRows([blankStaffRow('full_time'), blankStaffRow('part_time')])
              )
            }
          />
        )}

        {tab === 'driver' && (
          <form className="add-details-form card-section" onSubmit={(e) => handleSubmit(e, 'driver', driverForm)}>
            <h3>{editing?.category === 'driver' ? 'Edit driver details' : 'Driver details'}</h3>
            <p className="form-hint">Saved to Drivers table (same as admin dashboard).</p>
            <div className="form-grid">
              <div className="field"><label>Driver name</label><input required value={driverForm.driver_name} onChange={(e) => setDriverForm({ ...driverForm, driver_name: e.target.value })} /></div>
              <div className="field"><label>Vehicle no</label><input value={driverForm.vehicle_no} onChange={(e) => setDriverForm({ ...driverForm, vehicle_no: e.target.value })} /></div>
              <div className="field"><label>Mobile</label><input value={driverForm.mobile} onChange={(e) => setDriverForm({ ...driverForm, mobile: e.target.value })} /></div>
              <div className="field"><label>Licence no</label><input value={driverForm.licence_number} onChange={(e) => setDriverForm({ ...driverForm, licence_number: e.target.value })} /></div>
              <div className="field"><label>Licence validity</label><input type="date" value={driverForm.licence_validity} onChange={(e) => setDriverForm({ ...driverForm, licence_validity: e.target.value })} /></div>
              <div className="field"><label>Aadhar</label><input value={driverForm.aadhar_number} onChange={(e) => setDriverForm({ ...driverForm, aadhar_number: e.target.value })} /></div>
              <div className="field full"><label>Address</label><input value={driverForm.address} onChange={(e) => setDriverForm({ ...driverForm, address: e.target.value })} /></div>
              <div className="field full"><label>Notes</label><input value={driverForm.notes} onChange={(e) => setDriverForm({ ...driverForm, notes: e.target.value })} /></div>
            </div>
            <div className="form-actions-row">
              {editing?.category === 'driver' && (
                <button type="button" className="btn btn-ghost" onClick={() => { clearEditing(); setTab('view') }}>Cancel edit</button>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? editing?.category === 'driver' ? 'Updating…' : 'Submitting…'
                  : editing?.category === 'driver' ? 'Update driver' : 'Submit driver details'}
              </button>
            </div>
          </form>
        )}

        {tab === 'servant' && (
          <PublicStaffForm
            title={editing?.category === 'servant' ? 'Edit servant details' : 'Servant / domestic staff'}
            hint="Ek ghar mein kai servant ho sakte hain — full-time aur part-time alag add karein. Same Maids table as admin."
            entityLabel="Servant"
            showRole
            rows={servantRows}
            onRowsChange={setServantRows}
            saving={saving}
            editing={editing?.category === 'servant'}
            onCancelEdit={() => { clearEditing(); setTab('view') }}
            onSubmit={(e, rows) =>
              handleStaffBatchSubmit(e, 'servant', rows, () =>
                setServantRows([blankStaffRow('full_time'), blankStaffRow('part_time')])
              )
            }
          />
        )}

        {tab === 'vehicle' && (
          <form className="add-details-form card-section" onSubmit={(e) => handleSubmit(e, 'vehicle', vehicleForm)}>
            <h3>{editing?.category === 'vehicle' ? 'Edit vehicle details' : 'Vehicle details'}</h3>
            <p className="form-hint">Saved to Vehicles table (same as admin dashboard).</p>
            <div className="form-grid">
              <div className="field"><label>Vehicle no</label><input required value={vehicleForm.vehicle_no} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_no: e.target.value })} /></div>
              <div className="field"><label>Make / model</label><input value={vehicleForm.make_model} onChange={(e) => setVehicleForm({ ...vehicleForm, make_model: e.target.value })} /></div>
              <div className="field"><label>Colour</label><input value={vehicleForm.colour} onChange={(e) => setVehicleForm({ ...vehicleForm, colour: e.target.value })} /></div>
              <div className="field"><label>Linked to</label>
                <select value={vehicleForm.linked_to} onChange={(e) => setVehicleForm({ ...vehicleForm, linked_to: e.target.value })}>
                  <option value="owner">Owner</option><option value="tenant">Tenant</option>
                </select>
              </div>
              <div className="field"><label>RC number</label><input value={vehicleForm.rc_number} onChange={(e) => setVehicleForm({ ...vehicleForm, rc_number: e.target.value })} /></div>
              <div className="field"><label>PUC ID</label><input value={vehicleForm.puc_id} onChange={(e) => setVehicleForm({ ...vehicleForm, puc_id: e.target.value })} /></div>
              <div className="field"><label>PUC validity</label><input type="date" value={vehicleForm.puc_validity} onChange={(e) => setVehicleForm({ ...vehicleForm, puc_validity: e.target.value })} /></div>
              <div className="field"><label>Parking slot</label><input value={vehicleForm.parking_slot} onChange={(e) => setVehicleForm({ ...vehicleForm, parking_slot: e.target.value })} /></div>
              <div className="field"><label>Driver name</label><input value={vehicleForm.driver_name} onChange={(e) => setVehicleForm({ ...vehicleForm, driver_name: e.target.value })} /></div>
              <div className="field"><label>Driver licence</label><input value={vehicleForm.driver_licence} onChange={(e) => setVehicleForm({ ...vehicleForm, driver_licence: e.target.value })} /></div>
            </div>
            <div className="form-actions-row">
              {editing?.category === 'vehicle' && (
                <button type="button" className="btn btn-ghost" onClick={() => { clearEditing(); setTab('view') }}>Cancel edit</button>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? editing?.category === 'vehicle' ? 'Updating…' : 'Submitting…'
                  : editing?.category === 'vehicle' ? 'Update vehicle' : 'Submit vehicle details'}
              </button>
            </div>
          </form>
        )}

        {tab === 'view' && (
          <section className="add-details-form card-section">
            <div className="add-details-view-head">
              <h3>My submissions</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => refreshSubmissions(true)} disabled={loading}>
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
            {viewNotice && <div className="alert alert-warn">{viewNotice}</div>}
            <p className="form-hint">Records saved to society database. Shown here only for this browser. Use Edit to change a record.</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Apartment</th>
                    <th>Summary</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 ? (
                    <tr><td colSpan={6} className="empty">No submissions yet. Use the tabs above to add details.</td></tr>
                  ) : (
                    submissions.map((row) => (
                      <tr key={row.id}>
                        <td>{new Date(row.created_at).toLocaleDateString()}</td>
                        <td><span className="badge tenant">{categoryLabel(row.category)}</span></td>
                        <td>{row.apartment_no}</td>
                        <td>{detailSummary(row.details)}</td>
                        <td><span className="badge owner">Saved</span></td>
                        <td>
                          <button type="button" className="btn btn-edit btn-sm" onClick={() => startEdit(row)}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <footer className="public-footer add-details-footer">
        <div className="public-footer-inner">
          <div className="public-footer-bottom">
            <span>Data is saved to the main society records. Contact admin for corrections.</span>
            <Link to="/login">Back to home</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
