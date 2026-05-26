import Link from 'next/link'
import {
  Banknote,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Utensils,
} from 'lucide-react'

const spaces = [
  {
    title: 'Caissier',
    href: '/',
    icon: Banknote,
    description: 'Caisse, encaissement, commandes directes et suivi POS.',
    badge: 'Protégé',
  },
  {
    title: 'Serveur',
    href: '/serveur',
    icon: Utensils,
    description: 'Choix de table, ajout de plats, appels clients et service en salle.',
    badge: 'Protégé',
  },
  {
    title: 'Cuisine KDS',
    href: '/kds',
    icon: ChefHat,
    description: 'File de préparation, stations cuisine/bar et appels serveur.',
    badge: 'Protégé',
  },
  {
    title: 'Manager / Restaurateur',
    href: '/restaurateur/stats',
    icon: LayoutDashboard,
    description: 'Menu, stocks, tables, personnel, statistiques et configuration.',
    badge: 'Protégé',
  },
  {
    title: 'Supervision',
    href: '/admin/supervision',
    icon: ShieldCheck,
    description: 'Supervision multi-sites, commissions, validations et support.',
    badge: 'Protégé',
  },
  {
    title: 'Carte / Menu',
    href: '/restaurateur/tables',
    icon: QrCode,
    description: 'Liens de table gérés par le manager pour entrées, plats, boissons, formules et desserts.',
    badge: 'Table',
  },
]

export default function SpacesPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-8 text-[#212529] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#f08c00]">ParabellumPOS</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Espaces acteurs</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-[#868e96]">
              Chaque acteur du diagramme a maintenant une entrée visible dans l’application.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-[#212529] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white"
          >
            Connexion
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => {
            const Icon = space.icon
            return (
              <Link
                key={space.title}
                href={space.href}
                className="group rounded-2xl border border-[#dee2e6] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1f3f5] text-[#212529]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-lg bg-[#fff9db] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#f08c00]">
                    {space.badge}
                  </span>
                </div>
                <h2 className="text-lg font-black uppercase tracking-tight">{space.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-[#868e96]">{space.description}</p>
                <div className="mt-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#339af0]">
                  Ouvrir <ClipboardList className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-[#dee2e6] bg-white p-5 text-sm font-semibold text-[#495057]">
          La Carte/Menu utilise une URL générée par table depuis l’espace Manager. Le client scanne ce lien pour
          commander sur la table associée.
        </div>
      </div>
    </main>
  )
}
