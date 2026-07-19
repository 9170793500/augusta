import type { ReactNode } from 'react'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export function FormModal({ title, onClose, children, wide }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-card form-modal-card${wide ? ' modal-card-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="form-modal-body">{children}</div>
      </div>
    </div>
  )
}
