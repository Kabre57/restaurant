'use client'

import React, { useState, useEffect } from 'react'
import { Truck, MapPin, Clock, CheckCircle2, AlertCircle, Plus, Loader2, User, Phone, Package } from 'lucide-react'
import { getOrdersForDelivery, getDeliveryPeople, assignDelivery, createDeliveryPerson } from '@/app/actions/delivery'
import { useSession } from 'next-auth/react'
import { AlertModal } from '@/components/pos/subcomponents/AlertModal'

export default function DeliveryManagementPage() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<any[]>([])
  const [deliveryPeople, setDeliveryPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPersonModal, setShowAddPersonModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState<{ title: string, message: string, type?: 'error' | 'success' } | null>(null)

  const [newPerson, setNewPerson] = useState({
    name: '',
    phone: '',
    vehicleType: 'MOTO'
  })

  useEffect(() => {
    if (session?.user?.storeId) {
      loadData()
      // Refresh every 30 seconds
      const interval = setInterval(loadData, 30000)
      return () => clearInterval(interval)
    }
  }, [session])

  // Notification sonore lors de l'arrivée d'une nouvelle commande
  useEffect(() => {
    if (orders.length > 0) {
      const pendingOrders = orders.filter(o => o.status === 'EN_ATTENTE')
      const lastCount = parseInt(localStorage.getItem('last_delivery_count') || '0')
      
      if (pendingOrders.length > lastCount) {
        playNotificationSound()
      }
      localStorage.setItem('last_delivery_count', pendingOrders.length.toString())
    }
  }, [orders])

  function playNotificationSound() {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
    audio.play().catch(e => console.log("Audio play blocked by browser:", e))
  }

  async function loadData() {
    if (!session?.user?.storeId) return
    const [oData, pData] = await Promise.all([
      getOrdersForDelivery(session.user.storeId),
      getDeliveryPeople()
    ])
    setOrders(oData)
    setDeliveryPeople(pData)
    setLoading(false)
  }

  async function handleAssign(orderId: string, personId: string) {
    if (!personId) return
    const res = await assignDelivery(orderId, personId)
    if (res.success) {
      setAlert({ title: "Assigné", message: "Livreur assigné avec succès", type: 'success' })
      loadData()
    } else {
      setAlert({ title: "Erreur", message: res.error || "Échec de l'assignation" })
    }
  }

  async function handleAddPerson(e: React.FormEvent) {
    e.preventDefault()
    if (!newPerson.name || !newPerson.phone) return
    setIsSubmitting(true)
    const res = await createDeliveryPerson(newPerson)
    if (res.success) {
      setShowAddPersonModal(false)
      setNewPerson({ name: '', phone: '', vehicleType: 'MOTO' })
      loadData()
    }
    setIsSubmitting(false)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>

  return (
    <div className="p-10 space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#1a1d24] tracking-tight uppercase">Suivi des Livraisons</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gestion des commandes à distance et flotte de livreurs</p>
        </div>
        <button 
          onClick={() => setShowAddPersonModal(true)}
          className="bg-[#1a1d24] text-white px-8 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Ajouter un Livreur
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Orders Column */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-sm font-black text-[#1a1d24] uppercase tracking-widest flex items-center gap-2">
            <Package className="w-4 h-4" /> Commandes à livrer ({orders.length})
          </h2>
          
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white p-12 rounded-[2.5rem] border border-[#dee2e6] border-dashed flex flex-col items-center justify-center text-[#adb5bd]">
                <Clock className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">Aucune commande en attente de livraison</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white p-8 rounded-[2.5rem] border border-[#dee2e6] shadow-sm hover:shadow-xl transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-1">Commande #{order.id.slice(-6).toUpperCase()}</span>
                      <h3 className="text-xl font-black text-[#1a1d24] tracking-tight">Client à distance</h3>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-black text-[#1a1d24]">{order.total.toLocaleString()} F</span>
                      <span className="text-[9px] font-bold text-[#51cf66] uppercase bg-[#ebfbee] px-2 py-1 rounded-lg mt-1">{order.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Contenu</p>
                      <div className="text-xs font-bold text-[#495057]">
                        {order.items.map((item: any) => (
                          <div key={item.id}>{item.quantity}x {item.product.name}</div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Assignation</p>
                      {order.deliveryPerson ? (
                        <div className="flex items-center gap-3 p-3 bg-[#f8f9fa] rounded-xl border border-[#dee2e6]">
                          <div className="w-8 h-8 rounded-lg bg-[#1a1d24] flex items-center justify-center text-white">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-[#1a1d24] uppercase">{order.deliveryPerson.name}</p>
                            <p className="text-[9px] font-bold text-[#adb5bd]">{order.deliveryPerson.phone}</p>
                          </div>
                        </div>
                      ) : (
                        <select 
                          onChange={(e) => handleAssign(order.id, e.target.value)}
                          className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1a1d24]"
                        >
                          <option value="">Choisir un livreur</option>
                          {deliveryPeople.filter(p => p.status === 'ONLINE').map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delivery Flotte Column */}
        <div className="space-y-6">
          <h2 className="text-sm font-black text-[#1a1d24] uppercase tracking-widest flex items-center gap-2">
            <User className="w-4 h-4" /> Flotte de livreurs
          </h2>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-[#dee2e6] shadow-sm space-y-6">
            {deliveryPeople.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-2xl border border-[#dee2e6] group hover:bg-white hover:shadow-lg transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${p.status === 'ONLINE' ? 'bg-[#51cf66]' : p.status === 'BUSY' ? 'bg-[#fcc419]' : 'bg-[#adb5bd]'}`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#1a1d24] uppercase tracking-tight">{p.name}</h4>
                    <p className="text-[10px] font-bold text-[#adb5bd] flex items-center gap-1 uppercase">
                      <Phone className="w-3 h-3" /> {p.phone}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${p.status === 'ONLINE' ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#fff9db] text-[#f08c00]'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Person Modal */}
      {showAddPersonModal && (
        <div className="fixed inset-0 bg-[#1a1d24]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-[#1a1d24] uppercase tracking-tight mb-8">Nouveau Livreur</h2>
            <form onSubmit={handleAddPerson} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Nom Complet</label>
                <input
                  type="text"
                  required
                  value={newPerson.name}
                  onChange={e => setNewPerson({...newPerson, name: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none"
                  placeholder="Ex: Moussa Traoré"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Numéro de Téléphone</label>
                <input
                  type="tel"
                  required
                  value={newPerson.phone}
                  onChange={e => setNewPerson({...newPerson, phone: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none"
                  placeholder="+225 07..."
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddPersonModal(false)}
                  className="flex-1 py-4 bg-[#f8f9fa] text-[#495057] rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[1.5] py-4 bg-[#1a1d24] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black shadow-xl"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {alert && (
        <AlertModal 
          title={alert.title}
          message={alert.message}
          type={alert.type || 'error'}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  )
}
