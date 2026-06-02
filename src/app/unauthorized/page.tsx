"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6 bg-white/70 backdrop-blur-xl border border-red-200/40 rounded-[28px] p-8 shadow-2xl shadow-black/5">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-[20px] flex items-center justify-center mx-auto shadow-md">
          <ShieldAlert size={36} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-[#171717]">Accès Interdit</h1>
          <p className="text-[#6B7280] text-sm font-medium">
            Vos droits d'accès sont insuffisants pour consulter cette page. Veuillez contacter votre administrateur si vous pensez qu'il s'agit d'une erreur.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-block w-full py-4 bg-[#171717] hover:bg-black text-white font-extrabold rounded-[16px] shadow-lg transition-all active:scale-[0.98]"
          >
            Se connecter avec un autre compte
          </Link>
        </div>
      </div>
    </div>
  );
}
