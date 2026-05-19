'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { BarChart3, CreditCard, Loader2, ShoppingBag, Timer, Wallet } from 'lucide-react'
import { getAdminAnalytics } from '@/app/actions/analytics'

type AnalyticsData = NonNullable<Awaited<ReturnType<typeof getAdminAnalytics>>>

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    getAdminAnalytics()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const maxStoreRevenue = useMemo(() => Math.max(...(data?.stores.map((store) => store.revenue) || [0]), 1), [data])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-[var(--parabellum-primary)]" /></div>
  }

  return (
    <div className="mx-auto max-w-[96rem] space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Analytics</h1>
        <p className="mt-2 text-base font-medium text-[#72788f]">Performance réelle des 30 derniers jours</p>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Commandes" value={data?.totalOrders || 0} icon={<ShoppingBag />} />
        <Metric label="CA encaissé" value={`${(data?.totalRevenue || 0).toLocaleString()} F`} icon={<Wallet />} />
        <Metric label="Panier moyen" value={`${(data?.averageBasket || 0).toLocaleString()} F`} icon={<CreditCard />} />
        <Metric label="Préparation moy." value={`${data?.averagePrepMinutes || 0} min`} icon={<Timer />} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-7 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] lg:col-span-2">
          <h2 className="text-2xl font-black text-black">Revenus par restaurant</h2>
          <div className="mt-6 space-y-5">
            {data?.stores.map((store) => (
              <div key={store.id}>
                <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-widest text-[#495057]">
                  <span>{store.name}</span>
                  <span>{store.revenue.toLocaleString()} F</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#eef1ff]">
                  <div className="h-full rounded-full bg-[var(--parabellum-primary)]" style={{ width: `${Math.round((store.revenue / maxStoreRevenue) * 100)}%` }} />
                </div>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-[#adb5bd]">{store.orders} commandes</p>
              </div>
            ))}
            {!data?.stores.length && <Empty text="Aucun restaurant" />}
          </div>
        </div>

        <div className="rounded-xl bg-white p-7 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)]">
          <h2 className="text-2xl font-black text-black">Paiements</h2>
          <div className="mt-6 space-y-3">
            {data?.paymentByMethod.map((payment) => (
              <div key={payment.method} className="flex items-center justify-between rounded-xl bg-[#f8f9ff] px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#495057]">{payment.method}</span>
                <span className="text-xs font-black text-[#212529]">{payment.amount.toLocaleString()} F</span>
              </div>
            ))}
            {!data?.paymentByMethod.length && <Empty text="Aucun paiement encaissé" />}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Produits les plus vendus">
          {data?.topProducts.map((product) => (
            <div key={product.productId} className="flex items-center justify-between rounded-xl border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3">
              <span className="text-xs font-black uppercase tracking-tight text-[#212529]">{product.name}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#f08c00]">{product.quantity} vendus</span>
            </div>
          ))}
          {!data?.topProducts.length && <Empty text="Aucune vente produit" />}
        </Panel>

        <Panel title="Revenus journaliers">
          {data?.revenueByDay.slice(-10).map((item) => (
            <div key={item.date} className="flex items-center justify-between rounded-xl border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#495057]">{item.date}</span>
              <span className="text-xs font-black text-[#212529]">{item.revenue.toLocaleString()} F</span>
            </div>
          ))}
          {!data?.revenueByDay.length && <Empty text="Aucun revenu sur la période" />}
        </Panel>
      </section>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <article className="rounded-xl bg-white p-6 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-[#72788f]">{label}</p>
          <p className="mt-2 text-2xl font-black text-black">{value}</p>
        </div>
        <div className="rounded-full bg-[#eef1ff] p-4 text-[var(--parabellum-primary)]">
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
        </div>
      </div>
    </article>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-7 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)]">
      <div className="mb-5 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-[var(--parabellum-primary)]" />
        <h2 className="text-2xl font-black text-black">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[#dee2e6] p-6 text-center text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
      {text}
    </p>
  )
}
