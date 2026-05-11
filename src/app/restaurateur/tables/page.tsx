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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight uppercase">Plan de Salle</h1>
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
