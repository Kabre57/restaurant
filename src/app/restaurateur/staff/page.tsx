'use client'

import React, { useEffect, useState } from 'react'
import type { Role } from '@prisma/client'
import { Trash2, Edit3, X, Loader2, AlertCircle } from 'lucide-react'
import { getStoreStaff, createStaffMember, updateStaffMember, deleteStaffMember } from '@/app/actions/staff'
import { useSession } from 'next-auth/react'
import { CrudActionButton, CrudFilterBar, CrudPrimaryButton, CrudStatus, CrudTable } from '@/components/ui/ParabellumCrudTable'

type RestaurantStaffRole = 'CASHIER' | 'SERVER' | 'KITCHEN' | 'RESTAURATEUR'
type StaffMember = {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
}

const STAFF_ROLE_OPTIONS: Array<{ value: RestaurantStaffRole; label: string; badgeClassName: string }> = [
  { value: 'CASHIER', label: 'Caissier(ere)', badgeClassName: 'bg-[#339af0] text-white' },
  { value: 'SERVER', label: 'Serveur', badgeClassName: 'bg-[#12b886] text-white' },
  { value: 'KITCHEN', label: 'Cuisinier(ere)', badgeClassName: 'bg-[#51cf66] text-white' },
  { value: 'RESTAURATEUR', label: 'Manager', badgeClassName: 'bg-[#ae3ec9] text-white' },
]

function getRoleMeta(role: string) {
  return STAFF_ROLE_OPTIONS.find((option) => option.value === role) || { label: role, badgeClassName: 'bg-[#adb5bd] text-white' }
}

export default function StaffManagement() {
  const { data: session } = useSession()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CASHIER' as RestaurantStaffRole
  })

  useEffect(() => {
    if (!session?.user?.storeId) return

    let isCancelled = false

    void getStoreStaff(session.user.storeId).then((data) => {
      if (isCancelled) return
      setStaff(data as StaffMember[])
      setLoading(false)
    })

    return () => {
      isCancelled = true
    }
  }, [session?.user?.storeId])

  async function loadStaff() {
    if (!session?.user?.storeId) return

    setLoading(true)
    const data = await getStoreStaff(session.user.storeId)
    setStaff(data as StaffMember[])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    
    let res;
    if (editingStaff) {
      res = await updateStaffMember(editingStaff.id, {
        ...formData,
        role: formData.role as Role
      })
    } else {
      res = await createStaffMember({
        ...formData,
        role: formData.role as Role,
        storeId: session?.user?.storeId as string
      })
    }

    if (res.success) {
      setShowModal(false)
      setEditingStaff(null)
      setFormData({ name: '', email: '', password: '', role: 'CASHIER' })
      loadStaff()
    } else {
      setErrorModal(res.error || "Erreur lors de l'enregistrement")
    }
    setIsSubmitting(false)
  }

  function handleEdit(member: StaffMember) {
    setEditingStaff(member)
    setFormData({
      name: member.name,
      email: member.email,
      password: '', // Empty password field
      role: member.role as RestaurantStaffRole
    })
    setShowModal(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    const res = await deleteStaffMember(id)
    if (res.success) loadStaff()
    else setErrorModal(res.error || "Erreur lors de la suppression")
  }

  function handleDeleteClick(id: string) {
    setDeleteTarget(id)
  }

  const visibleStaff = staff.filter((member) => {
    const query = search.toLowerCase()
    const matchesSearch = member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query)
    const matchesRole = roleFilter ? member.role === roleFilter : true
    return matchesSearch && matchesRole
  })

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Gestion du Personnel</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gerez vos caissiers, serveurs, cuisiniers et managers</p>
        </div>
        <CrudPrimaryButton
          onClick={() => { setEditingStaff(null); setFormData({ name: '', email: '', password: '', role: 'CASHIER' }); setShowModal(true); }}
        >
          Ajouter un membre
        </CrudPrimaryButton>
      </div>

      <CrudFilterBar
        searchValue={search}
        searchPlaceholder="Nom ou email"
        statusValue={roleFilter}
        statusOptions={STAFF_ROLE_OPTIONS.map((roleOption) => ({ value: roleOption.value, label: roleOption.label }))}
        onSearchChange={setSearch}
        onStatusChange={setRoleFilter}
        onReset={() => {
          setSearch('')
          setRoleFilter('')
        }}
      />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {visibleStaff.map((member) => (
              <div key={member.id} className="rounded-[2rem] border border-[#dee2e6] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1f3f5] font-black uppercase text-[#212529]">{member.name[0]}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black uppercase text-[#212529]">{member.name}</p>
                      <p className="truncate text-xs font-bold text-[#495057]">{member.email}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${getRoleMeta(member.role).badgeClassName}`}>
                    {getRoleMeta(member.role).label}
                  </span>
                </div>

                {member.id !== session?.user?.id && (
                  <div className="mt-4 flex gap-3">
                    <button onClick={() => handleEdit(member)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f8f9fa] px-4 py-3 text-xs font-black uppercase tracking-widest text-[#212529] transition-all hover:bg-[#f1f3f5]">
                      <Edit3 className="w-4 h-4" />
                      Modifier
                    </button>
                    <button onClick={() => handleDeleteClick(member.id)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#fff5f5] px-4 py-3 text-xs font-black uppercase tracking-widest text-[#e03131] transition-all hover:bg-[#ffe3e3]">
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <CrudTable
              title="Liste du personnel"
              rows={visibleStaff}
              emptyLabel="Aucun membre trouvé"
              columns={[
                { key: 'serial', label: 'N° de série' },
                { key: 'name', label: 'Nom' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Statut' },
                { key: 'actions', label: 'Actes', className: 'text-right' },
              ]}
              footerLabel={`Page 1 sur 1, affichant ${visibleStaff.length} membre${visibleStaff.length > 1 ? 's' : ''} sur ${staff.length} au total.`}
              renderRow={(member, index) => (
                <tr key={member.id} className="transition hover:bg-[#fafbfc]">
                  <td className="px-6 py-4 text-sm font-bold text-[#72788f]">{index + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef1ff] text-xs font-black uppercase text-[var(--parabellum-primary)]">{member.name[0]}</div>
                      <span className="text-sm font-bold text-[#495057]">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[#72788f]">{member.email}</td>
                  <td className="px-6 py-4"><CrudStatus tone="info">{getRoleMeta(member.role).label}</CrudStatus></td>
                  <td className="px-6 py-4">
                    {member.id !== session?.user?.id && (
                      <div className="flex justify-end gap-2">
                        <CrudActionButton label="Modifier le membre" tone="edit" onClick={() => handleEdit(member)} />
                        <CrudActionButton label="Supprimer le membre" tone="delete" onClick={() => handleDeleteClick(member.id)} />
                      </div>
                    )}
                  </td>
                </tr>
              )}
            />
          </div>
        </>
      )}

      {/* Modal d'ajout */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">{editingStaff ? 'Modifier Personnel' : 'Nouveau Personnel'}</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Gérez les informations du collaborateur</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Nom complet</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="EX: JEAN DUPONT" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Email</label>
                <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="caissier@restaurant.com" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">{editingStaff ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe provisoire'}</label>
                <input required={!editingStaff} type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Rôle attribué</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as RestaurantStaffRole })} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#212529]">
                  {STAFF_ROLE_OPTIONS.map((roleOption) => (
                    <option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <button disabled={isSubmitting} type="submit" className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:bg-[#adb5bd]">
                {isSubmitting ? "Enregistrement..." : editingStaff ? "Mettre à jour" : "Enregistrer le membre"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation de Suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300 sm:p-8">
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">Confirmer la suppression</h2>
            <p className="text-xs font-bold text-[#adb5bd] mb-8">Voulez-vous vraiment supprimer ce membre ? Cette action est irréversible.</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Annuler</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-[#e03131] hover:bg-[#c92a2a] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-500/20">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Erreur / Alerte */}
      {errorModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300 sm:p-8">
            <button onClick={() => setErrorModal(null)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-4">Action Impossible</h2>
            <p className="text-sm font-bold text-[#495057] mb-8 leading-relaxed">{errorModal}</p>
            <button onClick={() => setErrorModal(null)} className="w-full py-4 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl">J&apos;ai compris</button>
          </div>
        </div>
      )}
    </div>
  )
}
