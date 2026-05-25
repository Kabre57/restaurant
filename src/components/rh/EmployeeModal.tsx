'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { createEmployee, updateEmployee, EmployeeData } from '@/app/actions/rh/employees'

interface EmployeeModalProps {
  storeId: string
  employee?: any
  onClose: () => void
  onSuccess: () => void
}

export function EmployeeModal({ storeId, employee, onClose, onSuccess }: EmployeeModalProps) {
  const [activeTab, setActiveTab] = useState<'perso' | 'emploi' | 'banque'>('perso')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!employee

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    const data: EmployeeData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as string,
      
      matricule: formData.get('matricule') as string,
      civilite: formData.get('civilite') as string,
      sexe: formData.get('sexe') as string,
      dateBirth: formData.get('dateBirth') ? new Date(formData.get('dateBirth') as string) : null,
      nationality: formData.get('nationality') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      personalPhone: formData.get('personalPhone') as string,
      
      salary: parseFloat(formData.get('salary') as string) || undefined,
      contractType: formData.get('contractType') as string,
      hireDate: formData.get('hireDate') ? new Date(formData.get('hireDate') as string) : null,
      status: formData.get('status') as string,
      
      cnpsNumber: formData.get('cnpsNumber') as string,
      bankName: formData.get('bankName') as string,
      rib: formData.get('rib') as string,
    }

    if (!isEditing) {
      data.password = formData.get('password') as string
      const result = await createEmployee(storeId, data)
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || 'Erreur inconnue')
      }
    } else {
      if (formData.get('password')) {
        data.password = formData.get('password') as string
      }
      const result = await updateEmployee(employee.id, data)
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || 'Erreur inconnue')
      }
    }
    
    setIsLoading(false)
  }

  const tabClass = (tab: string) => 
    `flex-1 pb-3 text-center text-sm font-bold border-b-2 transition-colors ${
      activeTab === tab 
        ? 'border-[var(--parabellum-primary)] text-[var(--parabellum-primary)]' 
        : 'border-transparent text-[var(--parabellum-muted)] hover:border-gray-200'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--parabellum-border)] p-6">
          <h2 className="text-xl font-black uppercase tracking-tight text-[var(--parabellum-text)]">
            {isEditing ? 'Modifier l\'employé' : 'Nouvel Employé'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex border-b border-[var(--parabellum-border)] px-6 pt-4">
            <button type="button" className={tabClass('perso')} onClick={() => setActiveTab('perso')}>
              INFOS PERSONNELLES
            </button>
            <button type="button" className={tabClass('emploi')} onClick={() => setActiveTab('emploi')}>
              EMPLOI & SYSTÈME
            </button>
            <button type="button" className={tabClass('banque')} onClick={() => setActiveTab('banque')}>
              BANQUE & SECU
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-6">
            {error && (
              <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <div className={activeTab === 'perso' ? 'grid grid-cols-1 gap-6 sm:grid-cols-2' : 'hidden'}>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Nom Complet</label>
                <input required name="name" defaultValue={employee?.name} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Civilité</label>
                <select name="civilite" defaultValue={employee?.civilite || ''} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white">
                  <option value="">Sélectionner</option>
                  <option value="M.">M.</option>
                  <option value="Mme">Mme</option>
                  <option value="Mlle">Mlle</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Sexe</label>
                <select name="sexe" defaultValue={employee?.sexe || ''} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white">
                  <option value="">Sélectionner</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Date de naissance</label>
                <input type="date" name="dateBirth" defaultValue={employee?.dateBirth?.toISOString().split('T')[0]} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Nationalité</label>
                <input name="nationality" defaultValue={employee?.nationality} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Tél Personnel</label>
                <input name="personalPhone" defaultValue={employee?.personalPhone} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Adresse Personnelle</label>
                <input name="address" defaultValue={employee?.address} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>
            </div>

            <div className={activeTab === 'emploi' ? 'grid grid-cols-1 gap-6 sm:grid-cols-2' : 'hidden'}>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Matricule</label>
                <input name="matricule" defaultValue={employee?.matricule} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Tél Professionnel</label>
                <input name="phone" defaultValue={employee?.phone} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Type de Contrat</label>
                <select name="contractType" defaultValue={employee?.contractType || ''} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white">
                  <option value="">Sélectionner</option>
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="STAGE">Stage</option>
                  <option value="FREELANCE">Freelance</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Salaire de Base</label>
                <input type="number" name="salary" defaultValue={employee?.salary} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Date d'embauche</label>
                <input type="date" name="hireDate" defaultValue={employee?.hireDate?.toISOString().split('T')[0]} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Statut</label>
                <select name="status" defaultValue={employee?.status || 'ACTIVE'} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white">
                  <option value="ACTIVE">Actif</option>
                  <option value="LEAVE">En congé</option>
                  <option value="SUSPENDED">Suspendu</option>
                  <option value="INACTIVE">Inactif (Départ)</option>
                </select>
              </div>
              
              <div className="sm:col-span-2 mt-4 pt-4 border-t border-[var(--parabellum-border)]">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--parabellum-text)]">Accès Système</h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Email de connexion</label>
                <input required type="email" name="email" defaultValue={employee?.email} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Mot de passe {isEditing && '(laisser vide pour ne pas modifier)'}</label>
                <input type="password" name="password" required={!isEditing} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Rôle Système</label>
                <select name="role" defaultValue={employee?.role || 'CASHIER'} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white">
                  <option value="CASHIER">Caissier / Serveur</option>
                  <option value="KITCHEN">Cuisine</option>
                  <option value="RESTAURATEUR">Manager Restaurant</option>
                </select>
              </div>
            </div>

            <div className={activeTab === 'banque' ? 'grid grid-cols-1 gap-6 sm:grid-cols-2' : 'hidden'}>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Numéro CNPS</label>
                <input name="cnpsNumber" defaultValue={employee?.cnpsNumber} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">Nom de la Banque</label>
                <input name="bankName" defaultValue={employee?.bankName} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--parabellum-muted)]">RIB / IBAN</label>
                <input name="rib" defaultValue={employee?.rib} className="w-full rounded-xl border border-[var(--parabellum-border)] bg-[#f8f9ff] p-3 text-sm font-medium text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)] focus:bg-white" />
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
              {isLoading ? 'Enregistrement...' : (isEditing ? 'Mettre à jour' : 'Créer l\'employé')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
