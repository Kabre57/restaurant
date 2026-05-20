'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Users, User, Phone, X, Check, Trash2 } from 'lucide-react';
import { Table, Reservation } from '@prisma/client';
import { createReservation, updateReservationStatus, deleteReservation } from '@/app/actions/reservations';

interface ReservationModalProps {
  table: Table;
  storeId: string;
  onClose: () => void;
  existingReservations: Reservation[];
}

export default function ReservationModal({ table, storeId, onClose, existingReservations }: ReservationModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [guests, setGuests] = useState(table.capacity);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const reservationDate = new Date(`${date}T${time}`);

    const res = await createReservation({
      storeId,
      tableId: table.id,
      customerName,
      phone,
      date: reservationDate,
      guests
    });

    if (res.success) {
      onClose();
    } else {
      alert(res.error);
    }
    setIsSubmitting(false);
  };

  const handleUpdateStatus = async (id: string, status: any) => {
    await updateReservationStatus(id, status);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer cette réservation ?")) {
      await deleteReservation(id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
        
        {/* Left Side: New Reservation Form */}
        <div className="flex-1 p-10 border-r border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Réserver Table {table.number}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Nouvelle réservation</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom du client</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ex: Jean Dupont" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ex: 0102030405" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Heure</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Couverts</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type="number" value={guests} onChange={(e) => setGuests(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none" min="1" max={table.capacity} />
                </div>
              </div>
            </div>

            <button disabled={isSubmitting} type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-3">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Calendar className="w-5 h-5" />}
              Confirmer la Réservation
            </button>
          </form>
        </div>

        {/* Right Side: List of Reservations for this table */}
        <div className="w-full md:w-80 bg-slate-50 p-10 overflow-y-auto max-h-[80vh] md:max-h-none">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Prochaines Réservations</h3>
          
          <div className="space-y-4">
            {existingReservations.length === 0 ? (
              <div className="py-20 text-center opacity-30">
                <Calendar className="w-12 h-12 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Aucune réservation</p>
              </div>
            ) : (
              existingReservations.map(res => (
                <div key={res.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{res.customerName}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{res.phone}</p>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${res.status === 'CONFIRMED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {res.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-slate-600">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-bold">{new Date(res.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {res.status !== 'CONFIRMED' && (
                      <button onClick={() => handleUpdateStatus(res.id, 'CONFIRMED')} className="flex-1 bg-green-500 hover:bg-green-600 text-white p-2 rounded-xl transition-all">
                        <Check className="w-4 h-4 mx-auto" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(res.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
