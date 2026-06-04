// src/components/pos/subcomponents/POSModals.tsx
'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { CashierStatsModal } from './CashierStatsModal'
import { ReceiptModal } from './ReceiptModal'
import { PaymentModal } from './PaymentModal'
import ReservationModal from '../ReservationModal'
import { OptionsModal } from './OptionsModal'
import { TableStatusModal } from './TableStatusModal'
import { AlertModal } from './AlertModal'

interface POSModalsProps {
  showSessionStats: boolean
  setShowSessionStats: (val: boolean) => void
  sessionTotal: number
  checkout: any
  showReservationModal: boolean
  setShowReservationModal: (val: boolean) => void
  tableForReservation: any
  storeId: string
  reservations: any[]
  editingOptionsId: string | null
  setEditingOptionsId: (val: string | null) => void
  items: any[]
  updateOptions: any
  showTableStatusModal: any
  setShowTableStatusModal: (val: any) => void
  activeTableOrder: any
  operatorRole: 'CASHIER' | 'SERVER'
  handleMarkOrderServed: () => void
  alertState: any
  setAlertState: (val: any) => void
  onAddItems: (table: any) => void
  onSettlePayment: (table: any, order: any) => void
}

export function POSModals({
  showSessionStats,
  setShowSessionStats,
  sessionTotal,
  checkout,
  showReservationModal,
  setShowReservationModal,
  tableForReservation,
  storeId,
  reservations,
  editingOptionsId,
  setEditingOptionsId,
  items,
  updateOptions,
  showTableStatusModal,
  setShowTableStatusModal,
  activeTableOrder,
  operatorRole,
  handleMarkOrderServed,
  alertState,
  setAlertState,
  onAddItems,
  onSettlePayment,
}: POSModalsProps) {
  const { data: session } = useSession()

  return (
    <>
      {showSessionStats && (
        <CashierStatsModal
          total={sessionTotal}
          cashierName={session?.user?.name || 'Caissier'}
          onClose={() => setShowSessionStats(false)}
        />
      )}

      {checkout.showReceipt && checkout.lastOrder && (
        <ReceiptModal order={checkout.lastOrder} storeId={storeId} onClose={() => checkout.setShowReceipt(false)} />
      )}

      {checkout.showPaymentModal && (
        <PaymentModal
          paymentMethods={checkout.paymentMethods}
          total={checkout.paymentTotal}
          title={checkout.paymentModalTitle}
          showCustomerSection={!checkout.isSettlementFlow}
          showPromoSection={!checkout.isSettlementFlow}
          amountReceived={checkout.amountReceived}
          changeAmount={checkout.changeAmount}
          onKey={(key) => {
            if (key.length > 1) {
              checkout.calculateChange(key)
            } else {
              checkout.calculateChange(checkout.amountReceived + key)
            }
          }}
          onDelete={() => checkout.calculateChange(checkout.amountReceived.slice(0, -1))}
          onClear={() => checkout.calculateChange('')}
          onClose={checkout.closePaymentModal}
          onFinalize={checkout.handleCheckout}
          isProcessing={checkout.isProcessing}
          promoCode={checkout.promoCode}
          onPromoChange={checkout.setPromoCode}
          onApplyPromo={checkout.handleApplyPromo}
          discount={checkout.discount}
          selectedCustomer={checkout.selectedCustomer}
          onCustomerSearch={checkout.handleCustomerSearch}
          customerResults={checkout.customerResults}
          onSelectCustomer={(customer) => checkout.setSelectedCustomer(customer)}
          selectedBills={checkout.selectedBills}
          onAddBill={checkout.onAddBill}
          onRemoveBill={checkout.onRemoveBill}
          onResetBills={checkout.onResetBills}
          roundedTotal={checkout.roundedTotal}
          roundingDiff={checkout.roundingDiff}
        />
      )}


      {showReservationModal && tableForReservation && (
        <ReservationModal
          table={tableForReservation}
          storeId={storeId}
          onClose={() => setShowReservationModal(false)}
          existingReservations={reservations.filter((r) => r.tableId === tableForReservation.id)}
        />
      )}

      {editingOptionsId && (
        <OptionsModal
          item={items.find((item) => item.id === editingOptionsId)!}
          onSave={(options) => {
            updateOptions(editingOptionsId, options)
            setEditingOptionsId(null)
          }}
          onClose={() => setEditingOptionsId(null)}
        />
      )}

      {showTableStatusModal && (
        <TableStatusModal
          table={showTableStatusModal}
          order={activeTableOrder}
          operatorRole={operatorRole}
          onClose={() => setShowTableStatusModal(null)}
          onAddItems={() => onAddItems(showTableStatusModal)}
          onSettlePayment={() => onSettlePayment(showTableStatusModal, activeTableOrder)}
          onMarkServed={handleMarkOrderServed}
        />
      )}

      {alertState && (
        <AlertModal
          type={alertState.type || 'error'}
          title={alertState.title}
          message={alertState.message}
          onClose={() => setAlertState(null)}
        />
      )}
    </>
  )
}
