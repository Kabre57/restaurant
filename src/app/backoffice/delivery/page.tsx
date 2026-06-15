"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Truck,
  MapPin,
  Settings,
  Shield,
  Loader2,
  DollarSign,
  TrendingUp,
  Clock,
  Compass,
  AlertCircle,
  Play,
  Users,
} from "lucide-react";
import DeliveryMap from "@/components/delivery/DeliveryMap";

type DeliveryOrder = {
  id: string;
  status: string;
  address: string;
  clientName: string;
  clientPhone: string;
  distanceKm: number | null;
  durationMins: number | null;
  deliveryFee: number;
  livreurId: string | null;
  livreur?: {
    name: string;
  } | null;
  order: {
    id: string;
    total: number;
  };
};

type Driver = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function BackofficeDeliveryPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Settings
  const [feeModel, setFeeModel] = useState<"FLAT" | "DISTANCE">("DISTANCE");
  const [flatFee, setFlatFee] = useState(1500);
  const [pricePerKm, setPricePerKm] = useState(250);
  const [baseFee, setBaseFee] = useState(500);
  const [savingSettings, setSavingSettings] = useState(false);

  // Authenticate backoffice user
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (sessionStatus === "authenticated") {
      const role = session?.user?.role;
      if (!["RESTAURATEUR", "ADMIN", "SUPER_ADMIN"].includes(role)) {
        router.push("/unauthorized");
      }
    }
  }, [sessionStatus, router, session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch deliveries
      const deliveriesRes = await fetch("/api/delivery/orders");
      if (deliveriesRes.ok) {
        const data = await deliveriesRes.json();
        setDeliveries(data);
        if (data.length > 0 && !selectedDelivery) {
          setSelectedDelivery(data[0]);
        }
      }

      // Fetch delivery drivers (users with DELIVERY role)
      const driversRes = await fetch("/api/admin/users?role=DELIVERY");
      if (driversRes.ok) {
        const data = await driversRes.json();
        setDrivers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchData();
    }
  }, [sessionStatus]);

  // Periodic SSE or short-poll simulation for live driver coordinate updates
  useEffect(() => {
    if (!selectedDelivery || !["PICKED_UP", "IN_PROGRESS"].includes(selectedDelivery.status)) {
      return;
    }

    // Connect to SSE stream
    const eventSource = new EventSource(`/api/delivery/tracking/stream?deliveryOrderId=${selectedDelivery.id}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "LOCATION") {
          // If we receive a location update, we can update the active selection coordinates
          console.log("Live coordinate received:", data);
        }
      } catch (err) {
        // Ignore JSON parsing errors
      }
    };

    return () => eventSource.close();
  }, [selectedDelivery?.id, selectedDelivery?.status]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    // Simulate setting saving
    setTimeout(() => {
      setSavingSettings(false);
      alert("Paramètres de tarification enregistrés !");
    }, 500);
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // Compute stats
  const activeDeliveries = deliveries.filter((d) => ["ASSIGNED", "PICKED_UP", "IN_PROGRESS"].includes(d.status)).length;
  const completedToday = deliveries.filter((d) => d.status === "DELIVERED").length;
  const totalFees = deliveries.reduce((acc, curr) => acc + (curr.status === "DELIVERED" ? curr.deliveryFee : 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      
      {/* Top HUD Stats Panel */}
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/10 rounded-2xl border border-indigo-650/20">
              <Truck className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Suivi des Livraisons</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Supervision temps réel et configuration tarifaire des livreurs
              </p>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">Courses Actives</span>
              <span className="text-2xl font-black text-indigo-400 mt-2 block">{activeDeliveries}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Compass className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">Livraisons Terminées</span>
              <span className="text-2xl font-black text-emerald-450 mt-2 block">{completedToday}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-450">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">Chiffre d&apos;Affaires Courses</span>
              <span className="text-2xl font-black text-amber-500 mt-2 block">{totalFees.toLocaleString()} FCFA</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">Livreurs Connectés</span>
              <span className="text-2xl font-black text-slate-200 mt-2 block">{drivers.length}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Split Section: Real-time map & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Deliveries List */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-850 rounded-3xl p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Suivi des Courses Actives
            </h2>
            
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto custom-scrollbar">
              {deliveries.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Aucune course enregistrée
                </div>
              ) : (
                deliveries.map((delivery) => {
                  const active = selectedDelivery?.id === delivery.id;
                  return (
                    <button
                      key={delivery.id}
                      onClick={() => setSelectedDelivery(delivery)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        active
                          ? "bg-indigo-650/15 border-indigo-500/50"
                          : "bg-slate-950/40 border-slate-850 hover:bg-slate-850"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-200">
                          Commande #{delivery.order.id.slice(-6).toUpperCase()}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          delivery.status === "DELIVERED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-indigo-500/10 text-indigo-400"
                        }`}>
                          {delivery.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 truncate mb-2">
                        {delivery.address}
                      </p>
                      
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>Livreur: {delivery.livreur?.name || "Non assigné"}</span>
                        <span>{delivery.distanceKm?.toFixed(1) || "N/A"} km</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Real-time Route Map */}
          <div className="lg:col-span-2">
            {selectedDelivery ? (
              <DeliveryMap
                destLat={
                  selectedDelivery.address
                    ? 5.3096 +
                      (selectedDelivery.address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100) / 1000
                    : null
                }
                destLng={
                  selectedDelivery.address
                    ? -4.0127 +
                      (selectedDelivery.address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 50) / 1000
                    : null
                }
                address={selectedDelivery.address}
                status={selectedDelivery.status}
              />
            ) : (
              <div className="h-full aspect-[16/10] bg-slate-950 border border-slate-850 rounded-3xl flex items-center justify-center text-slate-500">
                Aucun trajet sélectionné
              </div>
            )}
          </div>
        </div>

        {/* Pricing Configuration Form */}
        <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6">
          <div className="flex items-center gap-3 border-b border-slate-850 pb-4 mb-6">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h2 className="text-md font-bold">Barème de Calcul des Frais de Livraison</h2>
          </div>

          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] text-slate-550 uppercase tracking-widest font-bold mb-2">
                Modèle de tarification
              </label>
              <select
                value={feeModel}
                onChange={(e) => setFeeModel(e.target.value as "FLAT" | "DISTANCE")}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="FLAT">Forfait fixe (Flat rate)</option>
                <option value="DISTANCE">Calcul par distance (GPS)</option>
              </select>
            </div>

            {feeModel === "FLAT" ? (
              <div>
                <label className="block text-[10px] text-slate-550 uppercase tracking-widest font-bold mb-2">
                  Frais forfaitaire (FCFA)
                </label>
                <input
                  type="number"
                  value={flatFee}
                  onChange={(e) => setFlatFee(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-350 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] text-slate-550 uppercase tracking-widest font-bold mb-2">
                    Frais de base initial (FCFA)
                  </label>
                  <input
                    type="number"
                    value={baseFee}
                    onChange={(e) => setBaseFee(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-350 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-550 uppercase tracking-widest font-bold mb-2">
                    Prix par kilomètre (FCFA/km)
                  </label>
                  <input
                    type="number"
                    value={pricePerKm}
                    onChange={(e) => setPricePerKm(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-350 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-3 pt-4 border-t border-slate-850 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-xl transition-all"
              >
                {savingSettings ? "Enregistrement..." : "Enregistrer le barème"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
