'use client'

import React, { useState } from 'react'
import { X, CreditCard, FileText, Loader2, Info } from 'lucide-react'

export type LoanRequestFormData = {
  userId: string
  type: 'ADVANCE' | 'LOAN'
  amount: string
  monthlyDeduction: string
  startDate: string
  reason: string
}

type EmployeeOption = {
  id: string
  name: string | null
  matricule?: string | null
}

type LoanRequestModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (data: LoanRequestFormData) => Promise<void>
  employees: EmployeeOption[]
  currentUserId?: string
  isManager?: boolean
}

export function LoanRequestModal({ isOpen, onClose, onSave, employees, currentUserId, isManager }: LoanRequestModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<LoanRequestFormData>({
    userId: '',
    type: 'ADVANCE',
    amount: '',
    monthlyDeduction: '',
    startDate: '',
    reason: ''
  })

  if (!isOpen) return null

  const effectiveUserId = isManager ? formData.userId : currentUserId || formData.userId
  const payload = { ...formData, userId: effectiveUserId }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onSave(payload)
    setLoading(false)
  }

  const isAdvance = formData.type === 'ADVANCE'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-[var(--parabellum-border)] bg-[#f8f9ff] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--parabellum-primary)]/10 text-[var(--parabellum-primary)]">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-[var(--parabellum-text)]">
                Demande d'Avance / Prêt
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-black/5 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {isManager && employees.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Employé concerné
              </label>
              <select
                required
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors"
              >
                <option value="">Sélectionner un employé</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name || 'Employé'} ({emp.matricule || 'N/A'})</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
              Type de Demande
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as LoanRequestFormData['type'] })}
              className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors"
            >
              <option value="ADVANCE">Avance sur Salaire</option>
              <option value="LOAN">Prêt Entreprise</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Montant Demandé (F)
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Date de début / déblocage
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {!isAdvance && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Retenue mensuelle souhaitée (F)
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.monthlyDeduction}
                onChange={(e) => setFormData({ ...formData, monthlyDeduction: e.target.value })}
                placeholder="Ex: 25000"
                className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors"
              />
            </div>
          )}

          {isAdvance && (
            <div className="rounded-xl bg-orange-50 p-4 border border-orange-100 flex items-start gap-3">
              <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-orange-900">Remboursement de l'avance</div>
                <div className="text-xs text-orange-700 mt-1">L'avance sur salaire sera automatiquement et intégralement déduite lors de votre prochaine paie.</div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
              Motif de la demande
            </label>
            <textarea
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Précisez pourquoi vous avez besoin de cette avance/prêt..."
              className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors resize-none"
            />
          </div>

        </form>

        <div className="border-t border-[var(--parabellum-border)] bg-gray-50/50 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.amount || !formData.startDate || !effectiveUserId}
            className="flex items-center gap-2 rounded-xl bg-[var(--parabellum-primary)] px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-[var(--parabellum-primary)]/20 transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Soumettre
          </button>
        </div>
      </div>
    </div>
  )
}
