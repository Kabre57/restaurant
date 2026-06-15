"use client";

import React, { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Calendar, Users, Clock, Phone, User, Mail, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

interface Store {
  id: string;
  name: string;
}

interface CreatedReservation {
  customerName: string;
  startTime: string;
  guests: number;
}

export default function ReservationForm({ stores }: { stores: Store[] }) {
  const toast = useToast();
  const [storeId, setStoreId] = useState(stores[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("19:00");
  const [guests, setGuests] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdReservation, setCreatedReservation] = useState<CreatedReservation | null>(null);

  const timeSlots = [
    "12:00", "12:30", "13:00", "13:30",
    "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !date || !time || !customerName || !phone) {
      toast("Veuillez remplir tous les champs obligatoires", "warning");
      return;
    }

    setLoading(true);
    setError(null);

    // Reconstruire date + heure
    const startTimeStr = `${date}T${time}:00`;
    const startTime = new Date(startTimeStr);

    try {
      const response = await fetch("/api/booking/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
          tableId: "auto", // Allocation automatique
          customerName,
          phone,
          email: email || null,
          date: new Date(date),
          startTime,
          guests,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de la réservation");
      }

      setCreatedReservation(data);
      setSuccess(true);
      toast("Réservation enregistrée avec succès !", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setCreatedReservation(null);
    setError(null);
    setCustomerName("");
    setPhone("");
    setEmail("");
    setGuests(2);
  };

  if (success && createdReservation) {
    return (
      <div className="space-y-6 text-center animate-in fade-in duration-500">
        <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-2">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Réservation Confirmée !</h2>
          <p className="text-slate-400 text-sm mt-1">
            Votre demande a été traitée et validée par le système.
          </p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-left space-y-3">
          <div className="flex justify-between border-b border-slate-800 pb-2 text-xs font-semibold text-slate-500 uppercase">
            <span>Détail</span>
            <span>Valeur</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Client :</span>
            <span className="text-white font-medium">{createdReservation.customerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Date & Heure :</span>
            <span className="text-white font-medium">
              {new Date(createdReservation.startTime).toLocaleString("fr-FR", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Couverts :</span>
            <span className="text-white font-medium">{createdReservation.guests} personnes</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Statut :</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              En attente de confirmation
            </span>
          </div>
        </div>

        <button
          onClick={resetForm}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-600/20"
        >
          Nouvelle réservation
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      {error && (
        <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-left">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-rose-400">Impossible de réserver</h4>
            <p className="text-slate-400 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Sélection du store */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Sélectionner le Restaurant
        </label>
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date et Heure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Date
          </label>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Heure
          </label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100"
          >
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Convives */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Nombre de couverts
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 8].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setGuests(num)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                guests === num
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                  : "bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900/60"
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Informations de contact */}
      <div className="space-y-4 pt-2 border-t border-slate-800/40">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Nom complet
          </label>
          <input
            type="text"
            required
            placeholder="Ex: Jean Dupont"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 placeholder:text-slate-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Téléphone
            </label>
            <input
              type="tel"
              required
              placeholder="Ex: +225 07 00 00 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email (optionnel)
            </label>
            <input
              type="email"
              placeholder="Ex: jean.dupont@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Bouton de confirmation */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-indigo-600/20"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          "Confirmer la Réservation"
        )}
      </button>
    </form>
  );
}
