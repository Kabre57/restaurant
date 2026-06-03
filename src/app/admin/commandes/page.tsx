import React from 'react'
import { prisma } from '@/lib/db'
import { ShoppingBag, Clock, CheckCircle2, AlertCircle, Search } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  // Fetch real order metrics from database
  const [totalOrdersCount, pendingOrdersCount, completedOrdersCount, orders] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'EN_ATTENTE' } }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.order.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        store: { select: { name: true } },
        table: { select: { number: true } }
      }
    })
  ])

  // Calculate dynamic stats
  const averageValue = orders.length > 0
    ? Math.round(orders.reduce((sum, o) => sum + o.total, 0) / orders.length)
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">SUPERVISION GLOBALE</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-black sm:text-4xl">
          Suivi des Commandes
        </h1>
        <p className="mt-2 text-sm font-semibold text-[#868e96]">
          Visualisez, suivez et contrôlez l'état de toutes les commandes passées dans vos succursales en temps réel.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Commandes totales</span>
            <div className="rounded-xl bg-[#FF6D00]/10 p-2.5 text-[#FF6D00]">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{totalOrdersCount}</span>
            <span className="text-xs font-bold text-green-600">+10%</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">En attente</span>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{pendingOrdersCount}</span>
            <span className="text-xs font-bold text-[#868e96]">A traiter</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Terminées</span>
            <div className="rounded-xl bg-green-500/10 p-2.5 text-green-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{completedOrdersCount}</span>
            <span className="text-xs font-bold text-green-600">Servies</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Panier Moyen</span>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-500">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{averageValue.toLocaleString()} F CFA </span>
            <span className="text-xs font-bold text-blue-600">Global</span>
          </div>
        </div>
      </div>

      {/* Orders Table Section */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-base font-black text-black">Historique des transactions récents</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#adb5bd]" />
            <input
              type="text"
              placeholder="Rechercher une commande..."
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-2 pl-10 pr-4 text-xs font-bold text-black outline-none placeholder-[#adb5bd] focus:border-[#FF6D00]"
            />
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] py-16 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-[#adb5bd]" />
            <p className="mt-4 text-sm font-black text-black">Aucune commande enregistrée</p>
            <p className="text-xs font-bold text-[#868e96]">Les commandes de vos clients s'afficheront ici automatiquement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-[#495057]">
              <thead>
                <tr className="border-b border-[#F0F1F6] text-[10px] font-black uppercase tracking-widest text-[#868e96]">
                  <th className="pb-4">Référence ID</th>
                  <th className="pb-4">Restaurant</th>
                  <th className="pb-4">Table</th>
                  <th className="pb-4">Client</th>
                  <th className="pb-4">Montant</th>
                  <th className="pb-4">Méthode</th>
                  <th className="pb-4">Statut</th>
                  <th className="pb-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F6]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F8F9FA]/50 transition-colors">
                    <td className="py-4 font-black text-black">#{order.id.slice(-6).toUpperCase()}</td>
                    <td className="py-4 font-bold text-black">{order.store.name}</td>
                    <td className="py-4">
                      {order.table ? (
                        <span className="rounded-lg bg-[#FF6D00]/10 px-2 py-1 font-bold text-[#FF6D00]">
                          Table {order.table.number}
                        </span>
                      ) : (
                        <span className="text-[#868e96] font-bold">A emporter</span>
                      )}
                    </td>
                    <td className="py-4 font-bold text-black">{order.customerName || 'Client QR Code'}</td>
                    <td className="py-4 font-black text-[#FF6D00]">{order.total.toLocaleString()} F CFA </td>
                    <td className="py-4">
                      <span className="rounded-lg bg-[#F8F9FA] border border-[#E5E7EB] px-2 py-1 font-bold text-black">
                        {order.type}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest F CFA {
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        order.status === 'EN_ATTENTE' ? 'bg-amber-100 text-amber-700' :
                        order.status === 'PREPARATION' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 text-[#868e96]">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
