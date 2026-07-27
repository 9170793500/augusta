import { useEffect, useRef, useState } from 'react'

type Props = {
  onView: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function RowActionsMenu({ onView, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  return (
    <div className="row-actions" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="btn btn-ghost btn-sm row-actions-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Actions"
        aria-expanded={open}
      >
        ⋮
      </button>
      {open && (
        <div className="row-actions-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onView() }}>
            View
          </button>
          {onEdit && (
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onEdit() }}>
              Edit
            </button>
          )}
          {onDelete && (
            <button type="button" role="menuitem" className="danger" onClick={() => { setOpen(false); onDelete() }}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
