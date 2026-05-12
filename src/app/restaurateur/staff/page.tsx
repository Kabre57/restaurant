'use client'

import React, { useState, useEffect } from 'react'
import { UserPlus, Trash2, Edit3, Shield, Mail, Search, X, Loader2, AlertCircle } from 'lucide-react'
import { getStoreStaff, createStaffMember, updateStaffMember, deleteStaffMember } from '@/app/actions/staff'
import { useSession } from 'next-auth/react'

export default function StaffManagement() {
  const { data: session } = useSession()
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CASHIER'
  })

  useEffect(() => {
    if (session?.user?.storeId) {
      loadStaff()
    }
  }, [session])

  async function loadStaff() {
    setLoading(true)
    const data = await getStoreStaff(session?.user?.storeId as string)
    setStaff(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    
    let res;
    if (editingStaff) {
      res = await updateStaffMember(editingStaff.id, {
        ...formData,
        role: formData.role as any
      })
    } else {
      res = await createStaffMember({
        ...formData,
        role: formData.role as any,
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

  function handleEdit(member: any) {
    setEditingStaff(member)
    setFormData({
      name: member.name,
      email: member.email,
      password: '', // Empty password field
      role: member.role
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

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight uppercase">Gestion du Personnel</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gérez vos caissiers, cuisiniers et serveurs</p>
        </div>
        <button 
          onClick={() => { setEditingStaff(null); setFormData({ name: '', email: '', password: '', role: 'CASHIER' }); setShowModal(true); }}
          className="bg-[#212529] hover:bg-black text-white px-8 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-xl"
        >
          <UserPlus className="w-5 h-5" />
          Ajouter un membre
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-[#dee2e6] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafbfc] border-b border-[#f1f3f5]">
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Nom</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Email</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Rôle</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f5]">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-[#fafbfc] transition-all group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#f1f3f5] flex items-center justify-center font-black text-[#212529] uppercase">{member.name[0]}</div>
                      <span className="text-sm font-black text-[#212529] uppercase">{member.name}</span>
                    </div>
                  </td>
                  <td className="p-6 text-xs font-bold text-[#495057]">{member.email}</td>
                  <td className="p-6">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                      member.role === 'RESTAURATEUR' ? 'bg-[#ae3ec9] text-white' :
                      member.role === 'CASHIER' ? 'bg-[#339af0] text-white' :
                      member.role === 'KITCHEN' ? 'bg-[#51cf66] text-white' :
                      'bg-[#adb5bd] text-white'
                    }`}>
                      {member.role === 'CASHIER' ? 'CAISSIER(ÈRE)' : 
                       member.role === 'KITCHEN' ? 'CUISINIER(ÈRE)' : 
                       member.role === 'RESTAURATEUR' ? 'MANAGER' : 
                       member.role}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    {member.id !== session?.user?.id && (
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(member)} className="p-2 text-[#adb5bd] hover:text-[#212529] hover:bg-[#f1f3f5] rounded-xl transition-all">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteClick(member.id)} className="p-2 text-[#adb5bd] hover:text-[#e03131] hover:bg-[#fff5f5] rounded-xl transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal d'ajout */}
      {showModal && (
        <div className="fixed inset-0 bg-[#212529]/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="w-6 h-6" /></button>
            
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
                <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#212529]">
                  <option value="CASHIER">CAISSIER</option>
                  <option value="KITCHEN">CUISINIER</option>
                  <option value="RESTAURATEUR">GESTIONNAIRE (MANAGER)</option>
                  <option value="ADMIN">ADMINISTRATEUR</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN</option>
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
        <div className="fixed inset-0 bg-[#212529]/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">Confirmer la suppression</h2>
            <p className="text-xs font-bold text-[#adb5bd] mb-8">Voulez-vous vraiment supprimer ce membre ? Cette action est irréversible.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Annuler</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-[#e03131] hover:bg-[#c92a2a] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-500/20">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Erreur / Alerte */}
      {errorModal && (
        <div className="fixed inset-0 bg-[#212529]/60 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center relative">
            <button onClick={() => setErrorModal(null)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-4">Action Impossible</h2>
            <p className="text-sm font-bold text-[#495057] mb-8 leading-relaxed">{errorModal}</p>
            <button onClick={() => setErrorModal(null)} className="w-full py-4 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl">J'ai compris</button>
          </div>
        </div>
      )}
    </div>
  )
}
