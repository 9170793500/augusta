import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured, supabaseProjectRef } from '../lib/supabase'
import { AuthFooter, formatAuthError } from '../components/AuthFooter'
import { fetchPublicNotifications } from '../components/NotificationsPanel'
import type { SocietyNotification } from '../lib/types'
import { LandingGallery } from '../components/LandingGallery'

const MODULES = [
  { num: '01', title: 'Resident Directory', desc: 'Ownership and occupancy status — Owner, Tenant, or Vacant — for every apartment.', meta: '36 RECORDS', hash: '#directory' },
  { num: '02', title: 'Access & Personnel', desc: 'IDs for domestic help and FMG staff — guards, housekeeping, supervisors, technicians.', meta: 'FMG SYNCED', hash: '#access' },
  { num: '03', title: 'Vehicles & Parking', desc: 'Registered vehicles for residents and staff, with allotted parking slots.', meta: 'LIVE', hash: '#vehicles' },
  { num: '04', title: 'Document Repository', desc: 'Lease agreements with expiry tracking, and NOCs issued by the AOA.', meta: 'TRACKED', hash: '#documents' },
  { num: '05', title: 'AOA Governance', desc: 'About the AOA and BOM, with minutes of AGM/GBM, BOM, and monthly FMG meetings.', meta: 'UP TO DATE', hash: '#governance' },
  { num: '06', title: 'Finance & Accounts', desc: 'Payments and dues, plus Gym, extra parking, and annual charges accounts.', meta: 'SEE BELOW', hash: '#finance' },
  { num: '07', title: 'Community Events', desc: 'Upcoming events, notices, and gatherings across the three towers.', meta: 'UPCOMING', hash: '#events' },
]

function formatNoticeDate(iso: string | null) {
  if (!iso) return 'TBA'
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }).toUpperCase()
}

export function LoginPage() {
  const { signIn, session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [notices, setNotices] = useState<SocietyNotification[]>([])
  const projectRef = supabaseProjectRef()

  useEffect(() => {
    fetchPublicNotifications().then(setNotices)
  }, [])

  if (!loading && session && profile) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: err } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (err) {
      setError(formatAuthError(err))
      return
    }
    navigate('/dashboard', { replace: true })
  }

  function openLogin() {
    setShowLogin(true)
  }

  function scrollTo(hash: string) {
    document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="public-site">
      <header className="public-header">
        <div className="public-nav-wrap">
          <div className="public-brand">
            <span className="public-brand-name">AUGUSTA GOLF HOMES</span>
            <span className="public-brand-towers">Towers III · IV · V</span>
          </div>
          <nav className="public-nav-links" aria-label="Sections">
            <button type="button" onClick={() => scrollTo('#directory')}>Directory</button>
            <button type="button" onClick={() => scrollTo('#access')}>Access</button>
            <button type="button" onClick={() => scrollTo('#vehicles')}>Vehicles</button>
            <button type="button" onClick={() => scrollTo('#documents')}>Documents</button>
            <button type="button" onClick={() => scrollTo('#finance')}>Finance</button>
          </nav>
          <div className="public-nav-actions">
            <Link to="/add-details" className="public-add-details-btn">
              Add Details
            </Link>
            <button type="button" className="public-login-btn" onClick={openLogin}>
              Resident Login
            </button>
          </div>
        </div>
      </header>

      <section className="public-hero">
        <div className="public-hero-inner">
          <div className="public-eyebrow">Association of Apartment Owners — Private Resident Portal</div>
          <h1 className="public-hero-title">
            Every record of home,
            <br />
            held to <em>par</em>.
          </h1>
          <p className="public-hero-lede">
            One address for ownership, access, finances and governance across Towers 3, 4 and 5 —
            built for owners, tenants, the Board, and the Facility Management Group alike.
          </p>
          <div className="public-hero-cta">
            <button type="button" className="public-btn-primary" onClick={openLogin}>
              Sign in to your account
            </button>
            <button type="button" className="public-btn-ghost" onClick={() => scrollTo('#directory')}>
              Explore the modules
            </button>
          </div>

          <LandingGallery />
        </div>
      </section>

      <div className="public-stats">
        <div className="public-stats-inner">
          <div className="public-stat"><div className="public-stat-value mono">03</div><div className="public-stat-label">Towers Live on Portal</div></div>
          <div className="public-stat"><div className="public-stat-value mono">36</div><div className="public-stat-label">Apartments, 4,700 sq ft each</div></div>
          <div className="public-stat"><div className="public-stat-value mono">07</div><div className="public-stat-label">Managed Modules</div></div>
          <div className="public-stat"><div className="public-stat-value mono">24/7</div><div className="public-stat-label">FMG Gate &amp; Facility Coverage</div></div>
        </div>
      </div>

      <section className="public-block" id="directory">
        <div className="public-section-head">
          <div>
            <div className="public-tag">The Scorecard</div>
            <h2>Seven modules, one ledger</h2>
          </div>
          <p>
            Every function of daily life at Augusta — from who lives where, to who&apos;s on shift at the gate —
            recorded module by module, the way a scorecard tracks every hole.
          </p>
        </div>
        <div className="public-scorecard">
          {MODULES.map((m) => (
            <button key={m.num} type="button" className="public-card-row" onClick={openLogin}>
              <div className="public-card-num mono">{m.num}</div>
              <div>
                <p className="public-card-title">{m.title}</p>
                <p className="public-card-desc">{m.desc}</p>
              </div>
              <div className="public-card-meta"><span className="public-card-status">{m.meta}</span></div>
              <div className="public-card-arrow" aria-hidden>→</div>
            </button>
          ))}
        </div>
      </section>

      <section className="public-block" id="finance">
        <div className="public-section-head">
          <div>
            <div className="public-tag">Finance &amp; Accounts</div>
            <h2>Every account, reconciled</h2>
          </div>
          <p>Owner-level statements and AOA-level consolidated reports, drawn from the same ledger.</p>
        </div>
        <div className="public-two-col">
          <div className="public-info-card">
            <h3>Consolidated Ledger</h3>
            <div className="public-info-row"><span>Payments received (this quarter)</span><span className="mono">Sign in to view</span></div>
            <div className="public-info-row"><span>Dues outstanding</span><span className="mono">Sign in to view</span></div>
            <div className="public-info-row"><span>Gym account balance</span><span className="mono">Sign in to view</span></div>
            <div className="public-info-row"><span>Extra parking account</span><span className="mono">Sign in to view</span></div>
            <div className="public-info-row"><span>Annual charges collected</span><span className="mono">Sign in to view</span></div>
          </div>
          <div className="public-info-card" id="events">
            <h3>Upcoming Events</h3>
            {notices.length === 0 ? (
              <p className="public-empty-note">No announcements at the moment. Check back later.</p>
            ) : (
              notices.slice(0, 4).map((n) => (
                <div key={n.id} className="public-event-item">
                  <div className="public-event-date mono">{formatNoticeDate(n.event_date)}</div>
                  <div>
                    <h4>{n.title}</h4>
                    <p>{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="public-block" id="governance">
        <div className="public-section-head">
          <div>
            <div className="public-tag">Governance</div>
            <h2>AOA &amp; Board of Management</h2>
          </div>
          <p>Minutes of every AGM, GBM, BOM, and monthly FMG meeting, archived and searchable.</p>
        </div>
        <div className="public-two-col">
          <div className="public-info-card">
            <h3>Recent Minutes</h3>
            <div className="public-info-row"><span>AGM — Annual General Meeting</span><span>Sign in to view</span></div>
            <div className="public-info-row"><span>BOM Meeting</span><span>Sign in to view</span></div>
            <div className="public-info-row"><span>FMG Monthly Review</span><span>Sign in to view</span></div>
            <div className="public-info-row"><span>GBM — Facade Repainting</span><span>Sign in to view</span></div>
          </div>
          <div className="public-info-card">
            <h3>Board of Management</h3>
            <div className="public-info-row"><span>President</span><span>Tower 3</span></div>
            <div className="public-info-row"><span>Secretary</span><span>Tower 4</span></div>
            <div className="public-info-row"><span>Treasurer</span><span>Tower 5</span></div>
            <div className="public-info-row"><span>FMG Coordinator</span><span>All Towers</span></div>
          </div>
        </div>
      </section>

      <footer className="public-footer" id="access">
        <div className="public-footer-inner">
          <div className="public-footer-grid">
            <div>
              <h5>Augusta Golf Homes</h5>
              <p>Towers 3, 4 and 5 — a private resident portal maintained by the Association of Apartment Owners.</p>
            </div>
            <div id="vehicles">
              <h5>Modules</h5>
              <button type="button" onClick={() => scrollTo('#directory')}>Resident Directory</button>
              <button type="button" onClick={() => scrollTo('#access')}>Access &amp; Personnel</button>
              <button type="button" onClick={() => scrollTo('#vehicles')}>Vehicles &amp; Parking</button>
              <button type="button" onClick={() => scrollTo('#documents')}>Documents</button>
            </div>
            <div id="documents">
              <h5>Community</h5>
              <button type="button" onClick={() => scrollTo('#governance')}>AOA Governance</button>
              <button type="button" onClick={() => scrollTo('#finance')}>Finance &amp; Accounts</button>
              <button type="button" onClick={() => scrollTo('#events')}>Events</button>
            </div>
            <div>
              <h5>Resident Access</h5>
              <button type="button" onClick={openLogin}>Resident Login</button>
              <button type="button" onClick={openLogin}>AOA Admin Login</button>
            </div>
          </div>
          <div className="public-footer-bottom">
            <span>&copy; {new Date().getFullYear()} Augusta Golf Homes AOA. For residents of Towers 3, 4 &amp; 5 only.</span>
            <span>Portal v1.0</span>
          </div>
        </div>
      </footer>

      {showLogin && (
        <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
          <div className="modal-card login-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Resident Login</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setShowLogin(false)}>
                Close
              </button>
            </div>
            <form onSubmit={onSubmit}>
              <p className="brand-sub">
                Sign in with credentials provided by the AOA administrator — admin, owner, or tenant.
              </p>
              {!isSupabaseConfigured && (
                <div className="alert alert-error">
                  <strong>Server not configured.</strong> Set Supabase env variables on Vercel and redeploy.
                </div>
              )}
              {isSupabaseConfigured && projectRef && import.meta.env.DEV && (
                <p className="form-hint">Supabase project: <code>{projectRef}</code></p>
              )}
              {error && <div className="alert alert-error">{error}</div>}
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button className="btn btn-primary public-login-submit" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
              <AuthFooter />
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
