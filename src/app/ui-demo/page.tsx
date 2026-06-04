// src/app/ui-demo/page.tsx
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { ArrowLeft, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function UIDemoPage() {
  const toast = useToast()
  const [inputValue, setInputValue] = useState('')
  const [errorValue, setErrorValue] = useState('')

  return (
    <div className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)] font-sans p-6 sm:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* En-tête */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--ui-border)] pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Composants UI/UX Tactiles</h1>
            <p className="text-[var(--ui-text-muted)] mt-2">Démonstration interactive des contrôles conformes aux exigences tactiles min 44px.</p>
          </div>
          <Link href="/pos" passHref legacyBehavior>
            <Button variant="secondary" size="md">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour au POS
            </Button>
          </Link>
        </header>

        {/* Section 1 : Boutons Tactiles */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold border-l-4 border-[var(--ui-primary)] pl-3">1. Boutons (Button)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-[var(--ui-surface)] p-6 rounded-3xl border border-[var(--ui-border)] shadow-sm">
            {/* Tailles */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--ui-text-muted)]">Tailles Tactiles</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" size="sm">Petite (36px)</Button>
                <Button variant="primary" size="md">Moyenne (44px min)</Button>
                <Button variant="primary" size="lg">Grande (52px)</Button>
              </div>
            </div>

            {/* Variantes */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--ui-text-muted)]">Variantes Graphiques</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary">Principal</Button>
                <Button variant="secondary">Secondaire</Button>
                <Button variant="ghost">Fantôme</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>

            {/* États */}
            <div className="col-span-1 sm:col-span-2 space-y-4 pt-4 border-t border-[var(--ui-border)]">
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--ui-text-muted)]">États Spéciaux</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" disabled>Désactivé</Button>
                <Button variant="primary" className="active:scale-95">Tap Effect (Active State)</Button>
                <Button variant="secondary" className="focus-visible:ring-4">Clavier Focus Ring</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 : Champs de Saisie Tactiles */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold border-l-4 border-[var(--ui-primary)] pl-3">2. Champs de Saisie (Input)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[var(--ui-surface)] p-6 rounded-3xl border border-[var(--ui-border)] shadow-sm">
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--ui-text-muted)]">Label Flottant Standard</h3>
              <Input
                label="Nom du client"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--ui-text-muted)]">Champ avec Erreur</h3>
              <Input
                label="Code promotionnel"
                value={errorValue}
                onChange={(e) => setErrorValue(e.target.value)}
                error={errorValue.length > 5 ? "Code promotionnel expiré ou invalide" : undefined}
                placeholder="Ex: NOEL20"
              />
              <p className="text-xs text-[var(--ui-text-muted)]">Saisissez plus de 5 caractères pour voir l&apos;état d&apos;erreur tactile.</p>
            </div>
          </div>
        </section>

        {/* Section 3 : Badges de Statut */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold border-l-4 border-[var(--ui-primary)] pl-3">3. Badges de Statut (Badge)</h2>
          <div className="bg-[var(--ui-surface)] p-6 rounded-3xl border border-[var(--ui-border)] shadow-sm space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--ui-text-muted)]">Statuts des commandes</h3>
              <div className="flex flex-wrap gap-4">
                <Badge status="PENDING" label="En attente" />
                <Badge status="PREPARING" label="En préparation" />
                <Badge status="READY" label="Prêt" />
                <Badge status="PAID" label="Payé" />
                <Badge status="DELIVERED" label="Livré" />
                <Badge status="CANCELLED" label="Annulé" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--ui-border)]">
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--ui-text-muted)]">Rôles utilisateurs</h3>
              <div className="flex flex-wrap gap-4">
                <Badge status="ADMIN" />
                <Badge status="RESTAURATEUR" />
                <Badge status="SERVER" label="Serveur" />
                <Badge status="CASHIER" label="Caissier" />
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 : Toasts Tactiles */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold border-l-4 border-[var(--ui-primary)] pl-3">4. Notifications non-bloquantes (Toast)</h2>
          <div className="bg-[var(--ui-surface)] p-6 rounded-3xl border border-[var(--ui-border)] shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--ui-text-muted)]">Tester les Toasts (Auto-dismiss 4s)</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" onClick={() => toast("Opération effectuée avec succès !", "success")}>
                <Check className="w-4 h-4 mr-2" /> Succès
              </Button>
              <Button variant="danger" onClick={() => toast("Une erreur critique est survenue !", "error")}>
                <AlertCircle className="w-4 h-4 mr-2" /> Erreur
              </Button>
              <Button variant="secondary" onClick={() => toast("Rappel : Vérifier l'inventaire avant la clôture.", "warning")}>
                Avertissement
              </Button>
              <Button variant="ghost" onClick={() => toast("Nouvelle commande en cours de préparation.", "info")}>
                Info
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
