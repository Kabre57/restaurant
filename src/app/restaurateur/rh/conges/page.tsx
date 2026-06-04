'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Loader2, Calendar, Check, X, FileText } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getLeaveRequests, createLeaveRequest, updateLeaveRequestStatus } from '@/app/actions/rh/leaves'
import { getEmployees } from '@/app/actions/rh/employees'
import { LeaveRequestModal } from '@/components/rh/LeaveRequestModal'

export default function CongesPage() {
  const { data: session, status } = useSession()
  const [leaves, setLeaves] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
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
      const [leavesRes, empRes] = await Promise.all([
        getLeaveRequests(userId),
        isManager ? getEmployees() : Promise.resolve({ success: true, employees: [] })
      ])
      
      if (isCancelled) return

      if (leavesRes.success && leavesRes.leaves) {
        setLeaves(leavesRes.leaves)
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
    const res = await createLeaveRequest(data)
    if (res.success) {
      setShowModal(false)
      const refreshRes = await getLeaveRequests(userId)
      if (refreshRes.success && refreshRes.leaves) {
        setLeaves(refreshRes.leaves)
      }
    } else {
      alert("Erreur lors de la création de la demande")
    }
  }

  async function handleStatusUpdate(id: string, newStatus: string) {
    if (!confirm("Voulez-vous vraiment changer le statut de cette demande ?")) return
    
    // In a real app, you could open a modal to ask for a comment
    const res = await updateLeaveRequestStatus(id, newStatus)
    if (res.success) {
      const refreshRes = await getLeaveRequests(userId)
      if (refreshRes.success && refreshRes.leaves) {
        setLeaves(refreshRes.leaves)
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

  const filteredLeaves = leaves.filter(l => {
    return activeFilter === 'ALL' ? true : l.status === activeFilter
  })

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Gestion des Congés</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">
            {isManager ? "Validation et suivi des absences" : "Mes demandes de congés et absences"}
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--parabellum-primary)] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-blue-700 sm:w-auto sm:px-8"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Demande
        </button>
      </div>

      {isManager && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">En Attente</div>
            <div className="mt-2 text-3xl font-black text-orange-600">{leaves.filter(l => l.status === 'PENDING').length}</div>
          </div>
          <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">Approuvés (Ce mois)</div>
            <div className="mt-2 text-3xl font-black text-green-600">
              {leaves.filter(l => l.status === 'APPROVED' && new Date(l.startDate).getMonth() === new Date().getMonth()).length}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#e5e7ef] bg-white p-4 shadow-sm">
        <div className="flex gap-3 overflow-x-auto">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((filter) => (
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
               filter === 'PENDING' ? 'En Attente' : 
               filter === 'APPROVED' ? 'Approuvées' : 'Refusées'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {filteredLeaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center flex-1">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-black text-[var(--parabellum-text)]">Aucune demande</h3>
            <p className="mt-1 text-sm text-[var(--parabellum-muted)] max-w-sm">
              Il n'y a aucune demande de congé correspondant à vos critères.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8f9ff] text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">
                <tr>
                  <th className="px-6 py-4">Employé</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Période</th>
                  <th className="px-6 py-4">Durée</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--parabellum-border)]">
                {filteredLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--parabellum-text)]">{leave.user.name}</div>
                      <div className="text-xs text-[var(--parabellum-muted)]">{leave.user.matricule || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-700">
                        {leave.type === 'PAID' ? 'Congé Payé' : 
                         leave.type === 'SICK' ? 'Maladie' : 
                         leave.type === 'MATERNITY' ? 'Maternité/Paternité' : 'Sans Solde'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold">
                        {new Date(leave.startDate).toLocaleDateString('fr-FR')} 
                        <span className="text-gray-400 mx-1">au</span> 
                        {new Date(leave.endDate).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-blue-600">
                      {leave.daysCount} jours
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                        leave.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                        leave.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {leave.status === 'PENDING' ? 'En Attente' : leave.status === 'APPROVED' ? 'Approuvé' : 'Refusé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isManager && leave.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleStatusUpdate(leave.id, 'APPROVED')}
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            title="Approuver"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(leave.id, 'REJECTED')}
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Refuser"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--parabellum-muted)] italic">
                          {leave.status !== 'PENDING' ? 'Traité' : 'En attente'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LeaveRequestModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        employees={employees}
        currentUserId={userId}
        isManager={isManager}
      />
    </div>
  )
}
