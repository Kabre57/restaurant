'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, FileText, Loader2, Info } from 'lucide-react'

type LeaveRequestModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  employees: any[]
  currentUserId?: string
  isManager?: boolean
}

export function LeaveRequestModal({ isOpen, onClose, onSave, employees, currentUserId, isManager }: LeaveRequestModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    userId: currentUserId || '',
    type: 'PAID',
    startDate: '',
    endDate: '',
    daysCount: '0',
    reason: ''
  })

  // Calculate days difference
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (end >= start) {
        const diffTime = Math.abs(end.getTime() - start.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // Inclusive
        setFormData(prev => ({ ...prev, daysCount: diffDays.toString() }))
      } else {
        setFormData(prev => ({ ...prev, daysCount: '0' }))
      }
    }
  }, [formData.startDate, formData.endDate])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onSave(formData)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-[var(--parabellum-border)] bg-[#f8f9ff] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--parabellum-primary)]/10 text-[var(--parabellum-primary)]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-[var(--parabellum-text)]">
                Demande de Congé
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
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.matricule || 'N/A'})</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
              Type de Congé
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors"
            >
              <option value="PAID">Congé Payé</option>
              <option value="SICK">Congé Maladie</option>
              <option value="MATERNITY">Congé Maternité/Paternité</option>
              <option value="UNPAID">Congé Sans Solde</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Date de début
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Date de fin
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 p-4 border border-blue-100 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-blue-900">Nombre de jours estimé</div>
              <div className="text-xl font-black text-blue-600">{formData.daysCount} jours</div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
              Motif / Raison (Optionnel)
            </label>
            <textarea
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Précisez le motif de votre demande..."
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
            disabled={loading || !formData.startDate || !formData.endDate || !formData.userId}
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
