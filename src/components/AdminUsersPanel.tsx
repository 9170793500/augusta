import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

type Props = { onSaved: () => void }

export function AdminUsersPanel({ onSaved }: Props) {
  const [users, setUsers] = useState<Profile[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    apartment_no: '',
    role: 'owner' as 'owner' | 'tenant',
  })

  const loadUsers = useCallback(async () => {
    setBusy(true)
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'admin')
      .order('created_at', { ascending: false })
    if (data) setUsers(data)
    if (err) setError(err.message)
    setBusy(false)
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    const { data, error: fnError } = await supabase.functions.invoke('create-user', {
      body: {
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        apartment_no: form.apartment_no.trim().toUpperCase(),
        role: form.role,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })

    setSaving(false)

    if (fnError) {
      setError(
        fnError.message.includes('FunctionsFetchError') || fnError.message.includes('Failed to fetch')
          ? 'User creation service not deployed. Deploy supabase/functions/create-user or create user manually in Supabase Auth → Users.'
          : fnError.message
      )
      return
    }

    if (data?.error) {
      setError(data.error)
      return
    }

    setOk(`User created: ${form.email} (${form.role}). Share credentials with the resident.`)
    setForm({ email: '', password: '', full_name: '', apartment_no: '', role: 'owner' })
    loadUsers()
    onSaved()
  }

  return (
    <div className="users-panel">
      <h3 className="pane-title">Manage Users</h3>
      <p className="form-hint">
        Administrator creates owner or tenant accounts. Residents sign in with the credentials you provide.
      </p>

      <div className="users-grid">
        <form onSubmit={onSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          {ok && <div className="alert alert-ok">{ok}</div>}
          <div className="field">
            <label>Full Name</label>
            <input
              required
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Apartment No</label>
            <input
              required
              value={form.apartment_no}
              onChange={(e) => setForm((f) => ({ ...f, apartment_no: e.target.value }))}
              placeholder="AUG0010201"
            />
          </div>
          <div className="field">
            <label>Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'owner' | 'tenant' }))}
            >
              <option value="owner">Owner</option>
              <option value="tenant">Tenant</option>
            </select>
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Temporary Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Min 6 characters"
            />
          </div>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create user account'}
          </button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Apartment</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {busy ? (
                <tr>
                  <td colSpan={4} className="empty">
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">
                    No flat users yet. Create one above.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name}</td>
                    <td>{u.apartment_no || '—'}</td>
                    <td>{u.email || '—'}</td>
                    <td>{u.role}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
