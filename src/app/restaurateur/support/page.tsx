'use client'

import React, { useEffect, useState } from 'react'
import { Priority } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { Loader2, Plus } from 'lucide-react'
import { createSupportTicket, getSupportTicketsByUser } from '@/app/actions/support/support'

type TicketRow = Awaited<ReturnType<typeof getSupportTicketsByUser>>[number]
type SupportForm = { subject: string; description: string; priority: Priority }

const initialForm: SupportForm = { subject: '', description: '', priority: Priority.MEDIUM }

export default function RestaurateurSupportPage() {
  const { data: session } = useSession()
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function refreshTickets(userId: string) {
    setTickets(await getSupportTicketsByUser(userId))
  }

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return

    let cancelled = false
    getSupportTicketsByUser(userId)
      .then((rows) => {
        if (!cancelled) setTickets(rows)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!session?.user?.id) return

    setIsSaving(true)
    setMessage('')

    const result = await createSupportTicket({ ...form, userId: session.user.id })
    if (result.success) {
      setForm(initialForm)
      await refreshTickets(session.user.id)
      setMessage('Ticket envoyé au support Supervision.')
    } else {
      setMessage(result.error || 'Envoi impossible.')
    }

    setIsSaving(false)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#f08c00]">Support</p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[#212529] sm:text-3xl">Assistance restaurant</h1>
        <p className="mt-1 text-sm font-bold uppercase tracking-widest text-[#adb5bd]">
          Créez un ticket et suivez son traitement par le Supervision.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-[#f1f3f5] p-3"><Plus className="h-5 w-5 text-[#212529]" /></div>
          <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">Nouveau ticket</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
          <Field label="Sujet" value={form.subject} onChange={(value) => setForm({ ...form, subject: value })} />
          <label className="space-y-2">
            <span className="ml-1 block text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Priorité</span>
            <select
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}
              className="w-full rounded-xl border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#212529]"
            >
              {Object.values(Priority).map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-4 block space-y-2">
          <span className="ml-1 block text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Description</span>
          <textarea
            required
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="min-h-32 w-full rounded-xl border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#212529]"
          />
        </label>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-[#495057]">{message}</p>
          <button disabled={isSaving} className="rounded-xl bg-[#212529] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">
            {isSaving ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </form>

      <section className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">Mes tickets</h2>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#adb5bd]" /></div>
        ) : (
          <div className="mt-5 space-y-3">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-tight text-[#212529]">{ticket.subject}</h3>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-[#868e96]">{ticket.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge text={ticket.priority} />
                    <Badge text={ticket.status} />
                  </div>
                </div>
              </article>
            ))}
            {tickets.length === 0 && (
              <p className="rounded-xl border border-dashed border-[#dee2e6] p-8 text-center text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Aucun ticket envoyé
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="ml-1 block text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">{label}</span>
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#212529]"
      />
    </label>
  )
}

function Badge({ text }: { text: string }) {
  return <span className="rounded-lg bg-white px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#495057]">{text}</span>
}
