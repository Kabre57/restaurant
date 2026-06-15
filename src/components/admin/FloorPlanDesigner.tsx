'use client';

import React, { useState, useRef } from 'react';
import { Plus, Trash2, Move, Grid3X3, Circle, Square, Loader2, X, AlertCircle } from 'lucide-react';
import { Table, TableShape } from '@prisma/client';
import { createTable, updateTablePosition, updateTableDetails, deleteTable } from '@/app/actions/store/tables';

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
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTable = tables.find(t => t.id === selectedTableId);

  const updateDraggingTablePosition = (clientX: number, clientY: number) => {
    if (!selectedTableId || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.round(clientX - containerRect.left - dragOffset.x));
    const y = Math.max(0, Math.round(clientY - containerRect.top - dragOffset.y));
    setTables(prev => prev.map(t => t.id === selectedTableId ? { ...t, x, y } : t));
  };

  const handleAddTable = async () => {
    setIsAdding(true);
    setErrorModal(null);
    try {
      const nextNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
      const res = await createTable({
        storeId,
        number: nextNumber,
        capacity: 4,
        x: Math.floor(Math.random() * 300) + 50,
        y: Math.floor(Math.random() * 200) + 50,
        shape: 'RECTANGLE' as TableShape
      });

      if (res.success && res.table) {
        setTables(prev => [...prev, res.table!]);
        setSelectedTableId(res.table!.id);
      } else {
        setErrorModal(res.error || "Erreur lors de l'ajout");
      }
    } catch (e) {
      console.error("handleAddTable error:", e);
      setErrorModal("Impossible d'ajouter la table. Vérifiez la console.");
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
    if (!isDragging) return;
    updateDraggingTablePosition(e.clientX, e.clientY);
  };

  const persistDraggedTable = async () => {
    if (isDragging && selectedTableId) {
      const table = tables.find(t => t.id === selectedTableId);
      if (table) {
        await updateTablePosition(table.id, table.x, table.y);
      }
    }
    setIsDragging(false);
  };

  const handleMouseUp = async () => {
    await persistDraggedTable();
  };

  const handleTouchStart = (e: React.TouchEvent, tableId: string) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    setSelectedTableId(tableId);
    setIsDragging(true);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    updateDraggingTablePosition(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = async () => {
    await persistDraggedTable();
  };

  const handleUpdateShape = async (shape: 'RECTANGLE' | 'CIRCLE') => {
    if (!selectedTableId) return;
    setTables(prev => prev.map(t => t.id === selectedTableId ? { ...t, shape } : t));
    await updateTableDetails(selectedTableId, { shape: shape as TableShape });
  };

  const handleUpdateField = async (field: 'number' | 'capacity' | 'width' | 'height', value: number) => {
    if (!selectedTableId) return;
    setTables(prev => prev.map(t => t.id === selectedTableId ? { ...t, [field]: value } : t));
    await updateTableDetails(selectedTableId, { [field]: value });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await deleteTable(deleteTarget);
    if (res.success) {
      setTables(prev => prev.filter(t => t.id !== deleteTarget));
      setSelectedTableId(null);
      setDeleteTarget(null);
    } else {
      setErrorModal(res.error || "Erreur lors de la suppression");
      setDeleteTarget(null);
    }
  };

  const handleDeleteTable = () => {
    if (selectedTableId) setDeleteTarget(selectedTableId);
  };

  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm lg:h-[calc(100vh-180px)] lg:min-h-0">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
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
          <div className="flex flex-wrap items-center gap-3">
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

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Canvas Area */}
        <div
          ref={containerRef}
          className={`relative min-h-[420px] flex-1 overflow-auto bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] lg:min-h-0 ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTableId(null);
          }}
        >
          {tables.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 pointer-events-none">
              <Grid3X3 className="w-16 h-16 mb-4" />
              <p className="font-black text-xs uppercase tracking-widest">Cliquez &quot;Ajouter Table&quot; pour commencer</p>
            </div>
          )}

          {tables.map(table => (
            <div
              key={table.id}
              onMouseDown={(e) => handleMouseDown(e, table.id)}
              onTouchStart={(e) => handleTouchStart(e, table.id)}
              style={{
                left: `${table.x}px`,
                top: `${table.y}px`,
                width: `${table.width}px`,
                height: `${table.height}px`,
                borderRadius: table.shape === 'CIRCLE' ? '50%' : '16px',
                userSelect: 'none',
                touchAction: 'none'
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
          <div className="w-full space-y-5 overflow-y-auto border-t border-slate-100 bg-white p-5 sm:p-6 lg:w-60 lg:border-t-0 lg:border-l">
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

      {/* Modal Confirmation de Suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300 sm:p-8">
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">Confirmer la suppression</h2>
            <p className="text-xs font-bold text-[#adb5bd] mb-8">Voulez-vous vraiment supprimer cette table ?</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Annuler</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-[#e03131] hover:bg-[#c92a2a] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-500/20">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Erreur / Alerte */}
      {errorModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300 sm:p-8">
            <button onClick={() => setErrorModal(null)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-4">Action Impossible</h2>
            <p className="text-sm font-bold text-[#495057] mb-8 leading-relaxed">{errorModal}</p>
            <button onClick={() => setErrorModal(null)} className="w-full py-4 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl">J&apos;ai compris</button>
          </div>
        </div>
      )}
    </div>
  );
}
