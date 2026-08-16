import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  required?: boolean
  htmlFor?: string
}

export function FormFieldLabel({ children, required, htmlFor }: Props) {
  return (
    <label htmlFor={htmlFor}>
      {children}
      {required && (
        <span className="field-required" aria-label="required">
          {' '}
          *
        </span>
      )}
    </label>
  )
}
