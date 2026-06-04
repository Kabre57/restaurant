"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Users, Wifi, WifiOff, RefreshCw } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { TableData, TableStatus } from "@/app/api/tables/route";

const STATUS_CONFIG: Record<TableStatus, { label: string; dot: string; glass: string; badge: string }> = {
  LIBRE:         { label: "Libre",          dot: "bg-emerald-400", glass: "from-emerald-50/80  to-white/60  border-emerald-200/60",  badge: "bg-emerald-100  text-emerald-700" },
  OCCUPEE:       { label: "Occupée",        dot: "bg-orange-400",  glass: "from-orange-50/80   to-white/60  border-orange-200/60",   badge: "bg-orange-100   text-orange-700"  },
  RESERVEE:      { label: "Réservée",       dot: "bg-violet-400",  glass: "from-violet-50/80   to-white/60  border-violet-200/60",   badge: "bg-violet-100   text-violet-700"  },
  EN_NETTOYAGE:  { label: "Nettoyage",      dot: "bg-sky-400",     glass: "from-sky-50/80      to-white/60  border-sky-200/60",      badge: "bg-sky-100      text-sky-700"     },
};

const ZONES_MOCK = [
  { id: "z1", name: "Terrasse" },
  { id: "z2", name: "Salle Principale" },
  { id: "z3", name: "Étage" },
];

function elapsed(since: string | null | undefined): string {
  if (!since) return "";
  const mins = Math.floor((Date.now() - new Date(since).getTime()) / 60000);
  return mins < 60 ? `${mins}min` : `${Math.floor(mins / 60)}h${mins % 60}`;
}

export default function TablesPage() {
  const [tables, setTables]         = useState<TableData[]>([]);
  const [stats, setStats]           = useState({ total: 0, libre: 0, occupee: 0, reservee: 0, nettoyage: 0 });
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [online, setOnline]         = useState(true);

  // Modals
  const [addOpen, setAddOpen]       = useState(false);
  const [editOpen, setEditOpen]     = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selected, setSelected]     = useState<TableData | null>(null);

  // Form state
  const [formNumber, setFormNumber] = useState("");
  const [formSeats, setFormSeats]   = useState("4");
  const [formZone, setFormZone]     = useState("z1");

  // ── Fetch tables ──────────────────────────────────────────
  const fetchTables = useCallback(async () => {
    try {
      const url = activeZone ? `/api/tables?restaurantId=default&zone=${activeZone}` : "/api/tables?restaurantId=default";
      const res = await fetch(url);
      const data = await res.json();
      setTables(data.tables ?? []);
      setStats(data.stats ?? { total: 0, libre: 0, occupee: 0, reservee: 0, nettoyage: 0 });
    } catch (err) {
      console.error("Erreur lors du chargement des tables :", err);
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, [activeZone]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  // ── SSE temps réel ────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource("/api/tables/events?restaurantId=default");
    es.onopen    = () => setOnline(true);
    es.onerror   = () => setOnline(false);
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.event === "SNAPSHOT")      setTables(payload.tables);
        if (payload.event === "TABLE_UPDATED") setTables((prev) => prev.map((t) => t.id === payload.table.id ? payload.table : t));
        if (payload.event === "TABLE_CREATED") setTables((prev) => [...prev, payload.table]);
        if (payload.event === "TABLE_DELETED") setTables((prev) => prev.filter((t) => t.id !== payload.tableId));
      } catch { /* skip */ }
    };
    return () => es.close();
  }, []);

  // ── Actions ───────────────────────────────────────────────
  const handleAdd = async () => {
    await fetch("/api/tables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: formNumber, seats: Number(formSeats), zoneId: formZone, restaurantId: "default" }) });
    setAddOpen(false); fetchTables();
  };

  const handleStatusChange = async (status: TableStatus) => {
    if (!selected) return;
    await fetch(`/api/tables/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, restaurantId: "default" }) });
    setStatusOpen(false); fetchTables();
  };

  const handleDelete = async () => {
    if (!selected) return;
    await fetch(`/api/tables/${selected.id}?restaurantId=default`, { method: "DELETE" });
    setDeleteOpen(false); fetchTables();
  };

  const filtered = activeZone ? tables.filter((t) => t.zoneId === activeZone) : tables;

  // ── UI ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#171717]">Gestion de Salle</h1>
          <p className="flex items-center gap-2 text-[#6B7280] text-sm font-medium mt-0.5">
            {online
              ? <><Wifi size={14} className="text-emerald-500" /> Temps réel actif</>
              : <><WifiOff size={14} className="text-red-400" /> Hors ligne</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchTables} className="p-3 bg-white border border-[#E5E7EB] rounded-2xl text-[#6B7280] hover:text-[#FF6D00] hover:border-[#FF6D00]/40 transition-all shadow-sm">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 bg-[#FF6D00] text-white px-5 py-3 rounded-2xl font-bold hover:bg-[#E66200] shadow-md shadow-[#FF6D00]/20 active:scale-95 transition-all">
            <Plus size={20} /> Ajouter Table
          </button>
        </div>
      </div>

      {/* ── KPI Cards glassmorphism ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Tables", value: stats.total,     color: "from-gray-50  to-white", dot: "bg-gray-400",    badge: "bg-gray-100  text-gray-600"    },
          { label: "Libres",       value: stats.libre,     color: "from-emerald-50 to-white", dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700" },
          { label: "Occupées",     value: stats.occupee,   color: "from-orange-50  to-white", dot: "bg-orange-400",  badge: "bg-orange-50  text-orange-700"  },
          { label: "Réservées",    value: stats.reservee,  color: "from-violet-50  to-white", dot: "bg-violet-400",  badge: "bg-violet-50  text-violet-700"  },
        ].map((k, i) => (
          <div key={i} className={`bg-gradient-to-br ${k.color} backdrop-blur-sm border border-white/60 rounded-[20px] p-5 shadow-sm`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${k.dot} animate-pulse`} />
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">{k.label}</span>
            </div>
            <p className="text-4xl font-extrabold text-[#171717]">{loading ? "—" : k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Zone Filter ── */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setActiveZone(null)}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${!activeZone ? "bg-[#FF6D00] text-white shadow-md shadow-[#FF6D00]/20" : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6D00]/40"}`}
        >
          Toutes ({stats.total})
        </button>
        {ZONES_MOCK.map((z) => (
          <button
            key={z.id}
            onClick={() => setActiveZone(z.id === activeZone ? null : z.id)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeZone === z.id ? "bg-[#171717] text-white" : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#171717]/40"}`}
          >
            {z.name}
          </button>
        ))}
      </div>

      {/* ── Table Cards Grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/50 border border-[#E5E7EB] rounded-[24px] h-52 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((table) => {
            const cfg = STATUS_CONFIG[table.status];
            return (
              <div
                key={table.id}
                className={`relative bg-gradient-to-br ${cfg.glass} backdrop-blur-sm border rounded-[24px] p-5 flex flex-col items-center text-center shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group`}
                onClick={() => { setSelected(table); setStatusOpen(true); }}
              >
                {/* Live dot */}
                <span className={`absolute top-4 left-4 w-2.5 h-2.5 rounded-full ${cfg.dot}`}>
                  <span className={`absolute inset-0 rounded-full ${cfg.dot} opacity-60 animate-ping`} />
                </span>

                {/* Actions */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setSelected(table); setEditOpen(true); }} className="p-1.5 bg-white/80 backdrop-blur-sm text-[#9CA3AF] hover:text-[#FF6D00] rounded-lg shadow-sm transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => { setSelected(table); setDeleteOpen(true); }} className="p-1.5 bg-white/80 backdrop-blur-sm text-[#9CA3AF] hover:text-red-500 rounded-lg shadow-sm transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Table visual */}
                <div className="w-20 h-20 my-3 relative flex items-center justify-center">
                  <div className="w-14 h-10 bg-white/70 backdrop-blur-sm border-2 border-current rounded-xl shadow-inner" style={{ color: cfg.dot.replace("bg-", "").includes("emerald") ? "#10b981" : cfg.dot.replace("bg-", "").includes("orange") ? "#f97316" : cfg.dot.replace("bg-", "").includes("violet") ? "#8b5cf6" : "#38bdf8" }} />
                  {/* Chairs */}
                  {Array.from({ length: Math.min(table.seats, 4) }).map((_, i) => (
                    <div key={i} className={`absolute w-4 h-2.5 bg-white/70 border border-gray-200 rounded-sm ${i === 0 ? "-top-2 left-1/2 -translate-x-1/2" : i === 1 ? "-bottom-2 left-1/2 -translate-x-1/2" : i === 2 ? "-left-2 top-1/2 -translate-y-1/2 rotate-90" : "-right-2 top-1/2 -translate-y-1/2 rotate-90"}`} />
                  ))}
                </div>

                <h3 className="font-extrabold text-[#171717] text-xl">{table.number}</h3>
                <p className="text-xs text-[#6B7280] font-medium flex items-center gap-1 mt-0.5 mb-3">
                  <Users size={12} /> {table.seats} places · {table.zone}
                </p>

                <span className={`text-xs font-bold px-3 py-1.5 rounded-full w-full ${cfg.badge}`}>
                  {cfg.label}
                  {table.occupiedSince && ` · ${elapsed(table.occupiedSince)}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODALS ─────────────────────────────────────────── */}

      {/* Changement statut rapide */}
      <Modal isOpen={statusOpen} onClose={() => setStatusOpen(false)} title={`Changer statut — ${selected?.number}`} maxWidth="max-w-sm">
        <div className="grid grid-cols-2 gap-3 pb-2">
          {(Object.entries(STATUS_CONFIG) as [TableStatus, typeof STATUS_CONFIG[TableStatus]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => handleStatusChange(key)}
              className={`py-4 rounded-2xl font-bold text-sm flex flex-col items-center gap-2 border-2 transition-all active:scale-95 ${selected?.status === key ? "border-[#FF6D00] bg-[#FFF0E5]" : "border-[#E5E7EB] bg-white hover:border-[#FF6D00]/40"}`}
            >
              <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </button>
          ))}
        </div>
      </Modal>

      {/* Ajouter table */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Ajouter une Table" maxWidth="max-w-sm">
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="space-y-5">
          {[
            { label: "Numéro de table", placeholder: "T-09", value: formNumber, setter: setFormNumber, type: "text" },
            { label: "Nombre de places", placeholder: "4",  value: formSeats,  setter: setFormSeats,  type: "number" },
          ].map((f, i) => (
            <div key={i} className="space-y-2">
              <label className="text-sm font-bold text-[#171717] ml-1">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={f.value} onChange={(e) => f.setter(e.target.value)} required className="w-full px-5 py-4 bg-[#F8F9FA] rounded-[16px] border-none focus:ring-2 focus:ring-[#FF6D00] outline-none font-medium text-[#171717]" />
            </div>
          ))}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#171717] ml-1">Zone</label>
            <select value={formZone} onChange={(e) => setFormZone(e.target.value)} className="w-full px-5 py-4 bg-[#F8F9FA] rounded-[16px] border-none focus:ring-2 focus:ring-[#FF6D00] outline-none font-medium text-[#171717] appearance-none cursor-pointer">
              {ZONES_MOCK.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div className="pt-4 border-t border-[#E5E7EB] flex justify-end gap-3">
            <button type="button" onClick={() => setAddOpen(false)} className="px-6 py-3 rounded-2xl font-bold text-[#6B7280] hover:bg-[#F8F9FA]">Annuler</button>
            <button type="submit" className="px-8 py-3 rounded-2xl font-bold text-white bg-[#FF6D00] hover:bg-[#E66200] shadow-md shadow-[#FF6D00]/20 active:scale-95 transition-all">Ajouter</button>
          </div>
        </form>
      </Modal>

      {/* Modifier */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title={`Modifier ${selected?.number}`} maxWidth="max-w-sm">
        <form className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#171717] ml-1">Zone</label>
            <select defaultValue={selected?.zoneId} className="w-full px-5 py-4 bg-[#F8F9FA] rounded-[16px] border-none focus:ring-2 focus:ring-[#FF6D00] outline-none font-medium text-[#171717] appearance-none cursor-pointer">
              {ZONES_MOCK.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#171717] ml-1">Nombre de places</label>
            <input type="number" defaultValue={selected?.seats} className="w-full px-5 py-4 bg-[#F8F9FA] rounded-[16px] border-none focus:ring-2 focus:ring-[#FF6D00] outline-none font-medium text-[#171717]" />
          </div>
          <div className="pt-4 border-t border-[#E5E7EB] flex justify-end gap-3">
            <button type="button" onClick={() => setEditOpen(false)} className="px-6 py-3 rounded-2xl font-bold text-[#6B7280] hover:bg-[#F8F9FA]">Annuler</button>
            <button type="submit" className="px-8 py-3 rounded-2xl font-bold text-white bg-[#FF6D00] hover:bg-[#E66200] shadow-md shadow-[#FF6D00]/20 active:scale-95 transition-all">Mettre à jour</button>
          </div>
        </form>
      </Modal>

      {/* Supprimer */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Supprimer la Table" maxWidth="max-w-md">
        <div className="text-center space-y-5 pb-2">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto"><Trash2 size={28} /></div>
          <p className="text-[#6B7280] font-medium text-sm">Supprimer définitivement <span className="font-bold text-[#171717]">{selected?.number}</span> ({selected?.zone}) ? Cette action est irréversible.</p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setDeleteOpen(false)} className="flex-1 py-3 rounded-2xl font-bold text-[#6B7280] hover:bg-[#F8F9FA]">Annuler</button>
            <button onClick={handleDelete} className="flex-1 py-3 rounded-2xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20 active:scale-95 transition-all">Supprimer</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
