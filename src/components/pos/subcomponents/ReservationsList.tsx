'use client'

import React from 'react'
import { Reservation } from '@prisma/client'

interface ReservationsListProps {
  reservations: Reservation[]
}

export function ReservationsList({ reservations }: ReservationsListProps) {
  const sorted = [...reservations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="flex-1 p-10 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-[#212529] uppercase tracking-tighter mb-10">Réservations du Jour</h2>
        <div className="space-y-4">
          {sorted.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] text-center border border-[#e9ecef] shadow-sm">
              <p className="font-black text-[#adb5bd] uppercase tracking-widest text-sm">Aucune réservation pour le moment</p>
            </div>
          ) : (
            sorted.map(res => (
              <div key={res.id} className="bg-white p-6 rounded-[2rem] border border-[#e9ecef] shadow-sm hover:shadow-xl transition-all flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-[#f8f9fa] rounded-2xl flex flex-col items-center justify-center border border-[#e9ecef]">
                    <span className="text-[10px] font-black text-[#adb5bd] uppercase">{new Date(res.date).toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                    <span className="text-xl font-black text-[#212529]">{new Date(res.date).getHours()}:{new Date(res.date).getMinutes().toString().padStart(2, '0')}</span>
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-[#212529] uppercase tracking-tight">{res.customerName}</h4>
                    <p className="text-xs font-bold text-[#adb5bd] uppercase tracking-widest">{res.phone} • {res.guests} Personnes</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    res.status === 'CONFIRMED' ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#fff4e6] text-[#f08c00]'
                  }`}>
                    {res.status}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
