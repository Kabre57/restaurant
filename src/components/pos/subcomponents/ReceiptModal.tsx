'use client'

import React from 'react'

type ReceiptItem = {
  name?: string
  quantity: number
  price: number
}

export type ReceiptOrder = {
  id: string | number
  total: number
  items: ReceiptItem[]
  isOffline?: boolean
}

interface ReceiptModalProps {
  order: ReceiptOrder
  onClose: () => void
}

export function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 animate-in slide-in-from-bottom-10 duration-500">
        <div className="text-center border-b border-dashed border-[#dee2e6] pb-6 mb-6">
          <div className="w-16 h-16 bg-[#212529] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-black">POS</span>
          </div>
          <h2 className="text-xl font-black text-[#212529] uppercase tracking-tighter">Ticket de Caisse</h2>
          <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Établissement #01 - Abidjan</p>
        </div>
        
        <div className="space-y-4 mb-8">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-xs font-black text-[#212529] uppercase">{item.name || 'Produit'}</span>
                <span className="text-[10px] font-bold text-[#adb5bd]">x{item.quantity} @ {item.price.toLocaleString()}</span>
              </div>
              <span className="text-xs font-black text-[#212529]">{(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="py-6 border-t border-dashed border-[#dee2e6] space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest">
            <span>Sous-total</span>
            <span>{(order.total * 0.82).toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest">
            <span>TVA (18%)</span>
            <span>{(order.total * 0.18).toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between items-center text-xl font-black text-[#212529] pt-2">
            <span>TOTAL</span>
            <span>{order.total.toLocaleString()} FCFA</span>
          </div>
        </div>

        <div className="bg-[#f8f9fa] rounded-2xl p-4 text-center mb-8">
          <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Merci pour votre visite !</p>
          <span className="text-[9px] font-bold text-[#adb5bd]">{new Date().toLocaleString('fr-FR')}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="py-3 rounded-xl border-2 border-[#dee2e6] text-[10px] font-black uppercase tracking-widest hover:bg-[#f8f9fa] transition-all">Imprimer</button>
          <button onClick={onClose} className="py-3 rounded-xl bg-[#212529] text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Fermer</button>
        </div>
      </div>
    </div>
  )
}
