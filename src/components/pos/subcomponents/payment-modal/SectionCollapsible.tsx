'use client'

import { useState, type ReactNode } from 'react'

type SectionCollapsibleProps = {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export function SectionCollapsible({
  title,
  children,
  defaultOpen = true,
  className = '',
}: SectionCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className={`border-b border-[#e9ecef] pb-3 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#adb5bd]">
          {title}
        </span>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e9ecef] text-xs font-black text-[#495057]">
          {isOpen ? '-' : '+'}
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </section>
  )
}
