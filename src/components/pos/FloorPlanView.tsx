'use client';

import React from 'react';
import { Table, Reservation } from '@prisma/client';
import { Utensils, Calendar } from 'lucide-react';

interface FloorPlanViewProps {
  tables: Table[];
  reservations: Reservation[];
  activeOrders: any[];
  onTableSelect: (table: Table) => void;
  onTableBook: (table: Table) => void;
  selectedTableId?: string | null;
}

export default function FloorPlanView({ 
  tables, 
  reservations, 
  activeOrders,
  onTableSelect, 
  onTableBook, 
  selectedTableId 
}: FloorPlanViewProps) {
  
  // Helper to check if a table is reserved "soon" (e.g., today)
  const getTableReservations = (tableId: string) => {
    return reservations.filter(r => r.tableId === tableId && r.status !== 'CANCELLED' && r.status !== 'COMPLETED');
  };

  return (
    <div className="flex-1 relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] p-10 overflow-auto">
      <div className="min-w-full min-h-full relative">
        {tables.map(table => {
          const tableReservations = getTableReservations(table.id);
          const tableOrder = activeOrders.find(o => o.tableId === table.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
          
          const isOccupied = !!tableOrder && (tableOrder.status === 'EN_ATTENTE' || tableOrder.status === 'PREPARATION' || tableOrder.status === 'PRÉPARATION');
          const isReady = !!tableOrder && (tableOrder.status === 'PRET' || tableOrder.status === 'PRÊT');
          const isReserved = !tableOrder && (table.status === 'RESERVED' || tableReservations.length > 0);
          const isSelected = selectedTableId === table.id;

          let statusColor = 'bg-pos-surface border-pos-border text-pos-text';
          if (isOccupied) statusColor = 'bg-orange-50 border-orange-500 text-orange-600';
          if (isReady) statusColor = 'bg-green-50 border-green-500 text-green-600';
          if (isReserved) statusColor = 'bg-blue-50 border-blue-400 text-blue-600';
          if (isSelected) statusColor = 'bg-brand-500 border-brand-600 text-white shadow-xl scale-105 z-10';

          return (
            <div
              key={table.id}
              style={{
                left: `${table.x}px`,
                top: `${table.y}px`,
                width: `${table.width}px`,
                height: `${table.height}px`,
                borderRadius: table.shape === 'CIRCLE' ? '50%' : '24px',
              }}
              className={`absolute flex flex-col items-center justify-center transition-all border-4 shadow-sm hover:shadow-lg select-none group ${statusColor}`}
            >
              {/* Table Content - Click to Start Order */}
              <div 
                className="flex-1 w-full flex flex-col items-center justify-center cursor-pointer"
                onClick={() => onTableSelect(table)}
              >
                <span className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-inherit'}`}>
                  {table.number}
                </span>
                <div className="flex items-center gap-1 mt-1 opacity-60">
                  <Utensils className="w-3 h-3" />
                  <span className="text-[10px] font-bold">{table.capacity}p</span>
                </div>
              </div>

              {/* Action Buttons: Only show on hover or if selected */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); onTableBook(table); }}
                  className="bg-white text-blue-600 p-2 rounded-xl shadow-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-all"
                  title="Réserver"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
              
              {/* Status Badges */}
              {isOccupied && !isSelected && (
                <div className="absolute -top-2 -left-2 bg-orange-500 text-white text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-widest shadow-md">
                  Occupée
                </div>
              )}
              {isReady && !isSelected && (
                <div className="absolute -top-2 -left-2 bg-green-500 text-white text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-widest shadow-md">
                  Prêt
                </div>
              )}
              {isReserved && !isOccupied && !isReady && !isSelected && (
                <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1">
                  <Calendar className="w-2 h-2" />
                  {tableReservations.length} Résa
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="fixed bottom-10 right-10 bg-pos-surface/90 backdrop-blur-md p-4 rounded-3xl border border-pos-border shadow-soft flex items-center gap-6 z-30">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-pos-surface border border-pos-border" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-pos-text-muted">Libre</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-pos-text-muted">Occupée / Prépa</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-pos-text-muted">Prêt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-pos-text-muted">Réservée</span>
        </div>
      </div>
    </div>
  );
}
