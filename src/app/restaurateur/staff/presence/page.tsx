'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, X, Loader2, AlertCircle, Calendar, Clock, LogIn, LogOut, FileText } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getStoreStaff } from '@/app/actions/rh/staff'
import { getPresenceLogs, saveManualTimecard, deleteTimecard, clockInUser, clockOutUser } from '@/app/actions/rh/timecards'
import { CrudActionButton, CrudFilterBar, CrudPrimaryButton, CrudTable } from '@/components/ui/ParabellumCrudTable'

type StaffMember = {
  id: string
  name: string
  email: string
}

type TimecardLog = {
  id: string
  userId: string
  clockIn: Date | string
  clockOut: Date | string | null
  duration: number | null
  user: {
    name: string
    email: string
    role: string
  }
}

export default function TimecardsPresenceManagement() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [logs, setLogs] = useState<TimecardLog[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [formData, setFormData] = useState({
    id: undefined as string | undefined,
    userId: '',
    clockInDate: new Date().toISOString().slice(0, 10),
    clockInTime: '08:00',
    clockOutDate: '',
    clockOutTime: ''
  })

  const loadData = async () => {
    if (!storeId) return
    try {
      setLoading(true)
      const [logsData, staffData] = await Promise.all([
        getPresenceLogs(storeId),
        getStoreStaff(storeId)
      ])
      setLogs(logsData as unknown as TimecardLog[])
      setStaff(staffData as StaffMember[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (storeId) {
      void loadData()
    }
  }, [storeId])

  async function handleFastClockIn(userId: string) {
    if (!storeId) return
    const res = await clockInUser(storeId, userId)
    if (res.success) {
      await loadData()
    } else {
      setErrorModal(res.error || "Erreur de pointage")
    }
  }

  async function handleFastClockOut(userId: string) {
    if (!storeId) return
    const res = await clockOutUser(storeId, userId)
    if (res.success) {
      await loadData()
    } else {
      setErrorModal(res.error || "Erreur de pointage")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!storeId) return

    if (!formData.userId) {
      setErrorModal("Veuillez sélectionner un employé.")
      return
    }

    try {
      setIsSubmitting(true)
      const clockIn = new Date(`${formData.clockInDate}T${formData.clockInTime}`)
      
      let clockOut: Date | null = null
      if (formData.clockOutDate && formData.clockOutTime) {
        clockOut = new Date(`${formData.clockOutDate}T${formData.clockOutTime}`)
        if (clockOut.getTime() <= clockIn.getTime()) {
          setErrorModal("L'heure de sortie doit être postérieure à l'heure d'entrée.")
          return
        }
      }

      const res = await saveManualTimecard({
        id: formData.id,
        storeId,
        userId: formData.userId,
        clockIn,
        clockOut
      })

      if (res.success) {
        setShowModal(false)
        setFormData({
          id: undefined,
          userId: '',
          clockInDate: new Date().toISOString().slice(0, 10),
          clockInTime: '08:00',
          clockOutDate: '',
          clockOutTime: ''
        })
        await loadData()
      } else {
        setErrorModal(res.error || "Erreur d'enregistrement")
      }
    } catch (err) {
      console.error(err)
      setErrorModal("Format de date invalide.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    const res = await deleteTimecard(id)
    if (res.success) {
      await loadData()
    } else {
      setErrorModal(res.error || "Erreur lors de la suppression")
    }
  }

  const visibleLogs = logs.filter((log) => {
    return log.user.name.toLowerCase().includes(search.toLowerCase()) ||
      log.user.email.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Fiches de présence</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gérez le registre d'entrées, de sorties et de temps de présence des employés</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <CrudPrimaryButton
            onClick={() => {
              setFormData({
                id: undefined,
                userId: '',
                clockInDate: new Date().toISOString().slice(0, 10),
                clockInTime: '08:00',
                clockOutDate: '',
                clockOutTime: ''
              })
              setShowModal(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer Fiche Manuelle
          </CrudPrimaryButton>
        </div>
      </div>

      {/* Pointage Rapide & Filtres */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Fast Actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#adb5bd] mb-4">Pointage d'entrée/sortie rapide</h2>
            <div className="space-y-4">
              {staff.length === 0 ? (
                <p className="text-xs font-bold text-[#adb5bd]">Aucun employé configuré.</p>
              ) : (
                <div className="divide-y divide-[#f1f3f5]">
                  {staff.map((employee) => {
                    // Check if employee is currently clocked in (active log with clockOut = null)
                    const activeLog = logs.find(l => l.userId === employee.id && !l.clockOut)
                    return (
                      <div key={employee.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#212529] uppercase truncate">{employee.name}</p>
                          <p className="text-[10px] font-bold text-[#adb5bd] truncate">
                            {activeLog ? `En poste depuis ${new Date(activeLog.clockIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Inactif'}
                          </p>
                        </div>
                        <div>
                          {activeLog ? (
                            <button
                              onClick={() => handleFastClockOut(employee.id)}
                              className="inline-flex items-center gap-1 bg-[#fff5f5] border border-red-200 text-[#e03131] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-[#ffe3e3] transition-all"
                            >
                              <LogOut className="h-3 w-3" />
                              Point. Sortie
                            </button>
                          ) : (
                            <button
                              onClick={() => handleFastClockIn(employee.id)}
                              className="inline-flex items-center gap-1 bg-[#ebfbee] border border-green-200 text-[#2f9e44] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-[#d3f9d8] transition-all"
                            >
                              <LogIn className="h-3 w-3" />
                              Point. Entrée
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* List & Filters */}
        <div className="lg:col-span-2 space-y-4">
          <CrudFilterBar
            searchValue={search}
            searchPlaceholder="Rechercher par nom de collaborateur"
            onSearchChange={setSearch}
            onReset={() => setSearch('')}
          />

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
          ) : (
            <CrudTable
              title="Registre des fiches de présence"
              rows={visibleLogs}
              emptyLabel="Aucune présence trouvée"
              columns={[
                { key: 'name', label: 'Collaborateur' },
                { key: 'clockIn', label: 'Heure d\'entrée' },
                { key: 'clockOut', label: 'Heure de sortie' },
                { key: 'duration', label: 'Total Heures' },
                { key: 'actions', label: 'Actes', className: 'text-right' }
              ]}
              renderRow={(log, index) => {
                const inDate = new Date(log.clockIn)
                const outDate = log.clockOut ? new Date(log.clockOut) : null
                return (
                  <tr key={log.id} className="transition hover:bg-[#fafbfc]">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#495057]">{log.user.name}</span>
                        <span className="text-xs text-[#adb5bd] font-bold uppercase tracking-wider">{log.user.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#495057]">
                        <Clock className="h-3.5 w-3.5 text-[#adb5bd]" />
                        <span>{inDate.toLocaleDateString('fr-FR')} {inDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {outDate ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#495057]">
                          <Clock className="h-3.5 w-3.5 text-[#adb5bd]" />
                          <span>{outDate.toLocaleDateString('fr-FR')} {outDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#2fbe5f] border border-green-200">
                          En cours
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-[#FF6D00]">
                      {log.duration !== null ? `${log.duration} h` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <CrudActionButton
                          label="Modifier"
                          tone="edit"
                          onClick={() => {
                            const cIn = new Date(log.clockIn)
                            const cOut = log.clockOut ? new Date(log.clockOut) : null
                            setFormData({
                              id: log.id,
                              userId: log.userId,
                              clockInDate: cIn.toISOString().slice(0, 10),
                              clockInTime: cIn.toTimeString().slice(0, 5),
                              clockOutDate: cOut ? cOut.toISOString().slice(0, 10) : '',
                              clockOutTime: cOut ? cOut.toTimeString().slice(0, 5) : ''
                            })
                            setShowModal(true)
                          }}
                        />
                        <CrudActionButton label="Supprimer" tone="delete" onClick={() => setDeleteTarget(log.id)} />
                      </div>
                    </td>
                  </tr>
                )
              }}
            />
          )}
        </div>
      </div>

      {/* Manual Input Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">{formData.id ? 'Modifier Fiche' : 'Fiche de présence'}</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Insérer ou ajuster des heures travaillées</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Employé concerné</label>
                <select
                  disabled={!!formData.id}
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                >
                  <option value="">Sélectionner un collaborateur</option>
                  {staff.map(member => (
                    <option key={member.id} value={member.id}>{member.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Date d'entrée</label>
                  <input
                    required
                    type="date"
                    value={formData.clockInDate}
                    onChange={(e) => setFormData({ ...formData, clockInDate: e.target.value })}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Heure d'entrée</label>
                  <input
                    required
                    type="time"
                    value={formData.clockInTime}
                    onChange={(e) => setFormData({ ...formData, clockInTime: e.target.value })}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Date de sortie</label>
                  <input
                    type="date"
                    value={formData.clockOutDate}
                    onChange={(e) => setFormData({ ...formData, clockOutDate: e.target.value })}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Heure de sortie</label>
                  <input
                    type="time"
                    value={formData.clockOutTime}
                    onChange={(e) => setFormData({ ...formData, clockOutTime: e.target.value })}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2"
                  />
                </div>
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:bg-[#adb5bd]"
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer la fiche"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300 sm:p-8">
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">Confirmer la suppression</h2>
            <p className="text-xs font-bold text-[#adb5bd] mb-8">Voulez-vous vraiment supprimer cette fiche de présence ? Cette action est irréversible.</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Annuler</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-[#e03131] hover:bg-[#c92a2a] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-500/20">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert Modal */}
      {errorModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300 sm:p-8">
            <button onClick={() => setErrorModal(null)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-4">Alerte</h2>
            <p className="text-sm font-bold text-[#495057] mb-8 leading-relaxed">{errorModal}</p>
            <button onClick={() => setErrorModal(null)} className="w-full py-4 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl">J&apos;ai compris</button>
          </div>
        </div>
      )}
    </div>
  )
}
