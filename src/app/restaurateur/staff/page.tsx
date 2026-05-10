'use client'

import React, { useState, useEffect } from 'react'
import { UserPlus, Trash2, Shield, Mail, Search, X, Loader2 } from 'lucide-react'
import { getStoreStaff, createStaffMember, deleteStaffMember } from '@/app/actions/staff'
import { useSession } from 'next-auth/react'

export default function StaffManagement() {
  const { data: session } = useSession()
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    const res = await createStaffMember({
      ...formData,
      role: formData.role as any,
      storeId: session?.user?.storeId as string
    })

    if (res.success) {
      setShowModal(false)
      setFormData({ name: '', email: '', password: '', role: 'CASHIER' })
      loadStaff()
    } else {
      alert(res.error)
    }
    setIsSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (confirm("Voulez-vous vraiment supprimer ce membre du personnel ?")) {
      const res = await deleteStaffMember(id)
      if (res.success) loadStaff()
    }
  }

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight uppercase">Gestion du Personnel</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gérez vos caissiers, cuisiniers et serveurs</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
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
                      'bg-[#51cf66] text-white'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    {member.id !== session?.user?.id && (
                      <button onClick={() => handleDelete(member.id)} className="p-2 text-[#adb5bd] hover:text-[#e03131] hover:bg-[#fff5f5] rounded-xl transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Nouveau Personnel</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Ajoutez un collaborateur à votre équipe</p>
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
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Mot de passe provisoire</label>
                <input required type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Rôle attribué</label>
                <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#212529]">
                  <option value="CASHIER">CAISSIER</option>
                  <option value="KITCHEN">CUISINIER</option>
                  <option value="RESTAURATEUR">GESTIONNAIRE (ADMIN)</option>
                </select>
              </div>

              <button disabled={isSubmitting} type="submit" className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:bg-[#adb5bd]">
                {isSubmitting ? "Création..." : "Enregistrer le membre"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
