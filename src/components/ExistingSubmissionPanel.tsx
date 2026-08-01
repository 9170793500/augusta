import {
  categoryLabel,
  formatSubmissionDetailRows,
  type PublicSubmission,
} from '../lib/publicSubmission'

type Props = {
  rows: PublicSubmission[]
  onEdit: (row: PublicSubmission) => void
}

export function ExistingSubmissionPanel({ rows, onEdit }: Props) {
  if (rows.length === 0) return null

  return (
    <section className="existing-submission-panel card-section" aria-live="polite">
      <h3>Your saved data</h3>
      {rows.map((row) => (
        <div key={row.id} className="existing-submission-card">
          <div className="existing-submission-head">
            <div>
              <span className="badge tenant">{categoryLabel(row.category)}</span>
              <span className="existing-submission-apt">{row.apartment_no}</span>
              <span className="existing-submission-date">
                {new Date(row.created_at).toLocaleString()}
              </span>
            </div>
            <button type="button" className="btn btn-edit btn-sm" onClick={() => onEdit(row)}>
              Edit
            </button>
          </div>
          <dl className="existing-submission-details">
            {formatSubmissionDetailRows(row.details).map((item) => (
              <div key={item.label} className="existing-submission-row">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  )
}
