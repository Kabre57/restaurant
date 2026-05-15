import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTablesByStore } from '@/app/actions/tables';
import FloorPlanDesigner from '@/components/admin/FloorPlanDesigner';

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
    </div>
  );
}
