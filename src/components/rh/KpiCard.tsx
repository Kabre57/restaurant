import React from 'react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  colorClass?: string
}

export function KpiCard({ title, value, subtitle, icon, trend, colorClass = 'text-[var(--parabellum-primary)] bg-[var(--parabellum-primary)]/10' }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">{title}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--parabellum-text)]">{value}</span>
          </div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorClass}`}>
          {icon}
        </div>
      </div>
      
      {(subtitle || trend) && (
        <div className="mt-4 flex items-center gap-2">
          {trend && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
              trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs font-medium text-[var(--parabellum-muted)]">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  )
}
