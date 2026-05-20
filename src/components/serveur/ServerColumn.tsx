'use client'

import React from 'react'
import { Clock, CheckCircle2, Navigation } from 'lucide-react'

export type OrderStatus = 'EN_ATTENTE' | 'PREPARATION' | 'PRET' | 'SERVED' | 'COMPLETED' | 'CANCELLED'

export function ServerColumn({
  title,
  subtitle,
  orders,
  icon,
  emptyMessage,
  onTransmit,
  showTransmitButton
}: {
  title: string
  subtitle: string
  orders: any[]
  icon: React.ReactNode
  emptyMessage: string
  onTransmit?: (orderId: string) => void
  showTransmitButton?: boolean
}) {
  return (
    <div className="flex w-full min-w-[320px] max-w-sm flex-col rounded-2xl bg-[#F8F9FA] shadow-sm border border-[#E5E7EB]">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] p-4 bg-white rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6D00]/10 text-[#FF6D00]">
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">{title}</h2>
            <p className="text-[10px] font-medium text-[#868e96]">{subtitle}</p>
          </div>
        </div>
        <div className="flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-[#F8F9FA] px-2 text-[10px] font-black text-[#868e96] border border-[#E5E7EB]">
          {orders.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {orders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-[#868e96]">
            <div className="mb-3 rounded-2xl bg-white p-4 border border-[#E5E7EB]">
              <CheckCircle2 className="h-6 w-6 text-[#adb5bd]" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">{emptyMessage}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => {
              const waitTime = order.preparationStartedAt 
                ? Math.floor((new Date().getTime() - new Date(order.preparationStartedAt).getTime()) / 60000)
                : 0

              return (
                <div key={order.id} className="group flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition-all hover:border-[#FF6D00] hover:shadow-md">
                  <div className="flex items-center justify-between border-b border-[#F8F9FA] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-[#212529] px-2 py-1 text-[10px] font-black text-white">
                        #{order.id.slice(-4)}
                      </span>
                      {order.table && (
                        <span className="rounded-lg bg-[#FF6D00]/10 px-2 py-1 text-[10px] font-black text-[#FF6D00] border border-[#FF6D00]/20">
                          Table {order.table.number}
                        </span>
                      )}
                    </div>
                    {order.status === 'PREPARATION' && waitTime > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#FF6D00]">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{waitTime} min</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span className="font-medium text-[#212529]">
                          <span className="mr-2 font-black text-[#FF6D00]">{item.quantity}x</span>
                          {item.product?.name || 'Produit'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {showTransmitButton && onTransmit && (
                    <button
                      onClick={() => onTransmit(order.id)}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6D00] py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#E66200] shadow-sm shadow-orange-500/10"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Transmettre à la caisse
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
