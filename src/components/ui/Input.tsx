// src/components/ui/Input.tsx
'use client'

import React, { forwardRef, useState } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, onFocus, onBlur, value, ...props }, ref) => {
    const [focused, setFocused] = useState(false)
    const [hasVal, setHasVal] = useState(!!value)

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true)
      onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false)
      setHasVal(!!e.target.value)
      onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasVal(!!e.target.value)
      props.onChange?.(e)
    }

    // Input layout with touch-friendly 48px min height (h-12), floating label, and accessible border contrast
    return (
      <div className={`relative w-full ${className}`}>
        <div className="relative flex items-center">
          <input
            id={inputId}
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            value={value}
            className={`peer w-full h-12 px-4 pt-4 pb-1 rounded-xl text-base text-[var(--ui-text)] bg-[var(--ui-surface)] border transition-all duration-150 outline-none focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)] focus:border-transparent ${
              error
                ? 'border-[var(--ui-danger)] focus:ring-[var(--ui-danger)]'
                : 'border-[var(--ui-border)] hover:border-gray-400 dark:hover:border-slate-500'
            }`}
            placeholder=" "
            {...props}
          />
          <label
            htmlFor={inputId}
            className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-base text-[var(--ui-text-muted)] transition-all duration-150 origin-left 
            peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100
            peer-focus:top-2.5 peer-focus:-translate-y-1 peer-focus:scale-75 peer-focus:text-[var(--ui-primary)]
            ${focused || hasVal || value ? 'top-2.5 -translate-y-1 scale-75' : ''} ${
              error ? 'peer-focus:text-[var(--ui-danger)]' : ''
            }`}
          >
            {label}
          </label>
        </div>
        {error && (
          <p className="mt-1.5 ml-1 text-xs font-semibold text-[var(--ui-danger)] animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
