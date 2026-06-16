// src/components/ui/Input.tsx
'use client'

import React, { forwardRef, useId } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, value, ...props }, ref) => {
    const reactId = useId()
    const inputId = id ?? `input-${reactId}`

    return (
      <div className={`w-full ${className}`}>
        <label htmlFor={inputId} className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[var(--parabellum-text)]" style={{ fontFamily: 'var(--title-font)' }}>
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          value={value}
          className="th-input h-11 px-3"
          style={error ? { borderColor: 'var(--parabellum-danger)' } : undefined}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs font-medium text-[var(--ui-danger)]">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
