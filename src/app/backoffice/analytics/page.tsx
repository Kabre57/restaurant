// src/app/backoffice/analytics/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import RestaurateurLayout from "@/app/restaurateur/layout";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Percent,
  Calendar,
  Layers,
  Briefcase,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { TopProductsChart } from "@/components/analytics/TopProductsChart";
import { MarginChart } from "@/components/analytics/MarginChart";
import { ExportButtons } from "@/components/analytics/ExportButtons";
import { AnalyticsClient, FetchDashboardParams } from "@/services/analytics.client";
import { DashboardReport } from "@/services/analytics.service";
import { format, subDays, startOfMonth } from "date-fns";

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const toast = useToast();

  const userRole = session?.user?.role;
  const userStoreId = session?.user?.storeId;

  // Filters State
  const [period, setPeriod] = useState<"hour" | "day" | "month" | "year">("day");
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [storeId, setStoreId] = useState<string>("");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);

  // Report Data
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch stores list (only useful for ADMIN)
  useEffect(() => {
    if (userRole === "ADMIN") {
      fetch("/api/stores")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setStores(data);
          }
        })
        .catch((err) => console.error("Error fetching stores:", err));
    }
  }, [userRole]);

  // Set default storeId on load
  useEffect(() => {
    if (userStoreId) {
      setStoreId(userStoreId);
    }
  }, [userStoreId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const activeStoreId = userRole === "ADMIN" ? storeId : userStoreId;
      const data = await AnalyticsClient.getDashboard({
        startDate,
        endDate,
        period,
        storeId: activeStoreId || undefined,
      });
      setReport(data);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erreur lors du chargement des analyses";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status, startDate, endDate, period, storeId]);

  // Handle Preset Selectors
  const setPreset = (preset: "today" | "week" | "month" | "year") => {
    const today = new Date();
    if (preset === "today") {
      setStartDate(format(today, "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
      setPeriod("hour");
    } else if (preset === "week") {
      setStartDate(format(subDays(today, 7), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
      setPeriod("day");
    } else if (preset === "month") {
      setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
      setPeriod("day");
    } else if (preset === "year") {
      setStartDate(format(subDays(today, 365), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
      setPeriod("month");
    }
  };

  if (status === "loading") {
    return (
      <RestaurateurLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-[#FF6D00] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Chargement...
          </p>
        </div>
      </RestaurateurLayout>
    );
  }

  // RBAC Access Control
  if (userRole !== "ADMIN" && userRole !== "MANAGER") {
    return (
      <RestaurateurLayout>
        <div className="max-w-md mx-auto my-20 p-6 bg-white dark:bg-[#181a20] rounded-3xl border border-red-500/20 text-center space-y-4 shadow-sm">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-black uppercase text-[#171717] dark:text-white">
            Accès Refusé
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Vous ne possédez pas les permissions nécessaires pour accéder au tableau de bord analytique.
          </p>
        </div>
      </RestaurateurLayout>
    );
  }

  const exportParams: FetchDashboardParams = {
    startDate,
    endDate,
    period,
    storeId: userRole === "ADMIN" ? storeId : userStoreId || undefined,
  };

  return (
    <RestaurateurLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header / Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#F0F1F6] dark:border-[#2e3440] pb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#171717] dark:text-white flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-[#FF6D00]" />
              Tableau de Bord Analytique
            </h1>
            <p className="text-xs font-semibold text-[#868e96] dark:text-white/40 uppercase tracking-wider mt-1">
              Statistiques de vente, marges, réservations et performance en temps réel.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <ExportButtons params={exportParams} />
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 text-slate-505 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-[#181a20] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => setPreset("today")}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#FF6D00] hover:text-white text-slate-600 dark:text-slate-200 text-[10px] font-black rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setPreset("week")}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#FF6D00] hover:text-white text-slate-600 dark:text-slate-200 text-[10px] font-black rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
            >
              7 jours
            </button>
            <button
              onClick={() => setPreset("month")}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#FF6D00] hover:text-white text-slate-600 dark:text-slate-200 text-[10px] font-black rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
            >
              Ce mois
            </button>
            <button
              onClick={() => setPreset("year")}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#FF6D00] hover:text-white text-slate-600 dark:text-slate-200 text-[10px] font-black rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
            >
              12 mois
            </button>
          </div>

          {/* Form Controls */}
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            {/* Multi-Tenant Store Selector (Admin only) */}
            {userRole === "ADMIN" && (
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <span className="text-[9px] font-black uppercase text-slate-400">Store</span>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6D00] text-slate-700 dark:text-slate-200 min-w-[150px]"
                >
                  <option value="">Tous les Stores (Global)</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Start Date */}
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <span className="text-[9px] font-black uppercase text-slate-400">Du</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6D00] text-slate-700 dark:text-slate-200"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <span className="text-[9px] font-black uppercase text-slate-400">Au</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6D00] text-slate-700 dark:text-slate-200"
              />
            </div>

            {/* Period Grouping */}
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <span className="text-[9px] font-black uppercase text-slate-400">Période</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as "hour" | "day" | "month" | "year")}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6D00] text-slate-700 dark:text-slate-200"
              >
                <option value="hour">Horaire</option>
                <option value="day">Journalier</option>
                <option value="month">Mensuel</option>
                <option value="year">Annuel</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-[#FF6D00] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Génération des statistiques...
            </p>
          </div>
        )}

        {/* KPI Cards & Charts */}
        {!loading && report && (
          <div className="space-y-8 animate-fadeIn">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* CA Card */}
              <div className="bg-white dark:bg-[#181a20] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    CA Total
                  </span>
                  <DollarSign className="h-4 w-4 text-[#FF6D00]" />
                </div>
                <div className="mt-4">
                  <p className="text-lg font-black text-[#171717] dark:text-white truncate">
                    {report.kpis.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                    FCFA BCEAO
                  </p>
                </div>
              </div>

              {/* Orders Count Card */}
              <div className="bg-white dark:bg-[#181a20] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Commandes
                  </span>
                  <ShoppingCart className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="mt-4">
                  <p className="text-lg font-black text-[#171717] dark:text-white">
                    {report.kpis.totalOrders}
                  </p>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                    Factures émises
                  </p>
                </div>
              </div>

              {/* Basket Average Card */}
              <div className="bg-white dark:bg-[#181a20] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Panier Moyen
                  </span>
                  <Layers className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-4">
                  <p className="text-lg font-black text-[#171717] dark:text-white truncate">
                    {Math.round(report.kpis.averageOrderValue).toLocaleString()}
                  </p>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                    FCFA par ticket
                  </p>
                </div>
              </div>

              {/* Guests Count Card */}
              <div className="bg-white dark:bg-[#181a20] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Fréquentation
                  </span>
                  <Users className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mt-4">
                  <p className="text-lg font-black text-[#171717] dark:text-white">
                    {report.kpis.totalGuests}
                  </p>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                    Couverts installés
                  </p>
                </div>
              </div>

              {/* Booking Conversion Card */}
              <div className="bg-white dark:bg-[#181a20] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Conversion Résa
                  </span>
                  <Percent className="h-4 w-4 text-rose-500" />
                </div>
                <div className="mt-4">
                  <p className="text-lg font-black text-[#171717] dark:text-white">
                    {report.kpis.reservationConversionRate.toFixed(1)}%
                  </p>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                    Taux de concrétisation
                  </p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <RevenueChart data={report.revenueChart} />
              </div>
              <div>
                <TopProductsChart data={report.topProducts} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <MarginChart data={report.topProducts} />
              </div>

              {/* Detailed Top Products List Table */}
              <div className="md:col-span-2 bg-white dark:bg-[#181a20] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb5bd] dark:text-[#72788f] mb-6 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[#FF6D00]" />
                  Rentabilité détaillée par Produit (Top 5)
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-wider text-[#adb5bd] bg-slate-50 dark:bg-slate-900/50">
                        <th className="px-4 py-3">Produit</th>
                        <th className="px-4 py-3 text-right">Quantité</th>
                        <th className="px-4 py-3 text-right">Revenu (FCFA)</th>
                        <th className="px-4 py-3 text-right">Coût Unitaire</th>
                        <th className="px-4 py-3 text-right">Marge Amount</th>
                        <th className="px-4 py-3 text-right">Marge %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {report.topProducts.slice(0, 5).map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-100">
                            {p.name}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                            {p.quantitySold}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                            {p.revenue.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            {p.costPrice.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-emerald-600">
                            {p.marginAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="px-2 py-0.5 rounded font-black bg-emerald-500/10 text-emerald-500">
                              {p.marginPercent.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RestaurateurLayout>
  );
}
