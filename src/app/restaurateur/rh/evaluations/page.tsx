'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Loader2, Star, Check, Edit3, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getEvaluations, createEvaluation, updateEvaluation, deleteEvaluation } from '@/app/actions/rh/evaluations'
import { getEmployees } from '@/app/actions/rh/employees'
import { EvaluationModal } from '@/components/rh/EvaluationModal'

export default function EvaluationsPage() {
  const { data: session, status } = useSession()
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvaluation, setEditingEvaluation] = useState<any>(null)
  const [activeFilter, setActiveFilter] = useState('ALL')

  const userRole = session?.user?.role || 'WAITER'
  const isManager = userRole === 'RESTAURATEUR' || userRole === 'MANAGER'
  const userId = isManager ? undefined : session?.user?.id

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.storeId) return

    let isCancelled = false

    async function fetchData() {
      setLoading(true)
      const [evalRes, empRes] = await Promise.all([
        getEvaluations(session?.user?.storeId as string, userId),
        isManager ? getEmployees(session?.user?.storeId as string) : Promise.resolve({ success: true, employees: [] })
      ])
      
      if (isCancelled) return

      if (evalRes.success && evalRes.evaluations) {
        setEvaluations(evalRes.evaluations)
      }
      if (empRes.success && empRes.employees) {
        setEmployees(empRes.employees)
      }
      setLoading(false)
    }

    void fetchData()

    return () => {
      isCancelled = true
    }
  }, [session, status, isManager, userId])

  async function handleSave(data: any) {
    let res
    if (editingEvaluation) {
      res = await updateEvaluation(editingEvaluation.id, data)
    } else {
      res = await createEvaluation(data)
    }

    if (res.success) {
      setShowModal(false)
      const refreshRes = await getEvaluations(session?.user?.storeId as string, userId)
      if (refreshRes.success && refreshRes.evaluations) {
        setEvaluations(refreshRes.evaluations)
      }
    } else {
      alert("Erreur lors de la sauvegarde")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Voulez-vous vraiment supprimer cette évaluation ?")) return
    const res = await deleteEvaluation(id)
    if (res.success) {
      const refreshRes = await getEvaluations(session?.user?.storeId as string, userId)
      if (refreshRes.success && refreshRes.evaluations) {
        setEvaluations(refreshRes.evaluations)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--parabellum-primary)]" />
      </div>
    )
  }

  const filteredEvaluations = evaluations.filter(e => {
    return activeFilter === 'ALL' ? true : e.status === activeFilter
  })

  // Moyenne générale du restaurant (Manager uniquement)
  const averageScore = isManager && evaluations.length > 0 
    ? (evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length).toFixed(1)
    : 0

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Évaluations</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">
            {isManager ? "Suivi des performances des employés" : "Mes bilans et évaluations"}
          </p>
        </div>
        {isManager && (
          <button 
            onClick={() => { setEditingEvaluation(null); setShowModal(true) }}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--parabellum-primary)] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-blue-700 sm:w-auto sm:px-8"
          >
            <Plus className="w-5 h-5" />
            Nouvelle Évaluation
          </button>
        )}
      </div>

      {isManager && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">Évaluations Réalisées</div>
            <div className="mt-2 text-3xl font-black text-blue-600">{evaluations.length}</div>
          </div>
          <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">Moyenne Générale</div>
            <div className="mt-2 text-3xl font-black text-orange-600">{averageScore} / 10</div>
          </div>
          <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">Validées par RH</div>
            <div className="mt-2 text-3xl font-black text-green-600">{evaluations.filter(e => e.status === 'VALIDATED').length}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#e5e7ef] bg-white p-4 shadow-sm">
        <div className="flex gap-3 overflow-x-auto">
          {['ALL', 'DRAFT', 'COMPLETED', 'VALIDATED'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeFilter === filter 
                  ? 'bg-[#212529] text-white shadow-md' 
                  : 'bg-gray-100 text-[#adb5bd] hover:bg-gray-200'
              }`}
            >
              {filter === 'ALL' ? 'Toutes' : 
               filter === 'DRAFT' ? 'Brouillons' : 
               filter === 'COMPLETED' ? 'Terminées' : 'Validées'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {filteredEvaluations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center flex-1">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 mb-4">
              <Star className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-black text-[var(--parabellum-text)]">Aucune évaluation</h3>
            <p className="mt-1 text-sm text-[var(--parabellum-muted)] max-w-sm">
              Il n'y a aucune évaluation correspondant à vos critères.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8f9ff] text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">
                <tr>
                  <th className="px-6 py-4">Période</th>
                  <th className="px-6 py-4">Employé</th>
                  {isManager && <th className="px-6 py-4">Évaluateur</th>}
                  <th className="px-6 py-4">Note Globale</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--parabellum-border)]">
                {filteredEvaluations.map((evaluation) => (
                  <tr key={evaluation.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--parabellum-text)]">{evaluation.period}</div>
                      <div className="text-xs text-[var(--parabellum-muted)]">{new Date(evaluation.date).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--parabellum-text)]">{evaluation.user?.name}</div>
                      <div className="text-xs text-[var(--parabellum-muted)]">{evaluation.user?.matricule || 'N/A'}</div>
                    </td>
                    {isManager && (
                      <td className="px-6 py-4 text-xs text-[var(--parabellum-muted)]">
                        {evaluation.evaluator?.name || 'N/A'}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-black text-orange-500">{evaluation.score} <span className="text-gray-400 font-normal">/10</span></div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-3 h-3 ${star <= (evaluation.score/2) ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                        evaluation.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                        evaluation.status === 'VALIDATED' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {evaluation.status === 'DRAFT' ? 'Brouillon' : evaluation.status === 'VALIDATED' ? 'Validé' : 'Terminé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isManager ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => { setEditingEvaluation(evaluation); setShowModal(true) }}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(evaluation.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setEditingEvaluation(evaluation); setShowModal(true) }}
                          className="text-xs font-bold text-blue-600 hover:underline"
                        >
                          Consulter
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EvaluationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        employees={employees}
        currentUserId={userId}
        isManager={isManager}
        editingEvaluation={editingEvaluation}
      />
    </div>
  )
}
