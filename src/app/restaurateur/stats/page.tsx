'use client'

import React, { useState, useEffect } from 'react'
import { getStoreOrders } from '@/app/actions/orders'
import { useSession } from 'next-auth/react'
import { Loader2, TrendingUp, DollarSign, ShoppingBag, Calendar, ArrowUpRight } from 'lucide-react'
import { format } from 'date-fns'

type StatsOrder = {
  status: string
  total: number
  createdAt: Date | string
}

export default function RestaurateurStats() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<StatsOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    const storeId = session?.user?.storeId
    if (!storeId) return
    const activeStoreId = storeId

    let isCancelled = false

    async function fetchStats() {
      setLoading(true)
      const data = await getStoreOrders(activeStoreId)
      if (isCancelled) return
      setOrders(data as StatsOrder[])
      setLoading(false)
    }

    void fetchStats()

    return () => {
      isCancelled = true
    }
  }, [session?.user?.storeId])

  // Calculate total metrics (all time)
  const completedOrders = orders.filter(o => o.status !== 'CANCELLED')
  const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0)
  const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0

  // Calculate selected date metrics
  const targetDate = new Date(selectedDate)
  targetDate.setHours(0, 0, 0, 0)
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  const dateOrders = completedOrders.filter(o => {
    const orderDate = new Date(o.createdAt)
    return orderDate >= targetDate && orderDate <= endOfDay
  })
  
  const dateRevenue = dateOrders.reduce((sum, order) => sum + order.total, 0)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Performance</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Tableau de bord et indicateurs clés</p>
        </div>
        <div className="flex w-full items-center gap-4 rounded-2xl border border-[#dee2e6] bg-white px-5 py-3 shadow-sm sm:w-auto sm:px-6">
          <Calendar className="w-5 h-5 text-[#adb5bd]" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Période d&apos;analyse</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-black text-[#212529] uppercase tracking-widest focus:outline-none bg-transparent cursor-pointer"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <div className="bg-white p-6 rounded-[2rem] border border-[#dee2e6] shadow-sm flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#ebfbee] rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#ebfbee] text-[#2f9e44] flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Chiffre d&apos;affaires</p>
                  <h3 className="text-2xl font-black text-[#212529]">{totalRevenue.toLocaleString()} FCFA</h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-[#dee2e6] shadow-sm flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#e7f5ff] rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#e7f5ff] text-[#1c7ed6] flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Total Commandes</p>
                  <h3 className="text-2xl font-black text-[#212529]">{completedOrders.length}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-[#dee2e6] shadow-sm flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#f3f0ff] rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#f3f0ff] text-[#845ef7] flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Panier Moyen</p>
                  <h3 className="text-2xl font-black text-[#212529]">{Math.round(averageOrderValue).toLocaleString()} FCFA</h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-[#dee2e6] shadow-sm flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#fff0f6] rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#fff0f6] text-[#e64980] flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Recettes de la journée</p>
                  <h3 className="text-2xl font-black text-[#212529]">{dateRevenue.toLocaleString()} FCFA</h3>
                  <p className="text-[9px] font-bold text-[#adb5bd] mt-1 uppercase tracking-widest">{dateOrders.length} commandes traitées</p>
                </div>
              </div>
            </div>
          </div>

          {/* Simple Chart / Insights Placeholder */}
          <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm sm:rounded-[2.5rem] sm:p-10">
            <h3 className="text-lg font-black text-[#212529] uppercase tracking-tight mb-8">Aperçu Récent</h3>
            <div className="flex flex-col items-center justify-center py-10 text-[#adb5bd] gap-4 bg-[#f8f9fa] rounded-[2rem] border border-dashed border-[#dee2e6]">
              <TrendingUp className="w-12 h-12 opacity-20" />
              <p className="text-xs font-black uppercase tracking-widest">Les graphiques détaillés seront disponibles après plus d&apos;activité.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
