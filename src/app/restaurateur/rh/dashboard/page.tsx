'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, DollarSign, FileText, TrendingUp, Users } from 'lucide-react'
import { getHrDashboardMetrics } from '@/app/actions/rh/analytics'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { KpiCard } from '@/components/rh/KpiCard'

export default function DashboardRHPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) return

    const userRole = session.user.role || 'WAITER'
    if (userRole !== 'RESTAURATEUR' && userRole !== 'MANAGER') {
      router.replace('/restaurateur/rh/contrats') // redirect non-managers
      return
    }

    if (!session?.user?.storeId) return

    let isCancelled = false

    async function fetchData() {
      const res = await getHrDashboardMetrics()
      if (isCancelled) return
      if (res.success && res.metrics) {
        setMetrics(res.metrics)
      }
      setLoading(false)
    }

    void fetchData()

    return () => {
      isCancelled = true
    }
  }, [session, status, router])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--parabellum-primary)] border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--parabellum-text)] sm:text-3xl">Dashboard RH</h1>
        <p className="mt-1 text-sm font-bold uppercase tracking-widest text-[#adb5bd]">Aperçu de la gestion du personnel</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Effectif Actif"
          value={metrics?.totalEmployees || 0}
          subtitle="Employés enregistrés"
          icon={<Users className="h-6 w-6" />}
          colorClass="text-blue-600 bg-blue-100"
        />
        <KpiCard
          title="Contrats Actifs"
          value={metrics?.activeContractsCount || 0}
          subtitle="CDI, CDD, Stages en cours"
          icon={<FileText className="h-6 w-6" />}
          colorClass="text-green-600 bg-green-100"
        />
        <KpiCard
          title="Masse Salariale (Base)"
          value={`${(metrics?.totalBaseSalary || 0).toLocaleString()} F`}
          subtitle="Par mois (Théorique)"
          icon={<DollarSign className="h-6 w-6" />}
          colorClass="text-purple-600 bg-purple-100"
        />
        <KpiCard
          title="Alertes Contrats"
          value={metrics?.expiringContracts || 0}
          subtitle="Expirations dans < 30j"
          icon={<AlertTriangle className="h-6 w-6" />}
          colorClass={metrics?.expiringContracts > 0 ? "text-red-600 bg-red-100" : "text-gray-500 bg-gray-100"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-[var(--parabellum-text)]">Progression Paie</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--parabellum-muted)]">Période en cours</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-2 flex justify-between text-xs font-bold text-[var(--parabellum-text)]">
                <span>Bulletins générés</span>
                <span>{metrics?.processedPayrolls || 0} / {metrics?.totalEmployees || 0}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div 
                  className="h-full rounded-full bg-orange-500 transition-all duration-1000"
                  style={{ width: `${metrics?.totalEmployees ? ((metrics.processedPayrolls || 0) / metrics.totalEmployees) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-[var(--parabellum-text)]">Calendrier</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--parabellum-muted)]">Prochains événements</p>
            </div>
          </div>
          <div className="space-y-4">
            {metrics?.expiringContracts > 0 ? (
              <div className="flex items-center gap-4 rounded-xl border border-red-100 bg-red-50 p-4">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-sm font-bold text-red-900">{metrics.expiringContracts} contrat(s) arrivent à expiration</div>
                  <div className="text-xs text-red-700">Pensez à préparer les renouvellements</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div className="text-sm font-medium text-gray-600">Aucun événement critique à venir</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
