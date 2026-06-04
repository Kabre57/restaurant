'use client';

import { useSession } from 'next-auth/react';

export function useEnterpriseLogo() {
  const { data: session } = useSession();
  
  return {
    companyName: (session?.user as any)?.storeName || 'L\'ENTREPRISE',
    logoUrl: null // Add logic for fetching logo if needed
  };
}
