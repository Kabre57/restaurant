'use client'

type PaymentPromoSectionProps = {
  promoCode: string
  onPromoChange: (value: string) => void
  onApplyPromo: () => void
}

export function PaymentPromoSection({
  promoCode,
  onPromoChange,
  onApplyPromo,
}: PaymentPromoSectionProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#adb5bd]">Promotion</h4>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="CODE PROMO"
          value={promoCode}
          onChange={(event) => onPromoChange(event.target.value.toUpperCase())}
          className="flex-1 bg-white border border-[#e9ecef] rounded-xl px-4 py-3 text-[10px] font-black focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all uppercase"
        />
        <button
          onClick={onApplyPromo}
          className="bg-[#212529] text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
        >
          Appliquer
        </button>
      </div>
    </div>
  )
}
