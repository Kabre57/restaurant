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
}: PaymentModalProps) {
  const defaultMethod = paymentMethods.find(m => m.isDefault)?.name || paymentMethods[0]?.name || 'ESPECES'
  const [mode, setMode] = React.useState<PaymentMode>(defaultMethod)

  const activeMethod = paymentMethods.find(m => m.name === mode)
  const activeMethodType = activeMethod?.type || 'OTHER'

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">
        <PaymentSummaryPanel
          total={total}
          discount={discount + loyaltyDiscount}
          changeAmount={changeAmount}
          mode={mode}
          paymentMethods={paymentMethods}
          isProcessing={isProcessing}
          onModeChange={setMode}
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

