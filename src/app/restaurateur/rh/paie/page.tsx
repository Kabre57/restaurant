'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Loader2, AlertCircle, CheckCircle, Download, CreditCard, X, Printer } from 'lucide-react'
import { getPayrolls, generatePayrollForPeriod, markPayrollAsPaid } from '@/app/actions/rh/payroll'
import { useSession } from 'next-auth/react'
import { PayrollPayslipTemplate } from '@/components/rh/PayrollPayslipTemplate'

export default function PaiePage() {
  const { data: session } = useSession()
  const [payrolls, setPayrolls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [selectedPayroll, setSelectedPayroll] = useState<any | null>(null)
  
  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [period, setPeriod] = useState(currentPeriod)

  useEffect(() => {
    const storeId = session?.user?.storeId
    if (!storeId) return

    let isCancelled = false

    async function fetchData() {
      setLoading(true)
      const userRole = session?.user?.role || 'WAITER'
      const isManager = userRole === 'RESTAURATEUR' || userRole === 'MANAGER'
      const userId = isManager ? undefined : session?.user?.id
      
      const res = await getPayrolls(storeId as string, userId)
      if (isCancelled) return
      if (res.success && res.payrolls) {
        setPayrolls(res.payrolls)
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
    
    const res = await getPayrolls(session.user.storeId, userId)
    if (res.success && res.payrolls) {
      setPayrolls(res.payrolls)
    }
    setLoading(false)
  }

  async function handleGenerate() {
    if (!session?.user?.storeId) return
    setGenerating(true)
    const res = await generatePayrollForPeriod(session.user.storeId, period)
    if (res.success) {
      loadData()
    } else {
      setErrorModal(res.error || "Erreur lors de la génération")
    }
    setGenerating(false)
  }

  async function handleMarkAsPaid(id: string) {
    const res = await markPayrollAsPaid(id, 'VIREMENT_MANUEL')
    if (res.success) {
      loadData()
    } else {
      setErrorModal(res.error || "Erreur de mise à jour")
    }
  }

  const handlePrint = () => {
    document.body.classList.add('printing-payslip');
    
    const afterPrint = () => {
      document.body.classList.remove('printing-payslip');
      window.removeEventListener('afterprint', afterPrint);
    };
    
    window.addEventListener('afterprint', afterPrint);
    
    // Small delay to ensure styles are applied before opening print dialog
    setTimeout(() => {
      window.print();
    }, 100);
  }

  const filteredPayrolls = payrolls.filter(p => p.period === period)
  const totalNet = filteredPayrolls.reduce((sum, p) => sum + p.netSalary, 0)
  const totalCost = filteredPayrolls.reduce((sum, p) => sum + p.employerCost, 0)
  const allPaid = filteredPayrolls.length > 0 && filteredPayrolls.every(p => p.paymentStatus === 'PAID')

  const userRole = session?.user?.role || 'WAITER'
  const isManager = userRole === 'RESTAURATEUR' || userRole === 'MANAGER'

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Paie & Salaires</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Génération des bulletins et suivi comptable</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-12 rounded-xl border border-[var(--parabellum-border)] bg-white px-4 text-sm font-bold text-[var(--parabellum-text)] outline-none focus:border-[var(--parabellum-primary)]"
          >
            <option value={currentPeriod}>Ce mois ({currentPeriod})</option>
            <option value="2026-04">Avril 2026</option>
            <option value="2026-03">Mars 2026</option>
          </select>
          {isManager && (
            <button 
              onClick={handleGenerate}
              disabled={generating}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#212529] px-6 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-black disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Générer Bulletins
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {isManager && (
          <>
            <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-6 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">Salaires Nets à Payer</div>
              <div className="mt-2 text-3xl font-black text-blue-600">{totalNet.toLocaleString()} F</div>
            </div>
            <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-6 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">Coût Employeur Global</div>
              <div className="mt-2 text-3xl font-black text-purple-600">{totalCost.toLocaleString()} F</div>
            </div>
          </>
        )}
        <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-muted)]">Statut de paiement</div>
            <div className={`mt-2 text-lg font-black uppercase ${allPaid ? 'text-green-600' : 'text-orange-500'}`}>
              {filteredPayrolls.length === 0 ? 'En attente de génération' : allPaid ? 'Tout est payé' : 'Paiements en attente'}
            </div>
          </div>
          {allPaid && <CheckCircle className="h-8 w-8 text-green-500" />}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--parabellum-border)] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[var(--parabellum-border)] bg-[#f8f9ff] px-6 py-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-[var(--parabellum-text)]">Bulletins de la période</h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
        ) : filteredPayrolls.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto h-12 w-12 text-[#e5e7ef]" />
            <h3 className="mt-4 text-sm font-black uppercase tracking-widest text-[var(--parabellum-text)]">Aucun bulletin généré</h3>
            <p className="mt-1 text-xs text-[var(--parabellum-muted)]">Cliquez sur Générer Bulletins pour créer les fiches de paie du mois sélectionné.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--parabellum-text)]">
              <thead className="border-b border-[var(--parabellum-border)] bg-white text-[10px] font-black uppercase text-[var(--parabellum-muted)]">
                <tr>
                  <th className="px-6 py-3">Employé</th>
                  <th className="px-6 py-3">Salaire Base</th>
                  <th className="px-6 py-3">Retenues (CNPS)</th>
                  <th className="px-6 py-3">Net à Payer</th>
                  <th className="px-6 py-3">Statut</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--parabellum-border)]">
                {filteredPayrolls.map((payroll) => (
                  <tr key={payroll.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold">{payroll.user.name} <span className="text-xs text-[var(--parabellum-muted)] block">{payroll.user.matricule || 'N/A'}</span></td>
                    <td className="px-6 py-4">{payroll.baseSalary.toLocaleString()} F</td>
                    <td className="px-6 py-4 text-red-500">-{payroll.socialSecurity.toLocaleString()} F</td>
                    <td className="px-6 py-4 font-black text-blue-600">{payroll.netSalary.toLocaleString()} F</td>
                    <td className="px-6 py-4">
                      {payroll.paymentStatus === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-700">
                          <CheckCircle className="h-3 w-3" /> PAYÉ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-700">
                          EN ATTENTE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedPayroll(payroll)}
                          className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-[var(--parabellum-text)] transition hover:bg-gray-200"
                        >
                          <Download className="h-3 w-3" /> Fiche
                        </button>
                        {isManager && payroll.paymentStatus === 'PENDING' && (
                          <button 
                            onClick={() => handleMarkAsPaid(payroll.id)}
                            className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-100"
                          >
                            <CreditCard className="h-3 w-3" /> Payer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal d'aperçu du bulletin */}
      {selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm payslip-actions">
          <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--parabellum-border)] bg-[#f8f9ff]">
              <h2 className="text-xl font-black uppercase tracking-tight text-[var(--parabellum-text)]">
                Aperçu du Bulletin
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-xl bg-[var(--parabellum-primary)] px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:scale-105"
                >
                  <Printer className="h-4 w-4" /> Imprimer / PDF
                </button>
                <button 
                  onClick={() => setSelectedPayroll(null)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-gray-100 relative">
              <div className="shadow-2xl bg-white mx-auto relative print-container">
                <PayrollPayslipTemplate payroll={selectedPayroll} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Composant caché injecté directement pour l'impression si besoin, 
          mais on utilise directement celui dans le modal */}
      {selectedPayroll && (
         <div className="hidden payslip-print-area-wrapper">
           <PayrollPayslipTemplate payroll={selectedPayroll} />
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
