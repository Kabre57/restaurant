"use client";

import React from "react";
import { CreditCard, Smartphone, Check } from "lucide-react";

type PaymentMethodType = "CARD" | "ORANGE_MONEY" | "MTN_MONEY";

type PaymentMethodSelectorProps = {
  selected: PaymentMethodType;
  onChange: (method: PaymentMethodType) => void;
};

export function PaymentMethodSelector({ selected, onChange }: PaymentMethodSelectorProps) {
  const methods = [
    {
      id: "CARD" as const,
      name: "Carte Bancaire",
      description: "Visa, Mastercard via Stripe",
      icon: <CreditCard className="h-5 w-5 text-[var(--parabellum-primary)]" />,
    },
    {
      id: "ORANGE_MONEY" as const,
      name: "Orange Money",
      description: "Paiement Mobile via Orange Money",
      icon: <Smartphone className="h-5 w-5 text-[var(--parabellum-warning)]" />,
    },
    {
      id: "MTN_MONEY" as const,
      name: "MTN MoMo",
      description: "Paiement Mobile via MTN Mobile Money",
      icon: <Smartphone className="h-5 w-5 text-[var(--parabellum-success)]" />,
    },
  ];

  return (
    <div className="space-y-3">
      <label className="mb-1 block text-sm font-semibold text-[var(--parabellum-text)]">
        Moyen de paiement
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {methods.map((method) => {
          const isSelected = selected === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onChange(method.id)}
              className={`relative flex flex-col justify-between rounded-[1rem] border p-4 text-left transition-all focus:outline-none ${
                isSelected
                  ? 'border-[rgba(235,20,0,0.28)] bg-[rgba(235,20,0,0.06)] shadow-[0_14px_28px_rgba(18,18,18,0.08)]'
                  : 'border-[var(--parabellum-border)] bg-[var(--parabellum-card)] hover:-translate-y-0.5 hover:bg-[#fffaf5]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="rounded-full border border-[var(--parabellum-border)] bg-[#fffaf5] p-2">
                  {method.icon}
                </div>
                {isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--parabellum-primary)] text-white">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-bold uppercase tracking-wide text-[var(--parabellum-text)]" style={{ fontFamily: 'var(--title-font)' }}>{method.name}</h4>
                <p className="mt-1 line-clamp-1 text-xs text-[var(--parabellum-muted)]">{method.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
