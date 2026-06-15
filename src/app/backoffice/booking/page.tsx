"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import RestaurateurLayout from "@/app/restaurateur/layout";
import {
  Calendar,
  LayoutGrid,
  List,
  Plus,
  Search,
  Phone,
  User,
  Users,
  Clock,
  Check,
  X,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Table {
  id: string;
  number: string;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED";
}

interface Reservation {
  id: string;
  customerName: string;
  phone: string;
  email: string | null;
  guests: number;
  startTime: string;
  status: "PENDING" | "CONFIRMED" | "SEATED" | "CANCELLED" | "COMPLETED";
  tableId: string;
  table: Table;
}

export default function BookingBackofficePage() {
  const { data: session } = useSession();
  const toast = useToast();
  const storeId = session?.user?.storeId;

  const [activeTab, setActiveTab] = useState<"PLAN" | "LIST">("PLAN");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Booking Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newGuests, setNewGuests] = useState(2);
  const [newTime, setNewTime] = useState("19:00");
  const [selectedTableId, setSelectedTableId] = useState<string>("auto");

  // SSE subscription
  useEffect(() => {
    if (!storeId) return;

    // Load initial data
    fetchData();

    // Setup SSE connection
    const eventSource = new EventSource(`/api/booking/events?storeId=${storeId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("SSE Event Received in Backoffice:", data);
        
        // Dynamic state updates or refetch
        toast(`Mise à jour temps réel : Réservation ${data.action}`, "info");
        fetchData();
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error", err);
    };

    return () => {
      eventSource.close();
    };
  }, [storeId, selectedDate]);

  const fetchData = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [tablesRes, resasRes] = await Promise.all([
        fetch(`/api/booking/tables?storeId=${storeId}`),
        fetch(`/api/booking/reservations?storeId=${storeId}&date=${selectedDate}`),
      ]);

      if (tablesRes.ok && resasRes.ok) {
        const tablesData = await tablesRes.json();
        const resasData = await resasRes.json();
        setTables(tablesData);
        setReservations(resasData);
      }
    } catch (err) {
      console.error("Failed to fetch booking data", err);
      toast("Erreur de récupération des données", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    id: string,
    newStatus: Reservation["status"]
  ) => {
    try {
      const response = await fetch(`/api/booking/reservations/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          utilisateur: session?.user?.name || "Manager",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur de changement de statut");
      }

      toast(`Réservation mise à jour : ${newStatus}`, "success");
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de changement de statut";
      toast(msg, "error");
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !newCustName || !newCustPhone) {
      toast("Veuillez remplir les informations obligatoires", "warning");
      return;
    }

    try {
      const startTime = new Date(`${selectedDate}T${newTime}:00`);
      const response = await fetch("/api/booking/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
          tableId: selectedTableId,
          customerName: newCustName,
          phone: newCustPhone,
          email: newCustEmail || null,
          date: new Date(selectedDate),
          startTime,
          guests: newGuests,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création");
      }

      toast("Réservation créée avec succès", "success");
      setIsAddModalOpen(false);
      // Reset form
      setNewCustName("");
      setNewCustPhone("");
      setNewCustEmail("");
      setNewGuests(2);
      setSelectedTableId("auto");
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création";
      toast(msg, "error");
    }
  };

  const filteredReservations = reservations.filter((r) => {
    const matchesSearch =
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery);

    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <RestaurateurLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header / Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#F0F1F6] dark:border-[#2e3440] pb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#171717] dark:text-white flex items-center gap-2">
              <Calendar className="h-6 w-6 text-[#FF6D00]" />
              Gestion des Réservations & Tables
            </h1>
            <p className="text-xs font-semibold text-[#868e96] dark:text-white/40 uppercase tracking-wider mt-1">
              Pilotez le plan de salle temps réel et planifiez les réservations.
            </p>
          </div>

          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6D00] hover:bg-[#e65c00] text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all shadow-md"
            >
              <Plus className="h-4 w-4" />
              Créer Réservation
            </button>
            <button
              onClick={fetchData}
              className="p-2.5 bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* View Switch & Quick Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#181a20] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("PLAN")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "PLAN"
                  ? "bg-[#FF6D00]/10 text-[#FF6D00]"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Plan de Salle
            </button>
            <button
              onClick={() => setActiveTab("LIST")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "LIST"
                  ? "bg-[#FF6D00]/10 text-[#FF6D00]"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <List className="h-4 w-4" />
              Liste des Réservations
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Date Picker */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6D00] text-slate-700 dark:text-slate-200"
            />

            {activeTab === "LIST" && (
              <>
                {/* Search query */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher client/tel..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6D00] text-slate-700 dark:text-slate-200"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6D00] text-slate-700 dark:text-slate-200"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="PENDING">En attente (PENDING)</option>
                  <option value="CONFIRMED">Confirmé (CONFIRMED)</option>
                  <option value="SEATED">Installé (SEATED)</option>
                  <option value="CANCELLED">Annulé (CANCELLED)</option>
                  <option value="COMPLETED">Terminé (COMPLETED)</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-[#FF6D00] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Actualisation du plan de salle...
            </p>
          </div>
        )}

        {/* Content Views */}
        {!loading && activeTab === "PLAN" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Interactive Floor Plan */}
            <div className="md:col-span-2 bg-white dark:bg-[#181a20] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb5bd] mb-6 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Disposition des Tables
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {tables.map((t) => {
                  // Trouver les réservations actives pour cette table à cette date
                  const resasForTable = reservations.filter(
                    (r) =>
                      r.tableId === t.id &&
                      ["PENDING", "CONFIRMED", "SEATED"].includes(r.status)
                  );

                  let bgClass = "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600";
                  let statusLabel = "Disponible";

                  if (t.status === "OCCUPIED") {
                    bgClass = "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600";
                    statusLabel = "Occupée";
                  } else if (resasForTable.length > 0) {
                    bgClass = "border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600";
                    statusLabel = "Réservée";
                  }

                  return (
                    <div
                      key={t.id}
                      className={`flex flex-col justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${bgClass}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-lg font-black">Table #{t.number}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/40 dark:bg-black/20">
                          Cap. {t.capacity}
                        </span>
                      </div>

                      <div className="mt-6">
                        <span className="text-xs font-bold uppercase tracking-wider block">
                          {statusLabel}
                        </span>
                        {resasForTable.map((r) => (
                          <span
                            key={r.id}
                            className="block text-[10px] font-medium opacity-80 mt-1 truncate"
                          >
                            {new Date(r.startTime).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            - {r.customerName}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions / Today's Bookings */}
            <div className="bg-white dark:bg-[#181a20] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb5bd] flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Prochains arrivants
              </h3>

              <div className="space-y-4">
                {reservations
                  .filter((r) => r.status === "PENDING" || r.status === "CONFIRMED")
                  .slice(0, 5)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-xl border border-slate-250 dark:border-slate-800 hover:shadow-sm transition-all space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-black text-slate-700 dark:text-slate-100 uppercase">
                            {r.customerName}
                          </h4>
                          <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                            {r.phone}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-500">
                          Table {r.table.number}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(r.startTime).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {r.guests} pers.
                        </span>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleUpdateStatus(r.id, "SEATED")}
                          className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold uppercase transition-colors"
                        >
                          Installer (SEATED)
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(r.id, "CANCELLED")}
                          className="py-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded text-[10px] font-bold uppercase transition-colors"
                          title="Annuler"
                        >
                          <X className="h-3 w-3 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}

                {reservations.filter(
                  (r) => r.status === "PENDING" || r.status === "CONFIRMED"
                ).length === 0 && (
                  <p className="text-xs font-semibold text-slate-400 uppercase text-center py-6">
                    Aucune réservation en attente.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === "LIST" && (
          <div className="bg-white dark:bg-[#181a20] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Téléphone / Email</th>
                    <th className="px-6 py-4">Date / Heure</th>
                    <th className="px-6 py-4">Couverts</th>
                    <th className="px-6 py-4">Table</th>
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredReservations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-100">
                        {r.customerName}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <div>{r.phone}</div>
                        {r.email && <div className="text-[10px] opacity-70">{r.email}</div>}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(r.startTime).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-100">
                        {r.guests}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                          Table {r.table.number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            r.status === "PENDING"
                              ? "bg-amber-500/10 text-amber-500"
                              : r.status === "CONFIRMED"
                              ? "bg-indigo-500/10 text-indigo-500"
                              : r.status === "SEATED"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-rose-500/10 text-rose-500"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {r.status === "PENDING" && (
                            <button
                              onClick={() => handleUpdateStatus(r.id, "CONFIRMED")}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase transition-colors"
                            >
                              Confirmer
                            </button>
                          )}
                          {(r.status === "PENDING" || r.status === "CONFIRMED") && (
                            <button
                              onClick={() => handleUpdateStatus(r.id, "SEATED")}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold uppercase transition-colors"
                            >
                              Installer
                            </button>
                          )}
                          {["PENDING", "CONFIRMED"].includes(r.status) && (
                            <button
                              onClick={() => handleUpdateStatus(r.id, "CANCELLED")}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold uppercase transition-colors"
                            >
                              Annuler
                            </button>
                          )}
                          {r.status === "SEATED" && (
                            <button
                              onClick={() => handleUpdateStatus(r.id, "COMPLETED")}
                              className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-[10px] font-bold uppercase transition-colors"
                            >
                              Terminer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredReservations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 uppercase font-semibold">
                        Aucune réservation trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Create Reservation */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#181a20] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl relative">
              <h3 className="text-sm font-black uppercase text-[#171717] dark:text-white mb-6 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#FF6D00]" />
                Créer une Réservation
              </h3>

              <form onSubmit={handleCreateReservation} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                      Couverts
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newGuests}
                      onChange={(e) => setNewGuests(parseInt(e.target.value) || 2)}
                      className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                      Heure
                    </label>
                    <input
                      type="time"
                      required
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                    Table assignée
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                  >
                    <option value="auto">Allocation Automatique</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table #{t.number} (Cap. {t.capacity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                    Nom Client
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean Dupont"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 07070707"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                    Email (optionnel)
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: jean.dupont@mail.com"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                  />
                </div>

                <div className="flex gap-3 pt-4 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold uppercase text-[#868e96] hover:bg-[#F8F9FA] rounded-xl transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#FF6D00] hover:bg-[#e65c00] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RestaurateurLayout>
  );
}
