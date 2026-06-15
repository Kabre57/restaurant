// src/app/api-docs/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { Loader2, ShieldAlert } from 'lucide-react'

// Import asynchrone pour désactiver le Server-Side Rendering (SSR) 
// et empêcher les erreurs de build liées aux objets 'window' / 'navigator' absents sur le serveur.
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 text-slate-800 rounded-3xl">
      <Loader2 className="w-12 h-12 text-[#FF6D00] animate-spin mb-4" />
      <p className="text-sm font-bold animate-pulse">Chargement de la console API...</p>
    </div>
  ),
})

import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocsPage() {
  const { data: session, status } = useSession()
  const [spec, setSpec] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const userRole = session?.user?.role
  const isAuthorized = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'

  useEffect(() => {
    if (status === 'authenticated' && isAuthorized) {
      fetch('/api/swagger/json')
        .then((res) => {
          if (!res.ok) {
            throw new Error('Impossible de récupérer la spécification API')
          }
          return res.json()
        })
        .then((data) => setSpec(data))
        .catch((err) => {
          console.error(err)
          setError(err.message || 'Une erreur est survenue lors du chargement de la spécification.')
        })
    }
  }, [status, isAuthorized])

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-12 h-12 text-[#FF6D00] animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Vérification de la session...
        </p>
      </div>
    )
  }

  if (status === 'unauthenticated' || !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white border border-rose-500/20 p-8 rounded-3xl shadow-xl text-center space-y-6">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto animate-bounce" />
          <h2 className="text-xl font-black uppercase text-[#171717]">Accès Restreint</h2>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            Vous devez posséder des privilèges d'administrateur ou de super-administrateur pour accéder à la documentation technique des API de Parabellum POS.
          </p>
          <div className="pt-4">
            <a
              href="/pos"
              className="inline-block px-6 py-3 bg-[#FF6D00] hover:bg-[#E05300] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              Retour au POS
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* En-tête premium */}
      <header className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 shadow-lg border-b border-indigo-900/40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">
              Documentation Technique
            </span>
            <h1 className="text-2xl font-black tracking-tight mt-1">Console API Interactive - Parabellum POS</h1>
          </div>
          <a
            href="/pos"
            className="px-5 py-3 bg-slate-800/80 hover:bg-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700/60 shadow-md active:scale-95"
          >
            Retour au POS
          </a>
        </div>
      </header>

      {/* Rendu dynamique de Swagger UI */}
      <main className="max-w-6xl mx-auto py-8 px-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-4">
          {error ? (
            <div className="p-8 text-center text-rose-500 text-sm font-bold uppercase tracking-wider">
              {error}
            </div>
          ) : !spec ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#FF6D00] animate-spin mb-4" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                Génération de la spécification OpenAPI...
              </p>
            </div>
          ) : (
            <SwaggerUI spec={spec} />
          )}
        </div>
      </main>
    </div>
  )
}
