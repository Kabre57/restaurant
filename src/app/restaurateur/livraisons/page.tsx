'use client'

import React, { useState, useEffect } from 'react'
import { Truck, Clock, Plus, Loader2, User, Phone, Package } from 'lucide-react'
import { getOrdersForDelivery, getDeliveryPeople, assignDelivery, createDeliveryPerson } from '@/app/actions/livraisons/delivery'
import { useSession } from 'next-auth/react'
import { AlertModal } from '@/components/pos/subcomponents/AlertModal'

type DeliveryItem = {
  id: string
  quantity: number
  product: { name: string }
}

type DeliveryPerson = {
  id: string
  name: string
  phone: string
  status: string
}

type DeliveryOrder = {
  id: string
  total: number
  status: string
  items: DeliveryItem[]
  deliveryPerson?: DeliveryPerson | null
  sourcePlatform?: string | null
  customerName?: string | null
  customerPhone?: string | null
  deliveryAddress?: string | null
  customerNotes?: string | null
}

export default function DeliveryManagementPage() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [deliveryPeople, setDeliveryPeople] = useState<DeliveryPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPersonModal, setShowAddPersonModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState<{ title: string, message: string, type?: 'error' | 'success' } | null>(null)

  const [newPerson, setNewPerson] = useState({
    name: '',
    phone: '',
    vehicleType: 'MOTO'
  })

  function describeError(error: unknown) {
    return error instanceof Error ? error.message : "Accès refusé"
  }

  function playNotificationSound() {
    // ✅ Son bundlé localement — fonctionne offline, sans risque CORS
    const audio = new Audio('/sounds/notification.mp3')
    audio.play().catch(() => {
      // Bloqué par la politique d'autoplay du navigateur — pas d'action requise
    })
  }

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

  async function loadData(showSpinner = true, showIssues = true) {
    const storeId = session?.user?.storeId
    if (!storeId) {
      if (showSpinner) {
        setLoading(false)
      }
      return
    }

    if (showSpinner) {
      setLoading(true)
    }

    const [ordersResult, peopleResult] = await Promise.allSettled([
      getOrdersForDelivery(storeId),
      getDeliveryPeople(storeId),
    ])

    const issues: string[] = []

    if (ordersResult.status === 'fulfilled') {
      setOrders(ordersResult.value as DeliveryOrder[])
    } else {
      issues.push(describeError(ordersResult.reason))
      setOrders([])
    }

    if (peopleResult.status === 'fulfilled') {
      setDeliveryPeople(peopleResult.value as DeliveryPerson[])
    } else {
      issues.push(describeError(peopleResult.reason))
      setDeliveryPeople([])
    }

    if (showIssues && issues.length > 0) {
      setAlert({
        title: "Accès restreint",
        message: issues.join(' '),
        type: 'error',
      })
    }

    if (showSpinner) {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isCancelled = false

    async function fetchData() {
      try {
        await loadData(true, true)
      } catch (error) {
        if (isCancelled) return
        setAlert({
          title: "Erreur",
          message: describeError(error),
          type: 'error',
        })
        setLoading(false)
      }
    }

    void fetchData()
    const interval = setInterval(() => {
      void loadData(false, false)
    }, 30000)

    return () => {
      isCancelled = true
      clearInterval(interval)
    }
  }, [session?.user?.storeId])

  async function handleAssign(orderId: string, personId: string) {
    if (!personId) return
    const res = await assignDelivery(orderId, personId)
    if (res.success) {
      setAlert({ title: "Assigné", message: "Livreur assigné avec succès", type: 'success' })
      void loadData(false, true)
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
      void loadData(false, true)
    }
    setIsSubmitting(false)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>

  return (
    <div className="space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:space-y-10 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#1a1d24] uppercase sm:text-3xl">Suivi des Livraisons</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gestion des commandes à distance et flotte de livreurs</p>
        </div>
        <button 
          onClick={() => setShowAddPersonModal(true)}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#1a1d24] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-black sm:w-auto sm:px-8"
        >
          <Plus className="w-5 h-5" />
          Ajouter un Livreur
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-10">
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
                <div key={order.id} className="rounded-[2rem] border border-[#dee2e6] bg-white p-5 shadow-sm transition-all hover:shadow-xl sm:rounded-[2.5rem] sm:p-8">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-1">Commande #{order.id.slice(-6).toUpperCase()}</span>
                      <h3 className="text-xl font-black text-[#1a1d24] tracking-tight">
                        {order.customerName || "Client à distance"}
                      </h3>
                      {order.sourcePlatform && (
                        <span className="inline-flex items-center gap-1 bg-[#e7f5ff] text-[#1c7ed6] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg mt-1.5 border border-[#a5d8ff]">
                          Plateforme : {order.sourcePlatform}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:items-end">
                      <span className="text-lg font-black text-[#1a1d24]">{order.total.toLocaleString()} F</span>
                      <span className="text-[9px] font-bold text-[#51cf66] uppercase bg-[#ebfbee] px-2 py-1 rounded-lg mt-1">{order.status}</span>
                    </div>
                  </div>

                  <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest mb-1.5">Contenu</p>
                        <div className="text-xs font-bold text-[#495057] space-y-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="bg-[#f8f9fa] px-3 py-1.5 rounded-xl border border-[#dee2e6] flex justify-between items-center">
                              <span>{item.product.name}</span>
                              <span className="bg-[#e9ecef] px-2 py-0.5 rounded font-black text-xs font-mono">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {(order.customerPhone || order.deliveryAddress || order.customerNotes) && (
                        <div className="pt-3 border-t border-[#dee2e6] space-y-2.5">
                          {order.customerPhone && (
                            <div>
                              <p className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Téléphone</p>
                              <p className="text-xs font-bold text-[#495057] mt-0.5">{order.customerPhone}</p>
                            </div>
                          )}
                          {order.deliveryAddress && (
                            <div>
                              <p className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Adresse de Livraison</p>
                              <p className="text-xs font-bold text-[#495057] mt-0.5">{order.deliveryAddress}</p>
                            </div>
                          )}
                          {order.customerNotes && (
                            <div>
                              <p className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Note Client</p>
                              <p className="text-xs italic font-semibold text-[#f08c00] bg-[#fff9db] px-2.5 py-1.5 rounded-lg border border-[#ffe066] mt-1">{order.customerNotes}</p>
                            </div>
                          )}
                        </div>
                      )}
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
          
          <div className="space-y-4 rounded-[2rem] border border-[#dee2e6] bg-white p-5 shadow-sm sm:rounded-[2.5rem] sm:p-8 sm:space-y-6">
            {deliveryPeople.map((p) => (
              <div key={p.id} className="flex flex-col gap-4 rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] p-4 transition-all hover:bg-white hover:shadow-lg sm:flex-row sm:items-center sm:justify-between">
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
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#1a1d24]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
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
              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:gap-4">
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
