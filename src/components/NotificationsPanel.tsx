import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { NotificationType, SocietyNotification } from '../lib/types'

const empty = {
  title: '',
  message: '',
  notification_type: 'announcement' as NotificationType,
  event_date: '',
  is_published: true,
}

type Props = { onSaved?: () => void }

export function OverviewNoticesAdmin({ onSaved }: Props) {
  const [rows, setRows] = useState<SocietyNotification[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('society_notifications')
      .select('*')
      .order('event_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (data) setRows(data as SocietyNotification[])
    if (err) setError(err.message)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function resetForm() {
    setForm(empty)
    setEditingId(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required.')
      return
    }

    setSaving(true)
    setError(null)
    setOk(null)

    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      notification_type: form.notification_type,
      event_date: form.event_date ? new Date(form.event_date).toISOString() : null,
      is_published: form.is_published,
    }

    const { error: err } = editingId
      ? await supabase.from('society_notifications').update(payload as never).eq('id', editingId)
      : await supabase.from('society_notifications').insert(payload as never)

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }

    setOk(editingId ? 'Notice updated.' : 'Notice published on login page.')
    resetForm()
    load()
    onSaved?.()
  }

  async function remove(id: string) {
    if (!confirm('Delete this notice?')) return
    const { error: err } = await supabase.from('society_notifications').delete().eq('id', id)
    if (err) {
      setError(err.message)
      return
    }
    if (editingId === id) resetForm()
    load()
  }

  async function togglePublished(row: SocietyNotification) {
    const next = !row.is_published
    setError(null)
    setOk(null)

    const { error: err } = await supabase
      .from('society_notifications')
      .update({ is_published: next } as never)
      .eq('id', row.id)

    if (err) {
      setError(err.message)
      return
    }

    setOk(next ? `"${row.title}" is now visible on login page.` : `"${row.title}" hidden from login page.`)
    load()
  }

  function startEdit(row: SocietyNotification) {
    setEditingId(row.id)
    setForm({
      title: row.title,
      message: row.message,
      notification_type: row.notification_type,
      event_date: row.event_date ? row.event_date.slice(0, 16) : '',
      is_published: row.is_published,
    })
    setError(null)
    setOk(null)
  }

  return (
    <>
      <p className="form-hint overview-notices-hint">
        Publish meetings and announcements — they appear transparently on the public login page.
      </p>

      <form className="flat-master-form overview-notices-form" onSubmit={onSubmit}>
        <h3 className="pane-title">{editingId ? 'Edit notice' : 'Post society notice'}</h3>
        {error && <div className="alert alert-error">{error}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}

        <div className="form-grid">
          <div className="field full">
            <label>Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Society General Meeting" />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.notification_type} onChange={(e) => setForm({ ...form, notification_type: e.target.value as NotificationType })}>
              <option value="meeting">Meeting</option>
              <option value="announcement">Announcement</option>
              <option value="general">General</option>
            </select>
          </div>
          <div className="field">
            <label>Event date & time</label>
            <input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
          </div>
          <div className="field full">
            <label>Message</label>
            <textarea required rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Meeting details, venue, agenda..." />
          </div>
          <div className="field">
            <label>Show on login page</label>
            <select value={form.is_published ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, is_published: e.target.value === 'yes' })}>
              <option value="yes">Yes — visible to everyone</option>
              <option value="no">No — hidden</option>
            </select>
          </div>
        </div>

        <div className="form-actions-row">
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Cancel edit
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update notice' : 'Publish notice'}
          </button>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Event</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="empty">No notices yet.</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.title}</strong></td>
                  <td>{row.notification_type}</td>
                  <td>{row.event_date ? new Date(row.event_date).toLocaleString() : '—'}</td>
                  <td>{row.is_published ? 'Published' : 'Hidden'}</td>
                  <td className="actions">
                    <button type="button" className="btn btn-edit" onClick={() => startEdit(row)}>Edit</button>
                    {row.is_published ? (
                      <button type="button" className="btn btn-hide" onClick={() => togglePublished(row)}>
                        Hide
                      </button>
                    ) : (
                      <button type="button" className="btn btn-show" onClick={() => togglePublished(row)}>
                        Show
                      </button>
                    )}
                    <button type="button" className="btn btn-danger" onClick={() => remove(row.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

/** Fetch published notices for the public login page (no auth required). */
export async function fetchPublicNotifications(): Promise<SocietyNotification[]> {
  const { data, error } = await supabase
    .from('society_notifications')
    .select('*')
    .eq('is_published', true)
    .order('event_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) {
    console.warn('Could not load login notifications:', error.message)
    return []
  }
  return (data || []) as SocietyNotification[]
}

function formatEventDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function LoginNotificationsList({ items }: { items: SocietyNotification[] }) {
  if (items.length === 0) {
    return (
      <div className="login-notice-empty">
        <h2>Society Notices</h2>
        <p>No announcements at the moment.</p>
      </div>
    )
  }

  return (
    <div className="login-notices">
      <h2 className="login-notices-title">Society Notices</h2>
      <div className="login-notices-list">
        {items.map((n) => (
          <article key={n.id} className={`login-notice-item ${n.notification_type}`}>
            <div className="login-notice-head">
              <span className="login-notice-badge">{n.notification_type}</span>
              {n.event_date && <time className="login-notice-date">{formatEventDate(n.event_date)}</time>}
            </div>
            <h3>{n.title}</h3>
            <p>{n.message}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
