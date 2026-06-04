// src/app/api-docs/page.tsx
'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { spec } from './swagger-spec'

// Import asynchrone pour désactiver le Server-Side Rendering (SSR) 
// et empêcher les erreurs de build liées aux objets 'window' / 'navigator' absents sur le serveur.
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4" />
      <p className="text-sm font-bold animate-pulse">Chargement de la console API...</p>
    </div>
  ),
})

import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* En-tête premium */}
      <header className="bg-gradient-to-r from-indigo-950 to-indigo-900 text-white p-6 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Documentation Technique</span>
            <h1 className="text-2xl font-black tracking-tight mt-1">Console API Interactive - Gourmet POS</h1>
          </div>
          <a
            href="/pos"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            Retour au POS
          </a>
        </div>
      </header>

      {/* Rendu dynamique de Swagger UI */}
      <main className="max-w-6xl mx-auto py-8 px-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-2">
          <SwaggerUI spec={spec} />
        </div>
      </main>
    </div>
  )
}
