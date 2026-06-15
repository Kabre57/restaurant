"use client";

import React, { useState } from "react";
import { Check, ArrowRight, X, AlertTriangle } from "lucide-react";

interface DriverStatusButtonsProps {
  status: string;
  onStatusChange: (newStatus: string) => Promise<void>;
  loading?: boolean;
}

export default function DriverStatusButtons({
  status,
  onStatusChange,
  loading = false,
}: DriverStatusButtonsProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (status === "DELIVERED" || status === "CANCELLED") {
    return (
      <div className="text-center p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
        <span className={`text-xs font-bold uppercase tracking-wider ${
          status === "DELIVERED" ? "text-emerald-400" : "text-rose-400"
        }`}>
          Course terminée — {status === "DELIVERED" ? "Livrée" : "Annulée"}
        </span>
      </div>
    );
  }

  const handleUpdate = async (nextStatus: string) => {
    try {
      await onStatusChange(nextStatus);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-3">
      {/* Primary Action Button */}
      {status === "ASSIGNED" && (
        <button
          onClick={() => handleUpdate("PICKED_UP")}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Récupérer la commande (En Cuisine)
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}

      {status === "PICKED_UP" && (
        <button
          onClick={() => handleUpdate("IN_PROGRESS")}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Commencer la livraison (Départ du Resto)
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}

      {status === "IN_PROGRESS" && (
        <button
          onClick={() => handleUpdate("DELIVERED")}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-emerald-650 hover:bg-emerald-600 text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-900/10"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Confirmer la livraison
              <Check className="w-4 h-4" />
            </>
          )}
        </button>
      )}

      {/* Cancel Action */}
      {!confirmCancel ? (
        <button
          onClick={() => setConfirmCancel(true)}
          disabled={loading}
          className="w-full py-2.5 text-xs font-semibold text-rose-500 hover:text-rose-455 transition-colors uppercase tracking-wider"
        >
          Annuler la course
        </button>
      ) : (
        <div className="bg-rose-950/40 border border-rose-900/40 rounded-xl p-3 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-[11px] font-semibold">Annuler cette livraison ?</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setConfirmCancel(false);
                handleUpdate("CANCELLED");
              }}
              disabled={loading}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium py-2 rounded-lg transition-colors"
            >
              Oui, annuler
            </button>
            <button
              onClick={() => setConfirmCancel(false)}
              disabled={loading}
              className="flex-1 bg-slate-800 hover:bg-slate-755 text-slate-300 text-xs font-medium py-2 rounded-lg transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
