// src/components/ui/Button.tsx
'use client'

import React, { forwardRef } from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  children: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, className = '', disabled, children, ...props }, ref) => {
    const baseStyle =
      'th-btn select-none touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none'

    const variants = {
      primary: '',
      secondary: 'th-btn--secondary',
      ghost: 'th-btn--ghost',
      danger: 'th-btn--danger',
    }

    const sizes = {
      sm: 'min-h-10 px-4 text-[0.8rem]',
      md: 'min-h-11 px-5 text-[0.88rem]',
      lg: 'min-h-12 px-6 text-[0.95rem]',
    }

    const widthStyle = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        type={props.type ?? 'button'}
        disabled={disabled}
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
