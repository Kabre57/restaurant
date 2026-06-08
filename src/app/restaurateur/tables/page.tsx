import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTablesByStore } from '@/app/actions/store/tables';
import FloorPlanDesigner from '@/components/admin/FloorPlanDesigner';
import { QrCode } from 'lucide-react';

export default async function RestaurateurTablesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const tables = await getTablesByStore(session.user.storeId);

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Plan de Salle</h1>
          <p className="text-[#adb5bd] text-[10px] font-black uppercase tracking-widest mt-1">Configurez la disposition physique de vos tables</p>
        </div>
      </div>

      <FloorPlanDesigner
        initialTables={tables}
        storeId={session.user.storeId}
      />

      <section className="rounded-2xl border border-[#dee2e6] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1f3f5] text-[#212529]">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">Carte/Menu par table</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#adb5bd]">Lien à imprimer sur l’étiquette ou la tablette de chaque table</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <a
              key={table.id}
              href={`/menu/${session.user.storeId}/${table.number}`}
              target="_blank"
              className="rounded-xl border border-[#dee2e6] bg-[#f8f9fa] p-4 transition-all hover:bg-white hover:shadow-md"
            >
              <p className="text-xs font-black uppercase tracking-widest text-[#212529]">Table {table.number}</p>
              <p className="mt-2 break-all text-[10px] font-bold text-[#868e96]">/menu/{session.user.storeId}/{table.number}</p>
              <p className="mt-3 rounded-lg bg-[#fff7ed] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#f97316]">
                Ouvrir la carte de cette table
              </p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
