'use client'

import React, { useState, useEffect } from 'react'
import { getStoreSettings } from '@/app/actions/store/storeSettings'
import { printReceiptClient, openCashDrawerClient } from '@/lib/hardware/clientAgent'

type ReceiptItem = {
  name?: string
  quantity: number
  price: number
  options?: string
  priceHT?: number | null
  taxRate?: number | null
  priceTTC?: number | null
  barcode?: string | null
}

function formatOptions(optionsStr?: string | null): string {
  if (!optionsStr) return ''
  try {
    const parsed = JSON.parse(optionsStr)
    if (Array.isArray(parsed)) {
      return parsed
        .map((opt: { name: string; price: number }) => {
          return opt.price > 0 ? `+ ${opt.name} (+${opt.price} FCFA)` : `+ ${opt.name}`
        })
        .join('\n')
    }
  } catch {
    // Notes textuelles brutes
  }
  return optionsStr
}

export type ReceiptOrder = {
  id: string | number
  displayId?: string | number
  total: number
  items: ReceiptItem[]
  isOffline?: boolean
  date?: Date | string
  paymentMode?: string
  paymentType?: string | null
  amountReceived?: number
  changeAmount?: number
  estimatedPrepMinutes?: number | null
  tableId?: string | null
  discount?: number
  cashierName?: string | null
}

interface ReceiptModalProps {
  order: ReceiptOrder
  storeId?: string
  onClose: () => void
}

export function ReceiptModal({ order, storeId, onClose }: ReceiptModalProps) {
  const isPendingSettlement = order.paymentMode === 'A regler en caisse'
  const normalizedPaymentMode = (order.paymentMode || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
  const isCashPayment = order.paymentType === 'CASH' || normalizedPaymentMode === 'ESPECES' || normalizedPaymentMode === 'CASH'
  const orderDate = new Date(order.date || new Date())

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [headerText, setHeaderText] = useState<string | null>(null)
  const [footerText, setFooterText] = useState<string | null>(null)
  const [storeDetails, setStoreDetails] = useState<{
    name: string
    address: string | null
    phone: string | null
    email: string | null
    code: string | null
  } | null>(null)

  useEffect(() => {
    async function loadSettings() {
      if (!storeId) return
      const res = await getStoreSettings(storeId)
      if (res.success && res.settings) {
        setHeaderText(res.settings.receiptHeader || null)
        setFooterText(res.settings.receiptFooter || null)
        setStoreDetails((res.settings as any).store || null)
        if (res.settings.receiptLogo) {
          try {
            const parsed = JSON.parse(res.settings.receiptLogo)
            setLogoPreview(parsed.visual || null)
          } catch {
            setLogoPreview(null)
          }
        }
      }
    }
    void loadSettings()
  }, [storeId])

  function handlePrint() {
    window.print()

    void printReceiptClient(order).catch(() => null)

    if (isCashPayment && !isPendingSettlement) {
      void openCashDrawerClient(order.id, order.total).catch(() => null)
    }
  }

  const formatInvoiceNumber = (displayId?: string | number, orderId?: string | number, date?: Date | string) => {
    const idStr = String(displayId || orderId || '');
    if (/^FAC-\d{4}-\d+$/.test(idStr)) return idStr;

    const d = date ? new Date(date) : new Date();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const YY = String(d.getFullYear()).substring(2);

    const numericPart = parseInt(String(displayId || ''), 10);
    const counter = isNaN(numericPart) ? '00001' : String(numericPart).padStart(5, '0');

    return `FAC-${MM}${YY}-${counter}`;
  }

  const getPaymentLabel = (paymentMode?: string) => {
    if (!paymentMode) return 'Payé'
    const modeUpper = paymentMode.toUpperCase()
    if (modeUpper.includes('ESPECE') || modeUpper.includes('CASH')) {
      return 'Espèces payées'
    }
    if (modeUpper.includes('CARTE') || modeUpper.includes('CARD') || modeUpper.includes('VISA') || modeUpper.includes('MASTER')) {
      return 'Carte payée'
    }
    if (modeUpper.includes('REGLER') || modeUpper.includes('CAISSE')) {
      return 'À régler en caisse'
    }
    return `${paymentMode} payé`
  }

  const formatReceiptDate = (date: Date) => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    const day = String(date.getDate()).padStart(2, '0')
    const month = months[date.getMonth()]
    const year = String(date.getFullYear()).substring(2)
    
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
  }

  const defaultTaxRatePercent = 18.00
  let calculatedSubtotal = 0
  let calculatedTaxTotal = 0
  let totalItemsCount = 0
  const taxBreakdownMap: Record<number, { taxableAmt: number; taxAmt: number }> = {}

  order.items.forEach((item) => {
    totalItemsCount += item.quantity
    const unitTtc = item.priceTTC ?? item.price
    const ratePercent = item.taxRate !== undefined && item.taxRate !== null ? item.taxRate : defaultTaxRatePercent
    const rateDecimal = ratePercent / 100
    const unitHt = item.priceHT !== undefined && item.priceHT !== null
      ? item.priceHT
      : unitTtc / (1 + rateDecimal)

    const itemHt = unitHt * item.quantity
    const itemTtc = unitTtc * item.quantity
    const itemTax = itemTtc - itemHt

    calculatedSubtotal += itemHt
    calculatedTaxTotal += itemTax

    if (!taxBreakdownMap[ratePercent]) {
      taxBreakdownMap[ratePercent] = { taxableAmt: 0, taxAmt: 0 }
    }
    taxBreakdownMap[ratePercent].taxableAmt += itemHt
    taxBreakdownMap[ratePercent].taxAmt += itemTax
  })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
      <div className="receipt-print-area bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-10 duration-500 font-mono text-xs text-gray-800 leading-tight">
        
        {/* En-tête du ticket */}
        <div className="text-center pb-4 mb-4 border-b border-dashed border-gray-300">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="h-12 object-contain mx-auto mb-2" />
          ) : (
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-2">
              <span className="text-white text-lg font-black">POS</span>
            </div>
          )}
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Facture Simplifiée
          </h2>
          <p className="font-bold text-gray-900 mt-1">{storeDetails?.name || 'Samooha Demo Pos Pte Ltd'}</p>
          <p className="text-gray-600 text-[11px]">{storeDetails?.address || 'France'}</p>
          <p className="text-gray-600 text-[11px]">Tel : {storeDetails?.phone || ''}</p>
          <p className="text-gray-600 text-[11px]">Email : {storeDetails?.email || ''}</p>
        </div>

        {/* Métadonnées du ticket */}
        <div className="space-y-1 pb-4 mb-4 border-b border-dashed border-gray-300">
          <div className="flex justify-between">
            <span>Date</span>
            <span>: {formatReceiptDate(orderDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Facture N°</span>
            <span>: {formatInvoiceNumber(order.displayId, order.id, order.date)}</span>
          </div>
        </div>

        {/* Articles */}
        <div className="space-y-3 pb-4 mb-4 border-b border-dashed border-gray-300">
          {order.items.map((item, i) => {
            const unitTtc = item.priceTTC ?? item.price;
            const ratePercent = item.taxRate !== undefined && item.taxRate !== null ? item.taxRate : defaultTaxRatePercent;
            const totalLineTtc = unitTtc * item.quantity;
            return (
              <div key={i} className="flex flex-col">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>
                    {item.barcode ? `${item.barcode} ` : ''}
                    {item.name || 'Produit'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 text-[11px] mt-0.5">
                  <span>
                    {item.quantity} &nbsp;&nbsp;&nbsp; {unitTtc.toFixed(2)} ({ratePercent.toFixed(1)})%
                  </span>
                  <span>
                    {totalLineTtc < 0 ? `(${Math.abs(totalLineTtc).toFixed(2)})` : totalLineTtc.toFixed(2)}
                  </span>
                </div>
                {item.options && (
                  <span className="text-[9px] font-bold text-red-600 uppercase tracking-wide whitespace-pre-line mt-0.5 leading-none">
                    {formatOptions(item.options)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Totaux */}
        <div className="space-y-1 pb-4 mb-4 border-b border-dashed border-gray-300">
          <div className="flex justify-between">
            <span>Nombre d&apos;articles</span>
            <span>{totalItemsCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Montant total</span>
            <span>{(order.total + (order.discount || 0)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Remise promotionnelle totale</span>
            <span>{(order.discount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Remise du vendeur</span>
            <span>0.00</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-dashed border-gray-200">
            <span>Total des ventes</span>
            <span>{order.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 mt-2">
            <span>{getPaymentLabel(order.paymentMode)}</span>
            <span>{order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Ventilation fiscale */}
        <div className="pb-4 mb-4 border-b border-dashed border-gray-300">
          <div className="grid grid-cols-4 font-bold text-gray-900 border-b border-dashed border-gray-200 pb-1 mb-1 text-[11px]">
            <span>TVA</span>
            <span>Taux</span>
            <span className="text-right">Base HT</span>
            <span className="text-right">Montant</span>
          </div>
          <div className="space-y-1 text-gray-600 text-[11px]">
            {Object.entries(taxBreakdownMap).map(([rate, val]) => (
              <div key={rate} className="grid grid-cols-4">
                <span>TVA</span>
                <span>{Number(rate).toFixed(1)}%</span>
                <span className="text-right">{val.taxableAmt.toFixed(2)}</span>
                <span className="text-right">{val.taxAmt.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Serviced By & Code-barres simulé en CSS */}
        <div className="text-center space-y-2 mb-6">
          <p className="text-gray-700 font-bold text-[11px]">
            Vous avez été servi par {order.paymentMode === 'A regler en caisse' ? 'la Caisse' : order.cashierName || 'Cody Weiss'}
          </p>
          
          {headerText && (
            <p className="text-[10px] text-gray-500 whitespace-pre-line leading-tight">{headerText}</p>
          )}
          {footerText && (
            <p className="text-[10px] text-gray-500 whitespace-pre-line leading-tight">{footerText}</p>
          )}

          {/* Code-barres simulé en CSS */}
          <div className="flex justify-center items-center space-x-[1px] h-8 mt-4 overflow-hidden select-none opacity-80">
            {[...Array(46)].map((_, i) => (
              <div
                key={i}
                className="bg-black h-full"
                style={{ width: `${(i % 5 === 0 ? 3 : i % 3 === 0 ? 1 : i % 2 === 0 ? 2 : 1.5)}px` }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="receipt-actions grid grid-cols-2 gap-4">
          <button onClick={handlePrint} className="py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 transition-all text-center">Imprimer</button>
          <button onClick={onClose} className="py-2.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all text-center">Fermer</button>
        </div>

      </div>
    </div>
  )
}
