import Link from 'next/link'
import { QrCode, Table2 } from 'lucide-react'

export default function MenuIndexPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-10 text-[#212529] sm:px-6 lg:px-10">
      <section className="mx-auto max-w-3xl rounded-2xl border border-[#dee2e6] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff9db] text-[#f08c00]">
          <QrCode className="h-7 w-7" />
        </div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-[#f08c00]">Espace client</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Carte/Menu lié à une table</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-[#868e96]">
          Le client n’ouvre pas une page générique. Il scanne le lien de sa table pour voir les entrées, plats,
          boissons, formules et desserts du restaurant, puis passer une commande liée à cette table.
        </p>

        <div className="mt-6 rounded-xl border border-[#dee2e6] bg-[#f8f9fa] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Format réel</p>
          <p className="mt-2 break-all text-xs font-black text-[#495057]">/menu/store-id-reel/table-id-reel</p>
        </div>

        <Link
          href="/restaurateur/tables"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#212529] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white"
        >
          <Table2 className="h-4 w-4" />
          Générer les liens par table
        </Link>
      </section>
    </main>
  )
}
