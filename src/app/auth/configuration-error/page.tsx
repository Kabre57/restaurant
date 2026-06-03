'use client';

import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function ConfigurationErrorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          Configuration compte incomplète
        </h1>
        <p className="text-gray-600 mb-6">
          Votre compte utilisateur n'est pas associé à un restaurant.
          Veuillez contacter l'administrateur pour résoudre ce problème.
        </p>
        <div className="space-y-3">
          <Button variant="primary" fullWidth onClick={() => router.push('/login')}>
            Retour à la connexion
          </Button>
          <Button variant="ghost" fullWidth onClick={() => router.push('/support')}>
            Contacter le support
          </Button>
        </div>
      </div>
    </div>
  );
}
