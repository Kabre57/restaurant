'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, Loader2, AlertCircle, FileText, Calendar, Building, DollarSign } from 'lucide-react'
import { getContracts, deleteContract } from '@/app/actions/rh/contracts'
import { getEmployees } from '@/app/actions/rh/employees'
import { useSession } from 'next-auth/react'
import { ContractModal } from '@/components/rh/ContractModal'

export default function ContratsPage() {
  const { data: session } = useSession()
  const [contracts, setContracts] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingContract, setEditingContract] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('ALL')

  useEffect(() => {
    const storeId = session?.user?.storeId
    if (!storeId) return

    let isCancelled = false

    async function fetchData() {
      setLoading(true)
      const userRole = session?.user?.role || 'WAITER'
      const isManager = userRole === 'RESTAURATEUR' || userRole === 'MANAGER'
      const userId = isManager ? undefined : session?.user?.id

      const [contractsRes, employeesRes] = await Promise.all([
        getContracts(storeId as string, userId),
        isManager ? getEmployees(storeId as string) : Promise.resolve({ success: true, employees: [] })
      ])
      
      if (isCancelled) return
      
      if (contractsRes.success && contractsRes.contracts) {
        setContracts(contractsRes.contracts)
      }
      if (employeesRes.success && employeesRes.employees) {
        setEmployees(employeesRes.employees)
      }
      setLoading(false)
    }

    void fetchData()

    return () => {
      isCancelled = true
    }
  }, [session?.user?.storeId])

  async function loadData() {
    if (!session?.user?.storeId) return
    setLoading(true)
    const userRole = session?.user?.role || 'WAITER'
    const isManager = userRole === 'RESTAURATEUR' || userRole === 'MANAGER'
    const userId = isManager ? undefined : session?.user?.id

    const res = await getContracts(session.user.storeId, userId)
    if (res.success && res.contracts) {
      setContracts(res.contracts)
    }
    setLoading(false)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    const res = await deleteContract(id)
    if (res.success) loadData()
    else setErrorModal(res.error || "Erreur lors de la suppression")
  }

  const visibleContracts = contracts.filter((c) => {
    return activeFilter === 'ALL' ? true : c.status === activeFilter
  })

  const userRole = session?.user?.role || 'WAITER'
  const isManager = userRole === 'RESTAURATEUR' || userRole === 'MANAGER'

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Gestion des Contrats</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Suivi administratif et historique des contrats</p>
        </div>
        {isManager && (
          <button 
            onClick={() => { 
              setEditingContract(null)
              setShowModal(true)
            }}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--parabellum-primary)] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-blue-700 sm:w-auto sm:px-8"
          >
            <Plus className="w-5 h-5" />
            Nouveau Contrat
          </button>
        )}
      </div>

      {isManager && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">Total Contrats</div>
            <div className="mt-2 text-3xl font-black text-[var(--parabellum-text)]">{contracts.length}</div>
          </div>
          <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">Actifs</div>
            <div className="mt-2 text-3xl font-black text-green-600">{contracts.filter(c => c.status === 'ACTIVE').length}</div>
          </div>
          <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">CDI</div>
            <div className="mt-2 text-3xl font-black text-blue-600">{contracts.filter(c => c.type === 'CDI').length}</div>
          </div>
          <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">CDD & Stages</div>
            <div className="mt-2 text-3xl font-black text-orange-600">{contracts.filter(c => c.type === 'CDD' || c.type === 'STAGE').length}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#e5e7ef] bg-white p-4 shadow-sm">
        <div className="flex gap-3 overflow-x-auto">
          {['ALL', 'ACTIVE', 'EXPIRED', 'TERMINATED'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex min-w-[7rem] items-center justify-center rounded-lg px-4 py-3 text-[10px] font-black uppercase tracking-tight transition ${
                activeFilter === filter 
                  ? 'bg-[var(--parabellum-primary)] text-white shadow-md' 
                  : 'bg-[#f8f9fa] text-[#495057] hover:bg-[#eef1ff]'
              }`}
            >
              {filter === 'ALL' ? 'Tous' : 
               filter === 'ACTIVE' ? 'Actifs' : 
               filter === 'EXPIRED' ? 'Expirés' : 'Rompus'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--parabellum-border)] bg-white shadow-sm">
          <table className="w-full text-left text-sm text-[var(--parabellum-text)]">
            <thead className="bg-[#f8f9ff] text-xs font-bold uppercase text-[var(--parabellum-muted)]">
              <tr>
                <th className="px-6 py-4">Employé</th>
                <th className="px-6 py-4">Type & Poste</th>
                <th className="px-6 py-4">Période</th>
                <th className="px-6 py-4">Salaire Base</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--parabellum-border)]">
              {visibleContracts.map((contract) => (
                <tr key={contract.id} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="font-bold">{contract.user.name}</div>
                    <div className="text-[10px] text-[var(--parabellum-muted)]">{contract.user.matricule || contract.user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-[11px] font-medium">
                      <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-gray-700 w-max"><FileText className="w-3 h-3" /> {contract.type}</span>
                      <span className="inline-flex items-center gap-1 text-gray-500 w-max"><Building className="w-3 h-3" /> {contract.position || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Du: {new Date(contract.startDate).toLocaleDateString()}</div>
                      {contract.endDate && <div className="flex items-center gap-1 text-[var(--parabellum-muted)]"><Calendar className="w-3 h-3" /> Au: {new Date(contract.endDate).toLocaleDateString()}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold">
                    {contract.baseSalary.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      contract.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      contract.status === 'EXPIRED' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isManager ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingContract(contract); setShowModal(true) }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(contract.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--parabellum-muted)] italic">Lecture seule</span>
                    )}
                  </td>
                </tr>
              ))}
              {visibleContracts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[var(--parabellum-muted)]">
                    Aucun contrat trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ContractModal
          contract={editingContract}
          employees={employees}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            loadData()
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">Confirmer la suppression</h2>
            <p className="text-xs font-bold text-[#adb5bd] mb-8">Voulez-vous vraiment supprimer ce contrat ? Cette action est irréversible.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-[#212529] rounded-xl font-bold text-xs uppercase tracking-widest transition-all">Annuler</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {errorModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-4">Erreur</h2>
            <p className="text-sm font-medium text-gray-600 mb-8">{errorModal}</p>
            <button onClick={() => setErrorModal(null)} className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all">OK</button>
          </div>
        </div>
      )}
    </div>
  )
}
