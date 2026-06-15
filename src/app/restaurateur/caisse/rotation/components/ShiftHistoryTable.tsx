'use client'

import React from 'react'
import {
  History, Download, Calendar, UserCheck, Printer
} from 'lucide-react'
import type { CashDrawerShift } from '../types'

interface ShiftHistoryTableProps {
  history: CashDrawerShift[]
  onExportCSV: () => void
  onPrintReport: (shift: CashDrawerShift) => void
}

export function ShiftHistoryTable({
  history,
  onExportCSV,
  onPrintReport
}: ShiftHistoryTableProps) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
        <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-orange-600" />
          Historique des rotations de caisse
        </h2>
        
        {history.length > 0 && (
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 active:scale-95 transition-all text-xs font-bold w-fit"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-4">Aucun poste clôturé dans l&apos;historique.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-gray-500 border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="py-3 px-4">Date de Rotation</th>
                <th className="py-3 px-4">Caissier</th>
                <th className="py-3 px-4 text-right">Fond Initial</th>
                <th className="py-3 px-4 text-right">Réel Clôture</th>
                <th className="py-3 px-4 text-right">Attendu</th>
                <th className="py-3 px-4 text-right">Écart</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map((h) => {
                const ecart = h.endAmount !== null && h.expectedAmount !== null
                  ? h.endAmount - h.expectedAmount
                  : null

                return (
                  <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-gray-900 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{new Date(h.openedAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <span className="text-[9px] text-gray-400 block mt-0.5 font-bold uppercase tracking-wider">
                        {new Date(h.openedAt).toLocaleTimeString('fr-FR')}
                        {h.closedAt && ` - ${new Date(h.closedAt).toLocaleTimeString('fr-FR')}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-gray-700 font-bold">
                        <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                        <span>{h.openedByName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {h.startAmount.toLocaleString()} FCFA
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {h.endAmount !== null ? `${h.endAmount.toLocaleString()} FCFA` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {h.expectedAmount !== null ? `${h.expectedAmount.toLocaleString()} FCFA` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {ecart !== null ? (
                        ecart === 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black">
                            Parfait
                          </span>
                        ) : ecart > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black">
                            +{ecart.toLocaleString()} FCFA
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-black">
                            {ecart.toLocaleString()} FCFA
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {h.status === 'CLOSED' ? (
                        <span className="inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-500">
                          Clôturé
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 animate-pulse">
                          En cours
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onPrintReport(h)}
                        title="Imprimer le rapport"
                        className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 active:scale-95 transition-all inline-flex items-center gap-1 font-bold text-[10px]"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimer</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
