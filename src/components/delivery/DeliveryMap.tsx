"use client";

import React from "react";
import { MapPin, Navigation, Navigation2, Compass } from "lucide-react";

interface DeliveryMapProps {
  driverLat?: number | null;
  driverLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
  storeLat?: number;
  storeLng?: number;
  address?: string;
  status?: string;
}

export default function DeliveryMap({
  driverLat,
  driverLng,
  destLat,
  destLng,
  storeLat = 5.3096,
  storeLng = -4.0127,
  address = "Adresse de livraison",
  status = "PENDING",
}: DeliveryMapProps) {
  // Center is the midpoint or store location
  const centerLat = destLat ? (storeLat + destLat) / 2 : storeLat;
  const centerLng = destLng ? (storeLng + destLng) / 2 : storeLng;

  // Let's compute SVG offsets for a stylized schematic route map
  // Map lat/lng coords to SVG viewBox (0 to 500 wide, 0 to 300 tall)
  const mapCoordToSvg = (lat: number, lng: number) => {
    // Standard delta bounding box around Abidjan
    const minLat = 5.25;
    const maxLat = 5.38;
    const minLng = -4.08;
    const maxLng = -3.94;

    const x = ((lng - minLng) / (maxLng - minLng)) * 500;
    // Invert Y because SVG coordinates start from top
    const y = 300 - ((lat - minLat) / (maxLat - minLat)) * 300;

    return { x: Math.max(20, Math.min(480, x)), y: Math.max(20, Math.min(280, y)) };
  };

  const storeSvg = mapCoordToSvg(storeLat, storeLng);
  const destSvg = mapCoordToSvg(destLat || storeLat + 0.015, destLng || storeLng + 0.02);
  const driverSvg = driverLat && driverLng ? mapCoordToSvg(driverLat, driverLng) : null;

  return (
    <div className="relative w-full aspect-[16/10] bg-slate-950 border border-slate-850 rounded-3xl overflow-hidden shadow-2xl">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

      {/* Schematic Map Canvas */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Route Line */}
        <path
          d={`M ${storeSvg.x} ${storeSvg.y} Q ${(storeSvg.x + destSvg.x) / 2 - 30} ${(storeSvg.y + destSvg.y) / 2 - 40} ${destSvg.x} ${destSvg.y}`}
          stroke="url(#routeGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="6 4"
          className="animate-[dash_20s_linear_infinite]"
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <radialGradient id="storeGlow" r="50%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="destGlow" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="driverGlow" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Store Glow */}
        <circle cx={storeSvg.x} cy={storeSvg.y} r="35" fill="url(#storeGlow)" />
        {/* Store Node */}
        <circle cx={storeSvg.x} cy={storeSvg.y} r="7" fill="#6366f1" stroke="#1e1b4b" strokeWidth="2.5" />

        {/* Destination Glow */}
        <circle cx={destSvg.x} cy={destSvg.y} r="35" fill="url(#destGlow)" />
        {/* Destination Node */}
        <circle cx={destSvg.x} cy={destSvg.y} r="7" fill="#10b981" stroke="#064e3b" strokeWidth="2.5" />

        {/* Driver Node if active */}
        {driverSvg && (
          <>
            <circle cx={driverSvg.x} cy={driverSvg.y} r="25" fill="url(#driverGlow)" />
            <circle cx={driverSvg.x} cy={driverSvg.y} r="6" fill="#f59e0b" stroke="#451a03" strokeWidth="2.5" />
          </>
        )}
      </svg>

      {/* Floating Indicators */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start gap-4">
        {/* Store Info Label */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Store Central</span>
        </div>

        {/* Destination Address Label */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2 max-w-[200px] shadow-lg">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] font-medium text-slate-350 truncate">{address}</span>
        </div>
      </div>

      {/* Driver Coordinates & Status HUD */}
      <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <Compass className="w-5 h-5 text-amber-400 animate-spin-slow" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">Statut Commande</span>
            <span className="text-sm font-bold text-slate-200">
              {status === "PENDING" && "Recherche livreur..."}
              {status === "ASSIGNED" && "Livreur assigné"}
              {status === "PICKED_UP" && "Commande récupérée"}
              {status === "IN_PROGRESS" && "En cours de livraison"}
              {status === "DELIVERED" && "Commande livrée !"}
              {status === "CANCELLED" && "Livraison annulée"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold text-right">Livreur GPS</span>
            <span className="text-xs font-mono font-semibold text-slate-350 block text-right">
              {driverLat && driverLng
                ? `${driverLat.toFixed(4)}°N, ${driverLng.toFixed(4)}°W`
                : "Signal GPS en attente"}
            </span>
          </div>
        </div>
      </div>

      {/* CSS Styles for animations */}
      <style jsx global>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
