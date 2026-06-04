'use client'

import React, { useState, useEffect } from 'react'
import { X, Star, FileText, Loader2, Plus, Trash2 } from 'lucide-react'

type EvaluationModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  employees: any[]
  currentUserId?: string
  isManager?: boolean
  editingEvaluation?: any
}

export function EvaluationModal({ isOpen, onClose, onSave, employees, currentUserId, isManager, editingEvaluation }: EvaluationModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    userId: '',
    evaluatorId: currentUserId || '',
    period: new Date().getFullYear().toString(),
    date: new Date().toISOString().split('T')[0],
    score: '5',
    status: 'DRAFT',
    comments: '',
    skills: [] as { name: string, rating: number }[],
    objectives: [] as { description: string, achieved: boolean }[]
  })

  useEffect(() => {
    if (editingEvaluation) {
      setFormData({
        id: editingEvaluation.id,
        userId: editingEvaluation.userId,
        evaluatorId: editingEvaluation.evaluatorId || currentUserId || '',
        period: editingEvaluation.period,
        date: new Date(editingEvaluation.date).toISOString().split('T')[0],
        score: editingEvaluation.score.toString(),
        status: editingEvaluation.status,
        comments: editingEvaluation.comments || '',
        skills: editingEvaluation.skills || [],
        objectives: editingEvaluation.objectives || []
      })
    } else {
      setFormData({
        id: '',
        userId: '',
        evaluatorId: currentUserId || '',
        period: new Date().getFullYear().toString(),
        date: new Date().toISOString().split('T')[0],
        score: '5',
        status: 'DRAFT',
        comments: '',
        skills: [
          { name: 'Ponctualité', rating: 5 },
          { name: 'Qualité du travail', rating: 5 },
          { name: 'Esprit d\'équipe', rating: 5 }
        ],
        objectives: [
          { description: 'Améliorer le temps de service', achieved: false }
        ]
      })
    }
  }, [editingEvaluation, currentUserId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onSave(formData)
    setLoading(false)
  }

  const addSkill = () => setFormData(prev => ({ ...prev, skills: [...prev.skills, { name: '', rating: 5 }] }))
  const removeSkill = (index: number) => setFormData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }))
  const updateSkill = (index: number, field: string, value: any) => {
    const newSkills = [...formData.skills]
    newSkills[index] = { ...newSkills[index], [field]: value }
    setFormData({ ...formData, skills: newSkills })
  }

  const addObjective = () => setFormData(prev => ({ ...prev, objectives: [...prev.objectives, { description: '', achieved: false }] }))
  const removeObjective = (index: number) => setFormData(prev => ({ ...prev, objectives: prev.objectives.filter((_, i) => i !== index) }))
  const updateObjective = (index: number, field: string, value: any) => {
    const newObjectives = [...formData.objectives]
    newObjectives[index] = { ...newObjectives[index], [field]: value }
    setFormData({ ...formData, objectives: newObjectives })
  }

  // Si c'est un employé qui regarde sa propre évaluation, on rend tout en lecture seule
  const readOnly = !isManager

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-[var(--parabellum-border)] bg-[#f8f9ff] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--parabellum-primary)]/10 text-[var(--parabellum-primary)]">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-[var(--parabellum-text)]">
                {readOnly ? 'Détail de l\'évaluation' : editingEvaluation ? 'Modifier l\'Évaluation' : 'Nouvelle Évaluation'}
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Employé évalué
              </label>
              <select
                required
                disabled={readOnly || !!editingEvaluation}
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors disabled:opacity-70"
              >
                <option value="">Sélectionner un employé</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.matricule || 'N/A'})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Date de l'évaluation
              </label>
              <input
                type="date"
                required
                disabled={readOnly}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors disabled:opacity-70"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Période
              </label>
              <input
                type="text"
                required
                disabled={readOnly}
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                placeholder="Ex: Année 2026"
                className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Note Globale (/10)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                required
                disabled={readOnly}
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Statut
              </label>
              <select
                required
                disabled={readOnly}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors disabled:opacity-70"
              >
                <option value="DRAFT">Brouillon</option>
                <option value="COMPLETED">Terminée</option>
                <option value="VALIDATED">Validée par RH</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--parabellum-text)] border-b-2 border-[var(--parabellum-primary)] pb-1 inline-block">Compétences</h3>
              {!readOnly && (
                <button type="button" onClick={addSkill} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                  <Plus className="w-3 h-3" /> Ajouter
                </button>
              )}
            </div>
            <div className="space-y-3">
              {formData.skills.map((skill, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    disabled={readOnly}
                    value={skill.name}
                    onChange={(e) => updateSkill(idx, 'name', e.target.value)}
                    placeholder="Nom de la compétence"
                    className="flex-1 rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-2 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors disabled:opacity-70"
                  />
                  <input
                    type="number"
                    min="1" max="10"
                    disabled={readOnly}
                    value={skill.rating}
                    onChange={(e) => updateSkill(idx, 'rating', parseInt(e.target.value))}
                    className="w-24 rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-2 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors disabled:opacity-70"
                  />
                  {!readOnly && (
                    <button type="button" onClick={() => removeSkill(idx)} className="p-2 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--parabellum-text)] border-b-2 border-[var(--parabellum-primary)] pb-1 inline-block">Objectifs</h3>
              {!readOnly && (
                <button type="button" onClick={addObjective} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                  <Plus className="w-3 h-3" /> Ajouter
                </button>
              )}
            </div>
            <div className="space-y-3">
              {formData.objectives.map((obj, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="pt-2">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={obj.achieved}
                      onChange={(e) => updateObjective(idx, 'achieved', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={obj.description}
                    onChange={(e) => updateObjective(idx, 'description', e.target.value)}
                    placeholder="Description de l'objectif"
                    className="flex-1 rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-2 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors disabled:opacity-70"
                  />
                  {!readOnly && (
                    <button type="button" onClick={() => removeObjective(idx)} className="p-2 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
              Commentaires généraux
            </label>
            <textarea
              rows={4}
              disabled={readOnly}
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              placeholder="Appréciation globale du manager..."
              className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] px-4 py-3 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white transition-colors resize-none disabled:opacity-70"
            />
          </div>

        </form>

        <div className="border-t border-[var(--parabellum-border)] bg-gray-50/50 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-200 transition-colors"
          >
            {readOnly ? 'Fermer' : 'Annuler'}
          </button>
          {!readOnly && (
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.userId}
              className="flex items-center gap-2 rounded-xl bg-[var(--parabellum-primary)] px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-[var(--parabellum-primary)]/20 transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {editingEvaluation ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
