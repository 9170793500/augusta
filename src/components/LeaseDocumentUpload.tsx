import { useRef, useState } from 'react'
import type { ParsedLeaseFields } from '../lib/leaseDocumentParse'
import { extractTextFromLeaseFile, LEASE_FILE_ACCEPT, parseLeaseFromText } from '../lib/leaseDocumentParse'
import { uploadLeaseDocument } from '../lib/leaseDocumentUpload'

type Props = {
  apartmentNo: string
  documentUrl: string
  fileName: string
  onDocumentUrl: (url: string) => void
  onFileName: (name: string) => void
  onParsed: (fields: ParsedLeaseFields) => void
  disabled?: boolean
}

export function LeaseDocumentUpload({
  apartmentNo,
  documentUrl,
  fileName,
  onDocumentUrl,
  onFileName,
  onParsed,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | null) {
    if (!file || disabled) return
    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      const url = await uploadLeaseDocument(file, apartmentNo)
      onDocumentUrl(url)
      onFileName(file.name)

      try {
        const text = await extractTextFromLeaseFile(file)
        const parsed = parseLeaseFromText(text)
        const filled = [parsed.tenant_name, parsed.lease_start, parsed.lease_end].filter(Boolean).length

        if (filled > 0) {
          onParsed(parsed)
          setMessage(
            `Read ${filled} field(s) from the document. Review the form below and edit if needed before submitting.`
          )
        } else {
          setMessage('Document uploaded. Could not detect lease fields automatically — please fill the form manually.')
        }
      } catch {
        setMessage('Document uploaded. Auto-fill could not read this file — please fill the form manually.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload the lease document.')
    }

    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function clearFile() {
    onDocumentUrl('')
    onFileName('')
    setMessage(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="lease-upload-block">
      <div className="field full">
        <label>Lease copy (PDF, DOCX, DOC, or photo)</label>
        <p className="form-hint">
          Upload the agreement to auto-fill tenant name and dates. You can still edit every field manually before saving.
        </p>
        <div className="lease-upload-actions">
          <input
            ref={inputRef}
            type="file"
            accept={LEASE_FILE_ACCEPT}
            disabled={disabled || busy}
            className="lease-file-input"
            onChange={(e) => void handleFile(e.target.files?.[0] || null)}
          />
          {documentUrl && !busy && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFile}>
              Remove file
            </button>
          )}
        </div>
        {busy && <div className="alert alert-warn">Reading document and uploading…</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {message && !error && <div className="alert alert-ok">{message}</div>}
        {documentUrl && (
          <p className="form-hint lease-file-meta">
            Attached: {fileName || 'lease document'}{' '}
            <a href={documentUrl} target="_blank" rel="noreferrer">
              View file
            </a>
          </p>
        )}
      </div>
    </div>
  )
}

export type LeaseFieldValues = {
  tenant_name: string
  lease_start: string
  lease_end: string
  status: string
  notes: string
  document_url: string
}

type FieldsProps = {
  value: LeaseFieldValues
  onChange: (next: LeaseFieldValues) => void
  readOnly?: boolean
  defaultTenantName?: string
}

export function LeaseFieldsSection({ value, onChange, readOnly, defaultTenantName }: FieldsProps) {
  const tenantValue = value.tenant_name || defaultTenantName || ''

  return (
    <div className="form-grid">
      <div className="field full">
        <label>Tenant name</label>
        <input
          required
          disabled={readOnly}
          value={tenantValue}
          onChange={(e) => onChange({ ...value, tenant_name: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Lease start</label>
        <input
          type="date"
          required
          disabled={readOnly}
          value={value.lease_start}
          onChange={(e) => onChange({ ...value, lease_start: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Lease end</label>
        <input
          type="date"
          required
          disabled={readOnly}
          value={value.lease_end}
          onChange={(e) => onChange({ ...value, lease_end: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Status</label>
        <select
          disabled={readOnly}
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="renewed">Renewed</option>
        </select>
      </div>
      <div className="field full">
        <label>Notes</label>
        <input
          disabled={readOnly}
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
        />
      </div>
    </div>
  )
}
