"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Truck,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  Navigation,
  Loader2,
  CheckCircle,
  Clock,
  Compass,
} from "lucide-react";
import DeliveryMap from "@/components/delivery/DeliveryMap";
import DriverStatusButtons from "@/components/delivery/DriverStatusButtons";

type DeliveryOrder = {
  id: string;
  status: string;
  address: string;
  clientName: string;
  clientPhone: string;
  distanceKm: number | null;
  durationMins: number | null;
  deliveryFee: number;
  order: {
    id: string;
    total: number;
    items: {
      id: string;
      quantity: number;
      product: {
        name: string;
      };
    }[];
  };
};

export default function DriverDashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Authenticate driver
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [sessionStatus, router]);

  // Fetch driver deliveries
  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/delivery/orders");
      if (res.ok) {
        const data = await res.json();
        // Filter deliveries that belong to this driver (if driver role is active)
        // Or show all deliveries available if admin/restaurateur for easy testing
        setDeliveries(data);
        if (data.length > 0) {
          // Keep selection if it exists
          setSelectedDelivery((prev) => {
            const found = data.find((d: DeliveryOrder) => d.id === prev?.id);
            return found || data[0];
          });
        } else {
          setSelectedDelivery(null);
        }
      }
    } catch (err) {
      console.error("Error fetching deliveries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchDeliveries();
    }
  }, [sessionStatus]);

  // Periodically refresh list
  useEffect(() => {
    const timer = setInterval(fetchDeliveries, 30000);
    return () => clearInterval(timer);
  }, []);

  // Live Location Tracker loop when driver has active delivery
  useEffect(() => {
    if (!selectedDelivery || !["PICKED_UP", "IN_PROGRESS"].includes(selectedDelivery.status)) {
      setGpsActive(false);
      return;
    }

    setGpsActive(true);
    let stepCount = 0;

    // Simulate route coords starting from store to client if actual Geolocation fails/blocked
    const storeLat = 5.3096;
    const storeLng = -4.0127;
    // Resolve dynamic mock destination coords
    const hash = selectedDelivery.address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const destLat = storeLat + (hash % 100) / 1000;
    const destLng = storeLng + (hash % 50) / 1000;

    const trackInterval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setCurrentCoords({ lat, lng });
            
            // Send coordinates to server
            await fetch("/api/delivery/tracking", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deliveryOrderId: selectedDelivery.id,
                latitude: lat,
                longitude: lng,
              }),
            });
          },
          async () => {
            // Geolocation blocked/failed fallback - simulate moving towards destination
            stepCount++;
            const totalSteps = 20;
            const fraction = Math.min(1, stepCount / totalSteps);
            const mockLat = storeLat + (destLat - storeLat) * fraction;
            const mockLng = storeLng + (destLng - storeLng) * fraction;
            
            setCurrentCoords({ lat: mockLat, lng: mockLng });

            await fetch("/api/delivery/tracking", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deliveryOrderId: selectedDelivery.id,
                latitude: mockLat,
                longitude: mockLng,
              }),
            });
          }
        );
      }
    }, 8000);

    return () => clearInterval(trackInterval);
  }, [selectedDelivery?.id, selectedDelivery?.status]);

  const handleStatusChange = async (nextStatus: string) => {
    if (!selectedDelivery) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/delivery/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryOrderId: selectedDelivery.id,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        await fetchDeliveries();
      } else {
        const errData = await res.json();
        alert(errData.error || "Erreur de changement de statut");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-850 px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/10 rounded-xl border border-indigo-600/20">
            <Truck className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight">Dashboard Livreur</h1>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Parabellum PWA Edition
            </span>
          </div>
        </div>

        {gpsActive && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
              GPS LIVE ACTIVÉ
            </span>
          </div>
        )}
      </header>

      {/* Main Content split layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Delivery List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Mes Courses ({deliveries.length})
            </h2>
            
            {loading && deliveries.length === 0 ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : deliveries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Aucune livraison assignée pour le moment
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar">
                {deliveries.map((delivery) => {
                  const active = selectedDelivery?.id === delivery.id;
                  return (
                    <button
                      key={delivery.id}
                      onClick={() => setSelectedDelivery(delivery)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        active
                          ? "bg-indigo-650/10 border-indigo-500/50"
                          : "bg-slate-950/40 border-slate-850 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          Commande #{delivery.order.id.slice(-6).toUpperCase()}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          delivery.status === "DELIVERED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : delivery.status === "IN_PROGRESS"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        }`}>
                          {delivery.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        <span className="truncate">{delivery.address}</span>
                      </div>

                      <div className="mt-3 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                        <span>{delivery.order.total.toLocaleString()} FCFA</span>
                        <span>{delivery.distanceKm?.toFixed(1) || "N/A"} km</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Active Map & Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedDelivery ? (
            <>
              {/* Delivery Map component */}
              <DeliveryMap
                driverLat={currentCoords?.lat || null}
                driverLng={currentCoords?.lng || null}
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

              {/* Course Detail Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Details Client */}
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    Destinataire
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold">Nom</span>
                      <span className="text-sm font-semibold text-slate-200">
                        {selectedDelivery.clientName}
                      </span>
                    </div>
                    
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold">Téléphone</span>
                      <a
                        href={`tel:${selectedDelivery.clientPhone}`}
                        className="text-sm font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
                      >
                        <Phone className="w-4 h-4" />
                        {selectedDelivery.clientPhone}
                      </a>
                    </div>

                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold">Adresse de livraison</span>
                      <span className="text-xs text-slate-350 leading-relaxed block">
                        {selectedDelivery.address}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Commande & Actions */}
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
                      <ShoppingBag className="w-4 h-4 text-indigo-400" />
                      Panier
                    </h3>
                    
                    <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                      {selectedDelivery.order.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <span className="text-slate-300">{item.product.name}</span>
                          <span className="font-semibold text-indigo-400">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-850">
                    <DriverStatusButtons
                      status={selectedDelivery.status}
                      onStatusChange={handleStatusChange}
                      loading={actionLoading}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-96 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500">
              <Truck className="w-12 h-12 mb-3 opacity-30 animate-pulse" />
              <p className="text-sm">Sélectionnez une course pour démarrer</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
