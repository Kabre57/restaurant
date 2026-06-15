import React from "react";
import { CheckoutForm } from "@/components/ecommerce/CheckoutForm";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const revalidate = 0;

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header simple */}
      <div className="bg-white border-b border-gray-100 py-6">
        <div className="mx-auto max-w-5xl px-4 flex items-center justify-between">
          <Link
            href="/menu"
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au menu
          </Link>
          
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            Paiement 100% sécurisé
          </div>
        </div>
      </div>

      <CheckoutForm />
    </div>
  );
}
