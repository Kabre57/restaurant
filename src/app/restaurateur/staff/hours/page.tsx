'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, TrendingUp, Calendar, Clock, BarChart2, ShieldAlert, Award } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getHoursWorkedReport } from '@/app/actions/timecards'
import { CrudTable } from '@/components/ui/ParabellumCrudTable'

type HoursWorkedItem = {
  userId: string
  name: string
  email: string
  role: string
  totalHours: number
  shiftsCount: number
}

export default function TotalHoursWorkedReport() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [report, setReport] = useState<HoursWorkedItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!storeId) return
    try {
      setLoading(true)
      const data = await getHoursWorkedReport(storeId)
      setReport(data as HoursWorkedItem[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (storeId) {
      void loadData()
    }
  }, [storeId])

  // Compute total hours across all employees
  const totalStoreHours = report.reduce((sum, item) => sum + item.totalHours, 0)
  const averageHoursPerEmployee = report.length > 0 ? parseFloat((totalStoreHours / report.length).toFixed(1)) : 0

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Heures totales travaillées</h1>
        <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Rapport analytique des heures cumulées et présences par employé</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-green-50 rounded-2xl flex items-center justify-center text-[#2fbe5f] border border-green-200">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Heures Totales Cumulées</p>
            <p className="text-2xl font-black text-[#212529]">{totalStoreHours.toLocaleString('fr-FR')} hrs</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center text-[#f08c00] border border-amber-200">
            <BarChart2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Moyenne par Employé</p>
            <p className="text-2xl font-black text-[#212529]">{averageHoursPerEmployee} hrs</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#dee2e6] bg-[#212529] p-6 text-white shadow-xl flex items-center gap-4">
          <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Employés Actifs Suivis</p>
            <p className="text-2xl font-black text-white">{report.length}</p>
          </div>
        </div>
      </div>

      {/* Main Report Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <CrudTable
          title="Bilan des heures travaillées"
          rows={report}
          emptyLabel="Aucune donnée d'heures travaillées enregistrée"
          columns={[
            { key: 'name', label: 'Collaborateur' },
            { key: 'role', label: 'Rôle' },
            { key: 'shiftsCount', label: 'Sessions de pointage' },
            { key: 'totalHours', label: 'Total Heures Travaillées' },
            { key: 'progress', label: 'Progression d\'activité (Seuil 40h/semaine)' }
          ]}
          renderRow={(item) => {
            // Calculate a progress percentage towards e.g. 160 hours standard per month or 40 hours per week
            const weeklyTarget = 40
            const percentage = Math.min(Math.round((item.totalHours / weeklyTarget) * 100), 100)

            return (
              <tr key={item.userId} className="transition hover:bg-[#fafbfc]">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#495057]">{item.name}</span>
                    <span className="text-xs text-[#adb5bd] font-medium">{item.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-[#72788f] uppercase tracking-wider">
                  {item.role}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-[#495057]">
                  {item.shiftsCount} pointage{item.shiftsCount > 1 ? 's' : ''}
                </td>
                <td className="px-6 py-4 text-sm font-black text-[#FF6D00]">
                  {item.totalHours} hrs
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-full bg-[#f1f3f5] rounded-full h-2">
                      <div
                        className="bg-[#212529] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-[#72788f]">{percentage}%</span>
                  </div>
                </td>
              </tr>
            )
          }}
        />
      )}
    </div>
  )
}
