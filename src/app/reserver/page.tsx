import { prisma } from "@/lib/db";
import ReservationForm from "./ReservationForm";

export const dynamic = "force-dynamic";

export default async function ReserverPage() {
  // Charger les magasins disponibles
  const stores = await prisma.store.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full mx-auto space-y-8 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-8 rounded-3xl shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 mb-4 animate-pulse">
            <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase">Widget Public</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Réserver une Table
          </h1>
          <p className="mt-3 text-slate-400 text-sm">
            Entrez vos détails pour réserver instantanément votre table dans l'un de nos restaurants.
          </p>
        </div>

        <ReservationForm stores={stores} />
      </div>

      <footer className="text-center text-slate-600 text-xs mt-8">
        Parabellum POS — Module Réservations v1.0
      </footer>
    </div>
  );
}
