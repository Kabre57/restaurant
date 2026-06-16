'use client'

import { ChevronDown, Edit3, FileText, Filter, Search, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

export type CrudColumn = {
  key: string
  label: string
  className?: string
}

type CrudFilterProps = {
  searchValue: string
  searchPlaceholder?: string
  statusValue?: string
  statusOptions?: Array<{ value: string; label: string }>
  dateValue?: string
  onSearchChange: (value: string) => void
  onStatusChange?: (value: string) => void
  onDateChange?: (value: string) => void
  onReset: () => void
}

type CrudTableProps<T> = {
  title: string
  columns: CrudColumn[]
  rows: T[]
  emptyLabel: string
  renderRow: (row: T, index: number) => ReactNode
  footerLabel?: string
}

export function CrudFilterBar({
  searchValue,
  searchPlaceholder = 'Rechercher...',
  statusValue = '',
  statusOptions = [],
  dateValue = '',
  onSearchChange,
  onStatusChange,
  onDateChange,
  onReset,
}: CrudFilterProps) {
  return (
    <section className="barab-card overflow-hidden rounded-[1.25rem]">
      <div className="flex items-center justify-between border-b border-[var(--parabellum-border)] px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--parabellum-text)]">
          <Filter className="h-4 w-4" />
          Filtre
        </div>
        <ChevronDown className="h-4 w-4 text-[var(--parabellum-muted)]" />
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1.2fr_1.2fr_auto_auto]">
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="th-input h-11 px-4 text-sm"
        />
        <select
          value={statusValue}
          onChange={(event) => onStatusChange?.(event.target.value)}
          disabled={!onStatusChange}
          className="th-select h-11 px-4 text-sm disabled:opacity-50"
        >
          <option value="">Sélectionner le statut</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateValue}
          onChange={(event) => onDateChange?.(event.target.value)}
          disabled={!onDateChange}
          className="th-input h-11 px-4 text-sm disabled:opacity-50"
        />
        <button className="th-btn h-11 px-5 text-sm">
          <Search className="h-4 w-4" />
          Filtre
        </button>
        <button onClick={onReset} className="th-btn th-btn--secondary h-11 px-5 text-sm">
          Retirer
        </button>
      </div>
    </section>
  )
}

export function CrudPrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="th-btn px-5 py-3 text-sm">
      {children}
    </button>
  )
}

export function CrudStatus({ children, tone = 'success' }: { children: ReactNode; tone?: 'success' | 'danger' | 'warning' | 'info' | 'muted' }) {
  const toneClass = {
    success: 'bg-emerald-500',
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
    info: 'bg-[var(--parabellum-primary)]',
    muted: 'bg-slate-400',
  }[tone]

  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--parabellum-muted)]">
      <span className={`h-2.5 w-2.5 rounded-full ${toneClass}`} />
      {children}
    </span>
  )
}

export function CrudActionButton({ label, tone, onClick }: { label: string; tone: 'edit' | 'delete'; onClick: () => void }) {
  const isDelete = tone === 'delete'
  const Icon = isDelete ? Trash2 : Edit3

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${isDelete ? 'border-[rgba(235,20,0,0.18)] bg-[rgba(235,20,0,0.08)] text-[var(--parabellum-danger)] hover:bg-[rgba(235,20,0,0.14)]' : 'border-[var(--parabellum-border)] bg-[var(--parabellum-card)] text-[var(--parabellum-primary)] hover:bg-[var(--parabellum-body)]'}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export function CrudTable<T>({ title, columns, rows, emptyLabel, renderRow, footerLabel }: CrudTableProps<T>) {
  return (
    <section className="barab-card overflow-hidden rounded-[1.25rem]">
      <div className="flex items-center justify-between border-b border-[var(--parabellum-border)] px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--parabellum-text)]">
          <FileText className="h-4 w-4" />
          {title}
        </div>
        <ChevronDown className="h-4 w-4 text-[var(--parabellum-muted)]" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--parabellum-border)]">
              {columns.map((column) => (
                <th key={column.key} className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--parabellum-muted)] ${column.className || ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--parabellum-border)]">
            {rows.map((row, index) => renderRow(row, index))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-[var(--parabellum-muted)]">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-4 px-5 py-4 text-xs text-[var(--parabellum-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>{footerLabel || `${rows.length} enregistrement${rows.length > 1 ? 's' : ''} affiché${rows.length > 1 ? 's' : ''}.`}</span>
        <div className="flex items-center overflow-hidden rounded-full border border-[var(--parabellum-border)] bg-[var(--parabellum-card)]">
          <button className="px-4 py-2 text-[var(--parabellum-muted)]">‹</button>
          <span className="border-x border-[var(--parabellum-border)] px-4 py-2 text-[var(--parabellum-primary)]">1</span>
          <button className="px-4 py-2 text-[var(--parabellum-muted)]">›</button>
        </div>
      </div>
    </section>
  )
}
