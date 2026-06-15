'use client'

import React from 'react'
import { History, X, ClipboardCheck, RotateCcw } from 'lucide-react'
import type { Order } from '../types'

interface HistorySidebarProps {
  isDarkMode: boolean
  setShowHistory: (val: boolean) => void
  completedHistory: Order[]
  handleRecallOrder: (order: Order) => void
}

export function HistorySidebar({
  isDarkMode,
  setShowHistory,
  completedHistory,
  handleRecallOrder
}: HistorySidebarProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0f1115]/75 backdrop-blur-xs animate-in fade-in duration-300">
      <button
        onClick={() => setShowHistory(false)}
        className="flex-1 cursor-default focus:outline-none"
        aria-label="Fermer"
      />
      <div className={`w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 transition-colors ${
        isDarkMode ? 'bg-[#181a20] text-white border-l border-[#2e3440]' : 'bg-white text-[#212529] border-l border-[#dee2e6]'
      }`}>
        <div className={`p-6 border-b flex items-center justify-between ${
          isDarkMode ? 'border-[#2e3440]' : 'border-[#dee2e6]'
        }`}>
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-black uppercase tracking-tight">Rappel de Tickets</h2>
          </div>
          <button
            onClick={() => setShowHistory(false)}
            className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-[#2b303c] text-white' : 'hover:bg-[#f1f3f5] text-gray-500'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {completedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#adb5bd]">
              <ClipboardCheck className="w-16 h-16 mb-4 opacity-25" />
              <p className="text-xs font-black uppercase tracking-widest">Aucun ticket archivé</p>
              <p className="text-[10px] text-center mt-1">Les tickets terminés s'afficheront ici pour rappel.</p>
            </div>
          ) : (
            completedHistory.map(order => (
              <div
                key={order.id}
                className={`rounded-xl border p-4 shadow-xs flex flex-col gap-3 transition-all ${
                  isDarkMode ? 'bg-[#1e222b] border-[#2e3440]' : 'bg-[#f8f9fa] border-[#dee2e6]'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-dashed border-current/10">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black text-white bg-green-600">
                      #{order.id.slice(-4).toUpperCase()}
                    </span>
                    {order.table && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        isDarkMode ? 'bg-amber-400/10 text-amber-400' : 'bg-[#FF6D00]/10 text-[#FF6D00]'
                      }`}>
                        Table {order.table.number}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-gray-500 font-mono">
                    {new Date(order.createdAt).toLocaleTimeString('fr-FR')}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        <span className="font-bold mr-2 text-green-500">{item.quantity}x</span>
                        {item.product.name}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleRecallOrder(order)}
                  className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Rappeler le Ticket
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
