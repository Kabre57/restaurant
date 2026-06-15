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
      icon: <CreditCard className="h-5 w-5 text-indigo-500" />,
      colorClass: "border-indigo-200 bg-indigo-50/20 text-indigo-700",
      activeColorClass: "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/50",
    },
    {
      id: "ORANGE_MONEY" as const,
      name: "Orange Money",
      description: "Paiement Mobile via Orange Money",
      icon: <Smartphone className="h-5 w-5 text-orange-500" />,
      colorClass: "border-orange-200 bg-orange-50/20 text-orange-700",
      activeColorClass: "ring-2 ring-orange-500 border-orange-500 bg-orange-50/50",
    },
    {
      id: "MTN_MONEY" as const,
      name: "MTN MoMo",
      description: "Paiement Mobile via MTN Mobile Money",
      icon: <Smartphone className="h-5 w-5 text-yellow-600" />,
      colorClass: "border-yellow-200 bg-yellow-50/20 text-yellow-800",
      activeColorClass: "ring-2 ring-yellow-500 border-yellow-500 bg-yellow-50/50",
    },
  ];

  return (
    <div className="space-y-3">
      <label className="text-sm font-bold text-gray-700 block mb-1">
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
              className={`relative flex flex-col justify-between rounded-xl border p-4 text-left shadow-sm transition-all cursor-pointer hover:border-gray-300 focus:outline-none ${
                isSelected ? method.activeColorClass : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="rounded-lg p-2 bg-gray-50 border border-gray-100">
                  {method.icon}
                </div>
                {isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-800">{method.name}</h4>
                <p className="mt-1 text-xs text-gray-500 line-clamp-1">{method.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
