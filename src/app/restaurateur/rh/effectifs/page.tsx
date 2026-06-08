'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, Loader2, AlertCircle, Mail, Phone, Building, Briefcase } from 'lucide-react'
import { getEmployees, deleteEmployee } from '@/app/actions/rh/employees'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { EmployeeModal } from '@/components/rh/EmployeeModal'

type EmployeeRecord = Awaited<ReturnType<typeof getEmployees>> extends { employees?: Array<infer Employee> }
  ? Employee
  : never

export default function EffectifsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('ALL')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) return

    const userRole = session.user.role || 'WAITER'
    if (userRole !== 'RESTAURATEUR' && userRole !== 'MANAGER') {
      router.replace('/restaurateur/rh/contrats') // redirect non-managers
      return
    }

    const storeId = session.user.storeId
    if (!storeId) return

    let isCancelled = false

    async function fetchData() {
      setLoading(true)
      const res = await getEmployees()
      if (isCancelled) return
      if (res.success && res.employees) {
        setEmployees(res.employees)
      }
      setLoading(false)
    }

    void fetchData()

    return () => {
      isCancelled = true
    }
  }, [session, status, router])

  async function loadData() {
    if (!session?.user?.storeId) return
    setLoading(true)
    const res = await getEmployees()
    if (res.success && res.employees) {
      setEmployees(res.employees)
    }
    setLoading(false)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    const res = await deleteEmployee(id)
    if (res.success) void loadData()
    else setErrorModal(res.error || "Erreur lors de la suppression")
  }

  const visibleEmployees = employees.filter((emp) => {
    const query = search.toLowerCase()
    const matchesSearch = 
      emp.name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.matricule?.toLowerCase().includes(query) ||
      emp.role?.toLowerCase().includes(query)
      
    const matchesFilter = activeFilter === 'ALL' ? true : emp.status === activeFilter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Gestion des Effectifs</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gérez le dossier du personnel et les accès système</p>
        </div>
        <button 
          onClick={() => { 
            setEditingEmployee(null)
            setShowModal(true)
          }}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--parabellum-primary)] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-blue-700 sm:w-auto sm:px-8"
        >
          <Plus className="w-5 h-5" />
          Nouvel Employé
        </button>
      </div>

      <div className="rounded-xl border border-[#e5e7ef] bg-white p-4 shadow-sm">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {['ALL', 'ACTIVE', 'LEAVE', 'SUSPENDED', 'INACTIVE'].map((filter) => (
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
               filter === 'LEAVE' ? 'En congé' : 
               filter === 'SUSPENDED' ? 'Suspendus' : 'Départs'}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par nom, email, matricule ou rôle..."
            className="h-12 flex-1 rounded-full border border-[#e5e7ef] bg-white px-6 text-sm font-medium text-[#495057] outline-none transition focus:border-[var(--parabellum-primary)]"
          />
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
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Rôle & Contrat</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--parabellum-border)]">
              {visibleEmployees.map((emp) => (
                <tr key={emp.id} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--parabellum-primary)]/10 text-[var(--parabellum-primary)] font-bold">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold">{emp.name}</div>
                        <div className="text-[10px] text-[var(--parabellum-muted)]">{emp.matricule || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {emp.email}</div>
                      {emp.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {emp.phone}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-[11px] font-medium">
                      <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-gray-700 w-max"><Building className="w-3 h-3" /> {emp.role}</span>
                      <span className="inline-flex items-center gap-1 text-gray-500 w-max"><Briefcase className="w-3 h-3" /> {emp.contractType || 'Non défini'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      emp.status === 'LEAVE' ? 'bg-blue-100 text-blue-700' :
                      emp.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditingEmployee(emp); setShowModal(true) }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(emp.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleEmployees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-[var(--parabellum-muted)]">
                    Aucun employé trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && session?.user?.storeId && (
        <EmployeeModal
          storeId={session.user.storeId}
          employee={editingEmployee}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            void loadData()
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
            <p className="text-xs font-bold text-[#adb5bd] mb-8">Voulez-vous vraiment supprimer cet employé ? Cette action est irréversible.</p>
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
