'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { createContract, updateContract, ContractData } from '@/app/actions/rh/contracts'

interface ContractModalProps {
  contract?: any
  employees: any[]
  onClose: () => void
  onSuccess: () => void
}

export function ContractModal({ contract, employees, onClose, onSuccess }: ContractModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!contract

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    const data: ContractData = {
      userId: formData.get('userId') as string,
      type: formData.get('type') as string,
      startDate: new Date(formData.get('startDate') as string),
      endDate: formData.get('endDate') ? new Date(formData.get('endDate') as string) : null,
      position: formData.get('position') as string,
      department: formData.get('department') as string,
      baseSalary: parseFloat(formData.get('baseSalary') as string) || 0,
      status: formData.get('status') as string,
      maritalStatus: formData.get('maritalStatus') as string,
      numberOfChildren: parseInt(formData.get('numberOfChildren') as string) || 0,
    }

    if (!isEditing) {
      const result = await createContract(data)
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || 'Erreur inconnue')
      }
    } else {
      const result = await updateContract(contract.id, data)
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || 'Erreur inconnue')
      }
    }
    
    setIsLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--parabellum-border)] p-6">
          <h2 className="text-xl font-black uppercase tracking-tight text-[var(--parabellum-text)]">
            {isEditing ? 'Modifier le contrat' : 'Nouveau Contrat'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[60vh] overflow-y-auto p-6">
            {error && (
              <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Employé</label>
                <select required name="userId" defaultValue={contract?.userId || ''} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" disabled={isEditing}>
                  <option value="">Sélectionner un employé</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.matricule || emp.email})</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Type de Contrat</label>
                <select required name="type" defaultValue={contract?.type || ''} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white">
                  <option value="">Sélectionner</option>
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="STAGE">Stage</option>
                  <option value="FREELANCE">Freelance</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Statut</label>
                <select name="status" defaultValue={contract?.status || 'ACTIVE'} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white">
                  <option value="ACTIVE">Actif</option>
                  <option value="EXPIRED">Expiré</option>
                  <option value="TERMINATED">Rompu</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Date de début</label>
                <input required type="date" name="startDate" defaultValue={contract?.startDate?.toISOString().split('T')[0]} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Date de fin</label>
                <input type="date" name="endDate" defaultValue={contract?.endDate?.toISOString().split('T')[0]} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Poste</label>
                <input name="position" defaultValue={contract?.position} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Département</label>
                <input name="department" defaultValue={contract?.department} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Salaire de base (FCFA)</label>
                <input required type="number" name="baseSalary" defaultValue={contract?.baseSalary} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5 sm:col-span-2 border-t border-gray-200 pt-4 mt-2">
                <h3 className="text-sm font-black uppercase text-gray-800 mb-2">Informations Fiscales (Calcul IGR)</h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Statut Marital</label>
                <select name="maritalStatus" defaultValue={contract?.user?.maritalStatus || 'SINGLE'} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white">
                  <option value="SINGLE">Célibataire</option>
                  <option value="MARRIED">Marié(e)</option>
                  <option value="DIVORCED">Divorcé(e)</option>
                  <option value="WIDOWED">Veuf/Veuve</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Nombre d'enfants</label>
                <input type="number" min="0" name="numberOfChildren" defaultValue={contract?.user?.numberOfChildren || 0} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 rounded-b-3xl bg-[#f8f9ff] p-6 border-t border-[var(--parabellum-border)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-[var(--parabellum-muted)] transition-colors hover:bg-black/5 hover:text-[var(--parabellum-text)]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-[var(--parabellum-primary)] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--parabellum-primary)]/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Enregistrement...' : (isEditing ? 'Mettre à jour' : 'Enregistrer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
