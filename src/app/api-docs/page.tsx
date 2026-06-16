'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react'

type OpenApiSpec = Record<string, unknown>

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center rounded-[1.25rem] border border-[var(--parabellum-border)] bg-[var(--parabellum-card)] py-20">
      <Loader2 className="mb-4 h-12 w-12 animate-spin text-[var(--parabellum-primary)]" />
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--parabellum-muted)]">
        Chargement de la console API...
      </p>
    </div>
  ),
})

import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocsPage() {
  const { data: session, status } = useSession()
  const [spec, setSpec] = useState<OpenApiSpec | null>(null)
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
          return res.json() as Promise<OpenApiSpec>
        })
        .then((data) => setSpec(data))
        .catch((err: unknown) => {
          console.error(err)
          setError(err instanceof Error ? err.message : 'Une erreur est survenue lors du chargement de la spécification.')
        })
    }
  }, [status, isAuthorized])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--parabellum-primary)]" />
      </div>
    )
  }

  if (status === 'unauthenticated' || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="barab-card w-full max-w-md rounded-[1.5rem] p-8 text-center">
          <ShieldAlert className="mx-auto h-16 w-16 text-[var(--parabellum-danger)]" />
          <p className="mt-5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--parabellum-primary)]">
            Accès restreint
          </p>
          <h1 className="mt-2 text-3xl font-bold uppercase tracking-tight text-[var(--parabellum-text)]">
            Documentation API
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--parabellum-muted)]">
            Cette section est réservée aux administrateurs et super-administrateurs.
          </p>
          <div className="mt-6">
            <a href="/pos" className="th-btn th-btn--secondary">
              <ArrowLeft className="h-4 w-4" />
              Retour au POS
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="barab-page min-h-screen pb-10">
      <header className="breadcumb-wrapper">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="title-area max-w-3xl">
            <span className="sub-title">Documentation technique</span>
            <h1 className="sec-title text-white">Console API interactive</h1>
            <p className="desc text-white/78">
              Le contrat d’API reste lisible et exploitable pour les équipes techniques, directement depuis le back-office.
            </p>
          </div>
          <a href="/pos" className="th-btn th-btn--secondary w-fit">
            <ArrowLeft className="h-4 w-4" />
            Retour au POS
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="barab-card overflow-hidden rounded-[1.5rem] p-4 sm:p-5">
          {error ? (
            <div className="rounded-[1rem] border border-[rgba(235,20,0,0.18)] bg-[rgba(235,20,0,0.08)] px-6 py-10 text-center text-sm font-medium text-[var(--parabellum-danger)]">
              {error}
            </div>
          ) : !spec ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-[var(--parabellum-primary)]" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--parabellum-muted)]">
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
