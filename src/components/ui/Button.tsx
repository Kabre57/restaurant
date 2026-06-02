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
    // Base styles focus:visible rings and haptic-like scaling feedback
    const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 select-none touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ff6d00] active:scale-95 disabled:pointer-events-none disabled:opacity-40'

    // Premium styling variants using high quality CSS variables/Tailwind values
    const variants = {
      primary: 'bg-[var(--ui-primary)] text-white hover:bg-[var(--ui-primary-hover)] active:bg-[var(--ui-primary-active)] shadow-md shadow-[rgba(255,109,0,0.15)]',
      secondary: 'bg-[var(--ui-secondary-light)] text-[var(--ui-text)] border border-[var(--ui-border)] hover:bg-[var(--ui-border)] active:bg-gray-300 dark:active:bg-slate-700',
      ghost: 'bg-transparent text-[var(--ui-text)] hover:bg-[var(--ui-secondary-light)] active:bg-gray-200 dark:active:bg-slate-800',
      danger: 'bg-[var(--ui-danger)] text-white hover:bg-[var(--ui-danger-hover)] active:bg-[var(--ui-danger-active)] shadow-sm shadow-[rgba(224,49,49,0.15)]',
    }

    // Touch sizing specifications:
    // sm: 36px, md: 44px (Tactile minimum), lg: 52px
    const sizes = {
      sm: 'h-9 px-4 text-sm gap-2',
      md: 'h-11 px-5 text-base gap-2', // Tactile min (44px)
      lg: 'h-13 px-6 text-lg gap-3',   // Large touch zone (52px)
    }

    const widthStyle = fullWidth ? 'w-full flex' : ''

    return (
      <button
        ref={ref}
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
