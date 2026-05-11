'use client';

import React, { useState, useRef } from 'react';
import { Plus, Trash2, Move, Grid3X3, Circle, Square, Loader2 } from 'lucide-react';
import { Table } from '@prisma/client';
import { createTable, updateTablePosition, updateTableDetails, deleteTable } from '@/app/actions/tables';

interface FloorPlanDesignerProps {
  initialTables: Table[];
  storeId: string;
}

export default function FloorPlanDesigner({ initialTables, storeId }: FloorPlanDesignerProps) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTable = tables.find(t => t.id === selectedTableId);

  const handleAddTable = async () => {
    setIsAdding(true);
    setError(null);
    try {
      const nextNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
      const res = await createTable({
        storeId,
        number: nextNumber,
        capacity: 4,
        x: Math.floor(Math.random() * 300) + 50,
        y: Math.floor(Math.random() * 200) + 50,
        shape: 'RECTANGLE' as any
      });

      if (res.success && res.table) {
        setTables(prev => [...prev, res.table!]);
        setSelectedTableId(res.table!.id);
      } else {
        setError(res.error || "Erreur lors de l'ajout");
      }
    } catch (e) {
      console.error("handleAddTable error:", e);
      setError("Impossible d'ajouter la table. Vérifiez la console.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault();
    if (e.button !== 0) return;
    setSelectedTableId(tableId);
    setIsDragging(true);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedTableId || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.round(e.clientX - containerRect.left - dragOffset.x));
    const y = Math.max(0, Math.round(e.clientY - containerRect.top - dragOffset.y));
    setTables(prev => prev.map(t => t.id === selectedTableId ? { ...t, x, y } : t));
  };

  const handleMouseUp = async () => {
    if (isDragging && selectedTableId) {
      const table = tables.find(t => t.id === selectedTableId);
      if (table) {
        await updateTablePosition(table.id, table.x, table.y);
      }
    }
    setIsDragging(false);
  };

  const handleUpdateShape = async (shape: 'RECTANGLE' | 'CIRCLE') => {
    if (!selectedTableId) return;
    setTables(prev => prev.map(t => t.id === selectedTableId ? { ...t, shape } : t));
    await updateTableDetails(selectedTableId, { shape: shape as any });
  };

  const handleUpdateField = async (field: 'number' | 'capacity' | 'width' | 'height', value: number) => {
    if (!selectedTableId) return;
    setTables(prev => prev.map(t => t.id === selectedTableId ? { ...t, [field]: value } : t));
    await updateTableDetails(selectedTableId, { [field]: value });
  };

  const handleDeleteTable = async () => {
    if (!selectedTableId) return;
    if (confirm("Supprimer cette table ?")) {
      const res = await deleteTable(selectedTableId);
      if (res.success) {
        setTables(prev => prev.filter(t => t.id !== selectedTableId));
        setSelectedTableId(null);
      } else {
        setError(res.error || "Erreur lors de la suppression");
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleAddTable}
            disabled={isAdding}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm shadow-orange-200 active:scale-95"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Ajout...' : 'Ajouter Table'}
          </button>
          
          <div className="flex items-center gap-2 text-slate-400">
            <Grid3X3 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{tables.length} table{tables.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Shape controls shown when a table is selected */}
        {selectedTable && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Table {selectedTable.number} :</span>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => handleUpdateShape('RECTANGLE')}
                className={`p-2 rounded-lg transition-all ${selectedTable.shape === 'RECTANGLE' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                title="Rectangulaire"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleUpdateShape('CIRCLE')}
                className={`p-2 rounded-lg transition-all ${selectedTable.shape === 'CIRCLE' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                title="Ronde"
              >
                <Circle className="w-4 h-4" />
              </button>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <button
              onClick={handleDeleteTable}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 text-xs font-bold transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-red-600 text-sm font-medium flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div
          ref={containerRef}
          className={`flex-1 relative overflow-auto bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTableId(null);
          }}
        >
          {tables.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 pointer-events-none">
              <Grid3X3 className="w-16 h-16 mb-4" />
              <p className="font-black text-xs uppercase tracking-widest">Cliquez "Ajouter Table" pour commencer</p>
            </div>
          )}

          {tables.map(table => (
            <div
              key={table.id}
              onMouseDown={(e) => handleMouseDown(e, table.id)}
              style={{
                left: `${table.x}px`,
                top: `${table.y}px`,
                width: `${table.width}px`,
                height: `${table.height}px`,
                borderRadius: table.shape === 'CIRCLE' ? '50%' : '16px',
                userSelect: 'none'
              }}
              className={`absolute flex items-center justify-center cursor-grab transition-all border-[3px] shadow-md ${
                selectedTableId === table.id
                  ? 'border-orange-500 bg-orange-50 shadow-xl shadow-orange-100 z-10 scale-105'
                  : 'border-slate-300 bg-white hover:border-slate-400 hover:shadow-lg'
              }`}
            >
              <div className="flex flex-col items-center pointer-events-none">
                <span className="text-xl font-black text-slate-900 leading-none">{table.number}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{table.capacity}p</span>
              </div>
            </div>
          ))}
        </div>

        {/* Properties Panel */}
        {selectedTable && (
          <div className="w-60 bg-white border-l border-slate-100 p-6 space-y-5 overflow-y-auto">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Propriétés</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">N° Table</label>
                <input
                  type="number"
                  value={selectedTable.number}
                  onChange={(e) => handleUpdateField('number', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
                  min="1"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capacité (pers.)</label>
                <input
                  type="number"
                  value={selectedTable.capacity}
                  onChange={(e) => handleUpdateField('capacity', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
                  min="1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Largeur</label>
                  <input
                    type="number"
                    value={selectedTable.width}
                    onChange={(e) => handleUpdateField('width', parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none"
                    min="60"
                    max="300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hauteur</label>
                  <input
                    type="number"
                    value={selectedTable.height}
                    onChange={(e) => handleUpdateField('height', parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none"
                    min="60"
                    max="300"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                <Move className="w-3 h-3" />
                <span>Maintenez et glissez pour déplacer</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
