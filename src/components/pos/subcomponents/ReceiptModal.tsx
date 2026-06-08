'use client'

import React, { useState, useEffect } from 'react'
import { getStoreSettings } from '@/app/actions/store/storeSettings'

type ReceiptItem = {
  name?: string
  quantity: number
  price: number
}

export type ReceiptOrder = {
  id: string | number
  displayId?: string | number
  total: number
  items: ReceiptItem[]
  isOffline?: boolean
  date?: Date | string
  paymentMode?: string
  amountReceived?: number
  changeAmount?: number
  estimatedPrepMinutes?: number | null
}

interface ReceiptModalProps {
  order: ReceiptOrder
  storeId?: string
  onClose: () => void
}

export function ReceiptModal({ order, storeId, onClose }: ReceiptModalProps) {
  const isPendingSettlement = order.paymentMode === 'A regler en caisse'
  const orderDate = new Date(order.date || new Date())
  const subtotal = Math.round(order.total / 1.18)
  const tax = order.total - subtotal

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [headerText, setHeaderText] = useState<string | null>(null)
  const [footerText, setFooterText] = useState<string | null>(null)

  useEffect(() => {
    async function loadSettings() {
      if (!storeId) return
      const res = await getStoreSettings(storeId)
      if (res.success && res.settings) {
        setHeaderText(res.settings.receiptHeader || null)
        setFooterText(res.settings.receiptFooter || null)
        if (res.settings.receiptLogo) {
          try {
            const parsed = JSON.parse(res.settings.receiptLogo)
            setLogoPreview(parsed.visual || null)
          } catch (e) {
            setLogoPreview(null)
          }
        }
      }
    }
    void loadSettings()
  }, [storeId])

  async function handlePrint() {
    await fetch('/api/hardware/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    }).catch(() => null)

    if (order.paymentMode === 'ESPECES' && !isPendingSettlement) {
      await fetch('/api/hardware/cash-drawer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, total: order.total }),
      }).catch(() => null)
    }

    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
      <div className="receipt-print-area bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 animate-in slide-in-from-bottom-10 duration-500 font-sans">
        <div className="text-center border-b border-dashed border-[#dee2e6] pb-6 mb-6">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="h-16 object-contain mx-auto mb-4" />
          ) : (
            <div className="w-16 h-16 bg-[#212529] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-black">POS</span>
            </div>
          )}
          <h2 className="text-xl font-black text-[#212529] uppercase tracking-tighter">
            {isPendingSettlement ? 'Bon de Commande' : 'Ticket de Caisse'}
          </h2>
          <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Commande #{order.displayId || order.id}</p>
          {headerText && (
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-2 whitespace-pre-line leading-tight">
              {headerText}
            </p>
          )}
        </div>

        {(isPendingSettlement || order.estimatedPrepMinutes) && (
          <div className="bg-[#f8f9fa] rounded-2xl p-4 mb-6 space-y-2 border border-[#e9ecef]">
            {isPendingSettlement && (
              <p className="text-[10px] font-black text-[#f08c00] uppercase tracking-widest">
                Paiement en attente - a regler en caisse
              </p>
            )}
            {order.estimatedPrepMinutes ? (
              <p className="text-[10px] font-black text-[#495057] uppercase tracking-widest">
                Preparation estimee: ~ {order.estimatedPrepMinutes} min
              </p>
            ) : null}
          </div>
        )}
        
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
            <span>{subtotal.toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest">
            <span>TVA (18%)</span>
            <span>{tax.toLocaleString()} FCFA</span>
          </div>
          {order.paymentMode && (
            <div className="flex justify-between items-center text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest">
              <span>Paiement</span>
              <span>{order.paymentMode}</span>
            </div>
          )}
          {typeof order.amountReceived === 'number' && (
            <div className="flex justify-between items-center text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest">
              <span>Reçu</span>
              <span>{order.amountReceived.toLocaleString()} FCFA</span>
            </div>
          )}
          {typeof order.changeAmount === 'number' && (
            <div className="flex justify-between items-center text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest">
              <span>Monnaie</span>
              <span>{order.changeAmount.toLocaleString()} FCFA</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xl font-black text-[#212529] pt-2">
            <span>TOTAL</span>
            <span>{order.total.toLocaleString()} FCFA</span>
          </div>
        </div>

        <div className="bg-[#f8f9fa] rounded-2xl p-4 text-center mb-8 space-y-1">
          {footerText ? (
            <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest whitespace-pre-line leading-tight">{footerText}</p>
          ) : (
            <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Merci pour votre visite !</p>
          )}
          <span className="text-[9px] font-bold text-[#adb5bd]">{orderDate.toLocaleString('fr-FR')}</span>
        </div>

        <div className="receipt-actions grid grid-cols-2 gap-4">
          <button onClick={() => void handlePrint()} className="py-3 rounded-xl border-2 border-[#dee2e6] text-[10px] font-black uppercase tracking-widest hover:bg-[#f8f9fa] transition-all">Imprimer</button>
          <button onClick={onClose} className="py-3 rounded-xl bg-[#212529] text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Fermer</button>
        </div>
      </div>
    </div>
  )
}
