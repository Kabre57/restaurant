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
    <section className="overflow-hidden rounded-xl border border-[#e5e7ef] bg-white shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.06)]">
      <div className="flex items-center justify-between border-b border-[#eef0f6] px-6 py-5">
        <div className="flex items-center gap-2 text-sm font-black text-[var(--parabellum-primary)]">
          <Filter className="h-4 w-4" />
          Filtre
        </div>
        <ChevronDown className="h-4 w-4 text-[#adb5bd]" />
      </div>

      <div className="grid gap-4 p-6 lg:grid-cols-[1.2fr_1.2fr_1.2fr_auto_auto]">
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-12 rounded-lg border border-[#dfe3eb] bg-white px-5 text-sm font-medium text-[#495057] outline-none transition focus:border-[var(--parabellum-primary)]"
        />
        <select
          value={statusValue}
          onChange={(event) => onStatusChange?.(event.target.value)}
          disabled={!onStatusChange}
          className="h-12 rounded-lg border border-[#dfe3eb] bg-white px-5 text-sm font-medium text-[#495057] outline-none transition focus:border-[var(--parabellum-primary)] disabled:opacity-50"
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
          className="h-12 rounded-lg border border-[#dfe3eb] bg-white px-5 text-sm font-medium text-[#495057] outline-none transition focus:border-[var(--parabellum-primary)] disabled:opacity-50"
        />
        <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--parabellum-primary)] px-6 text-sm font-black text-white transition hover:bg-[#253ec7]">
          <Search className="h-4 w-4" />
          Filtre
        </button>
        <button onClick={onReset} className="h-12 rounded-lg bg-[#ffe3ea] px-6 text-sm font-bold text-[#f72559] transition hover:bg-[#ffd2dd]">
          Retirer
        </button>
      </div>
    </section>
  )
}

export function CrudPrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg bg-[var(--parabellum-primary)] px-6 py-4 text-sm font-bold text-white shadow-[0_0.75rem_1.25rem_rgba(47,76,221,0.18)] transition hover:bg-[#253ec7]">
      {children}
    </button>
  )
}

export function CrudStatus({ children, tone = 'success' }: { children: ReactNode; tone?: 'success' | 'danger' | 'warning' | 'info' | 'muted' }) {
  const toneClass = {
    success: 'bg-[#2fbe5f]',
    danger: 'bg-[#f72559]',
    warning: 'bg-[#ff7a59]',
    info: 'bg-[var(--parabellum-primary)]',
    muted: 'bg-[#adb5bd]',
  }[tone]

  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-[#72788f]">
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
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition ${isDelete ? 'bg-[#f72559] hover:bg-[#d91448]' : 'bg-[var(--parabellum-primary)] hover:bg-[#253ec7]'}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export function CrudTable<T>({ title, columns, rows, emptyLabel, renderRow, footerLabel }: CrudTableProps<T>) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#e5e7ef] bg-white shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.06)]">
      <div className="flex items-center justify-between border-b border-[#eef0f6] px-6 py-5">
        <div className="flex items-center gap-2 text-sm font-black text-[var(--parabellum-primary)]">
          <FileText className="h-4 w-4" />
          {title}
        </div>
        <ChevronDown className="h-4 w-4 text-[#adb5bd]" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#eef0f6]">
              {columns.map((column) => (
                <th key={column.key} className={`px-6 py-5 text-xs font-black uppercase text-black ${column.className || ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef0f6]">
            {rows.map((row, index) => renderRow(row, index))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-xs font-bold uppercase tracking-widest text-[#adb5bd]">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-4 px-6 py-5 text-xs font-medium text-[#72788f] sm:flex-row sm:items-center sm:justify-between">
        <span>{footerLabel || `${rows.length} enregistrement${rows.length > 1 ? 's' : ''} affiché${rows.length > 1 ? 's' : ''}.`}</span>
        <div className="flex items-center overflow-hidden rounded-lg border border-[#e5e7ef]">
          <button className="px-4 py-2 text-[#72788f]">‹</button>
          <span className="border-x border-[#e5e7ef] px-4 py-2 text-[var(--parabellum-primary)]">1</span>
          <button className="px-4 py-2 text-[#72788f]">›</button>
        </div>
      </div>
    </section>
  )
}
