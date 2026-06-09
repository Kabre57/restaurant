'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Loader2, CreditCard, Check, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getLoans, createLoan, updateLoanStatus } from '@/app/actions/rh/loans'
import { getEmployees } from '@/app/actions/rh/employees'
import { LoanRequestFormData, LoanRequestModal } from '@/components/rh/LoanRequestModal'

const managerRoles = ['ADMIN', 'RESTAURATEUR', 'MANAGER']
const filters = ['ALL', 'PENDING', 'APPROVED', 'SETTLED', 'REJECTED'] as const

type LoanStatusFilter = typeof filters[number]
type LoanStatus = Exclude<LoanStatusFilter, 'ALL'>

type EmployeeOption = {
  id: string
  name: string | null
  matricule?: string | null
}

type LoanRecord = {
  id: string
  user: EmployeeOption
  type: string
  startDate: string | Date
  amount: number
  remainingAmount: number
  status: LoanStatus
}

function getLoanStatusLabel(status: string) {
  if (status === 'PENDING') return 'En attente'
  if (status === 'APPROVED') return 'Approuvé'
  if (status === 'SETTLED') return 'Soldé'
  if (status === 'REJECTED') return 'Rejeté'
  return status
}

function getLoanStatusClass(status: string) {
  if (status === 'PENDING') return 'bg-amber-100 text-amber-700'
  if (status === 'APPROVED') return 'bg-blue-100 text-blue-700'
  if (status === 'SETTLED') return 'bg-green-100 text-green-700'
  return 'bg-red-100 text-red-700'
}

export default function LoansPage() {
  const { data: session, status } = useSession()
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState<LoanStatusFilter>('ALL')

  const userRole = session?.user?.role || 'WAITER'
  const isManager = managerRoles.includes(userRole)
  const userId = isManager ? undefined : session?.user?.id
  const hasStore = Boolean(session?.user?.storeId)
  const isPageLoading = status === 'loading' || (hasStore && loading)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.storeId) return

    let isCancelled = false

    async function fetchData() {
      try {
        setLoading(true)
        setError('')
        const [loansRes, empRes] = await Promise.all([
          getLoans(userId),
          isManager ? getEmployees() : Promise.resolve({ success: true, employees: [] })
        ])

        if (isCancelled) return

        if (loansRes.success && loansRes.loans) {
          setLoans(loansRes.loans as LoanRecord[])
        } else {
          setError(loansRes.error || "Impossible de charger les avances et prêts.")
        }
        if (empRes.success && empRes.employees) {
          setEmployees(empRes.employees)
        }
      } catch (err) {
        console.error(err)
        if (!isCancelled) {
          setError("Impossible de charger les avances et prêts.")
        }
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    void fetchData()

    return () => {
      isCancelled = true
    }
  }, [session, status, isManager, userId])

  async function handleSave(data: LoanRequestFormData) {
    const res = await createLoan(data)
    if (res.success) {
      setShowModal(false)
      const refreshRes = await getLoans(userId)
      if (refreshRes.success && refreshRes.loans) {
        setLoans(refreshRes.loans as LoanRecord[])
      }
    } else {
      alert(res.error || "Erreur lors de la création de la demande")
    }
  }

  async function handleStatusUpdate(id: string, newStatus: LoanStatus) {
    if (!confirm("Voulez-vous vraiment changer le statut de cette demande ?")) return
    
    const res = await updateLoanStatus(id, newStatus)
    if (res.success) {
      const refreshRes = await getLoans(userId)
      if (refreshRes.success && refreshRes.loans) {
        setLoans(refreshRes.loans as LoanRecord[])
      }
    }
  }

  if (isPageLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--parabellum-primary)]" />
      </div>
    )
  }

  if (!hasStore) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          Aucun restaurant n'est associé à votre session.
        </div>
      </div>
    )
  }

  const filteredLoans = loans.filter(l => {
    return activeFilter === 'ALL' ? true : l.status === activeFilter
  })

  const totalOngoing = loans
    .filter(l => l.status === 'APPROVED')
    .reduce((sum, l) => sum + (l.remainingAmount || 0), 0)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Avances & Prêts</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">
            {isManager ? "Suivi des dettes et retenues sur salaire" : "Mes demandes d'avances sur salaire et prêts"}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">Encours Total</div>
            <div className="mt-2 text-3xl font-black text-blue-600">{totalOngoing.toLocaleString()} F</div>
          </div>
          <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">Dossiers en cours</div>
            <div className="mt-2 text-3xl font-black text-orange-600">{loans.filter(l => l.status === 'APPROVED').length}</div>
          </div>
          <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">Remboursés (Total)</div>
            <div className="mt-2 text-3xl font-black text-green-600">{loans.filter(l => l.status === 'SETTLED').length}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[#e5e7ef] bg-white p-4 shadow-sm">
        <div className="flex gap-3 overflow-x-auto">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeFilter === filter 
                  ? 'bg-[#212529] text-white shadow-md' 
                  : 'bg-gray-100 text-[#adb5bd] hover:bg-gray-200'
              }`}
            >
              {filter === 'ALL' ? 'Tous' : getLoanStatusLabel(filter)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {filteredLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center flex-1">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 mb-4">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-black text-[var(--parabellum-text)]">Aucun dossier</h3>
            <p className="mt-1 text-sm text-[var(--parabellum-muted)] max-w-sm">
              Il n'y a aucune demande d'avance ou de prêt correspondant à vos critères.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8f9ff] text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">
                <tr>
                  <th className="px-6 py-4">Employé</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Déblocage</th>
                  <th className="px-6 py-4">Montant Initial</th>
                  <th className="px-6 py-4">Reste à Payer</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--parabellum-border)]">
                {filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--parabellum-text)]">{loan.user.name}</div>
                      <div className="text-xs text-[var(--parabellum-muted)]">{loan.user.matricule || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                        loan.type === 'ADVANCE' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {loan.type === 'ADVANCE' ? 'Avance' : 'Prêt'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold">
                        {new Date(loan.startDate).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-[var(--parabellum-text)]">
                      {loan.amount.toLocaleString()} F
                    </td>
                    <td className="px-6 py-4 font-bold text-red-600">
                      {(loan.remainingAmount || 0).toLocaleString()} F
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${getLoanStatusClass(loan.status)}`}>
                        {getLoanStatusLabel(loan.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isManager && loan.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleStatusUpdate(loan.id, 'APPROVED')}
                            className="flex items-center justify-center px-3 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-xs font-bold"
                            title="Approuver la demande"
                          >
                            <Check className="w-3 h-3 mr-1" /> Approuver
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(loan.id, 'REJECTED')}
                            className="flex items-center justify-center px-3 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-bold"
                            title="Rejeter la demande"
                          >
                            <X className="w-3 h-3 mr-1" /> Rejeter
                          </button>
                        </div>
                      ) : isManager && loan.status === 'APPROVED' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleStatusUpdate(loan.id, 'SETTLED')}
                            className="flex items-center justify-center px-3 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-xs font-bold"
                            title="Marquer comme soldé"
                          >
                            <Check className="w-3 h-3 mr-1" /> Solder
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--parabellum-muted)] italic">
                          {loan.status === 'SETTLED' || loan.status === 'REJECTED' ? 'Clôturé' : 'En attente'}
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

      <LoanRequestModal
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
