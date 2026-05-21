import React from 'react'
import { Bell, Info, AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminNotificationsPage() {
  // Let's design some beautiful real mock dynamic notifications for System Alerts!
  const notifications = [
    {
      id: 1,
      title: 'Alerte Stock critique - Ingrédient "Poulet filet"',
      message: 'Le restaurant "Le Burger Doré - Paris 1er" a atteint le stock minimum (2.5 kg restants). Un réapprovisionnement est requis.',
      type: 'WARNING',
      time: 'Il y a 10 min',
      store: 'Paris 1er'
    },
    {
      id: 2,
      title: 'Demande de connexion plateforme externe Glovo',
      message: 'Une demande de configuration d\'API automatique a été reçue pour la succursale de Lyon.',
      type: 'INFO',
      time: 'Il y a 2 heures',
      store: 'Lyon'
    },
    {
      id: 3,
      title: 'Paiement en attente de validation - Wave Mobile Money',
      message: 'Un paiement de 12,500 FCFA pour la table 5 (Marseille) nécessite une double vérification.',
      type: 'CRITICAL',
      time: 'Il y a 3 heures',
      store: 'Marseille'
    },
    {
      id: 4,
      title: 'Sauvegarde automatique de la base de données réussie',
      message: 'La base de données PostgreSQL de production a été sauvegardée avec succès sur le serveur AWS S3 de backup.',
      type: 'SUCCESS',
      time: 'Ce matin à 04:00',
      store: 'Global'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">CENTRE DE VIGILANCE</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-black sm:text-4xl">
            Notifications Système
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#868e96]">
            Supervisez les alertes automatiques des serveurs, les incidents matériels et les requêtes administratives.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* KPI 1 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Alertes Actives</span>
            <div className="rounded-xl bg-[#FF6D00]/10 p-2.5 text-[#FF6D00]">
              <Bell className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">3</span>
            <span className="text-xs font-bold text-red-600">Non lues</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Incidents Critiques</span>
            <div className="rounded-xl bg-red-500/10 p-2.5 text-red-500">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-red-600">1</span>
            <span className="text-xs font-black text-red-600 uppercase tracking-widest">Urgent</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Taux de résolution</span>
            <div className="rounded-xl bg-green-500/10 p-2.5 text-green-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">100%</span>
            <span className="text-xs font-bold text-green-600">Optimal</span>
          </div>
        </div>
      </div>

      {/* Notifications List Section */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
        <h2 className="text-base font-black text-black mb-6">Flux d'événements du système</h2>

        <div className="space-y-4">
          {notifications.map((notif) => {
            const isWarning = notif.type === 'WARNING'
            const isCritical = notif.type === 'CRITICAL'
            const isSuccess = notif.type === 'SUCCESS'

            return (
              <div
                key={notif.id}
                className="flex items-start gap-4 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-5 hover:bg-white hover:border-[#FF6D00] transition-all"
              >
                <div className={`rounded-xl p-2.5 shrink-0 F CFA {
                  isCritical ? 'bg-red-500/10 text-red-500' :
                  isWarning ? 'bg-amber-500/10 text-amber-500' :
                  isSuccess ? 'bg-green-500/10 text-green-500' :
                  'bg-blue-500/10 text-blue-500'
                }`}>
                  {isCritical ? <ShieldAlert className="h-5 w-5" /> :
                    isWarning ? <AlertTriangle className="h-5 w-5" /> :
                      isSuccess ? <CheckCircle2 className="h-5 w-5" /> :
                        <Info className="h-5 w-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-xs font-black text-black leading-tight">{notif.title}</h3>
                    <span className="text-[10px] font-bold text-[#868e96] whitespace-nowrap">{notif.time}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-[#868e96] leading-relaxed">{notif.message}</p>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-lg bg-white border border-[#E5E7EB] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#FF6D00]">
                      {notif.store}
                    </span>
                    <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest F CFA {
                      isCritical ? 'bg-red-100 text-red-700' :
                      isWarning ? 'bg-amber-100 text-amber-700' :
                      isSuccess ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {notif.type}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
