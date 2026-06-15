"use client";

import React, { useState, useEffect } from "react";
import { Reservation, Table } from "@prisma/client";
import { Calendar, Phone, Users, Clock, Check, X, RefreshCw, UserCheck } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ReservationsListProps {
  reservations: Reservation[];
  storeId: string;
}

export function ReservationsList({ reservations: initialReservations, storeId }: ReservationsListProps) {
  const toast = useToast();
  const [reservations, setReservations] = useState<any[]>(initialReservations);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);

  // Load and refresh reservations
  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/booking/reservations?storeId=${storeId}&date=${dateFilter}`);
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (err) {
      console.error("Failed to load reservations in cashier UI", err);
      toast("Erreur de synchronisation des réservations", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();

    // Subscribe to booking SSE events to keep cashier UI synced
    const eventSource = new EventSource(`/api/booking/events?storeId=${storeId}`);
    eventSource.onmessage = () => {
      fetchReservations();
    };

    return () => {
      eventSource.close();
    };
  }, [storeId, dateFilter]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/booking/reservations/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          utilisateur: "Caissier POS",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue");
      }

      toast(`Réservation mise à jour : ${newStatus}`, "success");
      fetchReservations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      toast(msg, "error");
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">
              Planning des Réservations
            </h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
              Visualisez et gérez les réservations de la journée.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
            />
            <button
              onClick={fetchReservations}
              disabled={loading}
              className="p-2.5 bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {reservations.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-[2rem] text-center border border-slate-200 dark:border-slate-800">
              <p className="font-black text-slate-400 uppercase tracking-widest text-sm">
                Aucune réservation pour ce jour
              </p>
            </div>
          ) : (
            reservations.map((res) => (
              <div
                key={res.id}
                className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 shrink-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                      {new Date(res.startTime).toLocaleDateString("fr-FR", { weekday: "short" })}
                    </span>
                    <span className="text-base font-black text-slate-800 dark:text-slate-200">
                      {new Date(res.startTime).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-lg text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                      {res.customerName}
                    </h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Phone className="w-3 h-3" /> {res.phone}
                      <span>•</span>
                      <Users className="w-3 h-3" /> {res.guests} Personnes
                      {res.table && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-500 font-black">Table {res.table.number}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                  <span
                    className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      res.status === "PENDING"
                        ? "bg-amber-500/10 text-amber-500"
                        : res.status === "CONFIRMED"
                        ? "bg-indigo-500/10 text-indigo-500"
                        : res.status === "SEATED"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-rose-500/10 text-rose-500"
                    }`}
                  >
                    {res.status}
                  </span>

                  <div className="flex gap-2">
                    {res.status === "PENDING" && (
                      <button
                        onClick={() => handleUpdateStatus(res.id, "CONFIRMED")}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Confirmer
                      </button>
                    )}
                    {(res.status === "PENDING" || res.status === "CONFIRMED") && (
                      <button
                        onClick={() => handleUpdateStatus(res.id, "SEATED")}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Installer
                      </button>
                    )}
                    {["PENDING", "CONFIRMED"].includes(res.status) && (
                      <button
                        onClick={() => handleUpdateStatus(res.id, "CANCELLED")}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all"
                        title="Annuler la réservation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {res.status === "SEATED" && (
                      <button
                        onClick={() => handleUpdateStatus(res.id, "COMPLETED")}
                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Terminer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
