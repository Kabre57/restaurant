'use client'

import React from 'react'
import { X } from 'lucide-react'

import type { PaymentMode } from '../lib/pos-helpers'
import type { PaymentModalProps } from '../lib/payment-types'
import { PaymentCashPanel } from './payment-modal/PaymentCashPanel'
import { PaymentCardPanel } from './payment-modal/PaymentCardPanel'
import { PaymentMobilePanel } from './payment-modal/PaymentMobilePanel'
import { PaymentCustomerSection } from './payment-modal/PaymentCustomerSection'
import { PaymentPromoSection } from './payment-modal/PaymentPromoSection'
import { PaymentSummaryPanel } from './payment-modal/PaymentSummaryPanel'
import AddressAutocomplete from '../../delivery/AddressAutocomplete'

const DEFAULT_PAYMENT_METHODS = [
  { id: 'default-cash', name: 'Espèces', type: 'CASH', icon: '💵', isDefault: true, isActive: true },
  { id: 'default-card', name: 'Carte Bancaire', type: 'CARD', icon: '💳', isDefault: false, isActive: true },
  { id: 'default-mobile', name: 'Mobile Money', type: 'MOBILE_MONEY', icon: '📱', isDefault: false, isActive: true },
]

export function PaymentModal({
  paymentMethods,
  total,
  title = 'Paiement de la commande',
  showCustomerSection = true,
  showPromoSection = true,
  amountReceived,
  changeAmount,
  onKey,
  onDelete,
  onClear,
  onClose,
  onFinalize,
  isProcessing,
  promoCode,
  onPromoChange,
  onApplyPromo,
  discount,
  loyaltyPointsRedeemed = 0,
  onLoyaltyPointsRedeemedChange,
  loyaltyDiscount = 0,
  selectedCustomer,
  onCustomerSearch,
  customerResults,
  onSelectCustomer,
  selectedBills,
  onAddBill,
  onRemoveBill,
  onResetBills,
  roundedTotal,
  roundingDiff,
  orderType = 'DINE_IN',
  onOrderTypeChange,
  deliveryAddress,
  onDeliveryAddressChange,
  deliveryClientName,
  onDeliveryClientNameChange,
  deliveryClientPhone,
  onDeliveryClientPhoneChange,
  deliveryFee,
  deliveryDistanceKm,
  deliveryDurationMins,
  handleAddressSelect,
}: PaymentModalProps) {
  const availablePaymentMethods = React.useMemo(() => {
    const activeMethods = paymentMethods.filter((method) => method.isActive !== false)
    return activeMethods.length > 0 ? activeMethods : DEFAULT_PAYMENT_METHODS
  }, [paymentMethods])

  const defaultMethod = availablePaymentMethods.find(m => m.isDefault)?.name || availablePaymentMethods[0]?.name || 'Espèces'
  const [selectedMode, setSelectedMode] = React.useState<PaymentMode | null>(null)
  const mode = selectedMode && availablePaymentMethods.some((method) => method.name === selectedMode)
    ? selectedMode
    : defaultMethod

  const activeMethod = availablePaymentMethods.find(m => m.name === mode)
  const activeMethodType = activeMethod?.type || 'OTHER'

  React.useEffect(() => {
    if (selectedCustomer) {
      const fullName = `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
      onDeliveryClientNameChange?.(fullName)
      if (selectedCustomer.phone) {
        onDeliveryClientPhoneChange?.(selectedCustomer.phone)
      }
    }
  }, [selectedCustomer, onDeliveryClientNameChange, onDeliveryClientPhoneChange])

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">
        <PaymentSummaryPanel
          total={total}
          discount={discount + loyaltyDiscount}
          changeAmount={changeAmount}
          mode={mode}
          paymentMethods={availablePaymentMethods}
          isProcessing={isProcessing}
          onModeChange={setSelectedMode}
          onFinalize={() => onFinalize(mode)}
        />

        <div className="p-8 md:w-1/2 flex flex-col gap-5 relative bg-[#f8f9fa] overflow-y-auto custom-scrollbar max-h-[90vh]">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-[#adb5bd] hover:text-[#212529] transition-all z-10">
            <X className="w-6 h-6" />
          </button>

          <div className="pr-12">
            <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Contexte</p>
            <h3 className="text-xl font-black text-[#212529] tracking-tight mt-2">{title}</h3>
          </div>

          {/* Type de Commande Switcher */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#adb5bd]">Type de Commande</h4>
            <div className="grid grid-cols-3 gap-2 bg-[#e9ecef] p-1 rounded-xl">
              {[
                { id: 'DINE_IN', label: 'Sur place' },
                { id: 'TAKEAWAY', label: 'À emporter' },
                { id: 'DELIVERY', label: 'Livraison' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onOrderTypeChange?.(t.id as any)}
                  className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    orderType === t.id
                      ? 'bg-white text-[#212529] shadow-sm'
                      : 'text-[#868e96] hover:text-[#495057]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Details Form */}
          {orderType === 'DELIVERY' && (
            <div className="bg-white border border-[#e9ecef] rounded-2xl p-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Détails de Livraison</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#868e96]">Nom du Client</label>
                  <input
                    type="text"
                    value={deliveryClientName}
                    onChange={(e) => onDeliveryClientNameChange?.(e.target.value)}
                    placeholder="Nom du client"
                    className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-2.5 text-xs text-[#212529] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#868e96]">Téléphone</label>
                  <input
                    type="text"
                    value={deliveryClientPhone}
                    onChange={(e) => onDeliveryClientPhoneChange?.(e.target.value)}
                    placeholder="Téléphone"
                    className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-2.5 text-xs text-[#212529] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#868e96]">Adresse de Livraison</label>
                <AddressAutocomplete
                  value={deliveryAddress || ''}
                  onChange={(val) => {
                    onDeliveryAddressChange?.(val);
                    void handleAddressSelect?.(val);
                  }}
                  lightTheme={true}
                />
              </div>

              {deliveryDistanceKm !== undefined && deliveryDistanceKm !== null && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex justify-between items-center text-[10px] font-semibold text-indigo-700">
                  <span>Distance: {deliveryDistanceKm.toFixed(1)} km</span>
                  <span>Temps estimé: {deliveryDurationMins} mins</span>
                  <span className="font-bold text-indigo-900">Frais: {deliveryFee?.toLocaleString() ?? '0'} FCFA</span>
                </div>
              )}
            </div>
          )}

          {/* On garde ici les briques de contexte client et remise, separees du resume paiement. */}
          {showCustomerSection && (
            <PaymentCustomerSection
              selectedCustomer={selectedCustomer}
              customerResults={customerResults}
              onCustomerSearch={onCustomerSearch}
              onSelectCustomer={onSelectCustomer}
              loyaltyPointsRedeemed={loyaltyPointsRedeemed}
              onLoyaltyPointsRedeemedChange={onLoyaltyPointsRedeemedChange}
              loyaltyDiscount={loyaltyDiscount}
            />
          )}

          {showPromoSection && (
            <PaymentPromoSection
              promoCode={promoCode}
              onPromoChange={onPromoChange}
              onApplyPromo={onApplyPromo}
            />
          )}

          {activeMethodType === 'CASH' && (
            <PaymentCashPanel
              amountReceived={amountReceived}
              onKey={onKey}
              onDelete={onDelete}
              onClear={onClear}
              selectedBills={selectedBills}
              onAddBill={onAddBill}
              onRemoveBill={onRemoveBill}
              onResetBills={onResetBills}
              total={total}
              roundedTotal={roundedTotal}
              roundingDiff={roundingDiff}
              changeAmount={changeAmount}
              onFinalize={() => onFinalize(mode)}
            />
          )}
          {activeMethodType === 'CARD' && (
            <PaymentCardPanel
              amountReceived={amountReceived}
              onKey={onKey}
              onDelete={onDelete}
              onClear={onClear}
              selectedBills={selectedBills}
              onAddBill={onAddBill}
              onRemoveBill={onRemoveBill}
              onResetBills={onResetBills}
            />
          )}
          {activeMethodType === 'MOBILE_MONEY' && (
            <PaymentMobilePanel
              amountReceived={amountReceived}
              onKey={onKey}
              onDelete={onDelete}
              onClear={onClear}
              selectedBills={selectedBills}
              onAddBill={onAddBill}
              onRemoveBill={onRemoveBill}
              onResetBills={onResetBills}
            />
          )}
        </div>
      </div>
    </div>
  )
}
