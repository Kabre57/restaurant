import React from "react";
import { CheckoutForm } from "@/components/ecommerce/CheckoutForm";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const revalidate = 0;

export default function CheckoutPage() {
  return (
    <div className="barab-page min-h-screen pb-20">
      <div className="breadcumb-wrapper py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-end sm:justify-between">
          <Link
            href="/menu"
            className="th-btn th-btn--secondary w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au menu
          </Link>
          
          <div className="th-badge w-fit border-white/15 bg-white/10 text-white">
            <ShieldCheck className="h-4 w-4" />
            Paiement sécurisé
          </div>
        </div>
      </div>

      <CheckoutForm />
    </div>
  );
}
