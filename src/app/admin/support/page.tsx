'use client'

import React, { useState } from 'react'
import { LifeBuoy, Plus, Search, Filter, MessageSquare, AlertTriangle, CheckCircle2, Clock, MoreVertical } from 'lucide-react'

export default function AdminSupport() {
  const [tickets, setTickets] = useState([
    { id: '1', subject: 'Échec de paiement mobile money', restaurant: 'Gourmet Abidjan', status: 'OPEN', priority: 'HIGH', date: 'Il y a 10 min' },
    { id: '2', subject: 'Livreur indisponible pour validation', restaurant: 'Moussa Traoré', status: 'IN_PROGRESS', priority: 'MEDIUM', date: 'Il y a 1h' },
    { id: '3', subject: 'Problème affichage menu KDS', restaurant: 'Burger King Plateau', status: 'CLOSED', priority: 'LOW', date: 'Hier' },
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight uppercase">Support & Assistance</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gestion des incidents et des alertes plateforme</p>
        </div>
        <button className="bg-[#212529] hover:bg-black text-white px-8 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-xl">
          <Plus className="w-5 h-5" />
          Nouveau Ticket
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SupportStat label="Tickets Ouverts" count={12} color="text-[#e03131]" bg="bg-[#fff5f5]" icon={<MessageSquare className="w-5 h-5" />} />
        <SupportStat label="En Cours" count={5} color="text-[#339af0]" bg="bg-[#e7f5ff]" icon={<Clock className="w-5 h-5" />} />
        <SupportStat label="Alertes Automatiques" count={3} color="text-[#fcc419]" bg="bg-[#fff9db]" icon={<AlertTriangle className="w-5 h-5" />} />
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-[2.5rem] border border-[#dee2e6] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-[#f1f3f5] flex items-center justify-between bg-[#fafbfc]">
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
            <input 
              type="text" 
              placeholder="RECHERCHER UN INCIDENT..." 
              className="w-full bg-white border border-[#dee2e6] rounded-xl pl-11 pr-4 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-3 hover:bg-[#f1f3f5] rounded-xl text-[#adb5bd] transition-all border border-transparent hover:border-[#dee2e6]"><Filter className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="divide-y divide-[#f1f3f5]">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="p-8 flex items-center justify-between hover:bg-[#fafbfc] transition-all group cursor-pointer">
              <div className="flex items-center gap-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${ticket.status === 'OPEN' ? 'bg-[#fff5f5] text-[#e03131]' : ticket.status === 'IN_PROGRESS' ? 'bg-[#e7f5ff] text-[#339af0]' : 'bg-[#ebfbee] text-[#51cf66]'}`}>
                  <LifeBuoy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#212529] uppercase tracking-tight leading-tight">{ticket.subject}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-widest">{ticket.restaurant}</span>
                    <div className="w-1 h-1 bg-[#dee2e6] rounded-full" />
                    <span className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-widest">{ticket.date}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="flex flex-col items-end">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${ticket.priority === 'HIGH' ? 'bg-[#fff5f5] text-[#e03131]' : 'bg-[#f1f3f5] text-[#adb5bd]'}`}>
                    Priorité {ticket.priority}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${ticket.status === 'OPEN' ? 'bg-[#e03131]' : ticket.status === 'IN_PROGRESS' ? 'bg-[#339af0]' : 'bg-[#51cf66]'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#212529]">{ticket.status}</span>
                  </div>
                </div>
                <button className="p-2 hover:bg-[#f1f3f5] rounded-lg transition-all text-[#adb5bd] opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 bg-[#fafbfc] text-center">
          <button className="text-[10px] font-black text-[#adb5bd] hover:text-[#212529] uppercase tracking-[0.2em] transition-all">Charger plus d'incidents</button>
        </div>
      </div>
    </div>
  )
}

function SupportStat({ label, count, color, bg, icon }: { label: string, count: number, color: string, bg: string, icon: React.ReactNode }) {
  return (
    <div className={`p-8 rounded-[2rem] border border-[#dee2e6] shadow-sm flex items-center justify-between bg-white overflow-hidden relative`}>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-3xl font-black ${color}`}>{count}</p>
      </div>
      <div className={`p-4 rounded-2xl ${bg} ${color} relative z-10 shadow-sm`}>
        {icon}
      </div>
    </div>
  )
}
